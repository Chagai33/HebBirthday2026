import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { googleCalendarService } from '../services/googleCalendar.service';
import { useAuth } from './AuthContext';
import { GoogleCalendarContextType, SyncResult, BulkSyncResult } from '../types';
import { logger } from '../utils/logger';
import { useToast } from './ToastContext';

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export const useGoogleCalendar = () => {
  const context = useContext(GoogleCalendarContext);
  if (!context) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};

interface GoogleCalendarProviderProps {
  children: ReactNode;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const GoogleCalendarProvider: React.FC<GoogleCalendarProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      setIsConnected(false);
      setLastSyncTime(null);
    }
  }, [user]);

  const refreshStatus = async () => {
    if (!user) return;

    try {
      const status = await googleCalendarService.getTokenStatus(user.id);
      setIsConnected(status.isConnected);

      if (status.lastSyncTime) {
        setLastSyncTime(new Date(status.lastSyncTime));
      }
    } catch (error) {
      logger.error('Error refreshing Google Calendar status:', error);
    }
  };

  const connectToGoogle = async () => {
    try {
      setIsSyncing(true);
      const code = await googleCalendarService.initiateGoogleOAuth();
      await googleCalendarService.exchangeAuthCode(code);

      setIsConnected(true);
      setLastSyncTime(new Date());
      showToast('החיבור ליומן Google הושלם בהצלחה', 'success');
    } catch (error: any) {
      logger.error('Error connecting to Google Calendar:', error);
      showToast(error.message || 'שגיאה בחיבור ליומן Google', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleBirthday = async (birthdayId: string): Promise<SyncResult> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.syncBirthdayToCalendar(birthdayId);

      if (result.success) {
        setLastSyncTime(new Date());
        showToast('יום ההולדת נוסף ליומן Google בהצלחה', 'success');
      } else {
        showToast(result.error || 'שגיאה בסנכרון', 'error');
      }

      return result;
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      showToast(error.message || 'שגיאה בסנכרון', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncMultipleBirthdays = async (birthdayIds: string[]): Promise<BulkSyncResult> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.syncMultipleBirthdays(birthdayIds);

      setLastSyncTime(new Date());
      showToast(`סונכרנו ${result.successCount} ימי הולדת בהצלחה`, 'success');

      return result;
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      showToast(error.message || 'שגיאה בסנכרון מרובה', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const removeBirthdayFromCalendar = async (birthdayId: string): Promise<void> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      await googleCalendarService.removeBirthdayFromCalendar(birthdayId);
      showToast('יום ההולדת הוסר מיומן Google', 'success');
    } catch (error: any) {
      logger.error('Error removing birthday:', error);
      showToast(error.message || 'שגיאה בהסרת יום ההולדת', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      setIsSyncing(true);
      await googleCalendarService.disconnectCalendar();

      setIsConnected(false);
      setLastSyncTime(null);
      showToast('החיבור ליומן Google נותק בהצלחה', 'success');
    } catch (error: any) {
      logger.error('Error disconnecting:', error);
      showToast(error.message || 'שגיאה בניתוק החיבור', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const value: GoogleCalendarContextType = {
    isConnected,
    lastSyncTime,
    isSyncing,
    connectToGoogle,
    syncSingleBirthday,
    syncMultipleBirthdays,
    removeBirthdayFromCalendar,
    disconnect,
    refreshStatus
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>
    </GoogleOAuthProvider>
  );
};
