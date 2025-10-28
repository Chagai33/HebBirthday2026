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

async function getCurrentHebrewYear(): Promise<number> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const params = new URLSearchParams({
    cfg: 'json',
    gy: year.toString(),
    gm: month,
    gd: day,
    g2h: '1',
  });

  try {
    const response = await fetch(`https://www.hebcal.com/converter?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to get current Hebrew year');
    }
    const data = await response.json();
    return data.hy;
  } catch (error) {
    functions.logger.error('Error getting current Hebrew year:', error);
    throw error;
  }
}

async function fetchNextHebrewBirthdays(
  startHebrewYear: number,
  hebrewMonth: string,
  hebrewDay: number,
  yearsAhead: number = 10
): Promise<Date[]> {
  const futureDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  functions.logger.log(`Fetching future dates starting from Hebrew year: ${startHebrewYear}, month: ${hebrewMonth}, day: ${hebrewDay}`);

  const fetchPromises = [];
  for (let i = 0; i <= yearsAhead; i++) {
    const yearToFetch = startHebrewYear + i;
    const params = new URLSearchParams({
      cfg: 'json',
      hy: yearToFetch.toString(),
      hm: hebrewMonth,
      hd: hebrewDay.toString(),
      h2g: '1',
    });

    const url = `https://www.hebcal.com/converter?${params.toString()}`;
    fetchPromises.push(
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            functions.logger.warn(`Response not OK for year ${yearToFetch}: ${response.status}`);
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.gy && data.gm && data.gd) {
            const date = new Date(data.gy, data.gm - 1, data.gd);
            date.setHours(0, 0, 0, 0);
            functions.logger.log(`Year ${yearToFetch} -> ${date.toISOString().split('T')[0]} (${date >= today ? 'FUTURE' : 'PAST'})`);
            if (date >= today) {
              return date;
            }
          }
          return null;
        })
        .catch((error) => {
          functions.logger.error(`Error fetching Hebrew year ${yearToFetch}:`, error);
          return null;
        })
    );
  }

  const results = await Promise.all(fetchPromises);
  futureDates.push(...results.filter((date): date is Date => date !== null));

  functions.logger.log(`Total future dates found: ${futureDates.length}`);
  return futureDates.sort((a, b) => a.getTime() - b.getTime());
}

export const onBirthdayWrite = functions.firestore
  .document('birthdays/{birthdayId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      return null;
    }

    if (!afterData.birth_date_gregorian) {
      functions.logger.warn('No birth_date_gregorian found, skipping');
      return null;
    }

    const hasHebrewData =
      afterData.birth_date_hebrew_string &&
      afterData.birth_date_hebrew_year &&
      afterData.birth_date_hebrew_month &&
      afterData.birth_date_hebrew_day &&
      afterData.next_upcoming_hebrew_birthday &&
      afterData.future_hebrew_birthdays &&
      afterData.future_hebrew_birthdays.length > 0;

    if (beforeData) {
      const birthDateChanged = beforeData.birth_date_gregorian !== afterData.birth_date_gregorian;
      const afterSunsetChanged = beforeData.after_sunset !== afterData.after_sunset;

      if (!birthDateChanged && !afterSunsetChanged) {
        functions.logger.log('No relevant changes detected, skipping calculation');
        return null;
      }

      if (hasHebrewData && !birthDateChanged && !afterSunsetChanged) {
        functions.logger.log('Birthday already has Hebrew data and no changes, skipping calculation');
        return null;
      }
    }

    if (hasHebrewData && !beforeData) {
      functions.logger.log('New birthday already has Hebrew data, skipping calculation');
      return null;
    }

    try {
      const birthDateStr = afterData.birth_date_gregorian;
      const birthDate = new Date(birthDateStr);
      const afterSunset = afterData.after_sunset || false;

      functions.logger.log(`Processing birthday ${context.params.birthdayId}: ${birthDateStr}, afterSunset: ${afterSunset}`);

      const hebcalData = await fetchHebcalData(birthDate, afterSunset);
      functions.logger.log(`Hebcal data received:`, JSON.stringify(hebcalData));

      if (!hebcalData.hebrew) {
        throw new Error('No Hebrew date returned from Hebcal');
      }

      const currentHebrewYear = await getCurrentHebrewYear();
      functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);
      functions.logger.log(`Birth Hebrew date: year=${hebcalData.hy}, month=${hebcalData.hm}, day=${hebcalData.hd}`);
      functions.logger.log(`Fetching next birthdays starting from year ${currentHebrewYear}`);

      const futureDates = await fetchNextHebrewBirthdays(
        currentHebrewYear,
        hebcalData.hm,
        hebcalData.hd,
        10
      );

      functions.logger.log(`Future dates returned: ${futureDates.length} dates`);

      const updateData: any = {
        birth_date_hebrew_string: hebcalData.hebrew,
        birth_date_hebrew_year: hebcalData.hy,
        birth_date_hebrew_month: hebcalData.hm,
        birth_date_hebrew_day: hebcalData.hd,
        gregorian_year: birthDate.getFullYear(),
        gregorian_month: birthDate.getMonth() + 1,
        gregorian_day: birthDate.getDate(),
        hebrew_year: hebcalData.hy,
        hebrew_month: hebcalData.hm,
        hebrew_day: hebcalData.hd,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (futureDates.length > 0) {
        const nextDate = futureDates[0];
        updateData.next_upcoming_hebrew_birthday = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        updateData.future_hebrew_birthdays = futureDates.map((date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        );
      } else {
        functions.logger.warn('No future dates found, setting empty array');
        updateData.future_hebrew_birthdays = [];
      }

      const docSnapshot = await change.after.ref.get();
      if (!docSnapshot.exists) {
        functions.logger.warn('Document was deleted during processing, skipping update');
        return null;
      }

      await change.after.ref.update(updateData);

      functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);

      return null;
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('No document to update')) {
        functions.logger.warn('Document no longer exists, skipping update');
        return null;
      }
      functions.logger.error('Error calculating Hebrew dates:', error);
      throw error;
    }
  });

export const refreshBirthdayHebrewData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const birthdayId = data.birthdayId;
  if (!birthdayId) {
    throw new functions.https.HttpsError('invalid-argument', 'Birthday ID is required');
  }

  const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_refresh`);
  const rateLimitDoc = await rateLimitRef.get();

  const now = Date.now();
  const windowMs = 30000; // 30 seconds
  const maxRequests = 3;

  if (rateLimitDoc.exists) {
    const data = rateLimitDoc.data();
    const requests = data?.requests || [];

    const recentRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many refresh requests. Please wait 30 seconds.'
      );
    }

    await rateLimitRef.update({
      requests: [...recentRequests, now],
    });
  } else {
    await rateLimitRef.set({
      requests: [now],
    });
  }

  try {
    const birthdayRef = db.collection('birthdays').doc(birthdayId);
    const birthdayDoc = await birthdayRef.get();

    if (!birthdayDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Birthday not found');
    }

    const birthdayData = birthdayDoc.data();

    if (birthdayData?.tenant_id !== data.tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    const birthDateStr = birthdayData?.birth_date_gregorian;
    if (!birthDateStr) {
      throw new functions.https.HttpsError('failed-precondition', 'No birth date found');
    }

    const birthDate = new Date(birthDateStr);
    const afterSunset = birthdayData?.after_sunset || false;

    const hebcalData = await fetchHebcalData(birthDate, afterSunset);

    if (!hebcalData.hebrew) {
      throw new functions.https.HttpsError('internal', 'Failed to fetch Hebrew date');
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

    await birthdayRef.update(updateData);

    functions.logger.log(`Successfully refreshed Hebrew dates for birthday ${birthdayId}`);

    return { success: true, message: 'Hebrew dates refreshed successfully' };
  } catch (error) {
    functions.logger.error('Error refreshing Hebrew dates:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh Hebrew dates');
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

export const fixExistingBirthdays = functions.https.onRequest(async (req, res) => {
  const snapshot = await db.collection('birthdays').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.birth_date_hebrew_string && !data.next_upcoming_hebrew_birthday) {
      await doc.ref.update({
        birth_date_hebrew_string: null,
      });
    }
  }

  res.send('Done');
});

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    const userId = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0];

    functions.logger.log(`New user created: ${userId}, creating tenant...`);

    const tenantRef = await db.collection('tenants').add({
      name: `${displayName}'s Organization`,
      owner_id: userId,
      default_language: 'he',
      timezone: 'Asia/Jerusalem',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const tenantId = tenantRef.id;
    functions.logger.log(`Tenant created: ${tenantId}`);

    await db.collection('tenant_members').add({
      tenant_id: tenantId,
      user_id: userId,
      role: 'owner',
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.log(`Tenant membership created for user ${userId}`);

    const maleGroupRef = await db.collection('groups').add({
      tenant_id: tenantId,
      name: 'גברים',
      name_en: 'Men',
      is_gender_group: true,
      gender_type: 'male',
      parent_group_id: null,
      created_by: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const femaleGroupRef = await db.collection('groups').add({
      tenant_id: tenantId,
      name: 'נשים',
      name_en: 'Women',
      is_gender_group: true,
      gender_type: 'female',
      parent_group_id: null,
      created_by: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.log(`Root groups created: ${maleGroupRef.id}, ${femaleGroupRef.id}`);

    await admin.auth().setCustomUserClaims(userId, {
      tenantId: tenantId,
      role: 'owner'
    });

    functions.logger.log(`Custom claims set for user ${userId}`);

    return null;
  } catch (error) {
    functions.logger.error('Error in onUserCreate:', error);
    throw error;
  }
});