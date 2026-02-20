/**
 * Custom hook for managing smart notifications
 * Provides real-time notifications and smart nudge generation
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSmartNudges,
  createSmartNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  type NudgeContext,
  type SmartNudge,
} from "@/lib/notificationEngine";
import type { Notification } from "@/types/database";

// ============================================================
// TYPES
// ============================================================

interface NotificationWithData extends Notification {
  data: {
    title?: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority?: "low" | "medium" | "high";
    [key: string]: unknown;
  };
}

interface UseNotificationsOptions {
  userId?: string;
  autoGenerate?: boolean;
  nudgeContext?: NudgeContext;
  realtime?: boolean;
}

interface UseNotificationsReturn {
  notifications: NotificationWithData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  generateNudges: () => Promise<SmartNudge[]>;
  createNudge: (nudge: SmartNudge) => Promise<{ success: boolean; error?: string }>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================
// HOOK
// ============================================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { userId, autoGenerate = false, nudgeContext, realtime = true } = options;

  const [notifications, setNotifications] = useState<NotificationWithData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const normalized = (data || []).map((n) => ({
        ...n,
        is_read: n.is_read === true,
        data: typeof n.data === "string" ? JSON.parse(n.data) : n.data || {},
      })) as NotificationWithData[];

      setNotifications(normalized);
      setUnreadCount(normalized.filter((n) => !n.is_read).length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Generate smart nudges
  const generateNudges = useCallback(async (): Promise<SmartNudge[]> => {
    if (!nudgeContext) return [];

    try {
      return await generateSmartNudges(nudgeContext);
    } catch (err) {
      console.error("Failed to generate nudges:", err);
      return [];
    }
  }, [nudgeContext]);

  // Create a single notification
  const createNudge = useCallback(
    async (nudge: SmartNudge): Promise<{ success: boolean; error?: string }> => {
      if (!userId) return { success: false, error: "No user ID" };

      const result = await createSmartNotification(userId, nudge);
      if (result.success) {
        await fetchNotifications();
      }
      return { success: result.success, error: result.error };
    },
    [userId, fetchNotifications]
  );

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await markNotificationAsRead(notificationId);
    },
    []
  );

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await markAllNotificationsAsRead(userId);
  }, [userId]);

  // Delete notification
  const remove = useCallback(
    async (notificationId: string): Promise<void> => {
      // Optimistic update
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });

      await deleteNotification(notificationId);
    },
    []
  );

  // Refresh notifications
  const refresh = useCallback(async (): Promise<void> => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Setup realtime subscription
  useEffect(() => {
    if (!userId || !realtime) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = {
            ...payload.new,
            data: typeof payload.new.data === "string" 
              ? JSON.parse(payload.new.data) 
              : payload.new.data || {},
          } as NotificationWithData;

          setNotifications((prev) => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = {
            ...payload.new,
            data: typeof payload.new.data === "string" 
              ? JSON.parse(payload.new.data) 
              : payload.new.data || {},
          } as NotificationWithData;

          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setNotifications((prev) => {
            const notification = prev.find((n) => n.id === deletedId);
            if (notification && !notification.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
            return prev.filter((n) => n.id !== deletedId);
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, realtime]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-generate nudges on mount if enabled
  useEffect(() => {
    if (autoGenerate && nudgeContext && userId) {
      generateNudges().then((nudges) => {
        if (nudges.length > 0) {
          // Store nudges in database
          Promise.all(
            nudges.map((nudge) => createSmartNotification(userId, nudge))
          ).then(() => {
            fetchNotifications();
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    generateNudges,
    createNudge,
    markAsRead,
    markAllAsRead,
    remove,
    refresh,
  };
}

// ============================================================
// CONVENIENCE HOOK FOR UNREAD COUNT
// ============================================================

export function useUnreadNotificationCount(userId?: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    getUnreadNotificationCount(userId).then(setCount);

    // Subscribe to changes
    const channel = supabase
      .channel(`notification-count:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          getUnreadNotificationCount(userId).then(setCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
