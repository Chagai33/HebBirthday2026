import { Birthday, BirthdayCalculations } from '../types';

export const birthdayCalculationsService = {
  calculateAll(
    birthday: Birthday,
    referenceDate: Date = new Date()
  ): BirthdayCalculations {

    const gregAge = this.calculateCurrentGregorianAge(
      birthday.gregorian_year || 0,
      birthday.gregorian_month || 0,
      birthday.gregorian_day || 0,
      referenceDate
    );

    const hebAge = this.calculateCurrentHebrewAge(
      birthday.hebrew_year || 0,
      birthday.next_upcoming_hebrew_birthday,
      birthday.next_upcoming_hebrew_year,
      referenceDate
    );

    const nextGreg = this.calculateNextGregorianBirthday(
      birthday.gregorian_month || 0,
      birthday.gregorian_day || 0,
      referenceDate
    );

    const nextHeb = birthday.next_upcoming_hebrew_birthday
      ? new Date(birthday.next_upcoming_hebrew_birthday)
      : null;

    const ageAtNextHeb = nextHeb && birthday.hebrew_year && birthday.next_upcoming_hebrew_year
      ? birthday.next_upcoming_hebrew_year - birthday.hebrew_year
      : hebAge.age + 1;

    return {
      currentGregorianAge: gregAge.age,
      currentHebrewAge: hebAge.age,
      nextGregorianBirthday: nextGreg.date,
      ageAtNextGregorianBirthday: gregAge.age + 1,
      nextHebrewBirthday: nextHeb,
      ageAtNextHebrewBirthday: ageAtNextHeb,
      daysUntilGregorianBirthday: nextGreg.daysUntil,
      daysUntilHebrewBirthday: nextHeb
        ? Math.ceil((nextHeb.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      nextBirthdayType: this.determineNextBirthdayType(nextGreg.date, nextHeb),
    };
  },

  calculateCurrentGregorianAge(
    birthYear: number,
    birthMonth: number,
    birthDay: number,
    today: Date = new Date()
  ): { age: number; hasBirthdayPassedThisYear: boolean } {
    if (!birthYear || !birthMonth || !birthDay) {
      return { age: 0, hasBirthdayPassedThisYear: false };
    }

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    let age = currentYear - birthYear;

    const hasPassed =
      currentMonth > birthMonth ||
      (currentMonth === birthMonth && currentDay >= birthDay);

    if (!hasPassed) {
      age--;
    }

    return { age, hasBirthdayPassedThisYear: hasPassed };
  },

  calculateCurrentHebrewAge(
    hebrewBirthYear: number,
    nextHebrewBirthdayStr: string | null | undefined,
    nextUpcomingHebrewYear: number | null | undefined,
    today: Date = new Date()
  ): { age: number; hasBirthdayPassedThisYear: boolean } {
    // If missing critical data, return 0
    if (!hebrewBirthYear || !nextHebrewBirthdayStr || !nextUpcomingHebrewYear) {
      console.error('⚠️ Missing Hebrew birthday data:', {
        hebrewBirthYear,
        nextHebrewBirthdayStr,
        nextUpcomingHebrewYear,
        hasBirthYear: !!hebrewBirthYear,
        hasBirthdayStr: !!nextHebrewBirthdayStr,
        hasUpcomingYear: !!nextUpcomingHebrewYear
      });
      return { age: 0, hasBirthdayPassedThisYear: false };
    }

    // Parse next Hebrew birthday date
    const nextBirthday = new Date(nextHebrewBirthdayStr);
    const todayCopy = new Date(today);
    todayCopy.setHours(0, 0, 0, 0);
    nextBirthday.setHours(0, 0, 0, 0);

    // Check if the birthday has already passed this Hebrew year
    const hasPassed = nextBirthday <= todayCopy;

    // Calculate age based on next_upcoming_hebrew_year from API
    let age = nextUpcomingHebrewYear - hebrewBirthYear;

    // If birthday hasn't passed yet, subtract 1 from age
    if (!hasPassed) {
      age--;
    }

    return { age: Math.max(0, age), hasBirthdayPassedThisYear: hasPassed };
  },

  calculateNextGregorianBirthday(
    birthMonth: number,
    birthDay: number,
    today: Date = new Date()
  ): { date: Date; daysUntil: number } {
    if (!birthMonth || !birthDay) {
      const fallbackDate = new Date(today);
      fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
      return { date: fallbackDate, daysUntil: 365 };
    }

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const hasPassed =
      currentMonth > birthMonth ||
      (currentMonth === birthMonth && currentDay >= birthDay);

    const nextYear = hasPassed ? currentYear + 1 : currentYear;
    const nextDate = new Date(nextYear, birthMonth - 1, birthDay);
    nextDate.setHours(0, 0, 0, 0);

    const todayCopy = new Date(today);
    todayCopy.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil(
      (nextDate.getTime() - todayCopy.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { date: nextDate, daysUntil: Math.max(0, daysUntil) };
  },

  determineNextBirthdayType(
    nextGregorian: Date,
    nextHebrew: Date | null
  ): 'gregorian' | 'hebrew' | 'same' {
    if (!nextHebrew) return 'gregorian';

    const diffMs = nextGregorian.getTime() - nextHebrew.getTime();
    const diffDays = Math.abs(diffMs) / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return 'same';

    return nextGregorian < nextHebrew ? 'gregorian' : 'hebrew';
  },

  calculateAgeAtDate(birthYear: number, targetDate: Date): number {
    if (!birthYear) return 0;
    return targetDate.getFullYear() - birthYear;
  },

};
