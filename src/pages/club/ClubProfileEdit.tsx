// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Building2, 
  Globe, 
  MapPin, 
  Calendar,
  Camera,
  Users,
  Link as LinkIcon,
  Mail,
  Phone,
  Twitter,
  Instagram,
  Youtube,
  Facebook,
  Palette,
  Sparkles,
  ShieldCheck,
  Trash2,
  AlertTriangle
} from "lucide-react";

import type { Club } from "@/types/database";

interface ClubFormData {
  name: string;
  slug: string;
  description: string;
  founded_year: string;
  primary_color: string;
  secondary_color: string;
  country: string;
  city: string;
  stadium_name: string;
  stadium_capacity: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  social_youtube: string;
}

const COUNTRIES = [
  "United Arab Emirates", "Saudi Arabia", "Egypt", "Morocco", "Jordan", "Lebanon",
  "United Kingdom", "Spain", "Germany", "Italy", "France", "Netherlands",
  "Brazil", "Argentina", "Mexico", "United States", "Japan", "South Korea", "Other"
];

export default function ClubProfileEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [formData, setFormData] = useState<ClubFormData>({
    name: "",
    slug: "",
    description: "",
    founded_year: "",
    primary_color: "#16a34a",
    secondary_color: "#15803d",
    country: "",
    city: "",
    stadium_name: "",
    stadium_capacity: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
    social_facebook: "",
    social_twitter: "",
    social_instagram: "",
    social_youtube: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isPreviewMode && !user) {
      navigate("/auth?role=club_admin");
      return;
    }
    loadClub();
  }, [user, authLoading, isPreviewMode]);

  const loadClub = async () => {
    if (isPreviewMode) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: clubs, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("admin_id", profile?.id)
        .single();

      if (error) throw error;

      if (clubs) {
        const clubData = clubs as Club;
        setClub(clubData);
        setLogoUrl(clubData.logo_url);
        setBannerUrl(clubData.banner_url);
        
        setFormData({
          name: clubData.name || "",
          slug: clubData.slug || "",
          description: clubData.description || "",
          founded_year: clubData.founded_year?.toString() || "",
          primary_color: clubData.primary_color || "#16a34a",
          secondary_color: clubData.secondary_color || "#15803d",
          country: clubData.country || "",
          city: clubData.city || "",
          stadium_name: clubData.stadium_name || "",
          stadium_capacity: clubData.stadium_capacity?.toString() || "",
          website_url: clubData.website_url || "",
          contact_email: clubData.contact_email || "",
          contact_phone: clubData.contact_phone || "",
          social_facebook: clubData.social_facebook || "",
          social_twitter: clubData.social_twitter || "",
          social_instagram: clubData.social_instagram || "",
          social_youtube: clubData.social_youtube || "",
        });
        setOriginalSlug(clubData.slug || "");
      }
    } catch (error) {
      console.error("Error loading club:", error);
      toast({
        title: "Error",
        description: "Failed to load club profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    if (slug.toLowerCase() === originalSlug.toLowerCase()) {
      setSlugAvailable(true);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("id")
        .ilike("slug", slug)
        .neq("id", club?.id || "")
        .maybeSingle();

      if (error) throw error;
      setSlugAvailable(!data);
    } catch {
      setSlugAvailable(null);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const filtered = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData({ ...formData, slug: filtered });
    setSlugAvailable(null);
    
    const timeout = setTimeout(() => {
      checkSlugAvailability(filtered);
    }, 500);
    
    return () => clearTimeout(timeout);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !club?.id) return;

    setLogoUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${club.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("club-logos").getPublicUrl(filePath);
      const newLogoUrl = publicUrl.publicUrl + "?t=" + Date.now();

      await supabase
        .from("clubs")
        .update({ logo_url: publicUrl.publicUrl })
        .eq("id", club.id);

      setLogoUrl(newLogoUrl);
      toast({
        title: "Logo Updated",
        description: "Your club logo has been updated!",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload logo";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !club?.id) return;

    setBannerUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${club.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("club-logos").getPublicUrl(filePath);
      const newBannerUrl = publicUrl.publicUrl + "?t=" + Date.now();

      await supabase
        .from("clubs")
        .update({ banner_url: publicUrl.publicUrl })
        .eq("id", club.id);

      setBannerUrl(newBannerUrl);
      toast({
        title: "Banner Updated",
        description: "Your club banner has been updated!",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload banner";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSave = async () => {
    if (isPreviewMode) {
      toast({
        title: "Preview Mode",
        description: "Changes cannot be saved in preview mode",
      });
      return;
    }

    // Validate
    if (!formData.name.trim()) {
      toast({
        title: "Club Name Required",
        description: "Please enter a club name",
        variant: "destructive",
      });
      return;
    }

    if (formData.slug && slugAvailable === false) {
      toast({
        title: "Slug Taken",
        description: "Please choose a different URL slug",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        slug: formData.slug || null,
        description: formData.description || null,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color || null,
        country: formData.country || "",
        city: formData.city || "",
        stadium_name: formData.stadium_name || null,
        stadium_capacity: formData.stadium_capacity ? parseInt(formData.stadium_capacity) : null,
        website_url: formData.website_url || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        social_facebook: formData.social_facebook || null,
        social_twitter: formData.social_twitter || null,
        social_instagram: formData.social_instagram || null,
        social_youtube: formData.social_youtube || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("clubs")
        .update(updateData)
        .eq("id", club?.id);

      if (error) throw error;

      toast({
        title: "Profile Saved",
        description: "Your club profile has been updated successfully!",
      });

      navigate("/club/dashboard");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!club || !profile || !user) return;
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "DELETE" to confirm club deletion',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete club's data from related tables
      // 1. Get the loyalty program(s) for this club
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", club.id);

      const programIds = (programs ?? []).map(p => p.id);

      if (programIds.length > 0) {
        // 2. Delete activity completions for activities in these programs
        for (const programId of programIds) {
          const { data: activities } = await supabase
            .from("activities")
            .select("id")
            .eq("program_id", programId);
          
          const activityIds = (activities ?? []).map(a => a.id);
          
          if (activityIds.length > 0) {
            await supabase.from("activity_completions").delete().in("activity_id", activityIds);
            await supabase.from("manual_claims").delete().in("activity_id", activityIds);
          }
        }

        // 3. Delete reward redemptions for rewards in these programs
        for (const programId of programIds) {
          const { data: rewards } = await supabase
            .from("rewards")
            .select("id")
            .eq("program_id", programId);
          
          const rewardIds = (rewards ?? []).map(r => r.id);
          
          if (rewardIds.length > 0) {
            await supabase.from("reward_redemptions").delete().in("reward_id", rewardIds);
          }
        }

        // 4. Delete rewards
        for (const programId of programIds) {
          await supabase.from("rewards").delete().eq("program_id", programId);
        }

        // 5. Delete activities
        for (const programId of programIds) {
          await supabase.from("activities").delete().eq("program_id", programId);
        }

        // 6. Delete tiers
        for (const programId of programIds) {
          await supabase.from("tiers").delete().eq("program_id", programId);
        }

        // 7. Delete fan memberships
        await supabase.from("fan_memberships").delete().eq("club_id", club.id);

        // 8. Delete loyalty programs
        await supabase.from("loyalty_programs").delete().eq("club_id", club.id);
      }

      // 9. Delete club verification
      await supabase.from("club_verifications").delete().eq("club_id", club.id);

      // 10. Delete club logos from storage
      if (club.id) {
        await supabase.storage.from("club-logos").remove([`${club.id}/logo.jpg`, `${club.id}/logo.png`]);
        await supabase.storage.from("club-logos").remove([`${club.id}/banner.jpg`, `${club.id}/banner.png`]);
      }

      // 11. Delete club
      await supabase.from("clubs").delete().eq("id", club.id);

      // 12. Delete notifications
      await supabase.from("notifications").delete().eq("user_id", user.id);

      // 13. Delete profile
      await supabase.from("profiles").delete().eq("id", profile.id);

      // 14. Delete auth user using edge function
      const { error: deleteError } = await supabase.functions.invoke("delete-user");
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
      }

      toast({
        title: "Club Deleted",
        description: "Your club and all associated data have been permanently deleted. You can register again.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: unknown) {
      console.error("Delete club error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete club";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmText("");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/club/dashboard")} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button onClick={handleSave} disabled={isSaving || isPreviewMode} className="rounded-full">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-4xl space-y-8">
        {/* Banner & Logo Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          {/* Banner */}
          <div className="h-48 md:h-64 relative bg-gradient-to-r from-primary/20 to-accent/20">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Club Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 gradient-hero" />
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              {bannerUploading ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : (
                <div className="text-white text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">Change Banner</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
                disabled={bannerUploading || isPreviewMode}
              />
            </label>
          </div>

          {/* Logo */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="h-28 w-28 rounded-2xl border-4 border-background shadow-xl overflow-hidden bg-card">
                {logoUrl ? (
                  <img src={logoUrl} alt="Club Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: formData.primary_color }}>
                    <Building2 className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                {logoUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading || isPreviewMode}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="pt-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Edit Club Profile</span>
          </div>
          <h1 className="text-2xl font-display font-bold">{formData.name || "Your Club"}</h1>
          {club?.status && (
            <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {club.status.charAt(0).toUpperCase() + club.status.slice(1)}
            </Badge>
          )}
        </div>

        {/* Basic Information */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Basic Information
            </CardTitle>
            <CardDescription>Your club's identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Club Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Club Name"
                className="rounded-xl"
              />
            </div>

            {/* URL Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Custom URL Slug
              </Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="your-club-name"
                  className="rounded-xl pr-10"
                  maxLength={50}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingSlug ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : slugAvailable === true && formData.slug ? (
                    <span className="text-green-500 text-sm">✓</span>
                  ) : slugAvailable === false ? (
                    <span className="text-red-500 text-sm">✗</span>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. 3-50 characters.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell fans about your club, history, and mission..."
                className="rounded-xl min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.description.length}/1000</p>
            </div>

            {/* Founded Year */}
            <div className="space-y-2">
              <Label htmlFor="founded_year" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Founded Year
              </Label>
              <Input
                id="founded_year"
                value={formData.founded_year}
                onChange={(e) => setFormData({ ...formData, founded_year: e.target.value.replace(/\D/g, "") })}
                placeholder="1900"
                className="rounded-xl"
                maxLength={4}
                type="number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              Brand Colors
            </CardTitle>
            <CardDescription>Customize your club's visual identity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-16 h-10 rounded-xl cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="rounded-xl flex-1"
                    placeholder="#16a34a"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-16 h-10 rounded-xl cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="rounded-xl flex-1"
                    placeholder="#15803d"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Stadium */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location & Stadium
            </CardTitle>
            <CardDescription>Where is your club based?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United Arab Emirates"
                  className="rounded-xl"
                  list="countries-list"
                />
                <datalist id="countries-list">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Dubai"
                  className="rounded-xl"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stadium_name">Stadium Name</Label>
                <Input
                  id="stadium_name"
                  value={formData.stadium_name}
                  onChange={(e) => setFormData({ ...formData, stadium_name: e.target.value })}
                  placeholder="Al Maktoum Stadium"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stadium_capacity" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Stadium Capacity
                </Label>
                <Input
                  id="stadium_capacity"
                  value={formData.stadium_capacity}
                  onChange={(e) => setFormData({ ...formData, stadium_capacity: e.target.value.replace(/\D/g, "") })}
                  placeholder="15000"
                  className="rounded-xl"
                  type="number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>How can fans reach you?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="info@yourclub.com"
                  className="rounded-xl"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contact Phone
                </Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+971 4 123 4567"
                  className="rounded-xl"
                  type="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website URL
              </Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://yourclub.com"
                className="rounded-xl"
                type="url"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Twitter className="h-5 w-5 text-primary" />
              Social Media
            </CardTitle>
            <CardDescription>Connect your social accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="social_facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-muted-foreground" />
                  Facebook
                </Label>
                <Input
                  id="social_facebook"
                  value={formData.social_facebook}
                  onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                  placeholder="https://facebook.com/yourclub"
                  className="rounded-xl"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                  Twitter / X
                </Label>
                <Input
                  id="social_twitter"
                  value={formData.social_twitter}
                  onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                  placeholder="https://twitter.com/yourclub"
                  className="rounded-xl"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  Instagram
                </Label>
                <Input
                  id="social_instagram"
                  value={formData.social_instagram}
                  onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                  placeholder="https://instagram.com/yourclub"
                  className="rounded-xl"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-muted-foreground" />
                  YouTube
                </Label>
                <Input
                  id="social_youtube"
                  value={formData.social_youtube}
                  onChange={(e) => setFormData({ ...formData, social_youtube: e.target.value })}
                  placeholder="https://youtube.com/@yourclub"
                  className="rounded-xl"
                  type="url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="md:hidden">
          <Button onClick={handleSave} disabled={isSaving || isPreviewMode} className="w-full rounded-full" size="lg">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {/* Danger Zone */}
        {!isPreviewMode && (
          <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions that affect your club</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-destructive/20">
                <div>
                  <p className="font-semibold text-sm">Delete Club & Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently delete your club, all associated data, and your admin account. This cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="rounded-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Club
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Club Permanently
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3 pt-2">
                        <p>
                          This action <strong>cannot be undone</strong>. This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                          <li>Your club profile and all settings</li>
                          <li>All loyalty programs and rewards</li>
                          <li>All fan memberships and points</li>
                          <li>All activities and completions</li>
                          <li>Your admin account</li>
                        </ul>
                        <div className="pt-3">
                          <Label htmlFor="delete-confirm" className="text-sm font-medium">
                            Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
                          </Label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="mt-2 rounded-xl"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText("")} className="rounded-full">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteClub}
                        disabled={isDeleting || deleteConfirmText !== "DELETE"}
                        className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete Forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
