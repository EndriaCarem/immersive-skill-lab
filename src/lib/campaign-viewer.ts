export const campaignViewerKey = "empiria:conheca:viewer:v1";

export type CampaignViewer = { name: string; interest: string };

export function parseCampaignViewer(raw: string | null): CampaignViewer | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("name" in value) || !("interest" in value)) return null;
    if (typeof value.name !== "string" || !value.name.trim() || typeof value.interest !== "string") return null;
    return { name: value.name, interest: value.interest };
  } catch {
    return null;
  }
}