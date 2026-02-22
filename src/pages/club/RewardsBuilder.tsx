// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Gift, Ticket, Wrench, Code, Loader2, Trash2, Edit, HelpCircle, LogOut, Sparkles } from "lucide-react";
import { Reward, RedemptionMethod, LoyaltyProgram } from "@/types/database";

const redemptionLabels: Record<RedemptionMethod, string> = { voucher: "Digital Voucher", manual_fulfillment: "Manual Fulfillment", code_display: "Code Display" };
const redemptionDescriptions: Record<RedemptionMethod, string> = { voucher: "Fan receives a digital voucher code to use at your shop or venue", manual_fulfillment: "You manually fulfill the reward (e.g., physical item, experience)", code_display: "Fan sees a code on screen to show at point of redemption" };
const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = { voucher: <Ticket className="h-4 w-4" />, manual_fulfillment: <Wrench className="h-4 w-4" />, code_display: <Code className="h-4 w-4" /> };

export default function RewardsBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [clubVerified, setClubVerified] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("500");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [redemptionMethod, setRedemptionMethod] = useState<RedemptionMethod>("voucher");
  const [voucherCode, setVoucherCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isPreviewMode) { setProgram({ id: "preview-program", club_id: "preview-club", name: "Demo Rewards", description: null, points_currency_name: "Points", is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setRewards([]); setDataLoading(false); }
    else { if (!loading && !user) { navigate("/auth?role=club_admin"); } else if (!loading && profile?.role !== "club_admin") { navigate("/fan/home"); } else if (!loading && profile) { fetchData(); } }
  }, [user, profile, loading, navigate, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return; setDataLoading(true);
    try {
      const { data: clubs } = await supabase.from("clubs").select("id, status").eq("admin_id", profile.id).limit(1);
      if (!clubs || clubs.length === 0) { navigate("/club/onboarding"); return; }

      // Check if club is verified
      const clubStatus = clubs[0].status;
      const isVerified = clubStatus === "verified" || clubStatus === "official";
      setClubVerified(isVerified);

      if (!isVerified && !isPreviewMode) {
        toast({
          title: "Verification Required",
          description: "Your club must be verified before you can create rewards.",
          variant: "destructive",
        });
        navigate("/club/dashboard?needs_verification=true");
        return;
      }

      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("club_id", clubs[0].id).limit(1);
      if (!programs || programs.length === 0) { navigate("/club/dashboard"); return; }
      setProgram(programs[0] as LoyaltyProgram);
      const { data: rewardsData } = await supabase.from("rewards").select(`*, reward_redemptions(count)`).eq("program_id", programs[0].id).order("created_at", { ascending: false });
      setRewards((rewardsData || []).map((r: { reward_redemptions?: { count: number }[] }) => ({ ...r, quantity_redeemed: r.reward_redemptions?.[0]?.count || 0 })) as Reward[]);
    } catch (error) { console.error("Error fetching data:", error); } finally { setDataLoading(false); }
  };

  const resetForm = () => { setName(""); setDescription(""); setPointsCost("500"); setQuantityLimit(""); setRedemptionMethod("voucher"); setVoucherCode(""); setIsActive(true); setEditingReward(null); };
  const openEditDialog = (reward: Reward) => { setEditingReward(reward); setName(reward.name); setDescription(reward.description || ""); setPointsCost(reward.points_cost.toString()); setQuantityLimit(reward.quantity_limit?.toString() || ""); setRedemptionMethod(reward.redemption_method); setVoucherCode(reward.voucher_code || ""); setIsActive(reward.is_active); setIsDialogOpen(true); };

  const handleSubmit = async () => {
    if (!program) return;
    const cost = parseInt(pointsCost);
    if (isNaN(cost) || cost <= 0) { toast({ title: "Invalid Points Cost", description: "Points cost must be a positive number.", variant: "destructive" }); return; }
    if (isPreviewMode) {
      const newReward: Reward = { id: `preview-${Date.now()}`, program_id: program.id, name, description: description || null, points_cost: cost, quantity_limit: quantityLimit ? parseInt(quantityLimit) : null, quantity_redeemed: 0, redemption_method: redemptionMethod, voucher_code: voucherCode || null, is_active: isActive, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (editingReward) { setRewards(rewards.map((r) => (r.id === editingReward.id ? newReward : r))); toast({ title: "Reward Updated" }); } else { setRewards([newReward, ...rewards]); toast({ title: "Reward Created", description: "Your new reward is ready for fans." }); }
      setIsDialogOpen(false); resetForm(); return;
    }
    setIsSubmitting(true);
    try {
      const rewardData = { program_id: program.id, name, description: description || null, points_cost: cost, quantity_limit: quantityLimit ? parseInt(quantityLimit) : null, redemption_method: redemptionMethod, voucher_code: voucherCode || null, is_active: isActive };
      if (editingReward) { const { error } = await supabase.from("rewards").update(rewardData).eq("id", editingReward.id); if (error) throw error; toast({ title: "Reward Updated", description: "The reward has been updated successfully." }); }
      else { const { error } = await supabase.from("rewards").insert(rewardData); if (error) throw error; toast({ title: "Reward Created", description: "Your new reward is ready for fans." }); }
      setIsDialogOpen(false); resetForm(); fetchData();
    } catch (error: unknown) { const err = error as Error; toast({ title: "Error", description: err.message || "Failed to save reward", variant: "destructive" }); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return;
    if (isPreviewMode) { setRewards(rewards.filter((r) => r.id !== rewardId)); toast({ title: "Reward Deleted" }); return; }
    try { const { error } = await supabase.from("rewards").delete().eq("id", rewardId); if (error) throw error; toast({ title: "Reward Deleted", description: "The reward has been removed." }); fetchData(); }
    catch (error: unknown) { const err = error as Error; toast({ title: "Error", description: err.message || "Failed to delete reward", variant: "destructive" }); }
  };

  const handleSignOut = async () => { if (isPreviewMode) navigate("/preview"); else { await signOut(); navigate("/"); } };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")} className="rounded-full hover:bg-card/60"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
        </div>
      </header>

      <main className="container py-10 max-w-5xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-accent" /><span className="text-xs font-semibold text-accent uppercase tracking-wider">Reward Hub</span></div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Rewards Manager</h1>
              <p className="text-white/50 mt-2 max-w-md">Create rewards fans can redeem with their {program?.points_currency_name || "points"}</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="rounded-full gap-2 shadow-stadium self-start md:self-auto"><Plus className="h-4 w-4" /> Add Reward</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-border/40">
                <DialogHeader><DialogTitle className="font-display">{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle><DialogDescription>Set up a reward that fans can redeem with their {program?.points_currency_name || "points"}</DialogDescription></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label htmlFor="name">Reward Name *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Signed Jersey" className="rounded-xl border-border/40" /></div>
                  <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the reward..." rows={2} className="rounded-xl border-border/40" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="pointsCost">Points Cost *</Label><Input id="pointsCost" type="number" min="1" value={pointsCost} onChange={(e) => setPointsCost(e.target.value)} className="rounded-xl border-border/40" /></div>
                    <div className="space-y-2"><Label htmlFor="quantityLimit" className="flex items-center gap-1">Quantity Limit <HelpCircle className="h-3 w-3 text-muted-foreground" /></Label><Input id="quantityLimit" type="number" min="1" value={quantityLimit} onChange={(e) => setQuantityLimit(e.target.value)} placeholder="Unlimited" className="rounded-xl border-border/40" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">Redemption Method * <HelpCircle className="h-3 w-3 text-muted-foreground" /></Label>
                    <Select value={redemptionMethod} onValueChange={(v) => setRedemptionMethod(v as RedemptionMethod)}><SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(redemptionLabels).map(([value, label]) => (<SelectItem key={value} value={value}><div className="flex items-center gap-2">{redemptionIcons[value as RedemptionMethod]}{label}</div></SelectItem>))}</SelectContent></Select>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-xl">{redemptionDescriptions[redemptionMethod]}</p>
                  </div>
                  {(redemptionMethod === "voucher" || redemptionMethod === "code_display") && (<div className="space-y-2"><Label htmlFor="voucherCode">Voucher/Display Code</Label><Input id="voucherCode" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="e.g., REWARD2024" className="rounded-xl border-border/40" /></div>)}
                  <div className="flex items-center justify-between"><Label htmlFor="isActive">Active</Label><Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} /></div>
                  <Button onClick={handleSubmit} disabled={!name || isSubmitting} className="w-full rounded-xl">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingReward ? "Update Reward" : "Create Reward"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {rewards.length === 0 ? (
          <Card className="rounded-2xl border-border/40 overflow-hidden"><CardContent className="py-16 text-center"><div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><Gift className="h-6 w-6 text-muted-foreground" /></div><h3 className="font-display font-bold text-lg">No Rewards Yet</h3><p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Rewards give fans something to work towards. Create your first reward to incentivize engagement.</p><Button onClick={() => setIsDialogOpen(true)} className="mt-4 rounded-full"><Plus className="h-4 w-4 mr-2" />Create Reward</Button></CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className={`rounded-2xl border-border/40 group hover:border-primary/20 transition-all duration-300 ${reward.is_active ? "" : "opacity-60"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"><Gift className="h-6 w-6 text-accent" /></div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(reward)} className="rounded-full"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive rounded-full" onClick={() => handleDelete(reward.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold tracking-tight mb-1">{reward.name}</h3>
                  {reward.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{reward.description}</p>}
                  <div className="flex items-center gap-2 mb-3"><span className="text-xl font-display font-bold text-primary">{reward.points_cost}</span><span className="text-sm text-muted-foreground">{program?.points_currency_name}</span></div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full text-[10px]">{redemptionLabels[reward.redemption_method]}</Badge>
                    {reward.quantity_limit && <Badge variant="secondary" className="rounded-full text-[10px]">{reward.quantity_redeemed}/{reward.quantity_limit} redeemed</Badge>}
                    {!reward.is_active && <Badge variant="secondary" className="rounded-full text-[10px]">Inactive</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
