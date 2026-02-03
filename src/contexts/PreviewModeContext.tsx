import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '@/types/database';

interface PreviewModeContextType {
  isPreviewMode: boolean;
  previewProfile: Profile | null;
  enablePreviewMode: (role: UserRole) => void;
  disablePreviewMode: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextType | undefined>(undefined);

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);

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
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const disablePreviewMode = () => {
    setIsPreviewMode(false);
    setPreviewProfile(null);
  };

  return (
    <PreviewModeContext.Provider
      value={{
        isPreviewMode,
        previewProfile,
        enablePreviewMode,
        disablePreviewMode,
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
