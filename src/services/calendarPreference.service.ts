import { Birthday, Group, Tenant, CalendarPreference, BirthdayCalculations } from '../types';

export const calendarPreferenceService = {
  resolvePreference(
    birthday: Birthday,
    group: Group | undefined,
    tenant: Tenant
  ): CalendarPreference {
    if (birthday.calendar_preference_override) {
      return birthday.calendar_preference_override;
    }

    if (group?.calendar_preference) {
      return group.calendar_preference;
    }

    if (tenant.default_calendar_preference) {
      return tenant.default_calendar_preference;
    }

    return 'both';
  },

  shouldShowGregorian(preference: CalendarPreference): boolean {
    return preference === 'gregorian' || preference === 'both';
  },

  shouldShowHebrew(preference: CalendarPreference): boolean {
    return preference === 'hebrew' || preference === 'both';
  },

  getNextRelevantBirthday(
    calculations: BirthdayCalculations,
    preference: CalendarPreference
  ): Date {
    if (preference === 'gregorian') {
      return calculations.nextGregorianBirthday;
    }

    if (preference === 'hebrew' && calculations.nextHebrewBirthday) {
      return calculations.nextHebrewBirthday;
    }

    if (calculations.nextBirthdayType === 'gregorian') {
      return calculations.nextGregorianBirthday;
    } else if (calculations.nextHebrewBirthday) {
      return calculations.nextHebrewBirthday;
    }

    return calculations.nextGregorianBirthday;
  },

  getNextRelevantAge(
    calculations: BirthdayCalculations,
    preference: CalendarPreference
  ): number {
    if (preference === 'gregorian') {
      return calculations.ageAtNextGregorianBirthday;
    }

    if (preference === 'hebrew') {
      return calculations.ageAtNextHebrewBirthday;
    }

    if (calculations.nextBirthdayType === 'gregorian') {
      return calculations.ageAtNextGregorianBirthday;
    }

    return calculations.ageAtNextHebrewBirthday;
  },

  getDaysUntilNextBirthday(
    calculations: BirthdayCalculations,
    preference: CalendarPreference
  ): number {
    if (preference === 'gregorian') {
      return calculations.daysUntilGregorianBirthday;
    }

    if (preference === 'hebrew' && calculations.daysUntilHebrewBirthday !== null) {
      return calculations.daysUntilHebrewBirthday;
    }

    if (calculations.nextBirthdayType === 'gregorian') {
      return calculations.daysUntilGregorianBirthday;
    }

    return calculations.daysUntilHebrewBirthday ?? calculations.daysUntilGregorianBirthday;
  },

  getPreferenceLabel(preference: CalendarPreference): { he: string; en: string } {
    const labels = {
      gregorian: { he: 'לועזי בלבד', en: 'Gregorian Only' },
      hebrew: { he: 'עברי בלבד', en: 'Hebrew Only' },
      both: { he: 'שניהם', en: 'Both' },
    };

    return labels[preference];
  },

  getPreferenceDescription(preference: CalendarPreference): { he: string; en: string } {
    const descriptions = {
      gregorian: {
        he: 'הצגת גילאים ותאריכים לועזיים בלבד',
        en: 'Display Gregorian ages and dates only',
      },
      hebrew: {
        he: 'הצגת גילאים ותאריכים עבריים בלבד',
        en: 'Display Hebrew ages and dates only',
      },
      both: {
        he: 'הצגת גילאים ותאריכים לועזיים ועבריים',
        en: 'Display both Gregorian and Hebrew ages and dates',
      },
    };

    return descriptions[preference];
  },
};
