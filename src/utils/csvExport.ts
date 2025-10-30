import { Birthday } from '../types';

export function exportBirthdaysToCSV(birthdays: Birthday[], filename: string = 'birthdays.csv') {
  const headers = [
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

  const rows = birthdays.map(birthday => [
    birthday.first_name || '',
    birthday.last_name || '',
    birthday.birth_date_gregorian || '',
    birthday.after_sunset ? 'Yes' : 'No',
    birthday.gender || '',
    birthday.hebrew_date || '',
    birthday.hebrew_year?.toString() || '',
    birthday.next_upcoming_hebrew_birthday || '',
    birthday.calculations?.nextGregorianBirthday?.toISOString().split('T')[0] || '',
    birthday.group_id || '',
    (birthday.notes || '').replace(/"/g, '""'),
    birthday.calendar_preference_override || ''
  ]);

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

export function parseCSVFile(csvText: string): CSVBirthdayData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const data: CSVBirthdayData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value;
    });

    const firstName = row['first name'] || row['firstname'] || '';
    const lastName = row['last name'] || row['lastname'] || '';
    const birthDate = row['birth date (gregorian)'] || row['birth date'] || row['birthdate'] || '';

    if (!firstName || !birthDate) continue;

    const afterSunsetValue = (row['after sunset'] || '').toLowerCase();
    const genderValue = (row['gender'] || '').toLowerCase();
    const calPrefValue = (row['calendar preference'] || row['calendarpreference'] || '').toLowerCase();

    data.push({
      firstName,
      lastName,
      birthDate,
      afterSunset: afterSunsetValue === 'yes' || afterSunsetValue === 'true' || afterSunsetValue === '1',
      gender: genderValue === 'male' || genderValue === 'female' || genderValue === 'other'
        ? genderValue as any
        : undefined,
      groupId: row['group id'] || row['groupid'] || undefined,
      notes: row['notes'] || undefined,
      calendarPreference: calPrefValue === 'gregorian' || calPrefValue === 'hebrew' || calPrefValue === 'both'
        ? calPrefValue as any
        : undefined
    });
  }

  return data;
}
