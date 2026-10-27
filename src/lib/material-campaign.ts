/** Only activate the campaign with the team's approved, hosted media. */
export const materialCampaign: { videoUrl: string | null; pdfUrl: string | null } = {
  videoUrl: null,
  pdfUrl: null,
};

export function canCaptureMaterial(videoUrl: string | null, pdfUrl: string | null, completed: boolean) {
  return Boolean(videoUrl && pdfUrl && completed);
}