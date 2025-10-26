import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

const db = admin.firestore();

interface HebcalEvent {
  date: string;
  hebrew: string;
}

interface HebcalResponse {
  hebrew: string;
  hy: number;
  hm: string;
  hd: number;
  events?: HebcalEvent[];
}

async function fetchHebcalData(
  gregorianDate: Date,
  afterSunset: boolean
): Promise<HebcalResponse> {
  const year = gregorianDate.getFullYear();
  const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
  const day = String(gregorianDate.getDate()).padStart(2, '0');

  const params = new URLSearchParams({
    cfg: 'json',
    gy: year.toString(),
    gm: month,
    gd: day,
    g2h: '1',
    lg: 's',
  });

  if (afterSunset) {
    params.append('gs', 'on');
  }

  const url = `https://www.hebcal.com/converter?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as HebcalResponse;
  } catch (error) {
    functions.logger.error('Error fetching Hebcal data:', error);
    throw error;
  }
}

async function fetchNextHebrewBirthdays(
  hebrewYear: number,
  hebrewMonth: string,
  hebrewDay: number,
  yearsAhead: number = 10
): Promise<Date[]> {
  const futureDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= yearsAhead; i++) {
    try {
      const params = new URLSearchParams({
        cfg: 'json',
        hy: (hebrewYear + i).toString(),
        hm: hebrewMonth,
        hd: hebrewDay.toString(),
        h2g: '1',
      });

      const response = await fetch(`https://www.hebcal.com/converter?${params.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.gy && data.gm && data.gd) {
        const date = new Date(data.gy, data.gm - 1, data.gd);
        date.setHours(0, 0, 0, 0);
        if (date >= today) {
          futureDates.push(date);
        }
      }
    } catch (error) {
      functions.logger.warn(`Error fetching Hebrew year ${hebrewYear + i}:`, error);
    }
  }

  return futureDates.sort((a, b) => a.getTime() - b.getTime());
}

export const onBirthdayWrite = functions.firestore
  .document('birthdays/{birthdayId}')
  .onWrite(async (change, context) => {
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      return null;
    }

    if (
      afterData.birth_date_hebrew_string &&
      afterData.next_upcoming_hebrew_birthday &&
      afterData.future_hebrew_birthdays
    ) {
      functions.logger.log('Birthday already has Hebrew data, skipping calculation');
      return null;
    }

    try {
      const birthDateStr = afterData.birth_date_gregorian;
      const birthDate = new Date(birthDateStr);
      const afterSunset = afterData.after_sunset || false;

      const hebcalData = await fetchHebcalData(birthDate, afterSunset);

      if (!hebcalData.hebrew) {
        throw new Error('No Hebrew date returned from Hebcal');
      }

      const futureDates = await fetchNextHebrewBirthdays(
        hebcalData.hy,
        hebcalData.hm,
        hebcalData.hd,
        10
      );

      const updateData: any = {
        birth_date_hebrew_string: hebcalData.hebrew,
        birth_date_hebrew_year: hebcalData.hy,
        birth_date_hebrew_month: hebcalData.hm,
        birth_date_hebrew_day: hebcalData.hd,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (futureDates.length > 0) {
        const nextDate = futureDates[0];
        updateData.next_upcoming_hebrew_birthday = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        updateData.future_hebrew_birthdays = futureDates.map((date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        );
      }

      await change.after.ref.update(updateData);

      functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);

      return null;
    } catch (error) {
      functions.logger.error('Error calculating Hebrew dates:', error);
      throw error;
    }
  });

export const updateNextBirthdayScheduled = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const snapshot = await db
        .collection('birthdays')
        .where('archived', '==', false)
        .get();

      const batch = db.batch();
      let updateCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const nextBirthday = data.next_upcoming_hebrew_birthday;

        if (!nextBirthday || nextBirthday < nowStr) {
          const futureDates = data.future_hebrew_birthdays || [];

          const upcomingDates = futureDates.filter((dateStr: string) => dateStr >= nowStr);

          if (upcomingDates.length > 0) {
            batch.update(doc.ref, {
              next_upcoming_hebrew_birthday: upcomingDates[0],
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            updateCount++;
          } else {
            try {
              const hebrewYear = data.birth_date_hebrew_year;
              const hebrewMonth = data.birth_date_hebrew_month;
              const hebrewDay = data.birth_date_hebrew_day;
              if (hebrewYear && hebrewMonth && hebrewDay) {
                const newFutureDates = await fetchNextHebrewBirthdays(
                  hebrewYear,
                  hebrewMonth,
                  hebrewDay,
                  10
                );
                if (newFutureDates.length > 0) {
                  const nextDate = newFutureDates[0];
                  batch.update(doc.ref, {
                    next_upcoming_hebrew_birthday: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`,
                    future_hebrew_birthdays: newFutureDates.map((date) =>
                      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                    ),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  updateCount++;
                }
              }
            } catch (error) {
              functions.logger.warn(`Failed to update birthday ${doc.id}:`, error);
            }
          }
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        functions.logger.log(`Updated ${updateCount} birthdays with new upcoming dates`);
      } else {
        functions.logger.log('No birthdays needed updating');
      }

      return null;
    } catch (error) {
      functions.logger.error('Error in scheduled birthday update:', error);
      throw error;
    }
  });
