const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return DATE_TIME_FORMATTER.format(new Date(iso));
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffSeconds) < 60) return "just now";
  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes >= 0 ? `${diffMinutes} minutes ago` : `in ${-diffMinutes} minutes`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours >= 0 ? `${diffHours} hours ago` : `in ${-diffHours} hours`;
  }
  return diffDays >= 0 ? `${diffDays} days ago` : `in ${-diffDays} days`;
}

export function formatDuration(hours: number): string {
  const totalHours = Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days === 0) return `${remainingHours}h`;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

// WaitingIndicator's signature format: zero-padded hours when a day segment is
// present ("3d 04h"), bare hours otherwise ("4h").
export function formatWaitingDuration(hours: number): string {
  const totalHours = Math.max(0, Math.round(hours));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days === 0) return `${remainingHours}h`;
  return `${days}d ${String(remainingHours).padStart(2, "0")}h`;
}

export function isOverdue(dueDate: string | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < now.getTime();
}

// Buckets a 0-100 risk score into the R1-R5 badge tiers SECTION and TASK
// PANEL render (R4-R5 get the --signal-critical-dim treatment).
export function riskTierOf(riskScore: number): 1 | 2 | 3 | 4 | 5 {
  const tier = Math.ceil(Math.max(1, Math.min(100, riskScore)) / 20);
  return Math.min(5, Math.max(1, tier)) as 1 | 2 | 3 | 4 | 5;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const [first = ""] = parts;
    return first.slice(0, 2).toUpperCase();
  }
  const [first, second] = parts;
  return `${(first ?? "").charAt(0)}${(second ?? "").charAt(0)}`.toUpperCase();
}

// ProjectMark's two-letter identifier. Multi-word names use the first letter
// of the first two words ("Atlas Core" -> AC). Single-word names split on
// internal capitals ("HealthBridge" -> HB), falling back to the first two
// characters if no internal capital exists.
export function projectMarkOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length >= 2) {
    const [first, second] = words;
    return `${(first ?? "").charAt(0)}${(second ?? "").charAt(0)}`.toUpperCase();
  }

  const [word = ""] = words;
  const capitalBoundary = word.match(/^([A-Z][a-z]*)([A-Z])/);
  if (capitalBoundary) {
    const [, , second] = capitalBoundary;
    return `${word.charAt(0)}${second}`.toUpperCase();
  }
  return word.slice(0, 2).toUpperCase();
}
