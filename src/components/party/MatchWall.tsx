import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, EyeOff, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/components/notify/notifications";
import { cn } from "@/lib/utils";

type Post = { id: string; kind: "photo" | "message"; body: string | null; photo_path: string | null; created_at: string; mine: boolean; first_name: string; reactions: Record<string, number>; my_reactions: string[] };
const EMOJIS = ["⚽", "🔥", "👏", "😂", "😭"];
const photoUrl = (path: string) => supabase.storage.from("party-photos").getPublicUrl(path).data.publicUrl;

/** Shrink a phone photo to max 1280px JPEG before upload. */
async function downscale(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.82));
}

/**
 * The match-night wall: photos and one-line messages from fans who are checked in at the venue,
 * open only around the match. Reactions instead of comment threads keep it light.
 */
export function MatchWall({ partyId, checkedIn, isHost }: { partyId: string; checkedIn: boolean; isHost: boolean }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: open } = useQuery({
    queryKey: ["wall-open", partyId],
    queryFn: async () => ((await supabase.rpc("party_wall_open", { p_party: partyId })).data ?? false) as boolean,
  });
  const { data: posts } = useQuery({
    queryKey: ["wall", partyId],
    refetchInterval: open ? 8_000 : false,
    queryFn: async () => ((await supabase.rpc("party_wall", { p_party: partyId })).data ?? []) as unknown as Post[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["wall", partyId] });
  const errMsg = (m: string) => m.includes("slow") ? t("wall.slow") : m.includes("limit") ? t("wall.photoLimit") : m.includes("check in") ? t("wall.checkInFirst") : m.includes("closed") ? t("wall.closed") : t("common.error");

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("post_to_party", { p_party: partyId, p_body: text });
    setBusy(false);
    if (error) return toast.error(errMsg(error.message));
    setText(""); refresh();
  }
  async function upload(file?: File) {
    if (!file || !user) return;
    setBusy(true);
    try {
      const blob = await downscale(file);
      const path = `${partyId}/${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("party-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error } = await supabase.rpc("post_to_party", { p_party: partyId, p_body: text || null, p_photo_path: path });
      if (error) throw error;
      setText(""); refresh();
    } catch (e) { toast.error(errMsg((e as Error).message)); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function react(p: Post, emoji: string) {
    if (!user) return;
    if (p.my_reactions.includes(emoji)) await supabase.from("party_post_reactions").delete().eq("post_id", p.id).eq("user_id", user.id).eq("emoji", emoji);
    else await supabase.from("party_post_reactions").insert({ post_id: p.id, user_id: user.id, emoji });
    refresh();
  }
  async function hide(p: Post) { await supabase.rpc("hide_post", { p_post: p.id }); refresh(); }

  return (
    <div className="space-y-3">
      {open && checkedIn ? (
        <div className="card flex items-center gap-2 p-2">
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={busy} aria-label={t("wall.addPhoto")}><Camera /></Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <Input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} placeholder={t("wall.placeholder")} className="border-0 bg-transparent focus-visible:ring-0"
            onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <Button size="icon" onClick={send} disabled={busy || !text.trim()} aria-label={t("pundit.send")}><Send className="rtl:rotate-180" /></Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground"><Lock className="h-4 w-4 shrink-0" />{!open ? t("wall.closed") : t("wall.checkInFirst")}</p>
      )}
      {(posts ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("wall.empty")}</p> : (
        <div className="space-y-3">
          {posts!.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              {p.photo_path && <img src={photoUrl(p.photo_path)} alt="" loading="lazy" className="max-h-[420px] w-full bg-muted object-cover" />}
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm"><span className="font-bold">{p.first_name}</span>{p.body ? <span className="ms-1.5">{p.body}</span> : null}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(p.created_at, lang)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => react(p, e)} className={cn("flex h-7 items-center gap-1 rounded-full px-2 text-xs transition-colors", p.my_reactions.includes(e) ? "bg-brand-soft font-bold text-brand" : "bg-surface hover:bg-muted")}>
                      <span>{e}</span>{p.reactions[e] ? <span className="scoreboard">{p.reactions[e]}</span> : null}
                    </button>
                  ))}
                  {(p.mine || isHost) && <button onClick={() => hide(p)} className="ms-auto text-muted-foreground hover:text-foreground" aria-label={t("wall.hide")}><EyeOff className="h-4 w-4" /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-muted-foreground">{t("wall.rules")}</p>
    </div>
  );
}
