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
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Birthday, BirthdayFormData } from '../types';

export const birthdayService = {
  async createBirthday(
    tenantId: string,
    data: BirthdayFormData,
    userId: string
  ): Promise<string> {
    const birthdaysRef = collection(db, 'birthdays');

    const birthdayData = {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDateGregorian: Timestamp.fromDate(data.birthDateGregorian),
      afterSunset: data.afterSunset ?? false,
      gender: data.gender,
      notes: data.notes || '',
      archived: false,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    const docRef = await addDoc(birthdaysRef, birthdayData);
    return docRef.id;
  },

  async updateBirthday(
    birthdayId: string,
    data: Partial<BirthdayFormData>,
    userId: string
  ): Promise<void> {
    const birthdayRef = doc(db, 'birthdays', birthdayId);

    const updateData: any = {
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.birthDateGregorian !== undefined) {
      updateData.birthDateGregorian = Timestamp.fromDate(data.birthDateGregorian);
    }
    if (data.afterSunset !== undefined) updateData.afterSunset = data.afterSunset;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await updateDoc(birthdayRef, updateData);
  },

  async deleteBirthday(birthdayId: string): Promise<void> {
    const birthdayRef = doc(db, 'birthdays', birthdayId);
    await deleteDoc(birthdayRef);
  },

  async archiveBirthday(birthdayId: string, userId: string): Promise<void> {
    const birthdayRef = doc(db, 'birthdays', birthdayId);
    await updateDoc(birthdayRef, {
      archived: true,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  },

  async getBirthday(birthdayId: string): Promise<Birthday | null> {
    const birthdayRef = doc(db, 'birthdays', birthdayId);
    const snapshot = await getDoc(birthdayRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Birthday;
  },

  async getTenantBirthdays(tenantId: string, includeArchived = false): Promise<Birthday[]> {
    const birthdaysRef = collection(db, 'birthdays');

    let q = query(
      birthdaysRef,
      where('tenantId', '==', tenantId),
      orderBy('birthDateGregorian', 'asc')
    );

    if (!includeArchived) {
      q = query(
        birthdaysRef,
        where('tenantId', '==', tenantId),
        where('archived', '==', false),
        orderBy('birthDateGregorian', 'asc')
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Birthday[];
  },

  async getUpcomingBirthdays(tenantId: string, days: number = 30): Promise<Birthday[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const birthdaysRef = collection(db, 'birthdays');
    const q = query(
      birthdaysRef,
      where('tenantId', '==', tenantId),
      where('archived', '==', false),
      where('nextUpcomingHebrewBirthdayGregorian', '>=', Timestamp.fromDate(now)),
      where('nextUpcomingHebrewBirthdayGregorian', '<=', Timestamp.fromDate(futureDate)),
      orderBy('nextUpcomingHebrewBirthdayGregorian', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Birthday[];
  },

  async searchBirthdays(
    tenantId: string,
    searchTerm: string
  ): Promise<Birthday[]> {
    const allBirthdays = await this.getTenantBirthdays(tenantId);

    const searchLower = searchTerm.toLowerCase();
    return allBirthdays.filter(
      birthday =>
        birthday.firstName.toLowerCase().includes(searchLower) ||
        birthday.lastName.toLowerCase().includes(searchLower)
    );
  },

  async checkDuplicates(
    tenantId: string,
    firstName: string,
    lastName: string
  ): Promise<Birthday[]> {
    const allBirthdays = await this.getTenantBirthdays(tenantId);

    return allBirthdays.filter(
      birthday =>
        birthday.firstName.toLowerCase() === firstName.toLowerCase() &&
        birthday.lastName.toLowerCase() === lastName.toLowerCase()
    );
  },
};
