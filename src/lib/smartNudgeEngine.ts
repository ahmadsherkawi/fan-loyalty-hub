/**
 * AI Smart Nudge Engine - Backward Compatibility Layer
 * Re-exports from the enhanced notificationEngine module
 */

// Re-export everything from the new notification engine
export {
  createSmartNotification,
  createNotificationsBatch,
  generateSmartNudges,
  generateAndStoreNudges,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  type NudgeContext,
  type SmartNudge,
  type NotificationCreateInput,
  type NudgeTemplate,
} from "./notificationEngine";
