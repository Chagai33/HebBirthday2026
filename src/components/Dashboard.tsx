import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from './layout/Layout';
import { BirthdayList } from './birthdays/BirthdayList';
import { BirthdayForm } from './birthdays/BirthdayForm';
import { useBirthdays } from '../hooks/useBirthdays';
import { useTenant } from '../contexts/TenantContext';
import { useGroupFilter } from '../contexts/GroupFilterContext';
import { Birthday, DashboardStats } from '../types';
import { Plus, Users, Calendar, TrendingUp, Cake } from 'lucide-react';
import { isWithinInterval, addWeeks, addMonths } from 'date-fns';
import { googleCalendarService } from '../services/google-calendar.service';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { currentTenant, createTenant } = useTenant();
  const { data: allBirthdays = [], isLoading } = useBirthdays();
  const { selectedGroupIds } = useGroupFilter();

  const [showForm, setShowForm] = useState(false);
  const [editBirthday, setEditBirthday] = useState<Birthday | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const birthdays = useMemo(() => {
    if (selectedGroupIds.length === 0) return allBirthdays;
    return allBirthdays.filter(b => b.group_id && selectedGroupIds.includes(b.group_id));
  }, [allBirthdays, selectedGroupIds]);

  useEffect(() => {
    googleCalendarService.initialize().catch(console.error);
  }, []);

  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const weekLater = addWeeks(now, 1);
    const monthLater = addMonths(now, 1);

    return {
      totalBirthdays: birthdays.length,
      upcomingThisWeek: birthdays.filter((b) => {
        if (!b.next_upcoming_hebrew_birthday) return false;
        const date = new Date(b.next_upcoming_hebrew_birthday);
        return isWithinInterval(date, { start: now, end: weekLater });
      }).length,
      upcomingThisMonth: birthdays.filter((b) => {
        if (!b.next_upcoming_hebrew_birthday) return false;
        const date = new Date(b.next_upcoming_hebrew_birthday);
        return isWithinInterval(date, { start: now, end: monthLater });
      }).length,
      maleCount: birthdays.filter((b) => b.gender === 'male').length,
      femaleCount: birthdays.filter((b) => b.gender === 'female').length,
    };
  }, [birthdays]);

  const handleEdit = (birthday: Birthday) => {
    setEditBirthday(birthday);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditBirthday(null);
  };

  const handleAddToCalendar = async (birthday: Birthday) => {
    try {
      await googleCalendarService.addBirthdayToCalendar(birthday);
      alert(t('messages.calendarSuccess', 'Birthday added to Google Calendar successfully!'));
    } catch (error) {
      console.error('Error adding to calendar:', error);
      alert(t('messages.calendarError', 'Failed to add birthday to calendar. Please try again.'));
    }
  };

  const handleCreateTenant = async () => {
    if (!tenantName.trim()) return;

    setIsCreating(true);
    try {
      await createTenant(tenantName);
      setShowCreateTenant(false);
      setTenantName('');
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert(t('messages.error', 'An error occurred. Please try again.'));
    } finally {
      setIsCreating(false);
    }
  };

  if (!currentTenant) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('tenant.createTenant')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('common.noTenantMessage', 'Create a tenant to get started')}
          </p>
          <button
            onClick={() => setShowCreateTenant(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('tenant.createNewTenant', 'Create Group')}
          </button>
        </div>

        {showCreateTenant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('tenant.createNewTenant', 'Create New Group')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tenant.tenantName', 'Group Name')}
                  </label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('tenant.enterTenantName', 'Enter group name')}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowCreateTenant(false);
                      setTenantName('');
                    }}
                    disabled={isCreating}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleCreateTenant}
                    disabled={isCreating || !tenantName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('dashboard.dashboard')}
            </h1>
            <p className="text-gray-600 mt-1">{currentTenant.name}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('birthday.addBirthday')}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">
                  {t('dashboard.totalBirthdays')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalBirthdays}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">
                  {t('dashboard.upcomingThisWeek')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {stats.upcomingThisWeek}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">
                  {t('dashboard.upcomingThisMonth')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {stats.upcomingThisMonth}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">{t('dashboard.statistics')}</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  {stats.maleCount}M / {stats.femaleCount}F
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Cake className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <BirthdayList
            birthdays={birthdays}
            onEdit={handleEdit}
            onAddToCalendar={handleAddToCalendar}
          />
        )}
      </div>

      {showForm && (
        <BirthdayForm
          onClose={handleCloseForm}
          onSuccess={() => {}}
          editBirthday={editBirthday}
        />
      )}
    </Layout>
  );
};
