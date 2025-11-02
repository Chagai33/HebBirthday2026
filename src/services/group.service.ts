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
import { Group, GroupType } from '../types';
import { retryFirestoreOperation } from './firestore.retry';

const ROOT_GROUPS = [
  { type: 'family' as GroupType, nameHe: 'משפחה', nameEn: 'Family', color: '#3b82f6' },
  { type: 'friends' as GroupType, nameHe: 'חברים', nameEn: 'Friends', color: '#10b981' },
  { type: 'work' as GroupType, nameHe: 'עבודה', nameEn: 'Work', color: '#f59e0b' }
];

export const groupService = {
  isInitializing: false,

  async initializeRootGroups(tenantId: string, userId: string, language: 'he' | 'en' = 'he'): Promise<void> {
    if (this.isInitializing) {
      console.log('Already initializing root groups, skipping...');
      return;
    }

    return retryFirestoreOperation(async () => {
      const existingRoots = await this.getRootGroups(tenantId);

      if (existingRoots.length >= 3) {
        console.log('Root groups already exist, skipping initialization');
        return;
      }

      if (this.isInitializing) {
        console.log('Another initialization is in progress, skipping...');
        return;
      }

      this.isInitializing = true;

      try {
        const existingTypes = new Set(existingRoots.map(g => g.type));
        const groupsToCreate = ROOT_GROUPS.filter(root => !existingTypes.has(root.type));

        if (groupsToCreate.length === 0) {
          console.log('All root groups already exist');
          return;
        }

        const promises = groupsToCreate.map(root =>
          addDoc(collection(db, 'groups'), {
            tenant_id: tenantId,
            name: language === 'he' ? root.nameHe : root.nameEn,
            parent_id: null,
            is_root: true,
            type: root.type,
            color: root.color,
            created_by: userId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          })
        );

        await Promise.all(promises);
        console.log('Root groups initialized successfully');
      } finally {
        this.isInitializing = false;
      }
    });
  },

  async createGroup(
    tenantId: string,
    groupInput: {
      name: string;
      parentId?: string | null;
      color?: string;
      calendarPreference?: 'gregorian' | 'hebrew' | 'both';
    },
    userId: string
  ): Promise<string> {
    const isRoot = !groupInput.parentId;

    const groupData: any = {
      tenant_id: tenantId,
      name: groupInput.name,
      parent_id: groupInput.parentId || null,
      is_root: isRoot,
      color: groupInput.color || (isRoot ? '#6366f1' : '#8b5cf6'),
      created_by: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    if (groupInput.calendarPreference) {
      groupData.calendar_preference = groupInput.calendarPreference;
    }

    const groupRef = await addDoc(collection(db, 'groups'), groupData);

    return groupRef.id;
  },

  async updateGroup(
    groupId: string,
    data: { name?: string; color?: string; calendarPreference?: 'gregorian' | 'hebrew' | 'both' }
  ): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.calendarPreference !== undefined) updateData.calendar_preference = data.calendarPreference;

    await updateDoc(doc(db, 'groups', groupId), updateData);
  },

  async deleteGroup(groupId: string, deleteBirthdays: boolean = false): Promise<void> {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    if (deleteBirthdays) {
      const birthdaysQuery = query(
        collection(db, 'birthdays'),
        where('group_id', '==', groupId)
      );
      const birthdaysSnapshot = await getDocs(birthdaysQuery);
      const deletePromises = birthdaysSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } else {
      const birthdaysQuery = query(
        collection(db, 'birthdays'),
        where('group_id', '==', groupId)
      );
      const birthdaysSnapshot = await getDocs(birthdaysQuery);
      const updatePromises = birthdaysSnapshot.docs.map(docSnap =>
        updateDoc(docSnap.ref, { group_id: null })
      );
      await Promise.all(updatePromises);
    }

    await deleteDoc(doc(db, 'groups', groupId));
  },

  async getGroupBirthdaysCount(groupId: string): Promise<number> {
    const q = query(
      collection(db, 'birthdays'),
      where('group_id', '==', groupId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) return null;

    return this.docToGroup(groupDoc.id, groupDoc.data());
  },

  async getTenantGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getRootGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId),
      where('is_root', '==', true)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getChildGroups(parentId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('parent_id', '==', parentId)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getGroupsByType(tenantId: string, type: GroupType): Promise<Group[]> {
    const rootGroups = await this.getRootGroups(tenantId);
    const rootGroup = rootGroups.find(g => g.type === type);
    if (!rootGroup) return [];
    return await this.getChildGroups(rootGroup.id);
  },

  docToGroup(id: string, data: any): Group {
    return {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
      parent_id: data.parent_id || null,
      is_root: data.is_root || false,
      type: data.type,
      color: data.color,
      created_by: data.created_by,
      created_at: this.timestampToString(data.created_at),
      updated_at: this.timestampToString(data.updated_at),
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
