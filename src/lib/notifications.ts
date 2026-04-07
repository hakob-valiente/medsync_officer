import { supabase } from './supabase';

/**
 * List of available Notification Types for MedSync application:
 * 
 * 1. appointment          - Related to scheduling or declining appointments.
 * 2. profile_update        - Triggered when a user's health profile is updated by the admin.
 * 3. medical_cert         - Triggered when a medical certificate request status is updated (e.g., approved/completed).
 * 4. medicine_request      - Triggered when a medicine request status is updated (e.g., accepted/dispensed).
 * 5. inquiry_reply         - Triggered when the administrator responds to a student inquiry.
 * 6. duty_assignment       - Triggered when a user is assigned as an officer or their duty settings change.
 * 7. campus_clinic_added   - Broadcast notification when a new campus or clinic facility is added.
 * 8. general               - Used for generic system-wide announcements or miscellaneous alerts.
 */
export type NotificationType = 
  | 'appointment' 
  | 'appointment_accepted'
  | 'appointment_declined'
  | 'profile_update' 
  | 'medical_cert' 
  | 'medical_cert_completed'
  | 'medical_cert_pending'
  | 'medical_cert_rejected'
  | 'medicine_request' 
  | 'medicine_request_pending'
  | 'medicine_request_accepted'
  | 'medicine_request_rejected'
  | 'medicine_request_dispensed'
  | 'inquiry_reply' 
  | 'duty_assignment' 
  | 'visit_record_added'
  | 'visit_record_updated'
  | 'account_created'
  | 'campus_clinic_added' 
  | 'general';

export type TargetType = 'INDIVIDUAL' | 'ALL' | 'GROUP';

interface CreateNotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  targetType: TargetType;
  userId?: string | null;
  targetId?: string | null;
  targetCriteria?: Record<string, any> | null;
}

/**
 * Creates a notification in the database with the new targeting logic.
 * 
 * Target Types:
 * - INDIVIDUAL: Requires user_id. Use for private alerts.
 * - ALL: user_id is null. Rows is visible to everyone.
 * - GROUP: user_id is null. Targets based on targetCriteria (e.g. course, year_level).
 */
export const createNotification = async ({
  title,
  message,
  type,
  targetType,
  userId = null,
  targetId = null,
  targetCriteria = null
}: CreateNotificationParams) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          title,
          message,
          notification_type: type,
          target_type: targetType,
          user_id: userId,
          target_id: targetId,
          target_criteria: targetCriteria,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Convenience function for specific individual notifications
 */
export const notifyIndividual = async (userId: string, title: string, message: string, type: NotificationType, targetId?: string) => {
  return createNotification({
    title,
    message,
    type,
    targetType: 'INDIVIDUAL',
    userId,
    targetId
  });
};

/**
 * Convenience function to notify ALL users (Broadcasting)
 * No longer needs bulk insertion - one row suffices for the entire population.
 */
export const notifyAllUsers = async (title: string, message: string, type: NotificationType, targetId?: string) => {
  return createNotification({
    title,
    message,
    type,
    targetType: 'ALL',
    targetId
  });
};

/**
 * Convenience function to notify a GROUP of users (e.g. by Year Level or Course)
 */
export const notifyGroup = async (criteria: Record<string, any>, title: string, message: string, type: NotificationType, targetId?: string) => {
  return createNotification({
    title,
    message,
    type,
    targetType: 'GROUP',
    targetCriteria: criteria,
    targetId
  });
};
/**
 * Marks a notification as read (for administrators).
 */
export const markAdminNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('admin_notification_reads')
      .upsert({
        notification_id: notificationId,
        read_at: new Date().toISOString()
      }, { onConflict: 'notification_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking admin notification as read:', error);
    return false;
  }
};

/**
 * Fetches all read notification IDs for administrators.
 */
export const fetchAdminReadNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_notification_reads')
      .select('notification_id');

    if (error) throw error;
    return data.map(row => row.notification_id);
  } catch (error) {
    console.error('Error fetching admin read notifications:', error);
    return [];
  }
};
