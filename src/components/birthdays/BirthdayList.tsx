import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useDeleteBirthday, useArchiveBirthday, useRefreshHebrewData } from '../../hooks/useBirthdays';
import { useGroups } from '../../hooks/useGroups';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { Edit, Trash2, Archive, Calendar, Search, CalendarDays, RefreshCw, Filter } from 'lucide-react';
import { FutureBirthdaysModal } from '../modals/FutureBirthdaysModal';

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
  const refreshHebrewData = useRefreshHebrewData();
  const { data: groups = [] } = useGroups();
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'upcoming'>('upcoming');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFutureModal, setShowFutureModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [showGroupFilter, setShowGroupFilter] = useState(false);

  const locale = i18n.language === 'he' ? he : enUS;

  const filteredAndSortedBirthdays = useMemo(() => {
    let filtered = birthdays;

    if (selectedGroupIds.length > 0) {
      filtered = filtered.filter((b) =>
        b.group_id ? selectedGroupIds.includes(b.group_id) : false
      );
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.first_name.toLowerCase().includes(search) ||
          b.last_name.toLowerCase().includes(search)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          );
        case 'date':
          return new Date(a.birth_date_gregorian).getTime() - new Date(b.birth_date_gregorian).getTime();
        case 'upcoming':
          if (!a.next_upcoming_hebrew_birthday && !b.next_upcoming_hebrew_birthday) {
            return 0;
          }
          if (!a.next_upcoming_hebrew_birthday) return 1;
          if (!b.next_upcoming_hebrew_birthday) return -1;
          return (
            new Date(a.next_upcoming_hebrew_birthday).getTime() -
            new Date(b.next_upcoming_hebrew_birthday).getTime()
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [birthdays, searchTerm, sortBy, selectedGroupIds]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteBirthday.mutateAsync(id);
    }
  };

  const handleArchive = async (id: string) => {
    await archiveBirthday.mutateAsync(id);
  };

  const handleRefresh = async (id: string) => {
    try {
      await refreshHebrewData.mutateAsync(id);
    } catch (error: any) {
      if (error.code === 'functions/resource-exhausted') {
        alert(t('birthday.refreshLimitReached', 'יותר מדי רענונים. המתן 30 שניות.'));
      } else {
        alert(t('birthday.refreshError', 'שגיאה ברענון הנתונים'));
      }
    }
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

        <button
          onClick={() => setShowGroupFilter(!showGroupFilter)}
          className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedGroupIds.length > 0
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('groups.filterByGroup')}
          {selectedGroupIds.length > 0 && (
            <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {selectedGroupIds.length}
            </span>
          )}
        </button>

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

      {showGroupFilter && groups.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{t('groups.filterByGroup')}</h3>
            {selectedGroupIds.length > 0 && (
              <button
                onClick={clearGroupFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('common.clear', 'Clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => toggleGroupFilter(group.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedGroupIds.includes(group.id)
                    ? 'ring-2 ring-offset-1'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: selectedGroupIds.includes(group.id) ? group.color : group.color + '40',
                  color: selectedGroupIds.includes(group.id) ? 'white' : group.color,
                  ringColor: group.color,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedGroupIds.includes(group.id) ? 'white' : group.color }}
                />
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
                filteredAndSortedBirthdays.map((birthday) => {
                  const birthdayGroup = birthday.group_id
                    ? groups.find((g) => g.id === birthday.group_id)
                    : null;

                  return (
                    <tr
                      key={birthday.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{
                        borderLeft: birthdayGroup ? `4px solid ${birthdayGroup.color}` : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(birthday.id)}
                          onChange={() => toggleSelect(birthday.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {birthdayGroup && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: birthdayGroup.color }}
                              title={birthdayGroup.name}
                            />
                          )}
                          <span className="text-sm text-gray-900">{birthday.first_name}</span>
                        </div>
                      </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {birthday.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy', {
                        locale,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {birthday.birth_date_hebrew_string || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {birthday.next_upcoming_hebrew_birthday ? (
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowFutureModal(true);
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                          <CalendarDays className="w-4 h-4" />
                          {format(
                            new Date(birthday.next_upcoming_hebrew_birthday),
                            'dd/MM/yyyy',
                            { locale }
                          )}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRefresh(birthday.id)}
                          disabled={refreshHebrewData.isPending}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('birthday.refresh', 'רענן תאריכים עבריים')}
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshHebrewData.isPending ? 'animate-spin' : ''}`} />
                        </button>
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
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FutureBirthdaysModal
        isOpen={showFutureModal}
        onClose={() => setShowFutureModal(false)}
        name={selectedBirthday ? `${selectedBirthday.first_name} ${selectedBirthday.last_name}` : ''}
        futureDates={selectedBirthday?.future_hebrew_birthdays || []}
      />
    </div>
  );
};
