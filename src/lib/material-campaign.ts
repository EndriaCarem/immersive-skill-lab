import presentationVideo from "@/assets/empiria-apresentacao-atualizada.mp4.asset.json";

/** Only activate the campaign with the team's approved, hosted media. */
export const materialCampaign: { videoUrl: string | null; pdfUrl: string | null } = {
  videoUrl: presentationVideo.url,
  pdfUrl: null,
};

export function canCaptureMaterial(videoUrl: string | null, pdfUrl: string | null, completed: boolean) {
  return Boolean(videoUrl && pdfUrl && completed);
}