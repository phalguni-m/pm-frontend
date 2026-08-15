/**
 * Real CPM (critical path method) over the whole project graph, not a
 * single-target longest chain. Pure, no React, total, deterministic — same
 * contract as src/lib/graph.ts.
 */

import type { GraphLayout } from "@/lib/graph";
import type { TaskView } from "@/types/ui";

// A task with no startDate/dueDate has no measurable duration. Coercing that
// to "today" would fabricate a fact the data doesn't contain, so instead
// every under-specified task gets this same flat, visibly-a-placeholder
// duration — 1 day — and isEstimatedDuration: true so the UI can mark it
// rather than silently blending it in with real durations.
export const DEFAULT_DURATION_DAYS = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TaskCPMResult {
  taskId: string;
  durationDays: number;
  isEstimatedDuration: boolean;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;
  isCritical: boolean;
}

export interface CriticalPathResult {
  tasks: Map<string, TaskCPMResult>;
  criticalTaskIds: string[];
  criticalChains: string[][];
  totalDurationDays: number;
  degraded: boolean;
  degradedNodeIds: string[];
}

function degradedResult(nodeIds: string[]): CriticalPathResult {
  return {
    tasks: new Map(),
    criticalTaskIds: [],
    criticalChains: [],
    totalDurationDays: 0,
    degraded: true,
    degradedNodeIds: [...nodeIds].sort(),
  };
}

function durationOf(task: TaskView | undefined): { durationDays: number; isEstimatedDuration: boolean } {
  if (!task || !task.startDate || !task.dueDate) {
    return { durationDays: DEFAULT_DURATION_DAYS, isEstimatedDuration: true };
  }
  const start = new Date(task.startDate).getTime();
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(due)) {
    return { durationDays: DEFAULT_DURATION_DAYS, isEstimatedDuration: true };
  }
  const days = Math.round((due - start) / MS_PER_DAY);
  return { durationDays: Math.max(1, days), isEstimatedDuration: false };
}

/**
 * Forward pass then backward pass over the topological layer order
 * GraphLayout already produced (layerNodes/orderWithinLayers) — nodes are
 * processed in ascending layer order for the forward pass and descending for
 * the backward pass, rather than re-running a topo sort here.
 *
 * Sources (no predecessors) start at earlyStart 0. Sinks (no successors) —
 * across every component, not per-component — share a single project-end
 * bound: lateFinish defaults to totalDurationDays (line 119, consumed at
 * line 125), the max earlyFinish over the whole node set. This is standard
 * CPM's implicit-virtual-end-node convention: every sink is treated as
 * feeding one shared project deadline, not its own component-local one.
 *
 * Consequence: an isolated node or a short dead-end branch is NOT trivially
 * critical. Its slack is totalDurationDays minus its own earlyFinish, which
 * is positive whenever that node/branch is shorter than the longest chain
 * in the whole graph — only a node whose earlyFinish equals the project-wide
 * max lands at slack 0.
 *
 * Disconnected components are pooled into this same single totalDurationDays
 * rather than each getting its own bound, so a short component's slack is
 * measured against the longest component's span. Intentional under a
 * single-project-deadline reading (one shared "the project is done" line),
 * not a per-component "this component is done" reading.
 *
 * Cycles make CPM undefined (no valid topological order to pass over), so
 * when layout.cycles is non-empty this returns a degraded result flagged
 * with the offending node ids instead of throwing or computing silently
 * wrong numbers.
 */
export function computeCriticalPath(layout: GraphLayout, tasks: TaskView[]): CriticalPathResult {
  if (layout.cycles.length > 0) {
    return degradedResult(layout.cycles.flat());
  }

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  for (const node of layout.nodes) {
    forward.set(node.id, []);
    backward.set(node.id, []);
  }
  for (const edge of layout.edges) {
    if (!forward.has(edge.from) || !backward.has(edge.to)) continue;
    forward.get(edge.from)!.push(edge.to);
    backward.get(edge.to)!.push(edge.from);
  }

  const durations = new Map<string, { durationDays: number; isEstimatedDuration: boolean }>();
  for (const node of layout.nodes) {
    durations.set(node.id, durationOf(tasksById.get(node.id)));
  }

  const ascending = [...layout.nodes].sort((a, b) => (a.layer - b.layer) || a.id.localeCompare(b.id));
  const descending = [...ascending].reverse();

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  for (const node of ascending) {
    const preds = backward.get(node.id) ?? [];
    const start = preds.length === 0 ? 0 : Math.max(...preds.map((p) => earlyFinish.get(p) ?? 0));
    const duration = durations.get(node.id)!.durationDays;
    earlyStart.set(node.id, start);
    earlyFinish.set(node.id, start + duration);
  }

  const totalDurationDays = layout.nodes.length === 0 ? 0 : Math.max(...[...earlyFinish.values()]);

  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();
  for (const node of descending) {
    const succs = forward.get(node.id) ?? [];
    const finish = succs.length === 0 ? totalDurationDays : Math.min(...succs.map((s) => lateStart.get(s) ?? totalDurationDays));
    const duration = durations.get(node.id)!.durationDays;
    lateFinish.set(node.id, finish);
    lateStart.set(node.id, finish - duration);
  }

  const results = new Map<string, TaskCPMResult>();
  for (const node of layout.nodes) {
    const { durationDays, isEstimatedDuration } = durations.get(node.id)!;
    const es = earlyStart.get(node.id) ?? 0;
    const ef = earlyFinish.get(node.id) ?? 0;
    const ls = lateStart.get(node.id) ?? 0;
    const lf = lateFinish.get(node.id) ?? 0;
    const slack = ls - es;
    results.set(node.id, {
      taskId: node.id,
      durationDays,
      isEstimatedDuration,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      slack,
      isCritical: slack === 0,
    });
  }

  const criticalTaskIds = [...results.values()].filter((r) => r.isCritical).map((r) => r.taskId).sort();
  const criticalSet = new Set(criticalTaskIds);

  // An edge only carries the critical path forward when no slack is
  // absorbed on it specifically (earlyFinish(from) === earlyStart(to)) —
  // two critical nodes joined by a slack-absorbing edge aren't on the same
  // critical chain. criticalEdgesFrom/To let multiple tied chains be walked
  // independently rather than assuming a single path.
  const criticalForward = new Map<string, string[]>();
  for (const edge of layout.edges) {
    if (!criticalSet.has(edge.from) || !criticalSet.has(edge.to)) continue;
    const from = results.get(edge.from)!;
    const to = results.get(edge.to)!;
    if (from.earlyFinish !== to.earlyStart) continue;
    if (!criticalForward.has(edge.from)) criticalForward.set(edge.from, []);
    criticalForward.get(edge.from)!.push(edge.to);
  }

  const hasCriticalIncoming = new Set<string>();
  for (const targets of criticalForward.values()) {
    for (const target of targets) hasCriticalIncoming.add(target);
  }
  const criticalSources = criticalTaskIds.filter((id) => !hasCriticalIncoming.has(id));

  // Enumerate every maximal path from a critical source to a critical sink
  // (a node with no critical outgoing edge) via iterative DFS — an explicit
  // stack, not recursion, for the same depth-safety reason as detectCycles.
  // A critical node feeding multiple critical successors produces one chain
  // per branch rather than picking a single "primary" one, so two tied
  // parallel chains both come out as separate entries.
  const criticalChains: string[][] = [];
  for (const source of criticalSources) {
    const stack: { path: string[] }[] = [{ path: [source] }];
    while (stack.length > 0) {
      const { path } = stack.pop()!;
      const last = path[path.length - 1]!;
      const nextOptions = (criticalForward.get(last) ?? []).sort();
      if (nextOptions.length === 0) {
        criticalChains.push(path);
        continue;
      }
      for (const next of nextOptions) {
        stack.push({ path: [...path, next] });
      }
    }
  }
  criticalChains.sort((a, b) => a.join(",").localeCompare(b.join(",")));

  return {
    tasks: results,
    criticalTaskIds,
    criticalChains,
    totalDurationDays,
    degraded: false,
    degradedNodeIds: [],
  };
}
