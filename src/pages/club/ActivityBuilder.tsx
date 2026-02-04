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
import { PollQuizBuilder, InAppConfig } from "@/components/ui/PollQuizBuilder";
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
} from "lucide-react";
import { Activity, ActivityFrequency, VerificationMethod, LoyaltyProgram } from "@/types/database";

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
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [qrActivity, setQrActivity] = useState<Activity | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState("100");
  const [frequency, setFrequency] = useState<ActivityFrequency>("once_per_day");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("qr_scan");
  const [isActive, setIsActive] = useState(true);

  // Location check-in configuration
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [locationRadius, setLocationRadius] = useState("500");
  const [isLocating, setIsLocating] = useState(false);

  // In-app activity configuration (poll/quiz)
  const [inAppConfig, setInAppConfig] = useState<InAppConfig | null>(null);

  // Time window configuration
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
      // Get club
      const { data: clubs } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);

      if (!clubs || clubs.length === 0) {
        navigate("/club/onboarding");
        return;
      }

      // Get program
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

      // Get activities
      // NOTE: Cast to any to avoid supabase-js type instantiation depth issues.
      const activitiesTable = supabase.from("activities") as any;
      const { data: activitiesData } = await activitiesTable
        .select("*")
        .eq("loyalty_program_id", programs[0].id)
        .order("created_at", { ascending: false });

      setActivities((activitiesData || []) as unknown as Activity[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
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
    setName(activity.name);
    setDescription(activity.description || "");
    setPointsAwarded(activity.points_awarded.toString());
    setFrequency(activity.frequency);
    setVerificationMethod(activity.verification_method);
    setIsActive(activity.is_active);
    setLocationLat(activity.location_lat?.toString() || "");
    setLocationLng(activity.location_lng?.toString() || "");
    setLocationRadius(activity.location_radius_meters?.toString() || "500");
    setInAppConfig(activity.in_app_config || null);

    // Time window
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
        toast({
          title: "Location Set",
          description: "Your current location has been set as the venue.",
        });
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
      toast({
        title: "Invalid Points",
        description: "Points must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    // Validate location for location_checkin activities
    if (verificationMethod === "location_checkin") {
      const lat = parseFloat(locationLat);
      const lng = parseFloat(locationLng);
      const radius = parseInt(locationRadius);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        toast({
          title: "Invalid Latitude",
          description: "Latitude must be between -90 and 90.",
          variant: "destructive",
        });
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        toast({
          title: "Invalid Longitude",
          description: "Longitude must be between -180 and 180.",
          variant: "destructive",
        });
        return;
      }
      if (isNaN(radius) || radius < 50 || radius > 5000) {
        toast({
          title: "Invalid Radius",
          description: "Radius must be between 50 and 5000 meters.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate in_app_completion activities
    if (verificationMethod === "in_app_completion") {
      if (!inAppConfig || !inAppConfig.question.trim()) {
        toast({
          title: "Question Required",
          description: "Please enter a question for the poll or quiz.",
          variant: "destructive",
        });
        return;
      }
      const filledOptions = inAppConfig.options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        toast({
          title: "Options Required",
          description: "Please provide at least 2 answer options.",
          variant: "destructive",
        });
        return;
      }
      if (inAppConfig.type === "quiz" && !inAppConfig.options.some((o) => o.isCorrect)) {
        toast({
          title: "Correct Answer Required",
          description: "Please select the correct answer for the quiz.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate time window
    if (hasTimeWindow) {
      if (!timeWindowStart || !timeWindowEnd) {
        toast({
          title: "Time Window Required",
          description: "Please set both start and end times for the time window.",
          variant: "destructive",
        });
        return;
      }
      if (new Date(timeWindowStart) >= new Date(timeWindowEnd)) {
        toast({
          title: "Invalid Time Window",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }
    }

    // Parse location values
    const parsedLat = verificationMethod === "location_checkin" ? parseFloat(locationLat) : null;
    const parsedLng = verificationMethod === "location_checkin" ? parseFloat(locationLng) : null;
    const parsedRadius = verificationMethod === "location_checkin" ? parseInt(locationRadius) : 100;

    // Parse in_app_config - only include for in_app_completion, filter empty options
    const parsedInAppConfig =
      verificationMethod === "in_app_completion" && inAppConfig
        ? {
            ...inAppConfig,
            options: inAppConfig.options.filter((o) => o.text.trim()),
          }
        : null;

    // Parse time window
    const parsedTimeWindowStart = hasTimeWindow && timeWindowStart ? new Date(timeWindowStart).toISOString() : null;
    const parsedTimeWindowEnd = hasTimeWindow && timeWindowEnd ? new Date(timeWindowEnd).toISOString() : null;

    if (isPreviewMode) {
      // Simulate activity creation
      const newActivity: Activity = {
        id: `preview-${Date.now()}`,
        loyalty_program_id: program.id,
        name,
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
      const activityData = {
        loyalty_program_id: program.id,
        name,
        description: description || null,
        points_awarded: points,
        frequency,
        verification_method: verificationMethod,
        is_active: isActive,
        qr_code_data: verificationMethod === "qr_scan" ? crypto.randomUUID() : null,
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

        toast({
          title: "Activity Updated",
          description: "The activity has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("activities").insert(activityData);

        if (error) throw error;

        toast({
          title: "Activity Created",
          description: "Your new activity is ready for fans.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to save activity",
        variant: "destructive",
      });
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

      toast({
        title: "Activity Deleted",
        description: "The activity has been removed.",
      });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to delete activity",
        variant: "destructive",
      });
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

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Logo />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              Activities Manager
            </h1>
            <p className="text-muted-foreground">
              Create activities for fans to earn {program?.points_currency_name || "points"}
            </p>
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gradient-stadium">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingActivity ? "Edit Activity" : "Create New Activity"}</DialogTitle>
                <DialogDescription>
                  Define how fans earn {program?.points_currency_name || "points"} for this activity
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Activity Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Attend Home Match"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what fans need to do..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points Awarded *</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      value={pointsAwarded}
                      onChange={(e) => setPointsAwarded(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Frequency
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as ActivityFrequency)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(frequencyLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{frequencyDescriptions[frequency]}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Verification Method *
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Select
                    value={verificationMethod}
                    onValueChange={(v) => setVerificationMethod(v as VerificationMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(verificationLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {verificationIcons[value as VerificationMethod]}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {verificationDescriptions[verificationMethod]}
                  </p>
                </div>

                {/* Location Configuration for Location Check-in */}
                {verificationMethod === "location_checkin" && (
                  <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-primary">
                        <MapPin className="h-4 w-4" />
                        Venue Location
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                      >
                        {isLocating ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <MapPin className="h-3 w-3 mr-1" />
                        )}
                        Use My Location
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="locationLat" className="text-xs">
                          Latitude *
                        </Label>
                        <Input
                          id="locationLat"
                          type="number"
                          step="any"
                          value={locationLat}
                          onChange={(e) => setLocationLat(e.target.value)}
                          placeholder="e.g., 53.4631"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="locationLng" className="text-xs">
                          Longitude *
                        </Label>
                        <Input
                          id="locationLng"
                          type="number"
                          step="any"
                          value={locationLng}
                          onChange={(e) => setLocationLng(e.target.value)}
                          placeholder="e.g., -2.2913"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="locationRadius" className="text-xs">
                        Check-in Radius (meters) *
                      </Label>
                      <Input
                        id="locationRadius"
                        type="number"
                        min="50"
                        max="5000"
                        value={locationRadius}
                        onChange={(e) => setLocationRadius(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Fans must be within this distance to check in (50-5000m)
                      </p>
                    </div>

                    {/* Map Preview */}
                    {locationLat &&
                      locationLng &&
                      !isNaN(parseFloat(locationLat)) &&
                      !isNaN(parseFloat(locationLng)) && (
                        <div className="space-y-2">
                          <Label className="text-xs">Map Preview</Label>
                          <VenueMapPreview
                            lat={parseFloat(locationLat)}
                            lng={parseFloat(locationLng)}
                            radiusMeters={parseInt(locationRadius) || 500}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            The green circle shows the check-in area
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* In-App Activity Configuration (Poll/Quiz) */}
                {verificationMethod === "in_app_completion" && (
                  <PollQuizBuilder value={inAppConfig} onChange={setInAppConfig} />
                )}

                {/* Time Window Configuration */}
                <div className="space-y-3 p-4 border border-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hasTimeWindow" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Time-Based Availability
                    </Label>
                    <Switch id="hasTimeWindow" checked={hasTimeWindow} onCheckedChange={setHasTimeWindow} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restrict this activity to specific dates and times (e.g., match days only)
                  </p>

                  {hasTimeWindow && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="timeWindowStart" className="text-xs">
                            Available From *
                          </Label>
                          <Input
                            id="timeWindowStart"
                            type="datetime-local"
                            value={timeWindowStart}
                            onChange={(e) => setTimeWindowStart(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="timeWindowEnd" className="text-xs">
                            Available Until *
                          </Label>
                          <Input
                            id="timeWindowEnd"
                            type="datetime-local"
                            value={timeWindowEnd}
                            onChange={(e) => setTimeWindowEnd(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      {timeWindowStart && timeWindowEnd && new Date(timeWindowStart) < new Date(timeWindowEnd) && (
                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          ⏰ Activity will be available from{" "}
                          <span className="font-medium">{new Date(timeWindowStart).toLocaleString()}</span> to{" "}
                          <span className="font-medium">{new Date(timeWindowEnd).toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <Button onClick={handleSubmit} disabled={!name || isSubmitting} className="w-full gradient-stadium">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingActivity ? "Update Activity" : "Create Activity"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Activities List */}
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">You Haven't Created Any Activities Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Activities are how fans earn {program?.points_currency_name || "points"}. Create your first activity to
                start engaging fans.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activities.map((activity) => (
              <Card key={activity.id} className={`${activity.is_active ? "" : "opacity-60"}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {verificationIcons[activity.verification_method]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{activity.name}</h3>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            +{activity.points_awarded} {program?.points_currency_name}
                          </Badge>
                          <Badge variant="outline">{frequencyLabels[activity.frequency]}</Badge>
                          <Badge variant="outline">{verificationLabels[activity.verification_method]}</Badge>
                          {!activity.is_active && <Badge variant="secondary">Inactive</Badge>}
                          {(activity.time_window_start || activity.time_window_end) && (
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Timed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.verification_method === "qr_scan" && activity.qr_code_data && (
                        <Button variant="outline" size="sm" onClick={() => setQrActivity(activity)} className="gap-1">
                          <QrCode className="h-4 w-4" />
                          View QR
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(activity)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Display Modal */}
        {qrActivity && qrActivity.qr_code_data && (
          <QRCodeDisplay
            isOpen={!!qrActivity}
            onClose={() => setQrActivity(null)}
            activityName={qrActivity.name}
            qrCodeData={qrActivity.qr_code_data}
            pointsAwarded={qrActivity.points_awarded}
            pointsCurrency={program?.points_currency_name || "Points"}
          />
        )}
      </main>
    </div>
  );
}
