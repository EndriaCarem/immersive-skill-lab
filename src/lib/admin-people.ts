import { z } from "zod";

/** Robot assistant: questions per activity, chosen by administration. */
export const ASSISTANT_LIMIT_MIN = 3;
export const ASSISTANT_LIMIT_MAX = 10;
export const assistantLimitSchema = z.number().int().min(ASSISTANT_LIMIT_MIN, "Mínimo de 3 perguntas.").max(ASSISTANT_LIMIT_MAX, "Máximo de 10 perguntas.");

export type PersonRow = Record<string, string>;

const cell = (v: string) => {
  // Neutralize spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};
/** CSV with ";" separator and BOM so Excel (pt-BR) and RD Station open accents correctly. */
export function toCsv(headers: string[], rows: PersonRow[]) {
  return "\uFEFF" + [headers.map(cell).join(";"), ...rows.map((r) => headers.map((h) => cell(r[h] ?? "")).join(";"))].join("\r\n");
}

/** Accounts with no paid or free order are "cadastro sem compra". */
export function withoutPurchase<T extends { id: string }>(people: T[], orders: { user_id: string; status: string }[]) {
  const buyers = new Set(orders.filter((o) => o.status === "paid" || o.status === "free").map((o) => o.user_id));
  return people.filter((p) => !buyers.has(p.id));
}
