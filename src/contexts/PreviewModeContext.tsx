import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, UserRole, ClubStatus } from '@/types/database';

interface EnrolledClubInfo {
  id: string;
  name: string;
}

interface PreviewModeContextType {
  isPreviewMode: boolean;
  previewProfile: Profile | null;
  previewClubStatus: ClubStatus;
  enablePreviewMode: (role: UserRole) => void;
  disablePreviewMode: () => void;
  setPreviewClubVerified: () => void;
  // Points tracking for preview mode
  previewPointsBalance: number;
  addPreviewPoints: (points: number) => void;
  completedPreviewActivities: string[];
  markActivityCompleted: (activityId: string) => void;
  // Enrolled club tracking for preview mode
  previewEnrolledClub: EnrolledClubInfo | null;
  setPreviewEnrolledClub: (club: EnrolledClubInfo) => void;
}

const PreviewModeContext = createContext<PreviewModeContextType | undefined>(undefined);

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [previewClubStatus, setPreviewClubStatus] = useState<ClubStatus>('unverified');
  
  // Preview mode points tracking
  const [previewPointsBalance, setPreviewPointsBalance] = useState(0);
  const [completedPreviewActivities, setCompletedPreviewActivities] = useState<string[]>([]);
  
  // Enrolled club tracking for preview mode
  const [previewEnrolledClub, setPreviewEnrolledClubState] = useState<EnrolledClubInfo | null>(null);

  // Check URL params for preview mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewRole = params.get('preview') as UserRole | null;
    
    if (previewRole === 'fan' || previewRole === 'club_admin') {
      enablePreviewMode(previewRole);
    }
  }, []);

  const enablePreviewMode = (role: UserRole) => {
    setIsPreviewMode(true);
    setPreviewProfile({
      id: 'preview-user-id',
      user_id: 'preview-auth-user-id',
      email: role === 'club_admin' ? 'admin@preview.club' : 'fan@preview.club',
      full_name: role === 'club_admin' ? 'Preview Club Admin' : 'Preview Fan',
      username: null,
      phone: null,
      date_of_birth: null,
      avatar_url: null,
      bio: null,
      address: null,
      city: null,
      country: null,
      preferred_language: 'en',
      notifications_enabled: true,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const disablePreviewMode = () => {
    setIsPreviewMode(false);
    setPreviewProfile(null);
    setPreviewClubStatus('unverified');
    setPreviewPointsBalance(0);
    setCompletedPreviewActivities([]);
    setPreviewEnrolledClubState(null);
  };

  const setPreviewEnrolledClub = useCallback((club: EnrolledClubInfo) => {
    setPreviewEnrolledClubState(club);
  }, []);

  const setPreviewClubVerified = () => {
    setPreviewClubStatus('verified');
  };

  const addPreviewPoints = useCallback((points: number) => {
    setPreviewPointsBalance(prev => prev + points);
  }, []);

  const markActivityCompleted = useCallback((activityId: string) => {
    setCompletedPreviewActivities(prev => 
      prev.includes(activityId) ? prev : [...prev, activityId]
    );
  }, []);

  return (
    <PreviewModeContext.Provider
      value={{
        isPreviewMode,
        previewProfile,
        previewClubStatus,
        enablePreviewMode,
        disablePreviewMode,
        setPreviewClubVerified,
        previewPointsBalance,
        addPreviewPoints,
        completedPreviewActivities,
        markActivityCompleted,
        previewEnrolledClub,
        setPreviewEnrolledClub,
      }}
    >
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  const context = useContext(PreviewModeContext);
  if (context === undefined) {
    throw new Error('usePreviewMode must be used within a PreviewModeProvider');
  }
  return context;
}
