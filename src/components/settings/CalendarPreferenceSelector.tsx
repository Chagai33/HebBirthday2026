import { useTranslation } from 'react-i18next';
import { CalendarPreference } from '../../types';
import { calendarPreferenceService } from '../../services/calendarPreference.service';

interface CalendarPreferenceSelectorProps {
  value: CalendarPreference | undefined;
  onChange: (value: CalendarPreference) => void;
  showDescription?: boolean;
  label?: string;
}

export const CalendarPreferenceSelector: React.FC<CalendarPreferenceSelectorProps> = ({
  value,
  onChange,
  showDescription = true,
  label,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as 'he' | 'en';

  const options: CalendarPreference[] = ['gregorian', 'hebrew', 'both'];

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((option) => {
          const optionLabel = calendarPreferenceService.getPreferenceLabel(option)[currentLang];
          const optionDesc = calendarPreferenceService.getPreferenceDescription(option)[currentLang];
          const isSelected = value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`
                relative p-4 border-2 rounded-xl text-start transition-all
                ${isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}
                `}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {optionLabel}
                  </div>
                  {showDescription && (
                    <div className={`text-xs mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                      {optionDesc}
                    </div>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="absolute -top-1 -end-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
