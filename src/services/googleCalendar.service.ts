import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import { SyncResult, BulkSyncResult, GoogleCalendarSyncStatus } from '../types';
import { logger } from '../utils/logger';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const googleCalendarService = {
  initiateGoogleOAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const client = google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          ux_mode: 'popup',
          callback: (response: any) => {
            if (response.code) {
              resolve(response.code);
            } else {
              reject(new Error('לא התקבל קוד אימות מ-Google'));
            }
          },
          error_callback: (error: any) => {
            logger.error('Google OAuth error:', error);
            reject(new Error('שגיאה באימות Google'));
          }
        });

        client.requestCode();
      } catch (error) {
        logger.error('Error initiating Google OAuth:', error);
        reject(error);
      }
    });
  },

  async exchangeAuthCode(code: string): Promise<void> {
    try {
      const exchangeFunction = httpsCallable<{ code: string }, { success: boolean; message: string }>(
        functions,
        'exchangeGoogleAuthCode'
      );

      const result = await exchangeFunction({ code });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בחיבור ליומן Google');
      }

      logger.log('Successfully connected to Google Calendar');
    } catch (error: any) {
      logger.error('Error exchanging auth code:', error);
      throw new Error(error.message || 'שגיאה בחיבור ליומן Google');
    }
  },

  async syncBirthdayToCalendar(birthdayId: string): Promise<SyncResult> {
    try {
      const syncFunction = httpsCallable<
        { birthdayId: string },
        { success: boolean; eventId: string; birthdayId: string; message: string }
      >(functions, 'syncBirthdayToGoogleCalendar');

      const result = await syncFunction({ birthdayId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בסנכרון');
      }

      return {
        success: true,
        eventId: result.data.eventId,
        birthdayId: result.data.birthdayId
      };
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בסנכרון ליומן',
        birthdayId
      };
    }
  },

  async syncMultipleBirthdays(birthdayIds: string[]): Promise<BulkSyncResult> {
    try {
      const syncFunction = httpsCallable<
        { birthdayIds: string[] },
        { totalAttempted: number; successCount: number; failureCount: number; results: any[]; message: string }
      >(functions, 'syncMultipleBirthdaysToGoogleCalendar');

      const result = await syncFunction({ birthdayIds });

      return {
        totalAttempted: result.data.totalAttempted,
        successCount: result.data.successCount,
        failureCount: result.data.failureCount,
        results: result.data.results
      };
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      throw new Error(error.message || 'שגיאה בסנכרון מרובה');
    }
  },

  async removeBirthdayFromCalendar(birthdayId: string): Promise<void> {
    try {
      const removeFunction = httpsCallable<{ birthdayId: string }, { success: boolean; message: string }>(
        functions,
        'removeBirthdayFromGoogleCalendar'
      );

      const result = await removeFunction({ birthdayId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בהסרה');
      }

      logger.log('Successfully removed birthday from Google Calendar');
    } catch (error: any) {
      logger.error('Error removing birthday:', error);
      throw new Error(error.message || 'שגיאה בהסרת יום ההולדת מהיומן');
    }
  },

  async disconnectCalendar(): Promise<void> {
    try {
      const disconnectFunction = httpsCallable<void, { success: boolean; message: string }>(
        functions,
        'disconnectGoogleCalendar'
      );

      const result = await disconnectFunction();

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בניתוק');
      }

      logger.log('Successfully disconnected from Google Calendar');
    } catch (error: any) {
      logger.error('Error disconnecting calendar:', error);
      throw new Error(error.message || 'שגיאה בניתוק מיומן Google');
    }
  },

  async getTokenStatus(userId: string): Promise<GoogleCalendarSyncStatus> {
    try {
      const tokenDoc = await getDoc(doc(db, 'googleCalendarTokens', userId));

      if (!tokenDoc.exists()) {
        return {
          isConnected: false,
          lastSyncTime: null,
          syncedBirthdaysCount: 0
        };
      }

      const tokenData = tokenDoc.data();
      const createdAt = tokenData.createdAt?.toDate?.()?.toISOString() || null;

      return {
        isConnected: true,
        lastSyncTime: createdAt,
        syncedBirthdaysCount: 0
      };
    } catch (error) {
      logger.error('Error getting token status:', error);
      return {
        isConnected: false,
        lastSyncTime: null,
        syncedBirthdaysCount: 0
      };
    }
  }
};
