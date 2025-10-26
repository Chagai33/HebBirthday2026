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
    const birthdayRef = await addDoc(collection(db, 'birthdays'), {
      tenant_id: tenantId,
      first_name: data.firstName,
      last_name: data.lastName,
      birth_date_gregorian: data.birthDateGregorian.toISOString().split('T')[0],
      after_sunset: data.afterSunset ?? false,
      gender: data.gender,
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
      updateData.birth_date_gregorian = data.birthDateGregorian.toISOString().split('T')[0];
      updateData.birth_date_hebrew_string = null;
      updateData.next_upcoming_hebrew_birthday = null;
      updateData.future_hebrew_birthdays = [];
    }
    if (data.afterSunset !== undefined) updateData.after_sunset = data.afterSunset;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await updateDoc(doc(db, 'birthdays', birthdayId), updateData);
  },

  async deleteBirthday(birthdayId: string): Promise<void> {
    await deleteDoc(doc(db, 'birthdays', birthdayId));
  },

  async archiveBirthday(birthdayId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'birthdays', birthdayId), {
      archived: true,
      updated_by: userId,
      updated_at: serverTimestamp(),
    });
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
    tenantId: string,
    firstName: string,
    lastName: string
  ): Promise<Birthday[]> {
    const allBirthdays = await this.getTenantBirthdays(tenantId);

    return allBirthdays.filter(
      (birthday) =>
        birthday.first_name.toLowerCase() === firstName.toLowerCase() &&
        birthday.last_name.toLowerCase() === lastName.toLowerCase()
    );
  },

  docToBirthday(id: string, data: any): Birthday {
    return {
      id,
      tenant_id: data.tenant_id,
      first_name: data.first_name,
      last_name: data.last_name,
      birth_date_gregorian: data.birth_date_gregorian,
      after_sunset: data.after_sunset ?? false,
      gender: data.gender,
      birth_date_hebrew_string: data.birth_date_hebrew_string,
      next_upcoming_hebrew_birthday: data.next_upcoming_hebrew_birthday,
      future_hebrew_birthdays: data.future_hebrew_birthdays || [],
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
