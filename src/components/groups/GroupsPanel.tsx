import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootGroups, useChildGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useInitializeRootGroups } from '../../hooks/useGroups';
import { groupService } from '../../services/group.service';
import { Layout } from '../layout/Layout';
import { Group } from '../../types';
import { Plus, Edit, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import { DeleteGroupModal } from '../modals/DeleteGroupModal';

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
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null);
  const [deleteRecordCount, setDeleteRecordCount] = useState(0);
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

  const handleDeleteClick = async (group: Group) => {
    try {
      const count = await groupService.getGroupBirthdaysCount(group.id);
      setDeleteRecordCount(count);
      setDeletingGroup({ id: group.id, name: group.name });
    } catch (err) {
      error(t('common.error'));
      console.error('Error getting birthdays count:', err);
    }
  };

  const handleDeleteConfirm = async (deleteBirthdays: boolean) => {
    if (!deletingGroup) return;

    try {
      await deleteGroup.mutateAsync({
        groupId: deletingGroup.id,
        deleteBirthdays,
      });
      success(t('groups.groupDeleted'));
      setDeletingGroup(null);
    } catch (err) {
      error(t('common.error'));
      console.error('Error deleting group:', err);
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('groups.manageGroups')}</h2>
          <p className="text-gray-600 mt-2">{t('groups.manageDescription', 'ארגן את אנשי הקשר שלך בקבוצות')}</p>
        </div>

        <div className="grid gap-4">
          {rootGroups.map((rootGroup) => (
            <CategorySection
              key={rootGroup.id}
              rootGroup={rootGroup}
              isExpanded={expandedCategories.has(rootGroup.id)}
              onToggle={() => toggleCategory(rootGroup.id)}
              onAddGroup={() => handleOpenForm(rootGroup.id)}
              onEditGroup={(group) => handleOpenForm(rootGroup.id, group)}
              onDeleteGroup={handleDeleteClick}
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

        <DeleteGroupModal
          isOpen={!!deletingGroup}
          onClose={() => setDeletingGroup(null)}
          onConfirm={handleDeleteConfirm}
          groupName={deletingGroup?.name || ''}
          recordCount={deleteRecordCount}
        />

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{
          borderRightColor: rootGroup.color,
          borderRightWidth: '4px',
          background: `linear-gradient(to right, ${rootGroup.color}08, transparent)`
        }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${rootGroup.color}20` }}
          >
            <div
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
              style={{ backgroundColor: rootGroup.color }}
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg sm:text-xl">{rootGroup.name}</h3>
            {childGroups.length > 0 && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {childGroups.length} {childGroups.length === 1 ? t('groups.group', 'קבוצה') : t('groups.groups', 'קבוצות')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddGroup();
            }}
            className="p-2 sm:p-2.5 text-white rounded-lg transition-all hover:scale-105 shadow-sm"
            style={{ backgroundColor: rootGroup.color }}
            title={t('groups.addGroup')}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gradient-to-b from-gray-50 to-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: rootGroup.color }}></div>
            </div>
          ) : childGroups.length === 0 ? (
            <div className="text-center py-8 sm:py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t('groups.noGroups', { category: rootGroup.name })}
              </p>
              <button
                onClick={onAddGroup}
                className="px-4 py-2 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-sm"
                style={{ backgroundColor: rootGroup.color }}
              >
                {t('groups.addGroup')}
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {childGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all hover:scale-[1.02] group"
                  style={{
                    borderRightColor: group.color,
                    borderRightWidth: '3px'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${group.color}20` }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditGroup(group)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGroup(group.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
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
