/**
 * Service to handle browser notifications for F1 Live Dashboard.
 */

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  public async sendNotification(title: string, options?: NotificationOptions) {
    if (this.permission === 'granted') {
      const notificationOptions = {
        icon: 'https://media.formula1.com/content/dam/fom-website/manual/Misc/F1_logo.png',
        badge: 'https://media.formula1.com/content/dam/fom-website/manual/Misc/F1_logo.png',
        ...options,
      };

      try {
        // Try to use Service Worker for notifications (required for mobile Chrome)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            await registration.showNotification(title, notificationOptions);
            return;
          }
        }
        
        // Fallback to standard Notification API
        const notification = new Notification(title, notificationOptions);
        notification.onclick = () => {
          window.focus();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
          notification.close();
        };
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  }

  /**
   * Schedules a daily notification at a specific time (e.g., 8:00 AM).
   * Note: This only works while the tab is open. For background pushes, a Service Worker + Backend is needed.
   */
  public scheduleDailyNews(hour: number, minute: number, newsSummary: string) {
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === hour && now.getMinutes() === minute) {
        this.sendNotification('🏎️ F1 今日新聞摘要', {
          body: newsSummary,
          data: { url: '/?tab=ai' } // Redirect to AI Insights for news
        });
      }
    };

    // Check every minute
    setInterval(checkTime, 60000);
    checkTime(); // Initial check
  }

  /**
   * Sends a race update notification.
   */
  public sendRaceUpdate(driverName: string, position: number, gap: string) {
    this.sendNotification(`🏁 賽事即時更新: ${driverName}`, {
      body: `目前排名: P${position} | 與領先者差距: ${gap}`,
      tag: 'race-update', // Overwrite previous race updates
      data: { url: '/?tab=live' }
    });
  }
}

export const notificationService = NotificationService.getInstance();
