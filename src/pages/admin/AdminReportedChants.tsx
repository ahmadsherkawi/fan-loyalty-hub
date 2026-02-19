import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Flag,
  LogOut,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Users,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ReportedChant {
  id: string;
  fan_id: string;
  fan_name: string | null;
  fan_email: string | null;
  content: string;
  image_url: string | null;
  cheers_count: number;
  created_at: string;
  report_count: number;
  latest_report_at: string | null;
  club_id: string;
  club_name: string | null;
}

interface ChantReport {
  id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export default function AdminReportedChants() {
  const navigate = useNavigate();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [chants, setChants] = useState<ReportedChant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedChant, setExpandedChant] = useState<string | null>(null);
  const [reports, setReports] = useState<ChantReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Delete/Dismiss state
  const [actionChant, setActionChant] = useState<ReportedChant | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Check if user is admin
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", profile.id)
        .single();

      if (profileErr || !profileData || (profileData.role as string) !== "admin") {
        toast({
          title: "Access denied",
          description: "You must be a system admin to view this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Fetch reported chants
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_reported_chants", {
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;
      setChants((data || []) as ReportedChant[]);
    } catch (err) {
      const error = err as Error;
      console.error("Fetch error:", err);
      toast({
        title: "Error",
        description: error?.message || "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, navigate, toast]);

  useEffect(() => {
    if (loading || !profile) {
      if (!loading && !profile) {
        navigate("/auth");
      }
      return;
    }

    fetchData();
  }, [loading, profile, navigate, fetchData]);

  const fetchReports = async (chantId: string) => {
    setLoadingReports(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_chant_reports", {
        p_chant_id: chantId,
      });

      if (error) throw error;
      setReports((data || []) as ChantReport[]);
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleExpand = (chantId: string) => {
    if (expandedChant === chantId) {
      setExpandedChant(null);
    } else {
      setExpandedChant(chantId);
      fetchReports(chantId);
    }
  };

  const handleDelete = async () => {
    if (!actionChant || !profile) return;
    setIsSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("admin_delete_reported_chant", {
        p_chant_id: actionChant.id,
        p_admin_id: profile.id,
        p_resolve_reports: true,
      });

      if (error) throw error;

      toast({ title: "Chant deleted", description: "The chant has been removed." });
      setChants((prev) => prev.filter((c) => c.id !== actionChant.id));
      setShowDeleteDialog(false);
      setActionChant(null);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error?.message || "Failed to delete chant.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!actionChant || !profile) return;
    setIsSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("dismiss_chant_reports", {
        p_chant_id: actionChant.id,
        p_admin_id: profile.id,
      });

      if (error) throw error;

      toast({ title: "Reports dismissed", description: "The chant will remain visible." });
      setChants((prev) => prev.filter((c) => c.id !== actionChant.id));
      setShowDismissDialog(false);
      setActionChant(null);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error?.message || "Failed to dismiss reports.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <header className="border-b border-border/40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              System Admin
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground h-9"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-4xl space-y-6">
        {/* Header Card */}
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              <CardTitle>Reported Chants</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review reported chants and take action. You can delete chants that violate
              community guidelines or dismiss false reports.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-amber-500" />
                <span className="text-sm">
                  <strong>{chants.length}</strong> reported chants
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reported Chants List */}
        {chants.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No reported chants!</p>
              <p className="text-xs text-muted-foreground mt-2">
                All caught up. No chants need moderation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chants.map((chant) => (
              <Card
                key={chant.id}
                className="rounded-2xl border-amber-500/30 bg-amber-500/5"
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {chant.fan_name || "Unknown"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({chant.fan_email})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{chant.club_name || "Unknown Club"}</span>
                        </div>
                        <span>{formatRelativeTime(chant.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50 shrink-0">
                      <Flag className="h-3 w-3 mr-1" />
                      {chant.report_count} report{chant.report_count !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="mt-3 p-3 bg-background/50 rounded-xl">
                    <p className="text-sm whitespace-pre-wrap break-words">{chant.content}</p>
                  </div>

                  {/* Image */}
                  {chant.image_url && (
                    <div className="mt-3">
                      <img
                        src={chant.image_url}
                        alt="Chant attachment"
                        className="rounded-xl max-h-48 w-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExpand(chant.id)}
                      className="rounded-full text-xs"
                    >
                      {expandedChant === chant.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Reports
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          View Reports
                        </>
                      )}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActionChant(chant);
                          setShowDismissDialog(true);
                        }}
                        className="rounded-full text-xs"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setActionChant(chant);
                          setShowDeleteDialog(true);
                        }}
                        className="rounded-full text-xs"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Reports */}
                  {expandedChant === chant.id && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        REPORT DETAILS
                      </p>
                      {loadingReports ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : reports.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No reports found.</p>
                      ) : (
                        <div className="space-y-3">
                          {reports.map((report) => (
                            <div
                              key={report.id}
                              className="p-3 bg-background/50 rounded-xl"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {report.reporter_name || "Unknown"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({report.reporter_email})
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(report.created_at)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                "{report.reason}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Chant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the chant and resolve all reports.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Confirmation Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Dismiss Reports?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will dismiss all reports and the chant will remain visible.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDismissDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              {isSubmitting ? "Dismissing..." : "Dismiss Reports"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
