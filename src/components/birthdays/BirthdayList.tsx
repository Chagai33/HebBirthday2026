import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useDeleteBirthday, useArchiveBirthday } from '../../hooks/useBirthdays';
import { Edit, Trash2, Archive, Calendar, Search } from 'lucide-react';

interface BirthdayListProps {
  birthdays: Birthday[];
  onEdit: (birthday: Birthday) => void;
  onAddToCalendar?: (birthday: Birthday) => void;
}

export const BirthdayList: React.FC<BirthdayListProps> = ({
  birthdays,
  onEdit,
  onAddToCalendar,
}) => {
  const { t, i18n } = useTranslation();
  const deleteBirthday = useDeleteBirthday();
  const archiveBirthday = useArchiveBirthday();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'upcoming'>('upcoming');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const locale = i18n.language === 'he' ? he : enUS;

  const filteredAndSortedBirthdays = useMemo(() => {
    let filtered = birthdays;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = birthdays.filter(
        (b) =>
          b.firstName.toLowerCase().includes(search) ||
          b.lastName.toLowerCase().includes(search)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
        case 'date':
          return a.birthDateGregorian.toMillis() - b.birthDateGregorian.toMillis();
        case 'upcoming':
          if (!a.nextUpcomingHebrewBirthdayGregorian && !b.nextUpcomingHebrewBirthdayGregorian) {
            return 0;
          }
          if (!a.nextUpcomingHebrewBirthdayGregorian) return 1;
          if (!b.nextUpcomingHebrewBirthdayGregorian) return -1;
          return (
            a.nextUpcomingHebrewBirthdayGregorian.toMillis() -
            b.nextUpcomingHebrewBirthdayGregorian.toMillis()
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [birthdays, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteBirthday.mutateAsync(id);
    }
  };

  const handleArchive = async (id: string) => {
    await archiveBirthday.mutateAsync(id);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedBirthdays.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedBirthdays.map((b) => b.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="upcoming">{t('birthday.upcomingBirthdays')}</option>
          <option value="name">{t('common.sortByName', 'Sort by Name')}</option>
          <option value="date">{t('common.sortByDate', 'Sort by Date')}</option>
        </select>
      </div>

      {selectedIds.size > 0 && onAddToCalendar && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-900 font-medium">
            {selectedIds.size} {t('common.selected', 'selected')}
          </span>
          <button
            onClick={() => {
              selectedIds.forEach((id) => {
                const birthday = birthdays.find((b) => b.id === id);
                if (birthday) onAddToCalendar(birthday);
              });
              setSelectedIds(new Set());
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {t('birthday.addToGoogleCalendar')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-start">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredAndSortedBirthdays.length &&
                      filteredAndSortedBirthdays.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-700">
                  {t('birthday.firstName')}
                </th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-700">
                  {t('birthday.lastName')}
                </th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-700">
                  {t('birthday.birthDate')}
                </th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-700">
                  {t('birthday.hebrewDate')}
                </th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-700">
                  {t('birthday.nextHebrewBirthday')}
                </th>
                <th className="px-4 py-3 text-end text-sm font-semibold text-gray-700">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedBirthdays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm
                      ? t('common.noResults', 'No results found')
                      : t('birthday.noBirthdays', 'No birthdays yet')}
                  </td>
                </tr>
              ) : (
                filteredAndSortedBirthdays.map((birthday) => (
                  <tr key={birthday.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(birthday.id)}
                        onChange={() => toggleSelect(birthday.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {birthday.firstName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {birthday.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(birthday.birthDateGregorian.toDate(), 'dd/MM/yyyy', {
                        locale,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {birthday.birthDateHebrewString || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {birthday.nextUpcomingHebrewBirthdayGregorian
                        ? format(
                            birthday.nextUpcomingHebrewBirthdayGregorian.toDate(),
                            'dd/MM/yyyy',
                            { locale }
                          )
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {onAddToCalendar && (
                          <button
                            onClick={() => onAddToCalendar(birthday)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('birthday.addToCalendar')}
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(birthday)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(birthday.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={t('common.archive', 'Archive')}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(birthday.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
