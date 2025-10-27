import { Birthday } from '../types';
import { format, parseISO } from 'date-fns';

export interface GoogleCalendarEvent {
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  location?: string;
  recurrence?: string;
}

export function generateGoogleCalendarLink(event: GoogleCalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.startDate}/${event.endDate}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  if (event.recurrence) {
    params.append('recur', event.recurrence);
  }

  return `${baseUrl}?${params.toString()}`;
}

export function formatDateForGoogleCalendar(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

export function createBirthdayCalendarEvent(birthday: Birthday): GoogleCalendarEvent {
  const hebrewDate = birthday.next_upcoming_hebrew_birthday;

  if (!hebrewDate) {
    throw new Error('No Hebrew date available for this birthday');
  }

  const startDate = parseISO(hebrewDate);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59);

  const title = `🎂 ${birthday.first_name} ${birthday.last_name}`;

  let description = `יום הולדת של ${birthday.first_name} ${birthday.last_name}\n`;
  description += `תאריך לועזי: ${format(parseISO(birthday.birth_date_gregorian), 'dd/MM/yyyy')}\n`;
  description += `תאריך עברי: ${hebrewDate}`;

  if (birthday.after_sunset) {
    description += '\n⚠️ לאחר השקיעה';
  }

  if (birthday.notes) {
    description += `\n\nהערות: ${birthday.notes}`;
  }

  return {
    title,
    startDate: formatDateForGoogleCalendar(startDate),
    endDate: formatDateForGoogleCalendar(endDate),
    description,
  };
}

export function openGoogleCalendarForBirthday(birthday: Birthday): void {
  try {
    const event = createBirthdayCalendarEvent(birthday);
    const link = generateGoogleCalendarLink(event);
    window.open(link, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Failed to create Google Calendar link:', error);
    throw error;
  }
}
