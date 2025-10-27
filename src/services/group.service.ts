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

const ROOT_GROUPS = [
  { type: 'family' as GroupType, nameHe: 'משפחה', nameEn: 'Family', color: '#3b82f6' },
  { type: 'friends' as GroupType, nameHe: 'חברים', nameEn: 'Friends', color: '#10b981' },
  { type: 'work' as GroupType, nameHe: 'עבודה', nameEn: 'Work', color: '#f59e0b' }
];

export const groupService = {
  async initializeRootGroups(tenantId: string, userId: string, language: 'he' | 'en' = 'he'): Promise<void> {
    const existingRoots = await this.getRootGroups(tenantId);
    if (existingRoots.length > 0) return;

    const promises = ROOT_GROUPS.map(root =>
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
  },

  async createGroup(
    tenantId: string,
    name: string,
    parentId: string,
    color: string,
    userId: string
  ): Promise<string> {
    const groupRef = await addDoc(collection(db, 'groups'), {
      tenant_id: tenantId,
      name,
      parent_id: parentId,
      is_root: false,
      color,
      created_by: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return groupRef.id;
  },

  async updateGroup(
    groupId: string,
    data: { name?: string; color?: string }
  ): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    await updateDoc(doc(db, 'groups', groupId), updateData);
  },

  async deleteGroup(groupId: string): Promise<void> {
    await deleteDoc(doc(db, 'groups', groupId));
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) return null;

    return this.docToGroup(groupDoc.id, groupDoc.data());
  },

  async getTenantGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
  },

  async getRootGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId),
      where('is_root', '==', true),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
  },

  async getChildGroups(parentId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('parent_id', '==', parentId),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
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
