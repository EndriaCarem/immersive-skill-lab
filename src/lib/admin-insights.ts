/** Pure helpers for administration insights (browser-safe). */

/** Purchases grant this many months of access from the enrollment date (mirrors the database trigger). */
export const ACCESS_MONTHS = 6;
export function accessUntil(enrolledAt: string, months = ACCESS_MONTHS) {
  const d = new Date(enrolledAt);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Orders that were started but never paid; older than `graceMinutes` so in-progress payments are not listed. */
export const UNFINISHED = ["awaiting_integration", "pending", "rejected"] as const;
export function abandonedOrders<T extends { user_id: string; status: string; created_at: string; total_cents: number; items: string[] }>(
  orders: T[], now = Date.now(), graceMinutes = 60,
) {
  const finished = new Set(orders.filter((o) => o.status === "paid" || o.status === "free").flatMap((o) => o.items.map((i) => `${o.user_id}|${i}`)));
  return orders.filter((o) =>
    (UNFINISHED as readonly string[]).includes(o.status) && o.total_cents > 0 &&
    now - new Date(o.created_at).getTime() >= graceMinutes * 60_000 &&
    !o.items.every((i) => finished.has(`${o.user_id}|${i}`)));
}

/**
 * Average time per activity: from the first time the student opens the activity
 * (any /estagio/<slug>/<n>/... page) until their first delivery of it.
 */
export function activityTimes(
  programs: { id: string; slug: string; title: string; activities: { id: string; title: string }[] }[],
  visits: { user_id: string; path: string; created_at: string }[],
  submissions: { user_id: string; program_id: string; activity_id: string; submitted_at: string }[],
) {
  const opened = new Map<string, number>();
  for (const v of visits) {
    const m = /^\/estagio\/([^/]+)\/(\d+)(\/|$)/.exec(v.path);
    if (!m) continue;
    const p = programs.find((x) => x.slug === m[1]);
    const a = p?.activities[Number(m[2]) - 1];
    if (!p || !a) continue;
    const k = `${v.user_id}|${p.id}|${a.id}`, t = new Date(v.created_at).getTime();
    if (!opened.has(k) || t < opened.get(k)!) opened.set(k, t);
  }
  const firstDelivery = new Map<string, number>();
  for (const s of submissions) {
    const k = `${s.user_id}|${s.program_id}|${s.activity_id}`, t = new Date(s.submitted_at).getTime();
    if (!firstDelivery.has(k) || t < firstDelivery.get(k)!) firstDelivery.set(k, t);
  }
  return programs.flatMap((p) => p.activities.map((a, i) => {
    const spans: number[] = [];
    for (const [k, end] of firstDelivery) {
      const [u, pid, aid] = k.split("|");
      if (pid !== p.id || aid !== a.id) continue;
      const start = opened.get(`${u}|${pid}|${aid}`);
      if (start !== undefined && start <= end) spans.push(end - start);
    }
    const avg = spans.length ? spans.reduce((x, y) => x + y, 0) / spans.length : null;
    return { programId: p.id, program: p.title, activity: `${i + 1}. ${a.title}`, students: spans.length, avgMs: avg };
  }));
}

/** "2 d 4 h", "3 h 10 min", "25 min". */
export function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  const min = Math.max(1, Math.round(ms / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${d} d${h ? ` ${h} h` : ""}`;
  if (h) return `${h} h${m ? ` ${m} min` : ""}`;
  return `${m} min`;
}
