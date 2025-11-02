import { Birthday } from '../types';

export function exportBirthdaysToCSV(birthdays: Birthday[], filename: string = 'birthdays.csv', language: string = 'en') {
  const headers = language === 'he' ? [
    'שם פרטי',
    'שם משפחה',
    'תאריך לידה לועזי',
    'אחרי שקיעה',
    'מגדר',
    'תאריך לידה עברי',
    'שנה עברית',
    'יום הולדת עברי הבא',
    'יום הולדת לועזי הבא',
    'מזהה קבוצה',
    'הערות',
    'העדפת לוח שנה'
  ] : [
    'First Name',
    'Last Name',
    'Birth Date (Gregorian)',
    'After Sunset',
    'Gender',
    'Hebrew Date',
    'Hebrew Year',
    'Next Hebrew Birthday',
    'Next Gregorian Birthday',
    'Group ID',
    'Notes',
    'Calendar Preference'
  ];

  const rows = birthdays.map(birthday => {
    let nextGregorianStr = '';
    if (birthday.calculations?.nextGregorianBirthday) {
      const date = birthday.calculations.nextGregorianBirthday;
      if (date instanceof Date) {
        nextGregorianStr = date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        nextGregorianStr = date.split('T')[0];
      }
    }

    return [
      birthday.first_name || '',
      birthday.last_name || '',
      birthday.birth_date_gregorian || '',
      birthday.after_sunset ? 'Yes' : 'No',
      birthday.gender || '',
      birthday.birth_date_hebrew_string || '',
      birthday.hebrew_year?.toString() || '',
      birthday.next_upcoming_hebrew_birthday || '',
      nextGregorianStr,
      birthday.group_id || '',
      (birthday.notes || '').replace(/"/g, '""'),
      birthday.calendar_preference_override || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export interface CSVBirthdayData {
  firstName: string;
  lastName: string;
  birthDate: string;
  afterSunset: boolean;
  gender?: 'male' | 'female' | 'other';
  groupId?: string;
  notes?: string;
  calendarPreference?: 'gregorian' | 'hebrew' | 'both';
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getColumnValue(row: any, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    if (row[normalizedName]) {
      return row[normalizedName];
    }
  }
  return '';
}

export function parseCSVFile(csvText: string): CSVBirthdayData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));
  const data: CSVBirthdayData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value;
    });

    const firstName = getColumnValue(
      row,
      'first name',
      'firstname',
      'first',
      'name',
      'שם פרטי',
      'שם'
    );

    const lastName = getColumnValue(
      row,
      'last name',
      'lastname',
      'last',
      'surname',
      'family name',
      'שם משפחה',
      'משפחה'
    );

    const birthDate = getColumnValue(
      row,
      'birth date (gregorian)',
      'birth date',
      'birthdate',
      'birthday',
      'date of birth',
      'dob',
      'date',
      'תאריך לידה',
      'תאריך לידה לועזי',
      'יום הולדת',
      'תאריך'
    );

    if (!firstName || !birthDate) continue;

    const afterSunsetValue = getColumnValue(
      row,
      'after sunset',
      'aftersunset',
      'sunset',
      'אחרי שקיעה',
      'שקיעה'
    ).toLowerCase();

    const genderValue = getColumnValue(
      row,
      'gender',
      'sex',
      'מגדר',
      'מין'
    ).toLowerCase();

    const calPrefValue = getColumnValue(
      row,
      'calendar preference',
      'calendarpreference',
      'calendar',
      'העדפת לוח שנה',
      'לוח שנה'
    ).toLowerCase();

    const notes = getColumnValue(
      row,
      'notes',
      'note',
      'comment',
      'comments',
      'הערות',
      'הערה'
    );

    const groupId = getColumnValue(
      row,
      'group id',
      'groupid',
      'group',
      'קבוצה',
      'מזהה קבוצה'
    );

    data.push({
      firstName,
      lastName,
      birthDate,
      afterSunset: afterSunsetValue === 'yes' ||
                   afterSunsetValue === 'true' ||
                   afterSunsetValue === '1' ||
                   afterSunsetValue === 'כן',
      gender: genderValue === 'male' || genderValue === 'זכר' || genderValue === 'ז'
        ? 'male'
        : genderValue === 'female' || genderValue === 'נקבה' || genderValue === 'נ'
        ? 'female'
        : genderValue === 'other' || genderValue === 'אחר'
        ? 'other'
        : undefined,
      groupId: groupId || undefined,
      notes: notes || undefined,
      calendarPreference: calPrefValue === 'gregorian' || calPrefValue === 'לועזי'
        ? 'gregorian'
        : calPrefValue === 'hebrew' || calPrefValue === 'עברי'
        ? 'hebrew'
        : calPrefValue === 'both' || calPrefValue === 'שניהם'
        ? 'both'
        : undefined
    });
  }

  return data;
}
