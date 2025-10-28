import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { HebrewBirthdayDate } from '../../types';

interface FutureBirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  futureDates: (string | HebrewBirthdayDate)[];
  birthHebrewYear?: number;
}

export const FutureBirthdaysModal: React.FC<FutureBirthdaysModalProps> = ({
  isOpen,
  onClose,
  name,
  futureDates,
  birthHebrewYear,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'he' ? he : enUS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('birthday.futureBirthdays', 'ימי הולדת עבריים קרובים')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-lg font-medium text-gray-700">
            {name}
          </p>
          <p className="text-sm text-gray-500">
            {t('birthday.next10Years', 'עשר השנים הבאות')}
          </p>
        </div>

        {futureDates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('birthday.noFutureDates', 'אין תאריכים זמינים')}
          </div>
        ) : (
          <div className="space-y-2">
            {futureDates.map((item, index) => {
              const dateStr = typeof item === 'string' ? item : item.gregorian;
              const hebrewYear = typeof item === 'string' ? null : item.hebrewYear;
              const date = new Date(dateStr);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isUpcoming = date >= today;
              const isPast = date < today;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    index === 0 && isUpcoming
                      ? 'bg-blue-50 border-blue-500'
                      : isPast
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Calendar
                    className={`w-5 h-5 ${
                      index === 0 && isUpcoming ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                      {format(date, 'dd MMMM yyyy', { locale })}
                    </p>
                    <p className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                      {format(date, 'EEEE', { locale })}
                    </p>
                    {hebrewYear && birthHebrewYear && (
                      <p className={`text-xs font-semibold ${isPast ? 'text-purple-400' : 'text-purple-600'}`}>
                        {t('birthday.age', 'גיל')}: {hebrewYear - birthHebrewYear}
                      </p>
                    )}
                  </div>
                  {index === 0 && isUpcoming && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                      {t('birthday.next', 'הבא')}
                    </span>
                  )}
                  {isPast && (
                    <span className="px-2 py-1 bg-gray-400 text-white text-xs font-medium rounded">
                      {t('birthday.past', 'עבר')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          {t('common.close', 'סגור')}
        </button>
      </div>
    </div>
  );
};
