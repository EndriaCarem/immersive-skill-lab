/** Only YouTube and Vimeo are embedded; anything else is shown as a plain link. */
export function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/live/") ? u.pathname.split("/")[2] : null);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function cleanTag(s: string) {
  return s.trim().toLowerCase().replace(/[^\w\-.]+/g, "-").slice(0, 80);
}

export function shareLink(origin: string, slug: string, ref: string, source = "", campaign = "") {
  const u = new URL(`/webinars/${slug}`, origin);
  if (ref) u.searchParams.set("ref", cleanTag(ref));
  if (source) u.searchParams.set("utm_source", cleanTag(source));
  if (campaign) u.searchParams.set("utm_campaign", cleanTag(campaign));
  return u.toString();
}

export function dateBR(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
