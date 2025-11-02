import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useDeleteBirthday, useRefreshHebrewData } from '../../hooks/useBirthdays';
import { useGroups } from '../../hooks/useGroups';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { useTenant } from '../../contexts/TenantContext';
import { Edit, Trash2, Calendar, Search, CalendarDays, RefreshCw, Filter, Gift, Download } from 'lucide-react';
import { FutureBirthdaysModal } from '../modals/FutureBirthdaysModal';
import { UpcomingGregorianBirthdaysModal } from '../modals/UpcomingGregorianBirthdaysModal';
import { WishlistModal } from '../modals/WishlistModal';
import { birthdayCalculationsService } from '../../services/birthdayCalculations.service';
import { calendarPreferenceService } from '../../services/calendarPreference.service';
import { exportBirthdaysToCSV } from '../../utils/csvExport';

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
  const refreshHebrewData = useRefreshHebrewData();
  const { data: groups = [] } = useGroups();
  const { currentTenant } = useTenant();
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'upcoming'>('upcoming');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFutureModal, setShowFutureModal] = useState(false);
  const [showGregorianModal, setShowGregorianModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [showGroupFilter, setShowGroupFilter] = useState(false);

  const locale = i18n.language === 'he' ? he : enUS;

  const enrichedBirthdays = useMemo(() => {
    return birthdays.map((birthday) => {
      const calculations = birthdayCalculationsService.calculateAll(
        birthday,
        new Date()
      );
      const group = groups.find((g) => g.id === birthday.group_id);
      const effectivePreference = currentTenant
        ? calendarPreferenceService.resolvePreference(birthday, group, currentTenant)
        : 'both';

      return {
        ...birthday,
        calculations,
        effectivePreference,
        group,
      };
    });
  }, [birthdays, groups, currentTenant]);

  const filteredAndSortedBirthdays = useMemo(() => {
    let filtered = enrichedBirthdays;

    if (selectedGroupIds.length > 0) {
      filtered = filtered.filter((b) => {
        if (selectedGroupIds.includes('unassigned')) {
          return !b.group_id || selectedGroupIds.includes(b.group_id);
        }
        return b.group_id ? selectedGroupIds.includes(b.group_id) : false;
      });
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
          const aNext = calendarPreferenceService.getNextRelevantBirthday(
            a.calculations,
            a.effectivePreference
          );
          const bNext = calendarPreferenceService.getNextRelevantBirthday(
            b.calculations,
            b.effectivePreference
          );
          return aNext.getTime() - bNext.getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [enrichedBirthdays, searchTerm, sortBy, selectedGroupIds]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteBirthday.mutateAsync(id);
    }
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

  const handleBulkDelete = async () => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    const deletePromises = Array.from(selectedIds).map((id) =>
      deleteBirthday.mutateAsync(id)
    );

    try {
      await Promise.all(deletePromises);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting birthdays:', error);
    }
  };

  const handleBulkRefresh = async () => {
    const birthdaysToRefresh = birthdays.filter((b) => selectedIds.has(b.id));

    for (const birthday of birthdaysToRefresh) {
      try {
        await refreshHebrewData.mutateAsync({
          birthdayId: birthday.id,
          birthDate: birthday.birth_date_gregorian,
          afterSunset: birthday.after_sunset,
          gender: birthday.gender,
        });
      } catch (error) {
        console.error('Error refreshing birthday:', birthday.id, error);
      }
    }

    setSelectedIds(new Set());
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

      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900">
                {selectedIds.size} {t('common.selected')}
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t('common.clear')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkDelete()}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
              <button
                onClick={() => handleBulkRefresh()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                {t('birthday.refresh')}
              </button>
              <button
                onClick={() => {
                  const selectedBirthdays = birthdays.filter(b => selectedIds.has(b.id));
                  exportBirthdaysToCSV(selectedBirthdays, `birthdays-${new Date().toISOString().split('T')[0]}.csv`, i18n.language);
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {t('birthday.exportSelected')}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button
              onClick={() => toggleGroupFilter('unassigned')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2 ${
                selectedGroupIds.includes('unassigned')
                  ? 'bg-gray-200 border-gray-400 text-gray-900'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-400" />
              {t('birthday.unassigned', 'ללא שיוך')}
            </button>
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

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-start">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredAndSortedBirthdays.length &&
                      filteredAndSortedBirthdays.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.firstName')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.lastName')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.birthDate')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.currentGregorianAge')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.currentHebrewAge')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.nextGregorianBirthday')}
                </th>
                <th className="px-6 py-4 text-start text-sm font-bold text-gray-900">
                  {t('birthday.nextHebrewBirthday')}
                </th>
                <th className="px-6 py-4 text-end text-sm font-bold text-gray-900">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedBirthdays.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm
                      ? t('common.noResults', 'No results found')
                      : t('birthday.noBirthdays', 'No birthdays yet')}
                  </td>
                </tr>
              ) : (
                filteredAndSortedBirthdays.map((birthday) => {
                  const showGregorian = calendarPreferenceService.shouldShowGregorian(birthday.effectivePreference);
                  const showHebrew = calendarPreferenceService.shouldShowHebrew(birthday.effectivePreference);

                  return (
                    <tr
                      key={birthday.id}
                      className="hover:bg-blue-50 transition-all group"
                      style={{
                        borderRight: birthday.group ? `4px solid ${birthday.group.color}` : undefined,
                      }}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(birthday.id)}
                          onChange={() => toggleSelect(birthday.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {birthday.group ? (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${birthday.group.color}20` }}
                              title={birthday.group.name}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: birthday.group.color }}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 border-2 border-dashed border-gray-300"
                              title={t('birthday.unassigned', 'ללא שיוך')}
                            >
                              <span className="text-xs text-gray-400">?</span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{birthday.first_name}</span>
                        </div>
                      </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {birthday.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>{format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy', { locale })}</span>
                        {birthday.birth_date_hebrew_string && (
                          <span className="text-xs text-gray-500">{birthday.birth_date_hebrew_string}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {showGregorian ? (
                        <span className="text-blue-600">{birthday.calculations.currentGregorianAge}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {showHebrew ? (
                        <span className="text-purple-600">{birthday.calculations.currentHebrewAge}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {showGregorian ? (
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowGregorianModal(true);
                          }}
                          className="flex flex-col gap-1 text-start hover:bg-blue-50 p-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">
                              {format(birthday.calculations.nextGregorianBirthday, 'dd/MM/yyyy', { locale })}
                            </span>
                          </div>
                          <span className="text-xs text-blue-600">
                            {t('birthday.ageAtNextGregorian')}: {birthday.calculations.ageAtNextGregorianBirthday}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({birthday.calculations.daysUntilGregorianBirthday} {t('birthday.days')})
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {showHebrew && birthday.calculations.nextHebrewBirthday ? (
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowFutureModal(true);
                          }}
                          className="flex flex-col gap-1 text-start hover:bg-purple-50 p-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">
                              {format(birthday.calculations.nextHebrewBirthday, 'dd/MM/yyyy', { locale })}
                            </span>
                          </div>
                          <span className="text-xs text-purple-600">
                            {t('birthday.ageAtNextHebrew')}: {birthday.calculations.ageAtNextHebrewBirthday}
                          </span>
                          {birthday.calculations.daysUntilHebrewBirthday !== null && (
                            <span className="text-xs text-gray-500">
                              ({birthday.calculations.daysUntilHebrewBirthday} {t('birthday.days', 'days')})
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowWishlistModal(true);
                          }}
                          className="p-2 text-pink-600 hover:bg-pink-100 rounded-lg transition-all hover:scale-110"
                          title={t('wishlist.title', 'רשימת משאלות')}
                        >
                          <Gift className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRefresh(birthday.id)}
                          disabled={refreshHebrewData.isPending}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('birthday.refresh', 'רענן תאריכים עבריים')}
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshHebrewData.isPending ? 'animate-spin' : ''}`} />
                        </button>
                        {onAddToCalendar && (
                          <button
                            onClick={() => onAddToCalendar(birthday)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all hover:scale-110"
                            title={t('birthday.addToCalendar')}
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        )}
                        {!birthday.group_id && (
                          <button
                            onClick={() => onEdit(birthday)}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all hover:scale-110 animate-pulse"
                            title={t('birthday.reassign', 'שייך לקבוצה')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {birthday.group_id && (
                          <button
                            onClick={() => onEdit(birthday)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110"
                            title={t('common.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(birthday.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110"
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
        birthHebrewYear={selectedBirthday?.hebrew_year}
      />

      {selectedBirthday && (
        <UpcomingGregorianBirthdaysModal
          isOpen={showGregorianModal}
          onClose={() => setShowGregorianModal(false)}
          birthday={selectedBirthday}
        />
      )}

      {selectedBirthday && (
        <WishlistModal
          isOpen={showWishlistModal}
          onClose={() => {
            setShowWishlistModal(false);
            setSelectedBirthday(null);
          }}
          birthday={selectedBirthday}
        />
      )}
    </div>
  );
};
