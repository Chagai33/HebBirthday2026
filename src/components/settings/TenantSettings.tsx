import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import { CalendarPreferenceSelector } from './CalendarPreferenceSelector';
import { CalendarPreference } from '../../types';
import { Settings, Save, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../common/Toast';

interface TenantSettingsProps {
  onClose: () => void;
}

export const TenantSettings: React.FC<TenantSettingsProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { currentTenant, updateTenant } = useTenant();
  const { toasts, hideToast, success, error } = useToast();

  const [preference, setPreference] = useState<CalendarPreference>(
    currentTenant?.default_calendar_preference || 'both'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    try {
      await updateTenant(currentTenant.id, {
        default_calendar_preference: preference,
      });
      success(t('messages.tenantUpdated'));
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      error(t('common.error'));
      console.error('Error updating tenant settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentTenant) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('tenant.settings')}
                </h2>
                <p className="text-sm text-gray-600">{currentTenant.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    {t('tenant.defaultCalendarPreference')}
                  </h3>
                  <p className="text-sm text-blue-800">
                    {t('tenant.preferenceDescription')}
                  </p>
                </div>
              </div>
            </div>

            <CalendarPreferenceSelector
              value={preference}
              onChange={setPreference}
              showDescription={true}
              label={t('birthday.calendarPreference')}
            />

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <h4 className="font-semibold text-gray-900">
                {t('common.notes', 'Notes')}:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('settings.note1', 'This setting applies to all groups in this tenant by default')}</li>
                <li>{t('settings.note2', 'Groups can override this with their own preference')}</li>
                <li>{t('settings.note3', 'Individual records can override group preferences')}</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
};
