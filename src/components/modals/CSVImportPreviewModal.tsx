import { logger } from "../../utils/logger";
import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Upload, FileText, Users, Plus, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CSVBirthdayRow, ValidationResult } from '../../types';
import { useGroups, useCreateGroup } from '../../hooks/useGroups';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface CSVImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CSVBirthdayRow[];
  onConfirm: (selectedRows: CSVBirthdayRow[], defaultGroupId?: string) => Promise<void>;
}

export const CSVImportPreviewModal = ({
  isOpen,
  onClose,
  data,
  onConfirm,
}: CSVImportPreviewModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { data: allGroups = [], refetch: refetchGroups } = useGroups();
  const createGroup = useCreateGroup();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string>('');
  const [rowGroupIds, setRowGroupIds] = useState<Map<number, string>>(new Map());
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParentGroup, setSelectedParentGroup] = useState<string>('');

  useEffect(() => {
    if (isOpen && data.length > 0) {
      const allValid = new Set(
        data
          .map((_, index) => index)
          .filter((index) => !data[index].validationErrors || data[index].validationErrors!.length === 0)
      );
      setSelectedRows(allValid);

      const results = data.map((row, index) => ({
        index,
        isValid: !row.validationErrors || row.validationErrors.length === 0,
        errors: row.validationErrors || [],
        warnings: row.warnings || [],
        isDuplicate: row.isDuplicate || false,
      }));
      setValidationResults(results);

      const initialRowGroups = new Map<number, string>();
      data.forEach((row, index) => {
        if (row.groupId) {
          initialRowGroups.set(index, row.groupId);
        }
      });
      setRowGroupIds(initialRowGroups);
    }
  }, [isOpen, data]);

  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);

  if (!isOpen) return null;

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === validationResults.filter(r => r.isValid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validationResults.filter(r => r.isValid).map(r => r.index)));
    }
  };

  const handleConfirm = async () => {
    setIsImporting(true);
    try {
      const rowsToImport = Array.from(selectedRows).map((index) => {
        const row = data[index];
        const rowGroupId = rowGroupIds.get(index) || row.groupId;
        if (rowGroupId) {
          return { ...row, groupId: rowGroupId };
        } else if (defaultGroupId) {
          return { ...row, groupId: defaultGroupId };
        }
        return row;
      });
      await onConfirm(rowsToImport, defaultGroupId);
      onClose();
    } catch (error) {
      logger.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedParentGroup) return;

    try {
      await createGroup.mutateAsync({
        name: newGroupName.trim(),
        parentId: selectedParentGroup,
      });
      await refetchGroups();
      setNewGroupName('');
      setSelectedParentGroup('');
      setShowGroupCreator(false);
    } catch (error) {
      logger.error('Failed to create group:', error);
      alert(t('common.error'));
    }
  };

  const updateRowGroup = (rowIndex: number, groupId: string) => {
    const newMap = new Map(rowGroupIds);
    if (groupId) {
      newMap.set(rowIndex, groupId);
    } else {
      newMap.delete(rowIndex);
    }
    setRowGroupIds(newMap);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.length - validCount;
  const duplicateCount = validationResults.filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('csvImport.previewTitle', 'תצוגה מקדימה - ייבוא קובץ')}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {t('csvImport.reviewData', 'בדוק את הנתונים לפני הייבוא')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600 font-medium">
                  {t('csvImport.totalRows', 'סך הכל שורות')}
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.length}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600 font-medium">
                  {t('csvImport.validRows', 'שורות תקינות')}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-700">{validCount}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-600 font-medium">
                  {t('csvImport.invalidRows', 'שורות לא תקינות')}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <p className="text-xs text-gray-600 font-medium">
                  {t('csvImport.duplicates', 'כפילויות אפשריות')}
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{duplicateCount}</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 bg-blue-50 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('csvImport.defaultGroup', 'קבוצת ברירת מחדל לכל הרשומות')}
              </label>
              <select
                value={defaultGroupId}
                onChange={(e) => setDefaultGroupId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">
                  {t('csvImport.noDefaultGroup', 'ללא קבוצת ברירת מחדל')}
                </option>
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
              <p className="text-xs text-gray-600 mt-1">
                {t('csvImport.groupNote', 'קבוצה זו תוחל על כל הרשומות שלא הוגדרה להן קבוצה בקובץ')}
              </p>
            </div>
            <button
              onClick={() => setShowGroupCreator(!showGroupCreator)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('csvImport.createGroup', 'צור קבוצה')}
            </button>
          </div>

          {showGroupCreator && (
            <div className="bg-white rounded-lg p-4 border border-gray-300 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FolderPlus className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">
                  {t('csvImport.createSubgroupTitle', 'צור תת-קבוצה')}
                </h3>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {t('csvImport.createSubgroupHint', 'צור תת-קבוצה תחת משפחה/חברים/עבודה, למשל: "יחיאל" תחת "משפחה"')}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('csvImport.subgroupNameLabel', 'שם התת-קבוצה')} *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newGroupName.trim() && selectedParentGroup) {
                        handleCreateGroup();
                      }
                    }}
                    placeholder={t('csvImport.subgroupPlaceholder', 'למשל: יחיאל, עמיתי צוות, וכו...')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('csvImport.underWhichGroup', 'תחת איזו קבוצה ראשית?')} *
                  </label>
                  <select
                    value={selectedParentGroup}
                    onChange={(e) => setSelectedParentGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  >
                    <option value="">{t('birthday.selectGroup')}</option>
                    {rootGroups.map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || !selectedParentGroup || createGroup.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {createGroup.isPending ? t('common.loading', 'טוען...') : t('csvImport.addSubgroup', 'הוסף תת-קבוצה')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupCreator(false);
                    setNewGroupName('');
                    setSelectedParentGroup('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {t('common.close', 'סגור')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRows.size === validCount && validCount > 0}
                onChange={toggleAll}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('csvImport.selectAll', 'בחר הכל')} ({selectedRows.size} {t('csvImport.selected', 'נבחרו')})
              </span>
            </label>
          </div>

          <div className="space-y-3">
            {data.map((row, index) => {
              const validation = validationResults[index];
              const isSelected = selectedRows.has(index);
              const hasErrors = validation && !validation.isValid;
              const hasWarnings = validation && validation.warnings.length > 0;

              return (
                <div
                  key={index}
                  className={`border rounded-xl p-4 transition-all ${
                    hasErrors
                      ? 'border-red-300 bg-red-50'
                      : hasWarnings
                      ? 'border-yellow-300 bg-yellow-50'
                      : validation?.isDuplicate
                      ? 'border-orange-300 bg-orange-50'
                      : isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(index)}
                        disabled={hasErrors}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.firstName', 'שם פרטי')}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {row.firstName || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.lastName', 'שם משפחה')}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {row.lastName || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.birthDate', 'תאריך לידה')}
                          </p>
                          <p className="text-sm text-gray-900 truncate">
                            {row.birthDate || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.gender', 'מגדר')}
                          </p>
                          <p className="text-sm text-gray-900">
                            {row.gender ? t(`gender.${row.gender}`, row.gender) : '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.afterSunset', 'אחרי שקיעה')}
                          </p>
                          <p className="text-sm text-gray-900">
                            {row.afterSunset ? t('common.yes', 'כן') : t('common.no', 'לא')}
                          </p>
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 font-medium mb-1">
                          <Users className="w-3 h-3 inline me-1" />
                          {t('csvImport.rowGroup', 'קבוצה')}
                        </label>
                        <select
                          value={rowGroupIds.get(index) || row.groupId || ''}
                          onChange={(e) => updateRowGroup(index, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">
                            {t('csvImport.noGroup', 'ללא קבוצה (ישתמש בברירת מחדל)')}
                          </option>
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
                      </div>

                      {validation && (validation.errors.length > 0 || validation.warnings.length > 0 || validation.isDuplicate) && (
                        <div className="space-y-1 mt-3">
                          {validation.errors.map((error, i) => (
                            <div key={`error-${i}`} className="flex items-start gap-2 text-xs text-red-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{error}</span>
                            </div>
                          ))}

                          {validation.warnings.map((warning, i) => (
                            <div key={`warning-${i}`} className="flex items-start gap-2 text-xs text-yellow-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{warning}</span>
                            </div>
                          ))}

                          {validation.isDuplicate && (
                            <div className="flex items-start gap-2 text-xs text-orange-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{t('csvImport.duplicateWarning', 'ייתכן שרשומה זו כבר קיימת במערכת')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            {t('common.cancel', 'ביטול')}
          </button>

          <button
            onClick={handleConfirm}
            disabled={selectedRows.size === 0 || isImporting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('csvImport.importing', 'מייבא...')}</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>
                  {t('csvImport.import', 'ייבא')} ({selectedRows.size})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
