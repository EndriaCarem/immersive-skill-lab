/** Browser-safe rules for the practical room: simulated e-mail, demand video, support library, release. */
import type { Activity } from "./store";
import type { ActivityStaff } from "./professionals";

export type MaterialCategory = "case" | "annex" | "template";
export type ActivityMaterial = {
  id: string;
  title: string;
  docType: string;
  description: string;
  category: MaterialCategory;
  version: string;
  fileName: string;
  fileSize: number;
};
export const MATERIAL_CATEGORIES: Record<MaterialCategory, string> = {
  case: "Documento do caso",
  annex: "Anexo",
  template: "Modelo de entrega",
};
export const MATERIAL_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "jpg", "png"] as const;
export const MATERIAL_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"] as const;
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const POSTER_EXTENSIONS = ["jpg", "png", "webp"] as const;
export const POSTER_MAX_BYTES = 2 * 1024 * 1024;

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const check = (name: string, size: number, allowed: readonly string[], max: number, label: string) => {
  if (!allowed.includes(ext(name))) return `Formato não aceito para ${label}: use ${allowed.join(", ").toUpperCase()}.`;
  if (size <= 0) return "Arquivo vazio.";
  if (size > max) return `${label[0]!.toUpperCase()}${label.slice(1)} deve ter até ${Math.round(max / 1024 / 1024)} MB.`;
  return null;
};
export const materialError = (f: { name: string; size: number }) => check(f.name, f.size, MATERIAL_EXTENSIONS, MATERIAL_MAX_BYTES, "o material");
export const videoError = (f: { name: string; size: number }) => check(f.name, f.size, VIDEO_EXTENSIONS, VIDEO_MAX_BYTES, "o vídeo");
export const posterError = (f: { name: string; size: number }) => check(f.name, f.size, POSTER_EXTENSIONS, POSTER_MAX_BYTES, "a capa");

/** Storage path inside the private activity-media bucket; the first folder is the course (used by RLS). */
export function mediaPath(programId: string, activityId: string, fileName: string, id = crypto.randomUUID()) {
  return `${programId}/${activityId}/${id}.${ext(fileName)}`;
}

/** Splits the library: what is consulted before delivering vs. the templates to fill in. */
export function materialGroups(list: ActivityMaterial[]) {
  return {
    caseDocs: list.filter((m) => m.category !== "template"),
    templates: list.filter((m) => m.category === "template"),
  };
}

/** Real duration only ("4:07", "1:02:03"); null when unknown, so nothing fictitious is shown. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds < 1) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/**
 * The simulated office e-mail. The sender is the activity's supervisor (or the course lead fallback)
 * when one is registered and authorized for display; otherwise the sender written in the course content.
 * Admin overrides for subject/body win over the course content.
 */
export function demandMail(activity: Pick<Activity, "demandFrom" | "demandSubject" | "demandBody" | "demandHtml">, staff?: ActivityStaff) {
  const person = staff?.supervisor ?? null;
  return {
    from: person ? person.fullName : activity.demandFrom,
    fromRole: person ? person.title : "",
    subject: staff?.mail?.subject || activity.demandSubject,
    html: staff?.mail?.html || activity.demandHtml || "",
    text: activity.demandBody,
  };
}

/**
 * Weekly release is PREPARED, NOT ACTIVE. The columns release_at / release_offset_days exist per activity,
 * but no rule reads them until the pedagogical decision (reference date, interval, late recovery) is approved.
 * While disabled, every activity follows the existing sequential progression only.
 */
export const RELEASE_SCHEDULE_ENABLED = false;
export function releaseGate(_cfg: { releaseAt?: string | null; offsetDays?: number | null }, _now = Date.now()) {
  if (!RELEASE_SCHEDULE_ENABLED) return { open: true as const, reason: "progression-only" as const };
  return { open: true as const, reason: "progression-only" as const };
}
