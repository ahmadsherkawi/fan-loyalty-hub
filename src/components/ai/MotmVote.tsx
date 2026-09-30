import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { FeatureHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";

export function MotmVote({ partyId }: { partyId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: votes } = useQuery({
    queryKey: ["motm", partyId],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => (await supabase.from("motm_votes").select("user_id, player_name").eq("watch_party_id", partyId)).data ?? [],
  });
  const mine = votes?.find((v) => v.user_id === user?.id);
  const tally = Object.entries((votes ?? []).reduce<Record<string, number>>((acc, v) => {
    const k = v.player_name.trim(); acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const total = votes?.length ?? 0;

  async function vote(player: string) {
    const p = player.trim();
    if (!user || !p) return;
    if (mine) await supabase.from("motm_votes").update({ player_name: p }).eq("watch_party_id", partyId).eq("user_id", user.id);
    else await supabase.from("motm_votes").insert({ watch_party_id: partyId, user_id: user.id, player_name: p });
    setName("");
    qc.invalidateQueries({ queryKey: ["motm", partyId] });
  }

  if (!user) return null;
  return (
    <div className="card p-4">
      <FeatureHeader icon={<Star />} tone="gold" title={t("motm.title")} sub={mine ? t("motm.yourVote", { name: mine.player_name }) : t("motm.sub")} />
      {tally.length > 0 && (
        <div className="mt-4 space-y-2">
          {tally.slice(0, 5).map(([p, n]) => (
            <button key={p} onClick={() => vote(p)} className="block w-full text-start">
              <div className="flex justify-between text-sm"><span className="font-medium">{p}</span><span className="scoreboard text-muted-foreground">{n}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / total) * 100}%` }} /></div>
            </button>
          ))}
        </div>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); vote(name); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("motm.placeholder")} className="rounded-full" maxLength={40} />
        <Button type="submit" variant="ink" className="shrink-0" disabled={!name.trim()}>{t("motm.vote")}</Button>
      </form>
    </div>
  );
}
