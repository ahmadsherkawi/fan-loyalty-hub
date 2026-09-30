import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useParty } from "@/lib/data";

type Result = { checkin_id: string; watch_party_id: string; group_id: string; caps: number };

export default function CheckinPage() {
  const { code: codeParam } = useParams();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState((codeParam ?? "").toUpperCase());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const autoTried = useRef(false);
  const { data: party } = useParty(result?.watch_party_id);

  async function submit(c = code) {
    const clean = c.trim().toUpperCase();
    if (clean.length < 4) return;
    if (!user) { navigate(`/auth?next=/checkin/${clean}`); return; }
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("check_in", { p_code: clean });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("invalid") ? t("checkin.invalid") : error.message.includes("open from") ? t("checkin.window") : t("common.error"));
      return;
    }
    setResult(data as unknown as Result);
    qc.invalidateQueries();
  }

  useEffect(() => {
    if (!loading && codeParam && !autoTried.current) { autoTried.current = true; submit(codeParam); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codeParam, user]);

  useEffect(() => {
    if (!result) return;
    const team = party?.group?.team;
    const colors = [team?.primary_color ?? "#00C566", team?.secondary_color ?? "#FFC53D", "#FFC53D", "#00C566"];
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors });
  }, [result, party?.group?.team]);

  useEffect(() => {
    if (!scanning) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode("qr-reader");
      scanner = s as unknown as typeof scanner;
      s.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (text) => {
        const m = text.match(/checkin\/([A-Za-z0-9]{4,8})/) ?? text.match(/^([A-Za-z0-9]{6})$/);
        if (m) { setScanning(false); setCode(m[1].toUpperCase()); submit(m[1]); }
      }, () => undefined).catch(() => { setScanning(false); setErr(t("checkin.noCamera")); });
    });
    return () => { stopped = true; scanner?.stop().then(() => scanner?.clear()).catch(() => undefined); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  if (result) {
    return (
      <AppShell>
        <div className="mx-auto mt-6 max-w-md text-center">
          <div className="relative mx-auto flex h-44 w-44 rotate-[-8deg] items-center justify-center rounded-full border-4 border-dashed border-gold bg-gold-soft text-gold-ink">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest">{t("checkin.cap")}</p>
              <p className="scoreboard text-6xl font-bold">#{result.caps}</p>
            </div>
          </div>
          <h1 className="mt-7 text-3xl font-extrabold">{t("checkin.success")}</h1>
          <p className="mt-2 text-muted-foreground">{party?.fixture ? `${party.fixture.home_team_name} v ${party.fixture.away_team_name}` : ""}{party?.venue ? ` · ${party.venue.name}` : ""}</p>
          <p className="mt-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand">+1 {t("league.caps")}</p>
          <div className="mt-8 grid gap-3">
            <Button asChild size="lg"><Link to={`/party/${result.watch_party_id}`}>{t("checkin.toParty")}</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/passport">{t("checkin.toPassport")}</Link></Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <PageTitle title={t("page.checkin")} sub={t("page.checkinBody")} />
        {scanning ? (
          <div className="overflow-hidden rounded-3xl bg-foreground p-3">
            <div id="qr-reader" className="overflow-hidden rounded-2xl" />
            <Button variant="ghost" className="mt-2 w-full text-background hover:bg-white/10 hover:text-background" onClick={() => setScanning(false)}>{t("checkin.stopScan")}</Button>
          </div>
        ) : (
          <button onClick={() => setScanning(true)} className="group flex w-full flex-col items-center justify-center gap-3 rounded-3xl bg-stadium px-6 py-10 text-white shadow-lift transition-transform active:scale-[0.99]">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/70">
              <Camera className="h-9 w-9 text-primary" />
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-primary" />
            </span>
            <span className="text-lg font-bold">{t("checkin.scan")}</span>
            <span className="text-xs text-white/60">{t("checkin.scanHint")}</span>
          </button>
        )}
        <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("checkin.orCode")}<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            placeholder="A1B2C3" dir="ltr" autoCapitalize="characters" autoComplete="off"
            className="scoreboard h-14 flex-1 text-center text-2xl font-bold uppercase tracking-[0.3em]" aria-label={t("page.checkinCode")} />
          <Button type="submit" variant="ink" className="h-14 px-6" disabled={busy || code.length < 4}>
            {busy ? t("common.loading") : <><CheckCircle2 />{t("checkin.go")}</>}
          </Button>
        </form>
        {err && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{err}</p>}
      </div>
    </AppShell>
  );
}
