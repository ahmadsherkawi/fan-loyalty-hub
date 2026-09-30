import { type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Home, QrCode, Tv, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Initials } from "@/components/common/bits";
import { NotificationBell } from "@/components/notify/notifications";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { TKey } from "@/i18n/en";

type NavItem = { to: string; key: TKey; icon: typeof Home };
const LEFT: NavItem[] = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/groups", key: "nav.groups", icon: Users },
];
const RIGHT: NavItem[] = [
  { to: "/predict", key: "nav.predict", icon: Tv },
  { to: "/passport", key: "nav.passport", icon: BookOpen },
];
const ALL = [...LEFT, { to: "/checkin", key: "nav.checkin" as TKey, icon: QrCode }, ...RIGHT];

/** One tap switches to the other language; the label shows where you'll go. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const other = lang === "ar" ? "en" : "ar";
  return (
    <button
      onClick={() => setLang(other)}
      className={cn("inline-flex h-9 min-w-9 items-center justify-center rounded-full border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted", other === "ar" && "font-arabic", className)}
      aria-label={other === "ar" ? "العربية" : "English"}
    >
      {other === "ar" ? "عربي" : "EN"}
    </button>
  );
}

export function Header() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-14 items-center gap-3 md:h-16">
        <Link to="/" aria-label="Jamhoor" className="min-w-0 shrink"><Wordmark /></Link>
        {user && (
          <nav className="ms-6 hidden items-center gap-1 md:flex">
            {ALL.map(({ to, key }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("rounded-full px-3.5 py-2 text-sm font-semibold transition-colors", isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {t(key)}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <LanguageToggle />
          {user && <NotificationBell />}
          {user ? (
            <Link to="/profile" aria-label={t("nav.profile")} className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-border">
              <Initials name={profile?.full_name || user.email} className="h-9 w-9 bg-foreground text-background ring-0" />
            </Link>
          ) : (
            <Button asChild size="sm" variant="ink"><Link to="/auth">{t("nav.signIn")}</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Tab({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => cn("group flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>
      {({ isActive }) => (
        <>
          <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-brand-soft text-brand")}>
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 items-end">
        {LEFT.map((n) => <Tab key={n.to} to={n.to} label={t(n.key)} icon={n.icon} />)}
        <NavLink to="/checkin" className="flex flex-col items-center gap-1 pb-2 text-[11px] font-semibold text-foreground" aria-label={t("nav.checkin")}>
          <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-background">
            <QrCode className="h-6 w-6" strokeWidth={2.4} />
          </span>
          {t("nav.checkin")}
        </NavLink>
        {RIGHT.map((n) => <Tab key={n.to} to={n.to} label={t(n.key)} icon={n.icon} />)}
      </div>
    </nav>
  );
}

export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className={cn("container py-5 md:py-8", !wide && "max-w-3xl", user && "pb-safe")}>{children}</main>
      {user && <BottomNav />}
    </div>
  );
}

export function BackButton({ label }: { label?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <button className="-ms-1 mb-3 inline-flex items-center gap-1.5 rounded-full py-1 pe-3 ps-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-card"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></span>
      {label ?? t("nav.back")}
    </button>
  );
}

/** Page title block: optional eyebrow, a strong title, optional one-line subtitle. */
export function PageTitle({ eyebrow, title, sub, action }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] font-extrabold leading-[1.1] md:text-4xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
