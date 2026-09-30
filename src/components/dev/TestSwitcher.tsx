/**
 * TEMPORARY test switcher — lets you view Jamhoor as the test fan, organiser or venue.
 * To remove before launch: delete this file, its <TestModeBar /> line in AppShell,
 * the `dev-login` edge function and the dev_personas / dev_settings tables.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FlaskConical, LogOut, Megaphone, Store, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const TEST_MODE = true;
const KEY = "jamhoor.testPasscode";

const PERSONAS = [
  { role: "fan", email: "fan@test.jamhoor.app", label: "Fan", name: "Omar", icon: User,
    sees: "Groups, watch parties, reserving, check-in, predictions, passport, rewards, the match wall, venues and table requests." },
  { role: "organiser", email: "organiser@test.jamhoor.app", label: "Organiser", name: "Layla", icon: Megaphone,
    sees: "Owns the 6 supporter groups: creates watch parties (booking requests to venues), members, stats, announcements. Sees counts, never guest names." },
  { role: "venue", email: "venue@test.jamhoor.app", label: "Venue", name: "Floodlight Sports Lounge", icon: Store,
    sees: "Venue dashboard: confirms bookings and sets seats, guest lists, table requests, messages, games shown, menu, rewards, TV check-in screen." },
] as const;

function readCode() { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } }
function saveCode(v: string) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } }

export function TestModeBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(readCode());
  const [busy, setBusy] = useState<string | null>(null);
  if (!TEST_MODE) return null;
  const current = PERSONAS.find((p) => p.email === user?.email);

  async function become(role: string) {
    if (!code) { toast.error("Enter the test passcode first"); return; }
    setBusy(role);
    const { data, error } = await supabase.functions.invoke("dev-login", { body: { role, passcode: code } });
    const d = data as { token_hash?: string; landing?: string; error?: string } | null;
    if (error || !d?.token_hash) { setBusy(null); toast.error(d?.error ?? "Wrong passcode"); return; }
    saveCode(code);
    await supabase.auth.signOut();
    const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: d.token_hash, type: "magiclink" });
    setBusy(null);
    if (vErr) { toast.error(vErr.message); return; }
    qc.clear();
    setOpen(false);
    navigate(d.landing ?? "/", { replace: true });
  }
  async function signOut() {
    await supabase.auth.signOut();
    qc.clear(); setOpen(false);
    navigate("/auth");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 bg-[#5B3DF5] px-3 py-1.5 text-xs font-semibold text-white" dir="ltr">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Test mode · viewing as <b>{current ? `${current.label} (${current.name})` : user ? user.email : "signed out"}</b></span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5">Switch<ChevronDown className="h-3 w-3" /></span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl" dir="ltr">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-ai" />View Jamhoor as…</SheetTitle></SheetHeader>
          <p className="mt-1 text-sm text-muted-foreground">Temporary testing tool. Each option signs you in as a separate test account, so you only see what that user sees.</p>
          <Input className="mt-4" type="password" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Test passcode" />
          <div className="mt-3 grid gap-2">
            {PERSONAS.map((p) => (
              <button key={p.role} onClick={() => become(p.role)} disabled={!!busy}
                className={cn("flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors hover:bg-surface", current?.role === p.role && "border-foreground ring-2 ring-foreground/10")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><p.icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block font-bold">{p.label} <span className="font-medium text-muted-foreground">· {p.name}</span>{current?.role === p.role && <span className="ms-2 rounded bg-brand-soft px-1.5 text-[10px] font-bold text-brand">CURRENT</span>}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.sees}</span>
                  {busy === p.role && <span className="mt-1 block text-xs font-semibold text-brand">Switching…</span>}
                </span>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3 w-full" onClick={signOut}><LogOut />Sign out (use my own account)</Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
