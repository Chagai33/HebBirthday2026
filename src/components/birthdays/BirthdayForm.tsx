import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { BirthdayFormData, Gender, Birthday } from '../../types';
import { useCreateBirthday, useUpdateBirthday, useCheckDuplicates } from '../../hooks/useBirthdays';
import { useGroups } from '../../hooks/useGroups';
import { DuplicateVerificationModal } from '../modals/DuplicateVerificationModal';
import { SunsetVerificationModal } from '../modals/SunsetVerificationModal';
import { GenderVerificationModal } from '../modals/GenderVerificationModal';
import { X, Save } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';

interface BirthdayFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editBirthday?: Birthday | null;
  defaultGroupId?: string;
}

export const BirthdayForm = ({
  onClose,
  onSuccess,
  editBirthday,
  defaultGroupId,
}: BirthdayFormProps) => {
  const { t } = useTranslation();
  const createBirthday = useCreateBirthday();
  const updateBirthday = useUpdateBirthday();
  const checkDuplicates = useCheckDuplicates();
  const { data: allGroups = [] } = useGroups();
  const { toasts, hideToast, success: showSuccess, error: showError } = useToast();

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSunsetModal, setShowSunsetModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [duplicates, setDuplicates] = useState<Birthday[]>([]);
  const [pendingData, setPendingData] = useState<BirthdayFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BirthdayFormData>({
    defaultValues: editBirthday
      ? {
          firstName: editBirthday.first_name,
          lastName: editBirthday.last_name,
          birthDateGregorian: new Date(editBirthday.birth_date_gregorian),
          afterSunset: editBirthday.after_sunset,
          gender: editBirthday.gender,
          groupId: editBirthday.group_id,
          notes: editBirthday.notes,
        }
      : {
          groupId: defaultGroupId || '',
        },
  });

  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);

  const finalSubmit = async (data: BirthdayFormData) => {
    try {
      if (editBirthday) {
        await updateBirthday.mutateAsync({
          birthdayId: editBirthday.id,
          data,
        });
        showSuccess(t('messages.birthdayUpdated'));
      } else {
        await createBirthday.mutateAsync(data);
        showSuccess(t('messages.birthdayAdded'));
      }
      onSuccess();
      onClose();
    } catch (error) {
      showError(t('common.error'));
      console.error('Error saving birthday:', error);
    }
  };

  const onSubmit = async (data: BirthdayFormData) => {
    if (!data.groupId) {
      showError(t('birthday.selectGroup'));
      return;
    }

    if (!editBirthday) {
      const result = await checkDuplicates.mutateAsync({
        groupId: data.groupId,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (result && result.length > 0) {
        setDuplicates(result);
        setPendingData(data);
        setShowDuplicateModal(true);
        return;
      }
    }

    if (data.afterSunset === undefined) {
      setPendingData(data);
      setShowSunsetModal(true);
      return;
    }

    if (!data.gender) {
      setPendingData(data);
      setShowGenderModal(true);
      return;
    }

    await finalSubmit(data);
  };

  const handleDuplicateConfirm = () => {
    setShowDuplicateModal(false);
    if (pendingData) {
      if (pendingData.afterSunset === undefined) {
        setShowSunsetModal(true);
      } else if (!pendingData.gender) {
        setShowGenderModal(true);
      } else {
        finalSubmit(pendingData);
      }
    }
  };

  const handleSunsetConfirm = (afterSunset: boolean) => {
    setShowSunsetModal(false);
    if (pendingData) {
      const updatedData = { ...pendingData, afterSunset };
      setPendingData(updatedData);

      if (!updatedData.gender) {
        setShowGenderModal(true);
      } else {
        finalSubmit(updatedData);
      }
    }
  };

  const handleGenderConfirm = (gender: Gender) => {
    setShowGenderModal(false);
    if (pendingData) {
      const updatedData = { ...pendingData, gender };
      finalSubmit(updatedData);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
              {editBirthday ? t('birthday.editBirthday') : t('birthday.addBirthday')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('birthday.firstName')} *
                </label>
                <input
                  {...register('firstName', {
                    required: t('validation.required'),
                  })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('birthday.lastName')} *
                </label>
                <input
                  {...register('lastName', {
                    required: t('validation.required'),
                  })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('birthday.birthDate')} *
              </label>
              <input
                type="date"
                {...register('birthDateGregorian', {
                  required: t('validation.required'),
                  valueAsDate: true,
                })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.birthDateGregorian && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.birthDateGregorian.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('birthday.group')} *
              </label>
              <select
                {...register('groupId', { required: t('validation.required') })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('birthday.selectGroup')}</option>
                {rootGroups.map((root) => {
                  const children = childGroups.filter(c => c.parent_id === root.id);
                  return (
                    <optgroup key={root.id} label={root.name}>
                      {children.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {errors.groupId && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.groupId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('birthday.gender')}
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('common.select')}</option>
                  <option value="male">{t('common.male')}</option>
                  <option value="female">{t('common.female')}</option>
                  <option value="other">{t('common.other')}</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('afterSunset')}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {t('birthday.afterSunset')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('birthday.notes')}
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createBirthday.isPending || updateBirthday.isPending}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                {createBirthday.isPending || updateBirthday.isPending
                  ? t('common.loading')
                  : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DuplicateVerificationModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={handleDuplicateConfirm}
        duplicates={duplicates}
      />

      <SunsetVerificationModal
        isOpen={showSunsetModal}
        onClose={() => setShowSunsetModal(false)}
        onConfirm={handleSunsetConfirm}
      />

      <GenderVerificationModal
        isOpen={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        onConfirm={handleGenderConfirm}
      />

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
