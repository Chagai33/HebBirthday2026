import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle, Loader } from 'lucide-react';

interface GoogleCalendarStatusProps {
  isSynced: boolean;
  onSync?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
}

export const GoogleCalendarStatus: React.FC<GoogleCalendarStatusProps> = ({
  isSynced,
  onSync,
  onRemove,
  isLoading = false
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Loader className="w-4 h-4 animate-spin" />
        <span className="text-xs">{t('googleCalendar.syncing')}</span>
      </div>
    );
  }

  if (isSynced) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700">{t('googleCalendar.synced')}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-600 hover:text-red-800 underline ml-2"
          >
            {t('googleCalendar.remove')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Circle className="w-4 h-4 text-gray-400" />
      <span className="text-xs text-gray-600">{t('googleCalendar.notSynced')}</span>
      {onSync && (
        <button
          onClick={onSync}
          className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
        >
          {t('googleCalendar.sync')}
        </button>
      )}
    </div>
  );
};
