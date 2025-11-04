import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Loader } from 'lucide-react';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { format } from 'date-fns';

export const GoogleCalendarButton: React.FC = () => {
  const { t } = useTranslation();
  const { isConnected, lastSyncTime, isSyncing, connectToGoogle } = useGoogleCalendar();

  const handleConnect = async () => {
    try {
      await connectToGoogle();
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Check className="w-5 h-5 text-green-600" />
        <div className="text-sm">
          <div className="font-medium text-green-900">{t('googleCalendar.connected')}</div>
          {lastSyncTime && (
            <div className="text-green-700">
              {t('googleCalendar.lastSync')}: {format(lastSyncTime, 'dd/MM/yyyy HH:mm')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isSyncing ? (
        <Loader className="w-5 h-5 animate-spin" />
      ) : (
        <Calendar className="w-5 h-5" />
      )}
      <span>{t('googleCalendar.connect')}</span>
    </button>
  );
};
