// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, UserRole } from "@/types/database";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: Error | null; data?: { session: Session | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fetch profile by user_id, also check user_roles table for role
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      // First, fetch the profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("[Auth] Error fetching profile:", profileError);
        return null;
      }

      if (!profileData) {
        return null;
      }

      // If profile has no role or role is 'fan', check user_roles table
      if (!profileData.role || profileData.role === 'fan') {
        console.log("[Auth] Checking user_roles table for role...");
        
        // Try to get role from user_roles table using RPC function
        const { data: roleFromTable, error: roleError } = await supabase
          .rpc("get_user_role", { p_user_id: userId });

        if (!roleError && roleFromTable) {
          console.log("[Auth] Found role in user_roles table:", roleFromTable);
          
          // Update profile with the correct role from user_roles
          if (roleFromTable !== profileData.role) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ role: roleFromTable })
              .eq("user_id", userId);
            
            if (!updateError) {
              profileData.role = roleFromTable;
              console.log("[Auth] Updated profile role to:", roleFromTable);
            }
          }
        }
      }

      return profileData as Profile | null;
    } catch (err) {
      console.error("[Auth] Exception fetching profile:", err);
      return null;
    }
  };

  // Create profile if it doesn't exist (fallback for missing trigger)
  const createProfileIfMissing = async (
    userId: string,
    email: string,
    fullName: string | undefined,
    role: UserRole
  ): Promise<Profile | null> => {
    try {
      console.log("[Auth] Attempting to create missing profile for:", userId);

      // Check if profile already exists
      const existingProfile = await fetchProfile(userId);
      if (existingProfile) {
        console.log("[Auth] Profile already exists:", existingProfile);
        return existingProfile;
      }

      // Try to get role from user metadata first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userRole = (authUser?.user_metadata?.role as UserRole) || role;
      const userName = authUser?.user_metadata?.full_name || fullName || email;

      // Create profile
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          email: email,
          full_name: userName,
          role: (userRole === 'admin' || userRole === 'system_admin' ? 'fan' : userRole) as "club_admin" | "fan",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Auth] Error creating profile:", insertError);
        
        // If insert fails due to RLS or other issues, try using the ensure_user_role function
        if (insertError.code === "42501" || insertError.message.includes("policy")) {
          console.log("[Auth] RLS policy blocked insert, trying ensure_user_role function");
          await supabase.rpc("ensure_user_role", {
            p_user_id: userId,
            p_role: (userRole === 'admin' || userRole === 'system_admin' ? 'fan' : userRole) as "club_admin" | "fan"
          });
          
          // Fetch the profile again
          return await fetchProfile(userId);
        }
        
        return null;
      }

      console.log("[Auth] Profile created successfully:", newProfile);
      return newProfile as Profile;
    } catch (err) {
      console.error("[Auth] Exception creating profile:", err);
      return null;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] onAuthStateChange event:", event);
      console.log("[Auth] onAuthStateChange session?.user?.id:", session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);
      setProfileError(null);

      if (session?.user) {
        // Defer profile fetch with setTimeout to avoid potential deadlock
        setTimeout(async () => {
          console.log("[Auth] Fetching profile for user:", session.user.id);
          
          let profileData = await fetchProfile(session.user.id);
          
          // If profile doesn't exist, try to create it
          if (!profileData) {
            console.log("[Auth] Profile not found, attempting to create...");
            setProfileError("Profile not found. Creating profile...");
            
            profileData = await createProfileIfMissing(
              session.user.id,
              session.user.email || "",
              session.user.user_metadata?.full_name,
              session.user.user_metadata?.role || "fan"
            );
          }
          
          if (profileData) {
            console.log("[Auth] Profile loaded successfully:", profileData);
            setProfile(profileData);
            setProfileError(null);
          } else {
            console.error("[Auth] Failed to load or create profile");
            setProfile(null);
            setProfileError("Unable to load user profile. Please try logging in again.");
          }
          
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileError(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[Auth] getSession session?.user?.id:", session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        let profileData = await fetchProfile(session.user.id);
        
        // If profile doesn't exist, try to create it
        if (!profileData) {
          console.log("[Auth] Profile not found on init, attempting to create...");
          profileData = await createProfileIfMissing(
            session.user.id,
            session.user.email || "",
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.role || "fan"
          );
        }
        
        if (profileData) {
          console.log("[Auth] Profile loaded on init:", profileData);
          setProfile(profileData);
        } else {
          console.error("[Auth] Failed to load profile on init");
          setProfileError("Unable to load user profile");
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    setProfileError(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) {
      return { error: new Error(error.message), data: undefined };
    }

    return { 
      error: null, 
      data: { session: data.session } 
    };
  };

  const signIn = async (email: string, password: string) => {
    setProfileError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileError,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
