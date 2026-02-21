import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { VenueMapPreview } from "@/components/ui/VenueMapPreview";
import { PollQuizBuilder, type InAppConfig } from "@/components/ui/PollQuizBuilder";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Zap,
  QrCode,
  MapPin,
  Smartphone,
  FileCheck,
  Loader2,
  Trash2,
  Edit,
  HelpCircle,
  Calendar,
  LogOut,
  Sparkles,
  BarChart3,
} from "lucide-react";
import type { Activity, ActivityFrequency, VerificationMethod, LoyaltyProgram } from "@/types/database";

const frequencyLabels: Record<ActivityFrequency, string> = {
  once_ever: "Once Ever",
  once_per_match: "Once Per Match",
  once_per_day: "Once Per Day",
  unlimited: "Unlimited",
};

const frequencyDescriptions: Record<ActivityFrequency, string> = {
  once_ever: "Fan can only complete this activity one time ever",
  once_per_match: "Fan can complete this once per match day",
  once_per_day: "Fan can complete this once per calendar day",
  unlimited: "No limit on how often fans can complete this",
};

const verificationLabels: Record<VerificationMethod, string> = {
  qr_scan: "QR Code Scan",
  location_checkin: "Location Check-in",
  in_app_completion: "In-App Completion",
  manual_proof: "Manual Proof Submission",
};

const verificationDescriptions: Record<VerificationMethod, string> = {
  qr_scan: "Fans scan a unique QR code you display at events or locations",
  location_checkin: "Fans check in using GPS at your stadium or venue",
  in_app_completion: "Fans complete polls, quizzes, or other in-app actions",
  manual_proof: "Fans submit evidence (photo, text) that you review and approve",
};

const verificationIcons: Record<VerificationMethod, React.ReactNode> = {
  qr_scan: <QrCode className="h-4 w-4" />,
  location_checkin: <MapPin className="h-4 w-4" />,
  in_app_completion: <Smartphone className="h-4 w-4" />,
  manual_proof: <FileCheck className="h-4 w-4" />,
};

export default function ActivityBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [clubVerified, setClubVerified] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [qrActivity, setQrActivity] = useState<Activity | null>(null);
  const [pollResultsActivity, setPollResultsActivity] = useState<Activity | null>(null);
  const [pollResults, setPollResults] = useState<{ option: string; count: number; percentage: number }[]>([]);
  const [loadingPollResults, setLoadingPollResults] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState("100");
  const [frequency, setFrequency] = useState<ActivityFrequency>("once_per_day");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("qr_scan");
  const [isActive, setIsActive] = useState(true);

  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [locationRadius, setLocationRadius] = useState("500");
  const [isLocating, setIsLocating] = useState(false);

  const [inAppConfig, setInAppConfig] = useState<InAppConfig | null>(null);

  const [hasTimeWindow, setHasTimeWindow] = useState(false);
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");

  useEffect(() => {
    if (isPreviewMode) {
      setProgram({
        id: "preview-program",
        club_id: "preview-club",
        name: "Demo Rewards",
        description: null,
        points_currency_name: "Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setActivities([]);
      setDataLoading(false);
    } else {
      if (!loading && !user) {
        navigate("/auth?role=club_admin");
      } else if (!loading && profile?.role !== "club_admin") {
        navigate("/fan/home");
      } else if (!loading && profile) {
        fetchData();
      }
    }
  }, [user, profile, loading, navigate, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("id, status").eq("admin_id", profile.id).limit(1);
      if (!clubs || clubs.length === 0) {
        navigate("/club/onboarding");
        return;
      }

      // Check if club is verified
      const clubStatus = clubs[0].status;
      const isVerified = clubStatus === "verified" || clubStatus === "official";
      setClubVerified(isVerified);

      if (!isVerified && !isPreviewMode) {
        toast({
          title: "Verification Required",
          description: "Your club must be verified before you can create activities.",
          variant: "destructive",
        });
        navigate("/club/dashboard?needs_verification=true");
        return;
      }

      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubs[0].id)
        .limit(1);
      if (!programs || programs.length === 0) {
        navigate("/club/dashboard");
        return;
      }
      setProgram(programs[0] as LoyaltyProgram);

      const { data: activitiesData } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", programs[0].id)
        .order("created_at", { ascending: false });
      setActivities((activitiesData || []) as unknown as Activity[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPointsAwarded("100");
    setFrequency("once_per_day");
    setVerificationMethod("qr_scan");
    setIsActive(true);
    setEditingActivity(null);
    setLocationLat("");
    setLocationLng("");
    setLocationRadius("500");
    setInAppConfig(null);
    setHasTimeWindow(false);
    setTimeWindowStart("");
    setTimeWindowEnd("");
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setTitle(activity.name);
    setDescription(activity.description || "");
    setPointsAwarded(activity.points_awarded.toString());
    setFrequency(activity.frequency);
    setVerificationMethod(activity.verification_method);
    setIsActive(activity.is_active);
    setLocationLat(activity.location_lat?.toString() || "");
    setLocationLng(activity.location_lng?.toString() || "");
    setLocationRadius(activity.location_radius_meters?.toString() || "500");
    setInAppConfig(activity.in_app_config || null);

    const hasWindow = !!(activity.time_window_start || activity.time_window_end);
    setHasTimeWindow(hasWindow);
    setTimeWindowStart(
      activity.time_window_start ? new Date(activity.time_window_start).toISOString().slice(0, 16) : "",
    );
    setTimeWindowEnd(activity.time_window_end ? new Date(activity.time_window_end).toISOString().slice(0, 16) : "");

    setIsDialogOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude.toFixed(6));
        setLocationLng(position.coords.longitude.toFixed(6));
        setIsLocating(false);
        toast({ title: "Location Set", description: "Your current location has been set as the venue." });
      },
      (error) => {
        setIsLocating(false);
        toast({
          title: "Location Error",
          description: error.message || "Failed to get your location.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async () => {
    if (!program) return;

    const points = parseInt(pointsAwarded);
    if (isNaN(points) || points <= 0) {
      toast({ title: "Invalid Points", description: "Points must be a positive number.", variant: "destructive" });
      return;
    }

    if (verificationMethod === "location_checkin") {
      const lat = parseFloat(locationLat);
      const lng = parseFloat(locationLng);
      const radius = parseInt(locationRadius);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        toast({ title: "Invalid Latitude", description: "Latitude must be between -90 and 90.", variant: "destructive" });
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        toast({ title: "Invalid Longitude", description: "Longitude must be between -180 and 180.", variant: "destructive" });
        return;
      }
      if (isNaN(radius) || radius < 50 || radius > 5000) {
        toast({ title: "Invalid Radius", description: "Radius must be between 50 and 5000 meters.", variant: "destructive" });
        return;
      }
    }

    if (verificationMethod === "in_app_completion") {
      if (!inAppConfig || !inAppConfig.question.trim()) {
        toast({ title: "Question Required", description: "Please enter a question for the poll or quiz.", variant: "destructive" });
        return;
      }
      const filledOptions = inAppConfig.options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        toast({ title: "Options Required", description: "Please provide at least 2 answer options.", variant: "destructive" });
        return;
      }
      if (inAppConfig.type === "quiz" && !inAppConfig.options.some((o) => o.isCorrect)) {
        toast({ title: "Correct Answer Required", description: "Please select the correct answer for the quiz.", variant: "destructive" });
        return;
      }
    }

    if (hasTimeWindow) {
      if (!timeWindowStart || !timeWindowEnd) {
        toast({ title: "Time Window Required", description: "Please set both start and end times for the time window.", variant: "destructive" });
        return;
      }
      if (new Date(timeWindowStart) >= new Date(timeWindowEnd)) {
        toast({ title: "Invalid Time Window", description: "End time must be after start time.", variant: "destructive" });
        return;
      }
    }

    const parsedLat = verificationMethod === "location_checkin" ? parseFloat(locationLat) : null;
    const parsedLng = verificationMethod === "location_checkin" ? parseFloat(locationLng) : null;
    const parsedRadius = verificationMethod === "location_checkin" ? parseInt(locationRadius) : 100;

    const parsedInAppConfig =
      verificationMethod === "in_app_completion" && inAppConfig
        ? { ...inAppConfig, options: inAppConfig.options.filter((o) => o.text.trim()) }
        : null;

    const parsedTimeWindowStart = hasTimeWindow && timeWindowStart ? new Date(timeWindowStart).toISOString() : null;
    const parsedTimeWindowEnd = hasTimeWindow && timeWindowEnd ? new Date(timeWindowEnd).toISOString() : null;

    if (isPreviewMode) {
      const newActivity: Activity = {
        id: `preview-${Date.now()}`,
        program_id: program.id,
        name: title,
        description: description || null,
        points_awarded: points,
        frequency,
        verification_method: verificationMethod,
        qr_code_data: verificationMethod === "qr_scan" ? "preview-qr" : null,
        location_lat: parsedLat,
        location_lng: parsedLng,
        location_radius_meters: parsedRadius,
        time_window_start: parsedTimeWindowStart,
        time_window_end: parsedTimeWindowEnd,
        in_app_config: parsedInAppConfig,
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (editingActivity) {
        setActivities(activities.map((a) => (a.id === editingActivity.id ? newActivity : a)));
        toast({ title: "Activity Updated" });
      } else {
        setActivities([newActivity, ...activities]);
        toast({ title: "Activity Created", description: "Your new activity is ready for fans." });
      }
      setIsDialogOpen(false);
      resetForm();
      return;
    }

    setIsSubmitting(true);

    try {
      let qrCodeData: string | null = null;
      if (verificationMethod === "qr_scan") {
        if (editingActivity && editingActivity.verification_method === "qr_scan" && editingActivity.qr_code_data) {
          qrCodeData = editingActivity.qr_code_data;
        } else {
          const generator =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID.bind(crypto)
              : () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          qrCodeData = generator();
        }
      } else {
        qrCodeData = null;
      }

      const activityData = {
        program_id: program.id,
        name: title,
        description: description || null,
        points_awarded: points,
        frequency,
        verification_method: verificationMethod,
        is_active: isActive,
        qr_code_data: qrCodeData,
        location_lat: parsedLat,
        location_lng: parsedLng,
        location_radius_meters: parsedRadius,
        time_window_start: parsedTimeWindowStart,
        time_window_end: parsedTimeWindowEnd,
        in_app_config: parsedInAppConfig as unknown as Json,
      };

      if (editingActivity) {
        const { error } = await supabase.from("activities").update(activityData).eq("id", editingActivity.id);
        if (error) throw error;
        toast({ title: "Activity Updated", description: "The activity has been updated successfully." });
      } else {
        const { error } = await supabase.from("activities").insert(activityData);
        if (error) throw error;
        toast({ title: "Activity Created", description: "Your new activity is ready for fans." });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Error", description: err.message || "Failed to save activity", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    if (isPreviewMode) {
      setActivities(activities.filter((a) => a.id !== activityId));
      toast({ title: "Activity Deleted" });
      return;
    }
    try {
      const { error } = await supabase.from("activities").delete().eq("id", activityId);
      if (error) throw error;
      toast({ title: "Activity Deleted", description: "The activity has been removed." });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Error", description: err.message || "Failed to delete activity", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    if (isPreviewMode) navigate("/preview");
    else {
      await signOut();
      navigate("/");
    }
  };

  const handleViewPollResults = async (activity: Activity) => {
    setPollResultsActivity(activity);
    setLoadingPollResults(true);
    
    try {
      // Fetch all completions for this activity with metadata
      const { data: completions, error } = await supabase
        .from("activity_completions")
        .select("metadata")
        .eq("activity_id", activity.id);
      
      if (error) throw error;
      
      // Get the poll config
      const config = activity.in_app_config as InAppConfig | null;
      if (!config || !config.options) {
        setPollResults([]);
        return;
      }
      
      // Count responses for each option
      const optionCounts: { [key: string]: number } = {};
      config.options.forEach(opt => {
        optionCounts[opt.id] = 0;
      });
      
      let totalResponses = 0;
      completions?.forEach((c: { metadata?: unknown }) => {
        const meta = c.metadata as { selectedOption?: string } | null;
        const selectedOption = meta?.selectedOption;
        if (selectedOption && Object.prototype.hasOwnProperty.call(optionCounts, selectedOption)) {
          optionCounts[selectedOption]++;
          totalResponses++;
        }
      });
      
      // Calculate percentages and format results
      const results = config.options.map(opt => ({
        option: opt.text,
        count: optionCounts[opt.id] || 0,
        percentage: totalResponses > 0 ? Math.round((optionCounts[opt.id] / totalResponses) * 100) : 0
      }));
      
      setPollResults(results);
    } catch (error) {
      console.error("Error loading poll results:", error);
      setPollResults([]);
    } finally {
      setLoadingPollResults(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")} className="rounded-full hover:bg-card/60">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
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
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Activity Hub</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Activities Manager</h1>
              <p className="text-white/50 mt-2 max-w-md">Create activities for fans to earn {program?.points_currency_name || "points"}</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2 shadow-stadium self-start md:self-auto">
                  <Plus className="h-4 w-4" /> Add Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-border/40">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingActivity ? "Edit Activity" : "Create New Activity"}</DialogTitle>
                  <DialogDescription>Define how fans earn {program?.points_currency_name || "points"} for this activity</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Activity Name *</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Attend Home Match" className="rounded-xl border-border/40" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what fans need to do..." rows={2} className="rounded-xl border-border/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">Points Awarded *</Label>
                      <Input id="points" type="number" min="1" value={pointsAwarded} onChange={(e) => setPointsAwarded(e.target.value)} className="rounded-xl border-border/40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">Frequency <HelpCircle className="h-3 w-3 text-muted-foreground" /></Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as ActivityFrequency)}>
                        <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(frequencyLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{frequencyDescriptions[frequency]}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">Verification Method * <HelpCircle className="h-3 w-3 text-muted-foreground" /></Label>
                    <Select value={verificationMethod} onValueChange={(v) => setVerificationMethod(v as VerificationMethod)}>
                      <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(verificationLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">{verificationIcons[value as VerificationMethod]}{label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-xl">{verificationDescriptions[verificationMethod]}</p>
                  </div>
                  {verificationMethod === "location_checkin" && (
                    <div className="space-y-3 p-4 border border-primary/20 rounded-2xl bg-primary/5">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-primary"><MapPin className="h-4 w-4" />Venue Location</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={isLocating} className="rounded-full">
                          {isLocating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}Use My Location
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label htmlFor="locationLat" className="text-xs">Latitude *</Label><Input id="locationLat" type="number" step="any" value={locationLat} onChange={(e) => setLocationLat(e.target.value)} placeholder="e.g., 53.4631" className="rounded-xl border-border/40" /></div>
                        <div className="space-y-1"><Label htmlFor="locationLng" className="text-xs">Longitude *</Label><Input id="locationLng" type="number" step="any" value={locationLng} onChange={(e) => setLocationLng(e.target.value)} placeholder="e.g., -2.2913" className="rounded-xl border-border/40" /></div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="locationRadius" className="text-xs">Check-in Radius (meters) *</Label>
                        <Input id="locationRadius" type="number" min="50" max="5000" value={locationRadius} onChange={(e) => setLocationRadius(e.target.value)} className="rounded-xl border-border/40" />
                        <p className="text-xs text-muted-foreground">Fans must be within this distance to check in (50-5000m)</p>
                      </div>
                      {locationLat && locationLng && !isNaN(parseFloat(locationLat)) && !isNaN(parseFloat(locationLng)) && (
                        <div className="space-y-2"><Label className="text-xs">Map Preview</Label><VenueMapPreview lat={parseFloat(locationLat)} lng={parseFloat(locationLng)} radiusMeters={parseInt(locationRadius) || 500} /><p className="text-xs text-muted-foreground text-center">The green circle shows the check-in area</p></div>
                      )}
                    </div>
                  )}
                  {verificationMethod === "in_app_completion" && <PollQuizBuilder value={inAppConfig} onChange={setInAppConfig} />}
                  <div className="space-y-3 p-4 border border-border/40 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hasTimeWindow" className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Time-Based Availability</Label>
                      <Switch id="hasTimeWindow" checked={hasTimeWindow} onCheckedChange={setHasTimeWindow} />
                    </div>
                    <p className="text-xs text-muted-foreground">Restrict this activity to specific dates and times (e.g., match days only)</p>
                    {hasTimeWindow && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label htmlFor="timeWindowStart" className="text-xs">Available From *</Label><Input id="timeWindowStart" type="datetime-local" value={timeWindowStart} onChange={(e) => setTimeWindowStart(e.target.value)} className="text-sm rounded-xl border-border/40" /></div>
                          <div className="space-y-1"><Label htmlFor="timeWindowEnd" className="text-xs">Available Until *</Label><Input id="timeWindowEnd" type="datetime-local" value={timeWindowEnd} onChange={(e) => setTimeWindowEnd(e.target.value)} className="text-sm rounded-xl border-border/40" /></div>
                        </div>
                        {timeWindowStart && timeWindowEnd && new Date(timeWindowStart) < new Date(timeWindowEnd) && (
                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-xl">⏰ Activity will be available from <span className="font-medium">{new Date(timeWindowStart).toLocaleString()}</span> to <span className="font-medium">{new Date(timeWindowEnd).toLocaleString()}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between"><Label htmlFor="isActive">Active</Label><Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} /></div>
                  <Button onClick={handleSubmit} disabled={!title || isSubmitting} className="w-full rounded-xl">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingActivity ? "Update Activity" : "Create Activity"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ACTIVITIES LIST */}
        {activities.length === 0 ? (
          <Card className="rounded-2xl border-border/40 overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><Zap className="h-6 w-6 text-muted-foreground" /></div>
              <h3 className="font-display font-bold text-lg">No Activities Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Activities are how fans earn {program?.points_currency_name || "points"}. Create your first activity to start engaging fans.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="mt-4 rounded-full"><Plus className="h-4 w-4 mr-2" />Create Activity</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Card key={activity.id} className={`rounded-2xl border-border/40 group hover:border-primary/20 transition-all duration-300 ${activity.is_active ? "" : "opacity-60"}`}>
                <CardContent className="py-5 px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">{verificationIcons[activity.verification_method]}</div>
                      <div>
                        <h3 className="font-display font-semibold tracking-tight">{activity.name}</h3>
                        {activity.description && <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 text-[10px]">+{activity.points_awarded} {program?.points_currency_name}</Badge>
                          <Badge variant="outline" className="rounded-full text-[10px]">{frequencyLabels[activity.frequency]}</Badge>
                          <Badge variant="outline" className="rounded-full text-[10px]">{verificationLabels[activity.verification_method]}</Badge>
                          {!activity.is_active && <Badge variant="secondary" className="rounded-full text-[10px]">Inactive</Badge>}
                          {(activity.time_window_start || activity.time_window_end) && (
                            <Badge variant="outline" className="gap-1 rounded-full text-[10px]"><Calendar className="h-3 w-3" />Timed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activity.verification_method === "qr_scan" && activity.qr_code_data && (
                        <Button variant="outline" size="sm" onClick={() => setQrActivity(activity)} className="gap-1 rounded-full border-border/40"><QrCode className="h-4 w-4" />View QR</Button>
                      )}
                      {activity.verification_method === "in_app_completion" && activity.in_app_config && (
                        <Button variant="outline" size="sm" onClick={() => handleViewPollResults(activity)} className="gap-1 rounded-full border-border/40"><BarChart3 className="h-4 w-4" />Results</Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(activity)} className="rounded-full"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive rounded-full" onClick={() => handleDelete(activity.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Display Modal */}
        {qrActivity && (
          <Dialog open={!!qrActivity} onOpenChange={() => setQrActivity(null)}>
            <DialogContent className="rounded-2xl border-border/40">
              <DialogHeader><DialogTitle className="font-display">QR Code: {qrActivity.name}</DialogTitle></DialogHeader>
              <QRCodeDisplay isOpen={true} onClose={() => setQrActivity(null)} activityName={qrActivity.name} qrCodeData={qrActivity.qr_code_data || ""} pointsAwarded={qrActivity.points_awarded} pointsCurrency={program?.points_currency_name || "Points"} />
            </DialogContent>
          </Dialog>
        )}

        {/* Poll Results Modal */}
        {pollResultsActivity && (
          <Dialog open={!!pollResultsActivity} onOpenChange={() => { setPollResultsActivity(null); setPollResults([]); }}>
            <DialogContent className="rounded-2xl border-border/40 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Poll Results: {pollResultsActivity.name}
                </DialogTitle>
                <DialogDescription>
                  {pollResultsActivity.in_app_config?.question}
                </DialogDescription>
              </DialogHeader>
              
              {loadingPollResults ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pollResults.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No responses yet</p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {pollResults.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{result.option}</span>
                        <span className="text-muted-foreground">{result.count} votes ({result.percentage}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      Total responses: {pollResults.reduce((sum, r) => sum + r.count, 0)}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
