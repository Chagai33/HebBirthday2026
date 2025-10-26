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
exports.updateNextBirthdayScheduled = exports.onBirthdayWrite = void 0;
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
async function fetchNextHebrewBirthdays(hebrewDate, yearsAhead = 10) {
    const params = new URLSearchParams({
        cfg: 'json',
        hd: hebrewDate,
        h2g: '1',
    });
    const currentYear = new Date().getFullYear();
    const futureDates = [];
    for (let i = 0; i <= yearsAhead; i++) {
        try {
            const yearParams = new URLSearchParams(params);
            yearParams.set('gy', (currentYear + i).toString());
            const response = await (0, node_fetch_1.default)(`https://www.hebcal.com/converter?${yearParams.toString()}`);
            if (!response.ok)
                continue;
            const data = await response.json();
            if (data.gy && data.gm && data.gd) {
                const date = new Date(data.gy, data.gm - 1, data.gd);
                if (date >= new Date()) {
                    futureDates.push(date);
                }
            }
        }
        catch (error) {
            functions.logger.warn(`Error fetching year ${currentYear + i}:`, error);
        }
    }
    return futureDates.sort((a, b) => a.getTime() - b.getTime());
}
exports.onBirthdayWrite = functions.firestore
    .document('birthdays/{birthdayId}')
    .onWrite(async (change, context) => {
    const afterData = change.after.exists ? change.after.data() : null;
    if (!afterData) {
        return null;
    }
    if (afterData.birthDateHebrewString &&
        afterData.nextUpcomingHebrewBirthdayGregorian &&
        afterData.futureHebrewBirthdaysGregorian) {
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
        const updateData = {
            birthDateHebrewString: hebcalData.hebrew,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (futureDates.length > 0) {
            updateData.nextUpcomingHebrewBirthdayGregorian = admin.firestore.Timestamp.fromDate(futureDates[0]);
            updateData.futureHebrewBirthdaysGregorian = futureDates.map((date) => admin.firestore.Timestamp.fromDate(date));
        }
        await change.after.ref.update(updateData);
        functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);
        return null;
    }
    catch (error) {
        functions.logger.error('Error calculating Hebrew dates:', error);
        throw error;
    }
});
exports.updateNextBirthdayScheduled = functions.pubsub
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
                .map((ts) => ts.toDate())
                .filter((date) => date >= now);
            if (upcomingDates.length > 0) {
                batch.update(doc.ref, {
                    nextUpcomingHebrewBirthdayGregorian: admin.firestore.Timestamp.fromDate(upcomingDates[0]),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                updateCount++;
            }
            else {
                try {
                    const hebrewDate = data.birthDateHebrewString;
                    if (hebrewDate) {
                        const newFutureDates = await fetchNextHebrewBirthdays(hebrewDate, 10);
                        if (newFutureDates.length > 0) {
                            batch.update(doc.ref, {
                                nextUpcomingHebrewBirthdayGregorian: admin.firestore.Timestamp.fromDate(newFutureDates[0]),
                                futureHebrewBirthdaysGregorian: newFutureDates.map((date) => admin.firestore.Timestamp.fromDate(date)),
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
//# sourceMappingURL=index.js.map