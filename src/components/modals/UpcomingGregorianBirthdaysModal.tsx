import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Birthday } from '../../types';

interface UpcomingGregorianBirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthday: Birthday;
}

export const UpcomingGregorianBirthdaysModal: React.FC<UpcomingGregorianBirthdaysModalProps> = ({
  isOpen,
  onClose,
  birthday,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'he' ? he : enUS;

  if (!isOpen) return null;

  const birthDate = new Date(birthday.birth_date_gregorian);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureBirthdays = [];
  for (let i = 0; i < 10; i++) {
    const nextBirthday = addYears(birthDate, birthDate.getFullYear() - today.getFullYear() + i);
    nextBirthday.setFullYear(today.getFullYear() + i);

    const age = nextBirthday.getFullYear() - birthDate.getFullYear();
    const hebrewBirthday = birthday.future_hebrew_birthdays?.[i];

    futureBirthdays.push({
      gregorianDate: nextBirthday,
      age,
      hebrewDate: hebrewBirthday?.gregorian ? new Date(hebrewBirthday.gregorian) : null,
      hebrewYear: hebrewBirthday?.hebrewYear,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('birthday.upcomingGregorianBirthdays', 'ימי הולדת לועזיים קרובים')}
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
            {birthday.first_name} {birthday.last_name}
          </p>
          <p className="text-sm text-gray-500">
            {t('birthday.next10Years')}
          </p>
        </div>

        <div className="space-y-2">
          {futureBirthdays.map((item, index) => {
            const date = item.gregorianDate;
            const isUpcoming = date >= today;
            const isPast = date < today;
            const isNext = index === 0 && isUpcoming;

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  isNext
                    ? 'bg-blue-50 border-blue-500'
                    : isPast
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Calendar
                    className={`w-5 h-5 mt-0.5 ${
                      isNext ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                        {format(date, 'dd/MM/yyyy', { locale })}
                      </p>
                      {isNext && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                          {t('birthday.next')}
                        </span>
                      )}
                      {isPast && (
                        <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-medium rounded">
                          {t('birthday.past')}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                      {format(date, 'EEEE', { locale })}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className={`text-sm font-semibold ${isPast ? 'text-blue-400' : 'text-blue-600'}`}>
                        {t('birthday.ageAtNextGregorian')}: {item.age}
                      </p>
                      {item.hebrewDate && (
                        <p className={`text-xs ${isPast ? 'text-purple-400' : 'text-purple-600'}`}>
                          {t('birthday.hebrewDate')}: {format(item.hebrewDate, 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};
