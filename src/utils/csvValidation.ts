import { CSVBirthdayData } from './csvExport';
import { CSVBirthdayRow, Birthday } from '../types';

function isValidDate(dateString: string): boolean {
  if (!dateString) return false;

  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{4}\/\d{2}\/\d{2}$/,
  ];

  if (!patterns.some(pattern => pattern.test(dateString))) {
    return false;
  }

  const date = parseDateString(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;

  dateString = dateString.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [month, day, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

export function normalizeDateString(dateString: string): string {
  const date = parseDateString(dateString);
  if (!date) return dateString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isDuplicate(
  row: CSVBirthdayData,
  existingBirthdays: Birthday[]
): boolean {
  const normalizedDate = normalizeDateString(row.birthDate);

  return existingBirthdays.some(
    (birthday) =>
      birthday.first_name.toLowerCase() === row.firstName.toLowerCase() &&
      birthday.last_name.toLowerCase() === row.lastName.toLowerCase() &&
      birthday.birth_date_gregorian === normalizedDate
  );
}

export function validateAndEnrichCSVData(
  data: CSVBirthdayData[],
  existingBirthdays: Birthday[],
  translations: {
    firstNameRequired: string;
    lastNameMissing: string;
    birthDateRequired: string;
    birthDateInvalid: string;
    birthDateFuture: string;
    birthDateTooOld: string;
  }
): CSVBirthdayRow[] {
  const now = new Date();
  const minYear = 1900;
  const maxYear = now.getFullYear();

  return data.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.firstName || row.firstName.trim().length === 0) {
      errors.push(translations.firstNameRequired);
    }

    if (!row.lastName || row.lastName.trim().length === 0) {
      warnings.push(translations.lastNameMissing);
    }

    if (!row.birthDate || row.birthDate.trim().length === 0) {
      errors.push(translations.birthDateRequired);
    } else if (!isValidDate(row.birthDate)) {
      errors.push(translations.birthDateInvalid);
    } else {
      const birthDate = parseDateString(row.birthDate);
      if (birthDate) {
        if (birthDate > now) {
          errors.push(translations.birthDateFuture);
        }

        const birthYear = birthDate.getFullYear();
        if (birthYear < minYear) {
          errors.push(translations.birthDateTooOld);
        }
        if (birthYear > maxYear) {
          errors.push(translations.birthDateFuture);
        }
      }
    }

    const duplicate = isDuplicate(row, existingBirthdays);

    return {
      firstName: row.firstName,
      lastName: row.lastName,
      birthDate: isValidDate(row.birthDate)
        ? normalizeDateString(row.birthDate)
        : row.birthDate,
      afterSunset: row.afterSunset,
      gender: row.gender,
      groupId: row.groupId,
      notes: row.notes,
      calendarPreference: row.calendarPreference,
      validationErrors: errors,
      warnings,
      isDuplicate: duplicate,
    };
  });
}
