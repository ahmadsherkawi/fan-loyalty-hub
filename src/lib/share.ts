import { useCallback, useEffect, useState, type RefObject } from "react";
import { toBlob } from "html-to-image";

const inIframe = () => { try { return window.self !== window.top; } catch { return true; } };

/** Save a file. Inside a sandboxed preview (iframe) downloads are blocked, so open it in a new tab instead. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  if (inIframe()) {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  const download = useCallback(() => { if (blob) saveBlob(blob, filename); return !!blob; }, [blob, filename]);
  const share = useCallback(async (text?: string): Promise<"shared" | "downloaded" | "cancelled" | "notready"> => {
    if (!blob) return "notready";
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (!inIframe() && nav.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return "shared"; }
      catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
    }
    saveBlob(blob, filename);
    return "downloaded";
  }, [blob, filename]);
  return { ready: !!blob, download, share };
}

/** Calendar file. On iPhone this opens the "Add to Calendar" sheet. */
export function downloadIcs(title: string, start: string, durationMin: number, location: string, url: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = new Date(start), e = new Date(s.getTime() + durationMin * 60000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jamhoor//EN", "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@jamhoor`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(s)}`, `DTEND:${fmt(e)}`,
    `SUMMARY:${title.replace(/[,;]/g, " ")}`, `LOCATION:${location.replace(/[,;]/g, " ")}`, `URL:${url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  saveBlob(new Blob([ics], { type: "text/calendar" }), "jamhoor-watch-party.ics");
}
