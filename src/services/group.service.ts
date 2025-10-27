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

export const groupService = {
  async createGroup(
    tenantId: string,
    name: string,
    type: GroupType,
    color: string,
    userId: string
  ): Promise<string> {
    const groupRef = await addDoc(collection(db, 'groups'), {
      tenant_id: tenantId,
      name,
      type,
      color,
      created_by: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return groupRef.id;
  },

  async updateGroup(
    groupId: string,
    data: { name?: string; type?: GroupType; color?: string }
  ): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
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

  docToGroup(id: string, data: any): Group {
    return {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
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
