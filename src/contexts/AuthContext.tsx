import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useI18n } from "@/i18n/I18nContext";

export type Profile = Tables<"profiles">;

interface AuthValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True once the signed-in user's profile has been fetched (it may still be null if the row is missing). */
  profileReady: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { lang, setLang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const user = session?.user ?? null;

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    setProfile(data ?? null);
    setLoadedUid(uid);
    if (data?.preferred_language === "en" || data?.preferred_language === "ar") setLang(data.preferred_language);
  }, [setLang]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else setProfile(null);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Persist language choice to the profile when signed in
  useEffect(() => {
    if (user && profile && profile.preferred_language !== lang) {
      supabase.from("profiles").update({ preferred_language: lang }).eq("user_id", user.id).then(() => {
        setProfile((p) => (p ? { ...p, preferred_language: lang } : p));
      });
    }
  }, [lang, user, profile]);

  const refreshProfile = useCallback(async () => { if (user) await loadProfile(user.id); }, [user, loadProfile]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); setProfile(null); }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileReady: !user || loadedUid === user.id, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
