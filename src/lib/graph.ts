/**
 * Pure dependency-graph algorithms: adjacency, cycle detection, topological
 * layering, and crossing-reduction ordering. No React, no fixtures, no
 * imports from components — GraphPage/DependencyGraph call computeGraphLayout
 * and render whatever comes back.
 */

import type { TaskDep } from "@/types/database";

// Coordinate-grid spacing. No existing design token covers a graph canvas's
// coordinate system (tokens.css only has UI spacing/radius/type scales), so
// these stay as named constants here rather than literals in JSX.
export const LAYER_GAP_X = 220;
export const NODE_GAP_Y = 96;

export interface Graph {
  nodeIds: string[];
  forward: Map<string, string[]>;
  backward: Map<string, string[]>;
}

export interface GraphNodeLayout {
  id: string;
  layer: number;
  index: number;
  x: number;
  y: number;
}

export interface GraphEdgeLayout {
  id: string;
  from: string;
  to: string;
  isBackEdge: boolean;
}

export interface GraphLayout {
  nodes: GraphNodeLayout[];
  edges: GraphEdgeLayout[];
  cycles: string[][];
}

/**
 * Builds adjacency in both directions from a flat TaskDep[]. Every id in
 * taskIds becomes a node, even with zero edges. Edges referencing a task id
 * outside taskIds, or with a null blocking/blocked id, are dropped — never
 * thrown on. taskIds is sorted so node order (and everything derived from
 * iterating nodeIds) is deterministic regardless of input order.
 */
export function buildGraph(deps: TaskDep[], taskIds: string[]): Graph {
  const idSet = new Set(taskIds);
  const nodeIds = [...idSet].sort();

  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  for (const id of nodeIds) {
    forward.set(id, []);
    backward.set(id, []);
  }

  const sortedDeps = [...deps].sort((a, b) => a.id.localeCompare(b.id));
  for (const dep of sortedDeps) {
    const from = dep.blocking_task_id;
    const to = dep.blocked_task_id;
    if (!from || !to) continue;
    if (!idSet.has(from) || !idSet.has(to)) continue;
    forward.get(from)!.push(to);
    backward.get(to)!.push(from);
  }

  return { nodeIds, forward, backward };
}

/**
 * Iterative (explicit-stack) Tarjan SCC. Returns only SCCs of size > 1, plus
 * any single node with a self-edge — those are the "cycles" that matter for
 * layering/rendering. No recursion: the task tree can be deep and a
 * recursive DFS would risk a stack overflow.
 */
export function detectCycles(graph: Graph): string[][] {
  let indexCounter = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Explicit-stack Tarjan: each frame tracks which neighbor to visit next.
  interface Frame {
    node: string;
    neighbors: string[];
    i: number;
  }

  for (const start of graph.nodeIds) {
    if (indices.has(start)) continue;

    const callStack: Frame[] = [{ node: start, neighbors: graph.forward.get(start) ?? [], i: 0 }];
    indices.set(start, indexCounter);
    lowlink.set(start, indexCounter);
    indexCounter += 1;
    stack.push(start);
    onStack.add(start);

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1]!;

      if (frame.i < frame.neighbors.length) {
        const next = frame.neighbors[frame.i]!;
        frame.i += 1;

        if (!indices.has(next)) {
          indices.set(next, indexCounter);
          lowlink.set(next, indexCounter);
          indexCounter += 1;
          stack.push(next);
          onStack.add(next);
          callStack.push({ node: next, neighbors: graph.forward.get(next) ?? [], i: 0 });
        } else if (onStack.has(next)) {
          lowlink.set(frame.node, Math.min(lowlink.get(frame.node)!, indices.get(next)!));
        }
      } else {
        callStack.pop();

        if (callStack.length > 0) {
          const parent = callStack[callStack.length - 1]!;
          lowlink.set(parent.node, Math.min(lowlink.get(parent.node)!, lowlink.get(frame.node)!));
        }

        if (lowlink.get(frame.node) === indices.get(frame.node)) {
          const component: string[] = [];
          let member: string;
          do {
            member = stack.pop()!;
            onStack.delete(member);
            component.push(member);
          } while (member !== frame.node);

          const first = component[0]!;
          const hasSelfEdge = component.length === 1 && (graph.forward.get(first) ?? []).includes(first);
          if (component.length > 1 || hasSelfEdge) {
            sccs.push(component.sort());
          }
        }
      }
    }
  }

  // Deterministic output order regardless of nodeIds traversal order.
  sccs.sort((a, b) => a[0]!.localeCompare(b[0]!));
  return sccs;
}

/**
 * Kahn topological layering. Nodes belonging to a cycle (per detectCycles)
 * cannot be layered by Kahn's algorithm — they never reach in-degree 0 among
 * themselves. Rule: cycle nodes are excluded from the Kahn pass entirely,
 * then all placed together in one synthetic trailing layer
 * (max acyclic layer + 1), ordered alphabetically by id within it. This
 * keeps layering total (every node gets a layer, nothing is dropped) and
 * deterministic without inventing a partial ordering among mutually-cyclic
 * nodes.
 */
export function layerNodes(graph: Graph, cycleNodeIds: ReadonlySet<string>): Map<string, number> {
  const layers = new Map<string, number>();
  const acyclicIds = graph.nodeIds.filter((id) => !cycleNodeIds.has(id));

  const inDegree = new Map<string, number>();
  for (const id of acyclicIds) {
    const count = (graph.backward.get(id) ?? []).filter((from) => !cycleNodeIds.has(from)).length;
    inDegree.set(id, count);
  }

  let frontier = acyclicIds.filter((id) => inDegree.get(id) === 0).sort();
  let layer = 0;

  const remaining = new Set(acyclicIds);
  while (frontier.length > 0) {
    for (const id of frontier) {
      layers.set(id, layer);
      remaining.delete(id);
    }

    const next = new Set<string>();
    for (const id of frontier) {
      for (const to of graph.forward.get(id) ?? []) {
        if (cycleNodeIds.has(to) || !remaining.has(to)) continue;
        const updated = (inDegree.get(to) ?? 0) - 1;
        inDegree.set(to, updated);
        if (updated === 0) next.add(to);
      }
    }

    frontier = [...next].sort();
    layer += 1;
  }

  // Any acyclic node not reached (shouldn't happen given cycle nodes are
  // excluded, but guards totality if backward/forward ever disagree) falls
  // into the same trailing layer as cycle nodes rather than being dropped.
  const maxAcyclicLayer = layers.size > 0 ? Math.max(...layers.values()) : -1;
  const trailingLayer = maxAcyclicLayer + 1;

  const strandedAcyclic = acyclicIds.filter((id) => !layers.has(id));
  const trailingMembers = [...cycleNodeIds, ...strandedAcyclic].sort();
  for (const id of trailingMembers) {
    layers.set(id, trailingLayer);
  }

  return layers;
}

/**
 * Median/barycenter heuristic to reduce edge crossings, fixed iteration
 * count (no convergence check, so runtime is bounded regardless of input).
 * Returns each node's index within its own layer. Initial order within a
 * layer is alphabetical by id, which is also the deterministic tie-break
 * whenever a node's barycenter ties with another's or has no positioned
 * neighbors yet.
 */
export function orderWithinLayers(layers: Map<string, number>, graph: Graph): Map<string, number> {
  const byLayer = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(id);
  }
  for (const ids of byLayer.values()) ids.sort();

  const layerNumbers = [...byLayer.keys()].sort((a, b) => a - b);
  const position = new Map<string, number>();
  for (const ids of byLayer.values()) {
    ids.forEach((id, i) => position.set(id, i));
  }

  function barycenter(neighbors: string[]): number | null {
    const positioned = neighbors.map((n) => position.get(n)).filter((p): p is number => p !== undefined);
    if (positioned.length === 0) return null;
    return positioned.reduce((sum, p) => sum + p, 0) / positioned.length;
  }

  function sweep(order: number[], neighborsOf: (id: string) => string[]) {
    for (const layer of order) {
      const ids = byLayer.get(layer);
      if (!ids) continue;
      const withKeys = ids.map((id) => ({ id, key: barycenter(neighborsOf(id)) }));
      withKeys.sort((a, b) => {
        if (a.key === null && b.key === null) return a.id.localeCompare(b.id);
        if (a.key === null) return 1;
        if (b.key === null) return -1;
        if (a.key !== b.key) return a.key - b.key;
        return a.id.localeCompare(b.id);
      });
      withKeys.forEach((entry, i) => position.set(entry.id, i));
      byLayer.set(
        layer,
        withKeys.map((entry) => entry.id),
      );
    }
  }

  const ITERATIONS = 4;
  for (let iter = 0; iter < ITERATIONS; iter += 1) {
    const downward = iter % 2 === 0;
    const order = downward ? layerNumbers : [...layerNumbers].reverse();
    sweep(order, (id) => (downward ? graph.backward.get(id) ?? [] : graph.forward.get(id) ?? []));
  }

  return position;
}

/**
 * Composes buildGraph -> detectCycles -> layerNodes -> orderWithinLayers
 * into final pixel coordinates. Total and deterministic: same deps/taskIds
 * in any order always produce an identical GraphLayout.
 */
export function computeGraphLayout(deps: TaskDep[], taskIds: string[]): GraphLayout {
  const graph = buildGraph(deps, taskIds);
  const cycles = detectCycles(graph);
  const cycleNodeIds = new Set(cycles.flat());

  const layers = layerNodes(graph, cycleNodeIds);
  const positions = orderWithinLayers(layers, graph);

  const nodes: GraphNodeLayout[] = graph.nodeIds
    .map((id) => {
      const layer = layers.get(id) ?? 0;
      const index = positions.get(id) ?? 0;
      return { id, layer, index, x: layer * LAYER_GAP_X, y: index * NODE_GAP_Y };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const edges: GraphEdgeLayout[] = [];
  const sortedDeps = [...deps].sort((a, b) => a.id.localeCompare(b.id));
  const idSet = new Set(graph.nodeIds);
  for (const dep of sortedDeps) {
    const from = dep.blocking_task_id;
    const to = dep.blocked_task_id;
    if (!from || !to) continue;
    if (!idSet.has(from) || !idSet.has(to)) continue;
    const fromLayer = layers.get(from) ?? 0;
    const toLayer = layers.get(to) ?? 0;
    const isBackEdge = fromLayer >= toLayer;
    edges.push({ id: dep.id, from, to, isBackEdge });
  }

  return { nodes, edges, cycles };
}
