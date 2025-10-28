import { Birthday, BirthdayCalculations } from '../types';

export const birthdayCalculationsService = {
  calculateAll(
    birthday: Birthday,
    referenceDate: Date = new Date(),
    currentHebrewYear?: number
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
      referenceDate,
      currentHebrewYear
    );

    const nextGreg = this.calculateNextGregorianBirthday(
      birthday.gregorian_month || 0,
      birthday.gregorian_day || 0,
      referenceDate
    );

    const nextHeb = birthday.next_upcoming_hebrew_birthday
      ? new Date(birthday.next_upcoming_hebrew_birthday)
      : null;

    const ageAtNextHeb = nextHeb && birthday.hebrew_year
      ? this.calculateHebrewAgeAtDate(birthday.hebrew_year, nextHeb, currentHebrewYear)
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
    today: Date = new Date(),
    currentHebrewYear?: number
  ): { age: number; hasBirthdayPassedThisYear: boolean } {
    if (!hebrewBirthYear || !nextHebrewBirthdayStr) {
      return { age: 0, hasBirthdayPassedThisYear: false };
    }

    const nextBirthday = new Date(nextHebrewBirthdayStr);
    const todayCopy = new Date(today);
    todayCopy.setHours(0, 0, 0, 0);
    nextBirthday.setHours(0, 0, 0, 0);

    const hasPassed = nextBirthday <= todayCopy;

    let hebrewYearToUse: number;
    if (currentHebrewYear) {
      hebrewYearToUse = currentHebrewYear;
    } else {
      const currentGregorianYear = today.getFullYear();
      hebrewYearToUse = hebrewBirthYear + Math.floor((currentGregorianYear - 1970) * 1.0307);
    }

    let age = hebrewYearToUse - hebrewBirthYear;

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

  calculateHebrewAgeAtDate(
    hebrewBirthYear: number,
    targetDate: Date,
    currentHebrewYear?: number
  ): number {
    if (!hebrewBirthYear) return 0;

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const today = new Date();
    const currentYear = today.getFullYear();

    let hebrewYearAtTarget: number;
    if (currentHebrewYear) {
      const gregorianYearDiff = targetYear - currentYear;
      hebrewYearAtTarget = currentHebrewYear + gregorianYearDiff;
    } else {
      hebrewYearAtTarget = targetYear + 3761;
      if (targetMonth >= 1 && targetMonth <= 8) {
        hebrewYearAtTarget--;
      }
    }

    return hebrewYearAtTarget - hebrewBirthYear;
  },
};
