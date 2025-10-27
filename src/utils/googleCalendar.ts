import { Birthday, WishlistItem } from '../types';
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

export function formatDateForGoogleCalendar(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return format(date, 'yyyyMMdd');
  }
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

export function createBirthdayCalendarEvent(
  birthday: Birthday,
  language: 'he' | 'en' = 'he',
  wishlist?: WishlistItem[]
): GoogleCalendarEvent {
  const hebrewDate = birthday.next_upcoming_hebrew_birthday;

  if (!hebrewDate) {
    throw new Error('No Hebrew date available for this birthday');
  }

  const startDate = parseISO(hebrewDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const age = new Date().getFullYear() - parseISO(birthday.birth_date_gregorian).getFullYear();

  let title: string;
  if (language === 'he') {
    title = `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת עברי 🎂`;
  } else {
    title = `Heb Birthday | ${age} | ${birthday.first_name} ${birthday.last_name} 🎂`;
  }

  let description = '';

  if (wishlist && wishlist.length > 0) {
    description += language === 'he' ? 'רשימת משאלות:\n' : 'Wishlist:\n';
    wishlist.forEach((item, index) => {
      description += `${index + 1}. ${item.item_name}`;
      if (item.description) {
        description += ` - ${item.description}`;
      }
      description += '\n';
    });
    description += '\n';
  }

  description += language === 'he'
    ? `תאריך לידה לועזי: ${format(parseISO(birthday.birth_date_gregorian), 'dd/MM/yyyy')}\n`
    : `Gregorian Birth Date: ${format(parseISO(birthday.birth_date_gregorian), 'dd/MM/yyyy')}\n`;

  description += language === 'he'
    ? `תאריך לידה עברי: ${birthday.birth_date_hebrew_string || hebrewDate}`
    : `Hebrew Birth Date: ${birthday.birth_date_hebrew_string || hebrewDate}`;

  if (birthday.after_sunset) {
    description += language === 'he' ? '\n⚠️ לאחר השקיעה' : '\n⚠️ After Sunset';
  }

  if (birthday.notes) {
    description += language === 'he' ? `\n\nהערות: ${birthday.notes}` : `\n\nNotes: ${birthday.notes}`;
  }

  return {
    title,
    startDate: formatDateForGoogleCalendar(startDate, true),
    endDate: formatDateForGoogleCalendar(endDate, true),
    description,
  };
}

export function openGoogleCalendarForBirthday(
  birthday: Birthday,
  language: 'he' | 'en' = 'he',
  wishlist?: WishlistItem[]
): void {
  try {
    const event = createBirthdayCalendarEvent(birthday, language, wishlist);
    const link = generateGoogleCalendarLink(event);
    window.open(link, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Failed to create Google Calendar link:', error);
    throw error;
  }
}
