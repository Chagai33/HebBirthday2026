import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from './layout/Layout';
import { BirthdayList } from './birthdays/BirthdayList';
import { BirthdayForm } from './birthdays/BirthdayForm';
import { useBirthdays } from '../hooks/useBirthdays';
import { useTenant } from '../contexts/TenantContext';
import { useGroupFilter } from '../contexts/GroupFilterContext';
import { useAuth } from '../contexts/AuthContext';
import { useRootGroups, useInitializeRootGroups } from '../hooks/useGroups';
import { Birthday, DashboardStats } from '../types';
import { Plus, Users, Calendar, TrendingUp, Cake, Upload } from 'lucide-react';
import { isWithinInterval, addWeeks, addMonths } from 'date-fns';
import { openGoogleCalendarForBirthday } from '../utils/googleCalendar';
import { wishlistService } from '../services/wishlist.service';
import { parseCSVFile } from '../utils/csvExport';
import { birthdayService } from '../services/birthday.service';
import { validateAndEnrichCSVData } from '../utils/csvValidation';
import { CSVImportPreviewModal } from './modals/CSVImportPreviewModal';
import { CSVBirthdayRow } from '../types';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { data: allBirthdays = [], isLoading } = useBirthdays();
  const { selectedGroupIds } = useGroupFilter();
  const { data: rootGroups = [], isLoading: isLoadingGroups } = useRootGroups();
  const initializeRootGroups = useInitializeRootGroups();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editBirthday, setEditBirthday] = useState<Birthday | null>(null);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [csvData, setCsvData] = useState<CSVBirthdayRow[]>([]);

  const birthdays = useMemo(() => {
    if (selectedGroupIds.length === 0) return allBirthdays;
    return allBirthdays.filter(b => b.group_id && selectedGroupIds.includes(b.group_id));
  }, [allBirthdays, selectedGroupIds]);

  useEffect(() => {
    if (currentTenant && user && !isLoadingGroups && rootGroups.length === 0 && !initializeRootGroups.isPending) {
      console.log('Initializing root groups for tenant:', currentTenant.id);
      initializeRootGroups.mutate(currentTenant.default_language || 'he');
    }
  }, [currentTenant?.id, user?.id, isLoadingGroups, rootGroups.length]);

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
      let wishlist: any[] = [];
      try {
        wishlist = await wishlistService.getItemsForBirthday(birthday.id, currentTenant?.id);
      } catch (wishlistError) {
        console.warn('Could not load wishlist, continuing without it:', wishlistError);
      }

      const language = currentTenant?.default_language || 'he';
      openGoogleCalendarForBirthday(birthday, language, wishlist);
    } catch (error) {
      console.error('Error opening Google Calendar:', error);
      alert(t('messages.calendarError'));
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant || !user) return;

    try {
      const text = await file.text();
      const parsedData = parseCSVFile(text);

      if (parsedData.length === 0) {
        alert(t('messages.csvEmpty', 'הקובץ ריק או לא תקין'));
        event.target.value = '';
        return;
      }

      const validatedData = validateAndEnrichCSVData(parsedData, allBirthdays, {
        firstNameRequired: t('validation.firstNameRequired', 'שם פרטי הוא שדה חובה'),
        lastNameMissing: t('validation.lastNameMissing', 'שם משפחה חסר'),
        birthDateRequired: t('validation.birthDateRequired', 'תאריך לידה הוא שדה חובה'),
        birthDateInvalid: t('validation.birthDateInvalid', 'תאריך לידה לא תקין'),
        birthDateFuture: t('validation.birthDateFuture', 'תאריך לידה לא יכול להיות בעתיד'),
        birthDateTooOld: t('validation.birthDateTooOld', 'תאריך לידה לא תקין (לפני 1900)'),
      });

      setCsvData(validatedData);
      setShowCSVPreview(true);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert(t('messages.importError', 'שגיאה בקריאת קובץ ה-CSV'));
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmImport = async (selectedRows: CSVBirthdayRow[]) => {
    if (!currentTenant || !user) return;

    let imported = 0;
    let failed = 0;

    for (const row of selectedRows) {
      try {
        await birthdayService.createBirthday(
          currentTenant.id,
          {
            firstName: row.firstName,
            lastName: row.lastName,
            birthDateGregorian: row.birthDate,
            afterSunset: row.afterSunset,
            gender: row.gender,
            groupId: row.groupId || '',
            notes: row.notes,
            calendarPreferenceOverride: row.calendarPreference,
          },
          user.id
        );
        imported++;
      } catch (error) {
        console.error('Failed to import:', row, error);
        failed++;
      }
    }

    // Invalidate React Query cache to refresh the UI
    await queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    await queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });

    alert(t('messages.importSuccess', `יובאו ${imported} ימי הולדת. נכשלו: ${failed}`));
    setShowCSVPreview(false);
  };

  if (!currentTenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border border-blue-200 p-3 sm:p-4 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-blue-700 font-medium mb-0.5">
                  {t('dashboard.totalBirthdays')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.totalBirthdays}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border border-green-200 p-3 sm:p-4 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-green-700 font-medium mb-0.5">
                  {t('dashboard.upcomingThisWeek')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900">
                  {stats.upcomingThisWeek}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border border-orange-200 p-3 sm:p-4 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-orange-700 font-medium mb-0.5">
                  {t('dashboard.upcomingThisMonth')}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-900">
                  {stats.upcomingThisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-md border border-pink-200 p-3 sm:p-4 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <Cake className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-pink-700 font-medium mb-0.5">{t('dashboard.statistics')}</p>
                <p className="text-xl sm:text-2xl font-bold text-pink-900">
                  {stats.maleCount}M / {stats.femaleCount}F
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <label className="flex items-center gap-2 px-4 py-2 sm:px-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md cursor-pointer">
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">{t('birthday.importCSV', 'Import CSV')}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              title={t('birthday.addBirthday')}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('birthday.addBirthday')}</span>
            </button>
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
      </div>

      {showForm && (
        <BirthdayForm
          onClose={handleCloseForm}
          onSuccess={() => {}}
          editBirthday={editBirthday}
        />
      )}

      <CSVImportPreviewModal
        isOpen={showCSVPreview}
        onClose={() => setShowCSVPreview(false)}
        data={csvData}
        onConfirm={handleConfirmImport}
      />
    </Layout>
  );
};
