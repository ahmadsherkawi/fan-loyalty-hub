import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, QrCode } from "lucide-react";
import confetti from "canvas-confetti";
import { AppShell, BackButton } from "@/components/layout/AppShell";
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
    const colors = [team?.primary_color ?? "#1DB954", team?.secondary_color ?? "#F5B301", "#F5B301"];
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
          <div className="relative mx-auto flex h-40 w-40 rotate-[-8deg] items-center justify-center rounded-full border-4 border-dashed border-accent text-accent">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest">{t("checkin.cap")}</p>
              <p className="scoreboard text-6xl font-bold">#{result.caps}</p>
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-bold">{t("checkin.success")}</h1>
          <p className="mt-2 text-muted-foreground">{party?.fixture ? `${party.fixture.home_team_name} v ${party.fixture.away_team_name}` : ""}{party?.venue ? ` · ${party.venue.name}` : ""}</p>
          <p className="mt-1 text-sm font-semibold text-primary">+1 {t("league.caps")}</p>
          <div className="mt-8 grid gap-3">
            <Button asChild className="rounded-full"><Link to={`/party/${result.watch_party_id}`}>{t("checkin.toParty")}</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/passport">{t("checkin.toPassport")}</Link></Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackButton />
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent"><QrCode className="h-7 w-7" /></span>
        <h1 className="mt-4 text-3xl font-bold">{t("page.checkin")}</h1>
        <p className="mt-1 text-muted-foreground">{t("page.checkinBody")}</p>
        <form className="mt-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            placeholder="A1B2C3" dir="ltr" autoCapitalize="characters" autoComplete="off"
            className="scoreboard h-16 text-center text-3xl uppercase tracking-[0.35em]" aria-label={t("page.checkinCode")} />
          <Button type="submit" className="mt-3 w-full rounded-full" size="lg" disabled={busy || code.length < 4}>
            <CheckCircle2 className="me-1.5 h-5 w-5" />{busy ? t("common.loading") : t("checkin.submit")}
          </Button>
        </form>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("auth.or")}<span className="h-px flex-1 bg-border" /></div>
        {scanning ? (
          <div>
            <div id="qr-reader" className="overflow-hidden rounded-2xl border" />
            <Button variant="ghost" className="mt-2 rounded-full" onClick={() => setScanning(false)}>{t("checkin.stopScan")}</Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full rounded-full" onClick={() => setScanning(true)}><Camera className="me-1.5 h-4 w-4" />{t("checkin.scan")}</Button>
        )}
      </div>
    </AppShell>
  );
}
