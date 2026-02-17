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
  Sparkles
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/profile")} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-full">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="relative z-10 p-8 flex items-center gap-6">
            {/* Avatar Upload */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-4 border-white/20 shadow-lg overflow-hidden bg-card/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                {avatarUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Edit Profile</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-white">Your Profile</h1>
              <p className="text-white/60 text-sm">Complete your profile to get personalized experiences</p>
            </div>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <Card className="rounded-2xl border-border/40">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Profile Completion</p>
                  <p className="text-xs text-muted-foreground">Complete your profile for better experience</p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Trophy className="h-3 w-3 mr-1" />
                {[formData.full_name, formData.username, formData.phone, formData.city, formData.country].filter(Boolean).length}/5
              </Badge>
            </div>
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
}
