// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Globe, 
  Bell, 
  Camera,
  AtSign,
  CheckCircle,
  XCircle,
  Shield,
  Trophy,
  Sparkles,
  Trash2,
  AlertTriangle
} from "lucide-react";

interface ProfileFormData {
  username: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  bio: string;
  address: string;
  city: string;
  country: string;
  preferred_language: string;
  notifications_enabled: boolean;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
];

const COUNTRIES = [
  "United Arab Emirates", "Saudi Arabia", "Egypt", "Morocco", "Jordan", "Lebanon",
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Brazil", "Argentina", "Mexico", "Japan", "South Korea", "China", "India",
  "Other"
];

export default function FanProfileEditPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    full_name: "",
    phone: "",
    date_of_birth: "",
    bio: "",
    address: "",
    city: "",
    country: "",
    preferred_language: "en",
    notifications_enabled: true,
  });

  const [originalUsername, setOriginalUsername] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Load avatar
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url + "?t=" + Date.now());
      } else {
        const { data } = await supabase.storage.from("fan-avatars").list(profile?.id || "");
        if (data && data.length > 0) {
          const avatarFile = data.find((f) => f.name.startsWith("avatar"));
          if (avatarFile && profile?.id) {
            const { data: urlData } = supabase.storage.from("fan-avatars").getPublicUrl(`${profile.id}/${avatarFile.name}`);
            setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
          }
        }
      }

      // Load profile data
      if (profile) {
        setFormData({
          username: profile.username || "",
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          date_of_birth: profile.date_of_birth || "",
          bio: profile.bio || "",
          address: profile.address || "",
          city: profile.city || "",
          country: profile.country || "",
          preferred_language: profile.preferred_language || "en",
          notifications_enabled: profile.notifications_enabled ?? true,
        });
        setOriginalUsername(profile.username || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Skip check if username hasn't changed
    if (username.toLowerCase() === originalUsername.toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase.rpc("is_username_available", {
        p_username: username,
        p_exclude_user_id: user?.id,
      });

      if (error) throw error;
      setUsernameAvailable(data);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and underscores
    const filtered = value.replace(/[^a-zA-Z0-9_]/g, "");
    setFormData({ ...formData, username: filtered });
    
    // Debounce username check
    setUsernameAvailable(null);
    const timeout = setTimeout(() => {
      checkUsernameAvailability(filtered);
    }, 500);
    
    return () => clearTimeout(timeout);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fan-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("fan-avatars").getPublicUrl(filePath);
      const newAvatarUrl = publicUrl.publicUrl + "?t=" + Date.now();

      // Update profile with avatar URL
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profile.id);

      setAvatarUrl(newAvatarUrl);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated!",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    // Validate username
    if (formData.username && formData.username.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    if (formData.username && usernameAvailable === false) {
      toast({
        title: "Username Taken",
        description: "Please choose a different username",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username || null,
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          bio: formData.bio || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
          preferred_language: formData.preferred_language,
          notifications_enabled: formData.notifications_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Profile Saved",
        description: "Your profile has been updated successfully!",
      });

      navigate("/fan/profile");
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

  const handleDeleteAccount = async () => {
    if (!profile || !user) return;
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "DELETE" to confirm account deletion',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete fan's data from related tables
      // 1. Delete activity completions
      await supabase.from("activity_completions").delete().eq("fan_id", profile.id);
      
      // 2. Delete manual claims
      await supabase.from("manual_claims").delete().eq("fan_id", profile.id);
      
      // 3. Delete reward redemptions
      await supabase.from("reward_redemptions").delete().eq("fan_id", profile.id);
      
      // 4. Delete fan memberships
      await supabase.from("fan_memberships").delete().eq("fan_id", profile.id);
      
      // 5. Delete notifications
      await supabase.from("notifications").delete().eq("user_id", user.id);
      
      // 6. Delete avatar from storage
      if (profile.id) {
        await supabase.storage.from("fan-avatars").remove([`${profile.id}/avatar.jpg`, `${profile.id}/avatar.png`, `${profile.id}/avatar.jpeg`]);
      }
      
      // 7. Delete profile (clear username/email to allow reuse)
      await supabase.from("profiles").delete().eq("id", profile.id);
      
      // 8. Delete auth user using admin API (requires edge function)
      const { error: deleteError } = await supabase.functions.invoke("delete-user");
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
        // Continue anyway - profile is deleted
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. You can register again with the same email.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: unknown) {
      console.error("Delete account error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete account";
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/profile")} className="rounded-full h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="rounded-full gradient-stadium font-semibold">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="relative z-10 p-6 md:p-8 flex items-center gap-6">
            {/* Avatar Upload */}
            <div className="relative group flex-shrink-0">
              <div className="h-22 w-22 rounded-3xl border-4 border-white/15 shadow-lg overflow-hidden bg-white/10" style={{height: 88, width: 88}}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-9 w-9 text-white/40" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                {avatarUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Edit Profile</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-white">Your Profile</h1>
              <p className="text-white/55 text-sm mt-0.5">Complete your profile for a better experience</p>
            </div>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 px-5 py-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/6 to-transparent rounded-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Profile Completion</p>
                <p className="text-xs text-muted-foreground">Fill in your details for a better experience</p>
              </div>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/25 rounded-full">
              <Trophy className="h-3 w-3 mr-1" />
              {[formData.full_name, formData.username, formData.phone, formData.city, formData.country].filter(Boolean).length}/5
            </Badge>
          </div>
        </div>

        {/* Basic Information */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Basic Information
            </CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Choose a unique username"
                  className="pr-10 rounded-xl"
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : usernameAvailable === true && formData.username ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : usernameAvailable === false ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                3-30 characters. Letters, numbers, and underscores only. Use this to sign in instead of email.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Your full name"
                className="rounded-xl"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="rounded-xl bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+971 50 123 4567"
                className="rounded-xl"
                type="tel"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date of Birth
              </Label>
              <Input
                id="date_of_birth"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                type="date"
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              About You
            </CardTitle>
            <CardDescription>Tell others about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell others about yourself, your interests, favorite team..."
                className="rounded-xl min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/500</p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
            <CardDescription>Where are you located?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City */}
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

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language</Label>
              <Select
                value={formData.preferred_language}
                onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="notifications">Push Notifications</Label>
                </div>
                <p className="text-xs text-muted-foreground">Receive notifications about rewards, activities, and more</p>
              </div>
              <Switch
                id="notifications"
                checked={formData.notifications_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, notifications_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="md:hidden">
          <Button onClick={handleSave} disabled={isSaving} className="w-full rounded-full" size="lg">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {/* Danger Zone */}
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that affect your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-destructive/20">
              <div>
                <p className="font-semibold text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete your account and all associated data. Your username and email will be available for reuse.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account Permanently
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 pt-2">
                      <p>
                        This action <strong>cannot be undone</strong>. This will permanently delete:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Your profile and personal information</li>
                        <li>All your points and memberships</li>
                        <li>Activity history and claims</li>
                        <li>Reward redemptions</li>
                        <li>Notifications and preferences</li>
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
                      onClick={handleDeleteAccount}
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
      </main>
    </div>
  );
}
