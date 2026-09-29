import { type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Moon, QrCode, Sun, Target, User, Users, BookOpen } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import type { TKey } from "@/i18n/en";

const NAV: { to: string; key: TKey; icon: typeof Home }[] = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/groups", key: "nav.groups", icon: Users },
  { to: "/predict", key: "nav.predict", icon: Target },
  { to: "/passport", key: "nav.passport", icon: BookOpen },
  { to: "/profile", key: "nav.profile", icon: User },
];

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-full border bg-card p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      <button onClick={() => setLang("en")} className={cn("rounded-full px-2.5 py-1", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>EN</button>
      <button onClick={() => setLang("ar")} className={cn("rounded-full px-2.5 py-1 font-arabic", lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>ع</button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("theme.toggle")} className="rounded-full">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function Header() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center gap-2 sm:gap-4">
        <Link to="/" aria-label="Jamhoor" className="min-w-0 shrink"><Wordmark /></Link>
        {user && (
          <nav className="ms-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, key }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {t(key)}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user && (
            <Button asChild size="sm" variant="outline" className="hidden rounded-full md:inline-flex">
              <Link to="/checkin"><QrCode className="me-1.5 h-4 w-4" />{t("nav.checkin")}</Link>
            </Button>
          )}
          <ThemeToggle />
          <LanguageToggle />
          {!user && <Button asChild size="sm" className="rounded-full"><Link to="/auth">{t("nav.signIn")}</Link></Button>}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {NAV.map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
            <Icon className="h-5 w-5" />
            {t(key)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function CheckinFab() {
  const { t } = useI18n();
  return (
    <Link to="/checkin" className="fixed bottom-20 end-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/30 md:hidden">
      <QrCode className="h-4 w-4" />{t("nav.checkin")}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-floodlight">
      <Header />
      <main className={cn("container py-6", user && "pb-safe")}>{children}</main>
      {user && <><CheckinFab /><BottomNav /></>}
    </div>
  );
}

export function BackButton() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" className="-ms-2 mb-3 rounded-full" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
      <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />{t("nav.back")}
    </Button>
  );
}
