export type Hours = Record<string, [string, string]>;
export const DAYS: [string, string][] = [["1", "Lundi"], ["2", "Mardi"], ["3", "Mercredi"], ["4", "Jeudi"], ["5", "Vendredi"], ["6", "Samedi"], ["7", "Dimanche"]];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Bénin et Niger : UTC+1. Les autres pays de la liste : UTC. */
const OFFSET: Record<string, number> = { bj: 1, ne: 1 };

/** Ne garde que des horaires valides (jour 1 à 7, début avant fin). */
export function cleanHours(input: unknown): Hours {
  const out: Hours = {};
  if (!input || typeof input !== "object") return out;
  for (const [d] of DAYS) {
    const v = (input as Record<string, unknown>)[d];
    if (Array.isArray(v) && typeof v[0] === "string" && typeof v[1] === "string" && TIME.test(v[0]) && TIME.test(v[1]) && v[0] < v[1]) out[d] = [v[0], v[1]];
  }
  return out;
}

const fmt = (t: string) => { const [h, m] = t.split(":"); return `${parseInt(h, 10)}h${m === "00" ? "" : m}`; };
const mins = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);

export type OpenStatus = { state: "open" | "closed" | "none"; text: string };

export function openStatus(hours: unknown, open247: boolean | null | undefined, country: string, now = new Date()): OpenStatus {
  if (open247) return { state: "open", text: "Ouvert 24 h/24" };
  const h = cleanHours(hours);
  if (!Object.keys(h).length) return { state: "none", text: "" };
  const local = new Date(now.getTime() + (OFFSET[country] ?? 0) * 3600e3);
  const dow = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
  const cur = local.getUTCHours() * 60 + local.getUTCMinutes();
  const today = h[String(dow)];
  if (today && cur >= mins(today[0]) && cur < mins(today[1])) return { state: "open", text: `Ouvert · jusqu’à ${fmt(today[1])}` };
  if (today && cur < mins(today[0])) return { state: "closed", text: `Fermé · ouvre à ${fmt(today[0])}` };
  for (let i = 1; i <= 7; i++) {
    const d = ((dow - 1 + i) % 7) + 1;
    const n = h[String(d)];
    if (n) return { state: "closed", text: `Fermé · ouvre ${i === 1 ? "demain" : DAYS[d - 1][1].toLowerCase()} à ${fmt(n[0])}` };
  }
  return { state: "closed", text: "Fermé" };
}

export const timeLabel = fmt;
