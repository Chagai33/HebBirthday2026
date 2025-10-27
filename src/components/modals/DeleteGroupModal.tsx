import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteRecords: boolean) => void;
  groupName: string;
  recordCount: number;
}

export const DeleteGroupModal = ({
  isOpen,
  onClose,
  onConfirm,
  groupName,
  recordCount,
}: DeleteGroupModalProps) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<'keep' | 'delete' | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOption) {
      onConfirm(selectedOption === 'delete');
      setSelectedOption(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('modals.deleteGroup.title', 'מחיקת קבוצה')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {groupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            {t('modals.deleteGroup.message', { count: recordCount })}
          </p>
          {recordCount > 0 && (
            <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              {t('modals.deleteGroup.warning', 'בקבוצה זו יש {{count}} רשומות ימי הולדת', { count: recordCount })}
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedOption('keep')}
            className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
              selectedOption === 'keep'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={selectedOption === 'keep'}
                onChange={() => setSelectedOption('keep')}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  {t('modals.deleteGroup.keepRecords', 'מחק רק את הקבוצה')}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('modals.deleteGroup.keepRecordsDesc', 'הרשומות יישארו במערכת ללא שיוך לקבוצה')}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedOption('delete')}
            className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
              selectedOption === 'delete'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={selectedOption === 'delete'}
                onChange={() => setSelectedOption('delete')}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-red-700">
                  {t('modals.deleteGroup.deleteAll', 'מחק את הקבוצה וכל הרשומות')}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('modals.deleteGroup.deleteAllDesc', 'כל ימי ההולדת בקבוצה זו יימחקו לצמיתות')}
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            {t('common.cancel', 'ביטול')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.delete', 'מחיקה')}
          </button>
        </div>
      </div>
    </div>
  );
};
