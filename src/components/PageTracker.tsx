import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { firstTouch, isTracked } from "@/lib/journey";
import { trackPageVisit } from "@/lib/journey.functions";

const KEY = "empiria.journey.v1";
type Stored = { visitorId: string; source: string; medium: string; campaign: string; landing: string; referrerHost: string };

function stored(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw) as Stored; if (s.visitorId) return s; }
  } catch { /* ignore */ }
  const s = { visitorId: crypto.randomUUID(), ...firstTouch(new URL(location.href), document.referrer, location.hostname) };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}
const device = () => (innerWidth < 640 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop");

/** Records each page the visitor opens, with the first way they arrived on the site. */
export function PageTracker() {
  const path = useLocation({ select: (l) => l.pathname });
  const track = useServerFn(trackPageVisit);
  const last = useRef("");
  useEffect(() => {
    if (!isTracked(path) || last.current === path) return;
    last.current = path;
    const s = stored();
    const t = window.setTimeout(() => {
      void track({ data: { visitorId: s.visitorId, path: path.slice(0, 300), referrerHost: s.referrerHost, source: s.source, medium: s.medium, campaign: s.campaign, landing: s.landing, device: device() } }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
  }, [path, track]);
  return null;
}
