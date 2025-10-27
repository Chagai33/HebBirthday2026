import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users } from 'lucide-react';
import { Gender } from '../../types';

interface GenderVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gender: Gender) => void;
}

export const GenderVerificationModal: React.FC<GenderVerificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('modals.genderVerification.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          {t('modals.genderVerification.message')}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm('male')}
            className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 font-medium transition-colors text-start"
          >
            {t('common.male')}
          </button>
          <button
            onClick={() => onConfirm('female')}
            className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 font-medium transition-colors text-start"
          >
            {t('common.female')}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};
