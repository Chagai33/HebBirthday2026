import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Edit, Trash2, Gift, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { Birthday, WishlistItem, WishlistPriority } from '../../types';
import {
  useWishlistItems,
  useCreateWishlistItem,
  useUpdateWishlistItem,
  useDeleteWishlistItem,
} from '../../hooks/useWishlist';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthday: Birthday;
}

export const WishlistModal = ({ isOpen, onClose, birthday }: WishlistModalProps) => {
  const { t } = useTranslation();
  const { data: items = [], isLoading, error } = useWishlistItems(birthday.id);
  const createItem = useCreateWishlistItem();
  const updateItem = useUpdateWishlistItem();
  const deleteItem = useDeleteWishlistItem();

  console.log('🎁 WishlistModal opened for birthday:', birthday.id);
  console.log('📊 Items loaded:', items.length, 'Loading:', isLoading, 'Error:', error);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    priority: 'medium' as WishlistPriority,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemName.trim()) return;

    try {
      if (editingId) {
        await updateItem.mutateAsync({
          itemId: editingId,
          birthdayId: birthday.id,
          data: {
            itemName: formData.itemName,
            description: formData.description,
            priority: formData.priority,
          },
        });
        setEditingId(null);
      } else {
        await createItem.mutateAsync({
          birthdayId: birthday.id,
          itemName: formData.itemName,
          description: formData.description,
          priority: formData.priority,
        });
      }

      setFormData({ itemName: '', description: '', priority: 'medium' });
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setFormData({
      itemName: item.item_name,
      description: item.description || '',
      priority: item.priority,
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteItem.mutateAsync({ itemId, birthdayId: birthday.id });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ itemName: '', description: '', priority: 'medium' });
  };

  const getPriorityIcon = (priority: WishlistPriority) => {
    switch (priority) {
      case 'high':
        return <Star className="w-4 h-4 text-red-600" fill="currentColor" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: WishlistPriority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {t('wishlist.title', 'רשימת משאלות')}
                </h2>
                <p className="text-pink-100 text-sm">
                  {birthday.first_name} {birthday.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('wishlist.addItem', 'הוסף פריט')}
            </button>
          )}

          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('wishlist.itemName', 'שם הפריט')} *
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder={t('wishlist.itemNamePlaceholder', 'למשל: ספר, משחק, בגד...')}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('wishlist.description', 'תיאור')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder={t('wishlist.descriptionPlaceholder', 'פרטים נוספים (אופציונלי)')}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('wishlist.priority', 'עדיפות')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: 'high' })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.priority === 'high'
                          ? 'bg-red-500 text-white shadow-md scale-105'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      <Star className="w-4 h-4 inline-block me-1" fill={formData.priority === 'high' ? 'currentColor' : 'none'} />
                      {t('wishlist.high', 'גבוהה')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: 'medium' })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.priority === 'medium'
                          ? 'bg-orange-500 text-white shadow-md scale-105'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 inline-block me-1" />
                      {t('wishlist.medium', 'בינונית')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: 'low' })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.priority === 'low'
                          ? 'bg-blue-500 text-white shadow-md scale-105'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 inline-block me-1" />
                      {t('wishlist.low', 'נמוכה')}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createItem.isPending || updateItem.isPending}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {editingId ? t('common.save', 'שמור') : t('common.add', 'הוסף')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    {t('common.cancel', 'ביטול')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Gift className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">
                {t('wishlist.empty', 'אין פריטים ברשימת המשאלות')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl p-4 border-2 transition-all hover:shadow-md group ${getPriorityColor(
                    item.priority
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getPriorityIcon(item.priority)}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.item_name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110"
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
      </div>
    </div>
  );
};
