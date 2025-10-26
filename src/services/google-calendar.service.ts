import { Birthday } from '../types';
import { format } from 'date-fns';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.google === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.initializeTokenClient();
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        this.initializeTokenClient();
        resolve();
      }
    });
  }

  private initializeTokenClient(): void {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      return;
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
        }
      },
    });
  }

  async requestAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (response.access_token) {
          this.accessToken = response.access_token;
          resolve(response.access_token);
        }
      };

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async addBirthdayToCalendar(birthday: Birthday): Promise<void> {
    if (!this.accessToken) {
      await this.requestAccessToken();
    }

    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const events = [];

    if (birthday.next_upcoming_hebrew_birthday) {
      const nextBirthday = new Date(birthday.next_upcoming_hebrew_birthday);
      events.push(this.createEvent(birthday, nextBirthday, true));
    }

    if (birthday.future_hebrew_birthdays) {
      for (const dateStr of birthday.future_hebrew_birthdays.slice(0, 5)) {
        const date = new Date(dateStr);
        events.push(this.createEvent(birthday, date, true));
      }
    }

    for (const event of events) {
      await this.insertEvent(event);
    }
  }

  async addMultipleBirthdaysToCalendar(birthdays: Birthday[]): Promise<void> {
    for (const birthday of birthdays) {
      await this.addBirthdayToCalendar(birthday);
    }
  }

  private createEvent(birthday: Birthday, date: Date, isHebrew: boolean) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const title = isHebrew
      ? `🎂 ${birthday.first_name} ${birthday.last_name} - ${
          birthday.birth_date_hebrew_string || ''
        }`
      : `🎂 ${birthday.first_name} ${birthday.last_name}`;

    return {
      summary: title,
      description: `Birthday: ${birthday.first_name} ${birthday.last_name}\nHebrew Date: ${
        birthday.birth_date_hebrew_string || 'N/A'
      }\n${birthday.notes || ''}`,
      start: {
        date: dateStr,
      },
      end: {
        date: dateStr,
      },
      recurrence: isHebrew ? undefined : ['RRULE:FREQ=YEARLY'],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };
  }

  private async insertEvent(event: any): Promise<void> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create event: ${error.error.message}`);
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
