import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  LogOut,
  SortAsc,
  Flag,
  Mail,
} from "lucide-react";

interface ClubChant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_email: string | null;
  fan_avatar_url: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  is_edited: boolean;
  is_reported: boolean;
  report_count: number;
  created_at: string;
  updated_at: string;
}

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
}

type SortOption = "newest" | "cheers" | "reported";

export default function ClubChants() {
  const navigate = useNavigate();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [club, setClub] = useState<Club | null>(null);
  const [chants, setChants] = useState<ClubChant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Check if user is a club admin
      const { data: clubData, error: clubErr } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .eq("admin_id", profile.id)
        .single();

      if (clubErr || !clubData) {
        toast({
          title: "Access denied",
          description: "You must be a club admin to view this page.",
          variant: "destructive",
        });
        navigate("/club/dashboard");
        return;
      }

      setClub(clubData as Club);

      // Fetch chants
      await fetchChants(clubData.id);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, navigate, toast]);

  const fetchChants = async (clubId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_club_admin_chants", {
        p_club_id: clubId,
        p_sort: sortBy,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;
      setChants((data || []) as ClubChant[]);
    } catch (err: any) {
      console.error("Chants fetch error:", err);
    }
  };

  useEffect(() => {
    if (loading || !profile) {
      if (!loading && !profile) {
        navigate("/auth");
      }
      return;
    }

    fetchData();
  }, [loading, profile, navigate, fetchData]);

  // Refetch when sort changes
  useEffect(() => {
    if (club) {
      fetchChants(club.id);
    }
  }, [sortBy]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getInitials(name: string | null): string {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Parse content and highlight @mentions
  function renderContentWithMentions(content: string): React.ReactNode {
    const mentionRegex = /@([\w.]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      parts.push(
        <span
          key={match.index}
          className="text-primary font-semibold"
        >
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/club/dashboard")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="rounded-full text-muted-foreground hover:text-foreground h-9"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">
                Club View
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              {club?.name || "Club"} Chants
            </h1>
            <p className="text-white/50 text-sm mt-1">
              View what your fans are chanting about
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-xl border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{chants.length}</p>
              <p className="text-xs text-muted-foreground">Total Chants</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">
                {chants.filter((c) => c.is_reported).length}
              </p>
              <p className="text-xs text-muted-foreground">Reported</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">
                {chants.reduce((sum, c) => sum + c.cheers_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Cheers</p>
            </CardContent>
          </Card>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={sortBy === "newest" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("newest")}
            className="rounded-full text-xs"
          >
            Newest
          </Button>
          <Button
            variant={sortBy === "cheers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("cheers")}
            className="rounded-full text-xs"
          >
            Most Cheered
          </Button>
          <Button
            variant={sortBy === "reported" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("reported")}
            className="rounded-full text-xs"
          >
            Reported
          </Button>
        </div>

        {/* Chants Feed */}
        {chants.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No chants yet.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Your fans haven't posted any chants yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chants.map((chant) => (
              <div
                key={chant.id}
                className={`rounded-2xl bg-card border p-4 ${
                  chant.is_reported
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border/50"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                      {chant.fan_avatar_url ? (
                        <img
                          src={chant.fan_avatar_url}
                          alt={chant.fan_name || "Fan"}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(chant.fan_name)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{chant.fan_name || "Unknown Fan"}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{chant.fan_email || "No email"}</span>
                      </div>
                    </div>
                  </div>
                  {chant.is_reported && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                      <Flag className="h-3 w-3 mr-1" />
                      {chant.report_count} report{chant.report_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="mt-3">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {renderContentWithMentions(chant.content)}
                  </p>
                </div>

                {/* Image */}
                {chant.image_url && (
                  <div className="mt-3">
                    <img
                      src={chant.image_url}
                      alt="Chant attachment"
                      className="rounded-xl max-h-64 w-auto object-cover"
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatRelativeTime(chant.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-3 w-3" />
                    <span>{chant.cheers_count} cheers</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
