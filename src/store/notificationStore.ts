/**
 * Notification store for user feedback and toast messages
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 means persistent
  timestamp: Date;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  clearNotificationsByType: (type: Notification['type']) => void;
}

// Generate unique notification ID
const generateNotificationId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date(),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };
    
    set(state => ({
      notifications: [...state.notifications, newNotification],
    }));
    
    // Auto-remove notification after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  },
  
  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(notification => notification.id !== id),
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  },
  
  clearNotificationsByType: (type) => {
    set(state => ({
      notifications: state.notifications.filter(notification => notification.type !== type),
    }));
  },
}));

// Memoized selector to prevent infinite loops
const notificationStoreSelector = (state: NotificationStore) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
});

// Convenience hooks for different notification types
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useNotificationStore(useShallow(notificationStoreSelector));
  
  return {
    notifications,
    removeNotification,
    clearNotifications,
    
    // Convenience methods for different types
    showSuccess: (title: string, message?: string, duration?: number) => {
      addNotification({ type: 'success', title, message, duration });
    },
    
    showError: (title: string, message?: string, duration?: number) => {
      addNotification({ type: 'error', title, message, duration: duration ?? 0 }); // Errors are persistent by default
    },
    
    showWarning: (title: string, message?: string, duration?: number) => {
      addNotification({ type: 'warning', title, message, duration });
    },
    
    showInfo: (title: string, message?: string, duration?: number) => {
      addNotification({ type: 'info', title, message, duration });
    },
  };
};

export default useNotificationStore;