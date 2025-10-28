"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = exports.migrateExistingUsers = exports.fixExistingBirthdays = exports.updateNextBirthdayScheduled = exports.refreshBirthdayHebrewData = exports.onBirthdayWrite = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const db = admin.firestore();
async function fetchHebcalData(gregorianDate, afterSunset) {
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
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            throw new Error(`Hebcal API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        functions.logger.error('Error fetching Hebcal data:', error);
        throw error;
    }
}
async function getCurrentHebrewYear() {
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
        const response = await (0, node_fetch_1.default)(`https://www.hebcal.com/converter?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to get current Hebrew year');
        }
        const data = await response.json();
        return data.hy;
    }
    catch (error) {
        functions.logger.error('Error getting current Hebrew year:', error);
        throw error;
    }
}
async function fetchNextHebrewBirthdays(startHebrewYear, hebrewMonth, hebrewDay, yearsAhead = 10) {
    const futureDates = [];
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
        fetchPromises.push((0, node_fetch_1.default)(url)
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
                    return { gregorianDate: date, hebrewYear: yearToFetch };
                }
            }
            return null;
        })
            .catch((error) => {
            functions.logger.error(`Error fetching Hebrew year ${yearToFetch}:`, error);
            return null;
        }));
    }
    const results = await Promise.all(fetchPromises);
    futureDates.push(...results.filter((date) => date !== null));
    functions.logger.log(`Total future dates found: ${futureDates.length}`);
    return futureDates.sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
}
exports.onBirthdayWrite = functions.firestore
    .document('birthdays/{birthdayId}')
    .onWrite(async (change, context) => {
    var _a;
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    if (!afterData) {
        return null;
    }
    if (!afterData.birth_date_gregorian) {
        functions.logger.warn('No birth_date_gregorian found, skipping');
        return null;
    }
    const hasHebrewData = afterData.birth_date_hebrew_string &&
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
        const futureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebcalData.hm, hebcalData.hd, 10);
        functions.logger.log(`Future dates returned: ${futureDates.length} dates`);
        const updateData = {
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
            const gregorianDate = nextDate.gregorianDate;
            updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
            updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
            updateData.future_hebrew_birthdays = futureDates.map((item) => ({
                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                hebrewYear: item.hebrewYear
            }));
        }
        else {
            functions.logger.warn('No future dates found, setting empty array');
            updateData.future_hebrew_birthdays = [];
            updateData.next_upcoming_hebrew_year = null;
        }
        const docSnapshot = await change.after.ref.get();
        if (!docSnapshot.exists) {
            functions.logger.warn('Document was deleted during processing, skipping update');
            return null;
        }
        await change.after.ref.update(updateData);
        functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);
        return null;
    }
    catch (error) {
        if (error.code === 5 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('No document to update'))) {
            functions.logger.warn('Document no longer exists, skipping update');
            return null;
        }
        functions.logger.error('Error calculating Hebrew dates:', error);
        throw error;
    }
});
exports.refreshBirthdayHebrewData = functions.https.onCall(async (data, context) => {
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
        const requests = (data === null || data === void 0 ? void 0 : data.requests) || [];
        const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);
        if (recentRequests.length >= maxRequests) {
            throw new functions.https.HttpsError('resource-exhausted', 'Too many refresh requests. Please wait 30 seconds.');
        }
        await rateLimitRef.update({
            requests: [...recentRequests, now],
        });
    }
    else {
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
        if ((birthdayData === null || birthdayData === void 0 ? void 0 : birthdayData.tenant_id) !== data.tenantId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const birthDateStr = birthdayData === null || birthdayData === void 0 ? void 0 : birthdayData.birth_date_gregorian;
        if (!birthDateStr) {
            throw new functions.https.HttpsError('failed-precondition', 'No birth date found');
        }
        const birthDate = new Date(birthDateStr);
        const afterSunset = (birthdayData === null || birthdayData === void 0 ? void 0 : birthdayData.after_sunset) || false;
        const hebcalData = await fetchHebcalData(birthDate, afterSunset);
        if (!hebcalData.hebrew) {
            throw new functions.https.HttpsError('internal', 'Failed to fetch Hebrew date');
        }
        const currentHebrewYear = await getCurrentHebrewYear();
        functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);
        const futureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebcalData.hm, hebcalData.hd, 10);
        const updateData = {
            birth_date_hebrew_string: hebcalData.hebrew,
            birth_date_hebrew_year: hebcalData.hy,
            birth_date_hebrew_month: hebcalData.hm,
            birth_date_hebrew_day: hebcalData.hd,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (futureDates.length > 0) {
            const nextDate = futureDates[0];
            const gregorianDate = nextDate.gregorianDate;
            updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
            updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
            updateData.future_hebrew_birthdays = futureDates.map((item) => ({
                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                hebrewYear: item.hebrewYear
            }));
        }
        await birthdayRef.update(updateData);
        functions.logger.log(`Successfully refreshed Hebrew dates for birthday ${birthdayId}`);
        return { success: true, message: 'Hebrew dates refreshed successfully' };
    }
    catch (error) {
        functions.logger.error('Error refreshing Hebrew dates:', error);
        throw new functions.https.HttpsError('internal', 'Failed to refresh Hebrew dates');
    }
});
exports.updateNextBirthdayScheduled = functions.pubsub
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
                const upcomingDates = futureDates.filter((item) => {
                    const dateStr = typeof item === 'string' ? item : item.gregorian;
                    return dateStr >= nowStr;
                });
                if (upcomingDates.length > 0) {
                    const nextItem = upcomingDates[0];
                    const nextGregorian = typeof nextItem === 'string' ? nextItem : nextItem.gregorian;
                    const nextHebrewYear = typeof nextItem === 'string' ? null : nextItem.hebrewYear;
                    batch.update(doc.ref, {
                        next_upcoming_hebrew_birthday: nextGregorian,
                        next_upcoming_hebrew_year: nextHebrewYear,
                        updated_at: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    updateCount++;
                }
                else {
                    try {
                        const hebrewYear = data.birth_date_hebrew_year;
                        const hebrewMonth = data.birth_date_hebrew_month;
                        const hebrewDay = data.birth_date_hebrew_day;
                        if (hebrewYear && hebrewMonth && hebrewDay) {
                            const currentHebrewYear = await getCurrentHebrewYear();
                            const newFutureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebrewMonth, hebrewDay, 10);
                            if (newFutureDates.length > 0) {
                                const nextDate = newFutureDates[0];
                                const gregorianDate = nextDate.gregorianDate;
                                batch.update(doc.ref, {
                                    next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                                    next_upcoming_hebrew_year: nextDate.hebrewYear,
                                    future_hebrew_birthdays: newFutureDates.map((item) => ({
                                        gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                                        hebrewYear: item.hebrewYear
                                    })),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                                });
                                updateCount++;
                            }
                        }
                    }
                    catch (error) {
                        functions.logger.warn(`Failed to update birthday ${doc.id}:`, error);
                    }
                }
            }
        }
        if (updateCount > 0) {
            await batch.commit();
            functions.logger.log(`Updated ${updateCount} birthdays with new upcoming dates`);
        }
        else {
            functions.logger.log('No birthdays needed updating');
        }
        return null;
    }
    catch (error) {
        functions.logger.error('Error in scheduled birthday update:', error);
        throw error;
    }
});
exports.fixExistingBirthdays = functions.https.onRequest(async (req, res) => {
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
exports.migrateExistingUsers = functions.https.onRequest(async (req, res) => {
    try {
        const membersSnapshot = await db.collection('tenant_members').get();
        const updates = [];
        for (const doc of membersSnapshot.docs) {
            const data = doc.data();
            const userId = data.user_id;
            const tenantId = data.tenant_id;
            const role = data.role || 'member';
            updates.push(admin.auth().setCustomUserClaims(userId, {
                tenantId: tenantId,
                role: role
            }).then(() => {
                functions.logger.log(`Set custom claims for user ${userId}: tenantId=${tenantId}, role=${role}`);
            }).catch((error) => {
                functions.logger.error(`Failed to set custom claims for user ${userId}:`, error);
            }));
        }
        await Promise.all(updates);
        res.json({
            success: true,
            message: `Migrated ${updates.length} users`,
            usersProcessed: updates.length
        });
    }
    catch (error) {
        functions.logger.error('Error in migrateExistingUsers:', error);
        res.status(500).json({
            success: false,
            error: String(error)
        });
    }
});
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const userId = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0];
    try {
        functions.logger.log(`New user created: ${userId}, creating tenant...`);
        const batch = db.batch();
        const tenantRef = db.collection('tenants').doc();
        const tenantId = tenantRef.id;
        batch.set(tenantRef, {
            name: `${displayName}'s Organization`,
            owner_id: userId,
            default_language: 'he',
            timezone: 'Asia/Jerusalem',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const memberRef = db.collection('tenant_members').doc();
        batch.set(memberRef, {
            tenant_id: tenantId,
            user_id: userId,
            role: 'owner',
            joined_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const maleGroupRef = db.collection('groups').doc();
        batch.set(maleGroupRef, {
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
        const femaleGroupRef = db.collection('groups').doc();
        batch.set(femaleGroupRef, {
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
        await admin.auth().setCustomUserClaims(userId, {
            tenantId: tenantId,
            role: 'owner'
        });
        functions.logger.log(`Custom claims set for user ${userId}, tenantId: ${tenantId}`);
        await batch.commit();
        functions.logger.log(`Successfully created tenant ${tenantId} with groups for user ${userId}`);
        return null;
    }
    catch (error) {
        functions.logger.error(`Error in onUserCreate for user ${userId}:`, error);
        try {
            await admin.auth().deleteUser(userId);
            functions.logger.log(`Rolled back: deleted user ${userId}`);
        }
        catch (rollbackError) {
            functions.logger.error(`Failed to rollback user ${userId}:`, rollbackError);
        }
        throw error;
    }
});
//# sourceMappingURL=index.js.map