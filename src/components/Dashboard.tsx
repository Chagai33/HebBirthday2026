import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from './layout/Layout';
import { BirthdayList } from './birthdays/BirthdayList';
import { BirthdayForm } from './birthdays/BirthdayForm';
import { useBirthdays } from '../hooks/useBirthdays';
import { useTenant } from '../contexts/TenantContext';
import { Birthday, DashboardStats } from '../types';
import { Plus, Users, Calendar, TrendingUp, Cake } from 'lucide-react';
import { isWithinInterval, addWeeks, addMonths } from 'date-fns';
import { googleCalendarService } from '../services/google-calendar.service';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { data: birthdays = [], isLoading } = useBirthdays();

  const [showForm, setShowForm] = useState(false);
  const [editBirthday, setEditBirthday] = useState<Birthday | null>(null);

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
        if (!b.nextUpcomingHebrewBirthdayGregorian) return false;
        const date = b.nextUpcomingHebrewBirthdayGregorian.toDate();
        return isWithinInterval(date, { start: now, end: weekLater });
      }).length,
      upcomingThisMonth: birthdays.filter((b) => {
        if (!b.nextUpcomingHebrewBirthdayGregorian) return false;
        const date = b.nextUpcomingHebrewBirthdayGregorian.toDate();
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
        </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('dashboard.totalBirthdays')}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBirthdays}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('dashboard.upcomingThisWeek')}
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.upcomingThisWeek}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('dashboard.upcomingThisMonth')}
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.upcomingThisMonth}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('dashboard.statistics')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.maleCount}M / {stats.femaleCount}F
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Cake className="w-6 h-6 text-purple-600" />
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
