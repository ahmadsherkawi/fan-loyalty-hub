import { useCallback, useEffect, useState, type RefObject } from "react";
import { toBlob } from "html-to-image";

const inIframe = () => { try { return window.self !== window.top; } catch { return true; } };

/** The public address of the site. Links made inside the Lovable editor or a local preview still point fans to the live site. */
export const PUBLIC_ORIGIN = "https://jamhoor.lovable.app";
export function siteUrl(path: string) {
  const o = window.location.origin;
  const base = /lovableproject\.com|id-preview--|preview--|localhost|127\.0\.0\.1/.test(o) ? PUBLIC_ORIGIN : o;
  return base + path;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const inAppBrowser = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent);
/**
 * Where a file download would strand the user on a blank page with no way back:
 * the home-screen app, in-app browsers (WhatsApp, Instagram…), iPhone, and the editor preview.
 */
export const downloadsUnsafe = () => inIframe() || isStandalone() || inAppBrowser() || isIOS();

/** Save a file the normal way. Returns false where that would open a blank page instead (see downloadsUnsafe). */
export function saveBlob(blob: Blob, filename: string) {
  if (downloadsUnsafe()) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

/** Native share sheet when available; otherwise copy the link. Returns what happened. */
export async function shareOrCopy(text: string, url: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share && !inIframe()) {
    try { await nav.share({ text, url }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  return (await copyText(`${text} ${url}`)) ? "copied" : "failed";
}

/**
 * Renders a DOM node to a PNG ahead of time, so the Share tap can open the share sheet immediately
 * (browsers only allow sharing directly inside the tap; rendering first would lose that permission).
 */
export function useShareableImage(ref: RefObject<HTMLElement>, filename: string, deps: unknown[]) {
  const [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    let alive = true;
    setBlob(null);
    const t = setTimeout(async () => {
      if (!ref.current) return;
      try {
        await document.fonts?.ready;
        const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: "#0B1220" };
        await toBlob(ref.current, opts); // first pass warms fonts/images (Safari)
        const b = await toBlob(ref.current, opts);
        if (alive) setBlob(b);
      } catch { /* leave blob null; buttons fall back */ }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Where a download would open a blank page, show the image in the app instead (press and hold to save).
  const [preview, setPreview] = useState<string | null>(null);
  const openPreview = useCallback((b: Blob) => setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); }), []);
  const closePreview = useCallback(() => setPreview((old) => { if (old) URL.revokeObjectURL(old); return null; }), []);
  const download = useCallback(() => {
    if (!blob) return false;
    if (!saveBlob(blob, filename)) openPreview(blob);
    return true;
  }, [blob, filename, openPreview]);
  const share = useCallback(async (text?: string): Promise<"shared" | "downloaded" | "previewed" | "cancelled" | "notready"> => {
    if (!blob) return "notready";
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (!inIframe() && nav.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return "shared"; }
      catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
    }
    if (saveBlob(blob, filename)) return "downloaded";
    openPreview(blob);
    return "previewed";
  }, [blob, filename, openPreview]);
  return { ready: !!blob, download, share, preview, closePreview };
}

const FUNCTIONS = "https://ohjhzmqcbprcybjlsusp.supabase.co/functions/v1";

/**
 * Add a match night to the calendar. Where a downloaded file would open a blank page (iPhone, the
 * home-screen app, WhatsApp's browser), open a real calendar link instead: iPhone shows "Add to Calendar".
 */
export function addToCalendar(partyId: string, title: string, start: string, durationMin: number, location: string, url: string) {
  if (downloadsUnsafe()) {
    const link = `${FUNCTIONS}/party-calendar?party=${encodeURIComponent(partyId)}`;
    if (inIframe()) window.open(link, "_blank", "noopener"); else window.location.href = link;
    return;
  }
  downloadIcs(title, start, durationMin, location, url);
}

/** Calendar file download (desktop and Android). */
function downloadIcs(title: string, start: string, durationMin: number, location: string, url: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = new Date(start), e = new Date(s.getTime() + durationMin * 60000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jamhoor//EN", "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@jamhoor`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(s)}`, `DTEND:${fmt(e)}`,
    `SUMMARY:${title.replace(/[,;]/g, " ")}`, `LOCATION:${location.replace(/[,;]/g, " ")}`, `URL:${url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  saveBlob(blob, "jamhoor-watch-party.ics");
}
