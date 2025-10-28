import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Birthday, BirthdayFormData } from '../types';

export const birthdayService = {
  async createBirthday(
    tenantId: string,
    data: BirthdayFormData,
    userId: string
  ): Promise<string> {
    const birthDate = data.birthDateGregorian;
    const birthdayRef = await addDoc(collection(db, 'birthdays'), {
      tenant_id: tenantId,
      group_id: data.groupId,
      first_name: data.firstName,
      last_name: data.lastName,
      birth_date_gregorian: birthDate.toISOString().split('T')[0],
      after_sunset: data.afterSunset ?? false,
      gender: data.gender,
      gregorian_year: birthDate.getFullYear(),
      gregorian_month: birthDate.getMonth() + 1,
      gregorian_day: birthDate.getDate(),
      calendar_preference_override: data.calendarPreferenceOverride || null,
      notes: data.notes || '',
      archived: false,
      created_by: userId,
      updated_by: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      birth_date_hebrew_string: null,
      next_upcoming_hebrew_birthday: null,
      future_hebrew_birthdays: [],
    });

    return birthdayRef.id;
  },

  async updateBirthday(
    birthdayId: string,
    data: Partial<BirthdayFormData>,
    userId: string
  ): Promise<void> {
    const updateData: any = {
      updated_by: userId,
      updated_at: serverTimestamp(),
    };

    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.birthDateGregorian !== undefined) {
      const birthDate = data.birthDateGregorian;
      updateData.birth_date_gregorian = birthDate.toISOString().split('T')[0];
      updateData.gregorian_year = birthDate.getFullYear();
      updateData.gregorian_month = birthDate.getMonth() + 1;
      updateData.gregorian_day = birthDate.getDate();
      updateData.birth_date_hebrew_string = null;
      updateData.next_upcoming_hebrew_birthday = null;
      updateData.future_hebrew_birthdays = [];
    }
    if (data.afterSunset !== undefined) updateData.after_sunset = data.afterSunset;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.groupId !== undefined) updateData.group_id = data.groupId || null;
    if (data.calendarPreferenceOverride !== undefined) updateData.calendar_preference_override = data.calendarPreferenceOverride;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await updateDoc(doc(db, 'birthdays', birthdayId), updateData);
  },

  async deleteBirthday(birthdayId: string): Promise<void> {
    await deleteDoc(doc(db, 'birthdays', birthdayId));
  },

  async getBirthday(birthdayId: string): Promise<Birthday | null> {
    const birthdayDoc = await getDoc(doc(db, 'birthdays', birthdayId));
    if (!birthdayDoc.exists()) return null;

    return this.docToBirthday(birthdayDoc.id, birthdayDoc.data());
  },

  async getTenantBirthdays(tenantId: string, includeArchived = false): Promise<Birthday[]> {
    let q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      orderBy('birth_date_gregorian', 'asc')
    );

    if (!includeArchived) {
      q = query(
        collection(db, 'birthdays'),
        where('tenant_id', '==', tenantId),
        where('archived', '==', false),
        orderBy('birth_date_gregorian', 'asc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));
  },

  async getUpcomingBirthdays(tenantId: string, days: number = 30): Promise<Birthday[]> {
    const now = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      where('archived', '==', false),
      where('next_upcoming_hebrew_birthday', '>=', now),
      where('next_upcoming_hebrew_birthday', '<=', futureDateStr),
      orderBy('next_upcoming_hebrew_birthday', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));
  },

  async searchBirthdays(tenantId: string, searchTerm: string): Promise<Birthday[]> {
    const allBirthdays = await this.getTenantBirthdays(tenantId);

    const searchLower = searchTerm.toLowerCase();
    return allBirthdays.filter(
      (birthday) =>
        birthday.first_name.toLowerCase().includes(searchLower) ||
        birthday.last_name.toLowerCase().includes(searchLower)
    );
  },

  async checkDuplicates(
    groupId: string,
    firstName: string,
    lastName: string
  ): Promise<Birthday[]> {
    const q = query(
      collection(db, 'birthdays'),
      where('group_id', '==', groupId),
      where('archived', '==', false)
    );

    const snapshot = await getDocs(q);
    const groupBirthdays = snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));

    return groupBirthdays.filter(
      (birthday) =>
        birthday.first_name.toLowerCase() === firstName.toLowerCase() &&
        birthday.last_name.toLowerCase() === lastName.toLowerCase()
    );
  },

  docToBirthday(id: string, data: any): Birthday {
    return {
      id,
      tenant_id: data.tenant_id,
      group_id: data.group_id || undefined,
      first_name: data.first_name,
      last_name: data.last_name,
      birth_date_gregorian: data.birth_date_gregorian,
      after_sunset: data.after_sunset ?? false,
      gender: data.gender,
      birth_date_hebrew_string: data.birth_date_hebrew_string,
      next_upcoming_hebrew_birthday: data.next_upcoming_hebrew_birthday,
      future_hebrew_birthdays: data.future_hebrew_birthdays || [],
      gregorian_year: data.gregorian_year,
      gregorian_month: data.gregorian_month,
      gregorian_day: data.gregorian_day,
      hebrew_year: data.hebrew_year,
      hebrew_month: data.hebrew_month,
      hebrew_day: data.hebrew_day,
      calendar_preference_override: data.calendar_preference_override || null,
      notes: data.notes || '',
      archived: data.archived ?? false,
      created_at: this.timestampToString(data.created_at),
      created_by: data.created_by,
      updated_at: this.timestampToString(data.updated_at),
      updated_by: data.updated_by,
    };
  },

  timestampToString(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  },
};
