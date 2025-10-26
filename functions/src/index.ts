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
  events?: HebcalEvent[];
}

async function fetchHebcalData(
  gregorianDate: Date,
  afterSunset: boolean
): Promise<HebcalResponse> {
  const year = gregorianDate.getFullYear();
  const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
  const day = String(gregorianDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

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
  hebrewDate: string,
  yearsAhead: number = 10
): Promise<Date[]> {
  const params = new URLSearchParams({
    cfg: 'json',
    hd: hebrewDate,
    h2g: '1',
  });

  const url = `https://www.hebcal.com/converter?${params.toString()}`;
  const currentYear = new Date().getFullYear();
  const futureDates: Date[] = [];

  for (let i = 0; i <= yearsAhead; i++) {
    try {
      const yearParams = new URLSearchParams(params);
      yearParams.set('gy', (currentYear + i).toString());

      const response = await fetch(`https://www.hebcal.com/converter?${yearParams.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.gy && data.gm && data.gd) {
        const date = new Date(data.gy, data.gm - 1, data.gd);
        if (date >= new Date()) {
          futureDates.push(date);
        }
      }
    } catch (error) {
      functions.logger.warn(`Error fetching year ${currentYear + i}:`, error);
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
      afterData.birthDateHebrewString &&
      afterData.nextUpcomingHebrewBirthdayGregorian &&
      afterData.futureHebrewBirthdaysGregorian
    ) {
      functions.logger.log('Birthday already has Hebrew data, skipping calculation');
      return null;
    }

    try {
      const birthDate = afterData.birthDateGregorian.toDate();
      const afterSunset = afterData.afterSunset || false;

      const hebcalData = await fetchHebcalData(birthDate, afterSunset);

      if (!hebcalData.hebrew) {
        throw new Error('No Hebrew date returned from Hebcal');
      }

      const futureDates = await fetchNextHebrewBirthdays(hebcalData.hebrew, 10);

      const updateData: any = {
        birthDateHebrewString: hebcalData.hebrew,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (futureDates.length > 0) {
        updateData.nextUpcomingHebrewBirthdayGregorian = admin.firestore.Timestamp.fromDate(
          futureDates[0]
        );
        updateData.futureHebrewBirthdaysGregorian = futureDates.map((date) =>
          admin.firestore.Timestamp.fromDate(date)
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
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const snapshot = await db
        .collection('birthdays')
        .where('archived', '==', false)
        .where('nextUpcomingHebrewBirthdayGregorian', '<', admin.firestore.Timestamp.fromDate(now))
        .get();

      const batch = db.batch();
      let updateCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const futureDates = data.futureHebrewBirthdaysGregorian || [];

        const upcomingDates = futureDates
          .map((ts: admin.firestore.Timestamp) => ts.toDate())
          .filter((date: Date) => date >= now);

        if (upcomingDates.length > 0) {
          batch.update(doc.ref, {
            nextUpcomingHebrewBirthdayGregorian: admin.firestore.Timestamp.fromDate(
              upcomingDates[0]
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          updateCount++;
        } else {
          try {
            const hebrewDate = data.birthDateHebrewString;
            if (hebrewDate) {
              const newFutureDates = await fetchNextHebrewBirthdays(hebrewDate, 10);
              if (newFutureDates.length > 0) {
                batch.update(doc.ref, {
                  nextUpcomingHebrewBirthdayGregorian: admin.firestore.Timestamp.fromDate(
                    newFutureDates[0]
                  ),
                  futureHebrewBirthdaysGregorian: newFutureDates.map((date) =>
                    admin.firestore.Timestamp.fromDate(date)
                  ),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                updateCount++;
              }
            }
          } catch (error) {
            functions.logger.warn(`Failed to update birthday ${doc.id}:`, error);
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
