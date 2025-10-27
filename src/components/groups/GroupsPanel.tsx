import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootGroups, useChildGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useInitializeRootGroups } from '../../hooks/useGroups';
import { Layout } from '../layout/Layout';
import { Group } from '../../types';
import { Plus, Edit, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

export const GroupsPanel = () => {
  const { t } = useTranslation();
  const { data: rootGroups = [], isLoading } = useRootGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const initializeRootGroups = useInitializeRootGroups();
  const { toasts, hideToast, success, error } = useToast();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: GROUP_COLORS[0],
  });

  useEffect(() => {
    if (rootGroups.length > 0) {
      setExpandedCategories(new Set(rootGroups.map(g => g.id)));
    }
  }, [rootGroups]);

  useEffect(() => {
    if (rootGroups.length === 0 && !isLoading) {
      initializeRootGroups.mutate('he');
    }
  }, [rootGroups.length, isLoading, initializeRootGroups]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleOpenForm = (parentId: string, group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        color: group.color,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        color: GROUP_COLORS[0],
      });
    }
    setSelectedParentId(parentId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGroup(null);
    setSelectedParentId(null);
    setFormData({
      name: '',
      color: GROUP_COLORS[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          groupId: editingGroup.id,
          data: formData,
        });
        success(t('groups.groupUpdated'));
      } else if (selectedParentId) {
        await createGroup.mutateAsync({
          name: formData.name,
          parentId: selectedParentId,
          color: formData.color,
        });
        success(t('groups.groupCreated'));
      }
      handleCloseForm();
    } catch (err) {
      error(t('common.error'));
      console.error('Error saving group:', err);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await deleteGroup.mutateAsync(groupId);
        success(t('groups.groupDeleted'));
      } catch (err) {
        error(t('common.error'));
        console.error('Error deleting group:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 px-2 sm:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('groups.manageGroups')}</h2>
        </div>

        <div className="space-y-3">
          {rootGroups.map((rootGroup) => (
            <CategorySection
              key={rootGroup.id}
              rootGroup={rootGroup}
              isExpanded={expandedCategories.has(rootGroup.id)}
              onToggle={() => toggleCategory(rootGroup.id)}
              onAddGroup={() => handleOpenForm(rootGroup.id)}
              onEditGroup={(group) => handleOpenForm(rootGroup.id, group)}
              onDeleteGroup={handleDelete}
            />
          ))}
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingGroup ? t('groups.editGroup') : t('groups.addGroup')}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('groups.groupName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('groups.groupName')}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('groups.groupColor')}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createGroup.isPending || updateGroup.isPending}
                    className="px-3 sm:px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createGroup.isPending || updateGroup.isPending
                      ? t('common.loading')
                      : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </Layout>
  );
};

interface CategorySectionProps {
  rootGroup: Group;
  isExpanded: boolean;
  onToggle: () => void;
  onAddGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
}

const CategorySection = ({
  rootGroup,
  isExpanded,
  onToggle,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}: CategorySectionProps) => {
  const { t } = useTranslation();
  const { data: childGroups = [], isLoading } = useChildGroups(isExpanded ? rootGroup.id : null);

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderLeftColor: rootGroup.color, borderLeftWidth: '4px' }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
            style={{ backgroundColor: rootGroup.color }}
          />
          <h3 className="font-bold text-gray-900 text-base sm:text-lg">{rootGroup.name}</h3>
          {childGroups.length > 0 && (
            <span className="text-xs sm:text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {childGroups.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddGroup();
            }}
            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('groups.addGroup')}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-2 sm:p-3 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : childGroups.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm text-gray-500 mb-3">
                {t('groups.noGroups', { category: rootGroup.name })}
              </p>
              <button
                onClick={onAddGroup}
                className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('groups.addGroup')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {childGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditGroup(group)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGroup(group.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
