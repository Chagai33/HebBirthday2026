import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Tenant, UserRole } from '../types';

export const tenantService = {
  async createTenant(name: string, ownerId: string): Promise<string> {
    const tenantRef = await addDoc(collection(db, 'tenants'), {
      name,
      owner_id: ownerId,
      default_language: 'he',
      timezone: 'Asia/Jerusalem',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    await addDoc(collection(db, 'tenant_members'), {
      tenant_id: tenantRef.id,
      user_id: ownerId,
      role: 'owner',
      joined_at: serverTimestamp(),
    });

    return tenantRef.id;
  },

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
    if (!tenantDoc.exists()) return null;

    const data = tenantDoc.data();
    return {
      id: tenantDoc.id,
      name: data.name,
      owner_id: data.owner_id,
      default_language: data.default_language,
      timezone: data.timezone,
      created_at: this.timestampToString(data.created_at),
      updated_at: this.timestampToString(data.updated_at),
    };
  },

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const membershipsQuery = query(
      collection(db, 'tenant_members'),
      where('user_id', '==', userId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);

    if (membershipsSnapshot.empty) {
      return [];
    }

    const tenantIds = membershipsSnapshot.docs.map((doc) => doc.data().tenant_id);
    const tenants: Tenant[] = [];

    for (const tenantId of tenantIds) {
      const tenant = await this.getTenant(tenantId);
      if (tenant) {
        tenants.push(tenant);
      }
    }

    return tenants;
  },

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.default_language !== undefined) updateData.default_language = data.default_language;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    await updateDoc(doc(db, 'tenants', tenantId), updateData);
  },

  async getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
    const membershipsQuery = query(
      collection(db, 'tenant_members'),
      where('user_id', '==', userId),
      where('tenant_id', '==', tenantId)
    );
    const snapshot = await getDocs(membershipsQuery);

    if (snapshot.empty) return null;

    return snapshot.docs[0].data().role as UserRole;
  },

  async inviteUserToTenant(
    email: string,
    tenantId: string,
    role: UserRole,
    invitedBy: string
  ): Promise<void> {
    console.log('Invite user to tenant:', { email, tenantId, role, invitedBy });
  },

  async addUserToTenant(userId: string, tenantId: string, role: UserRole): Promise<void> {
    await addDoc(collection(db, 'tenant_members'), {
      user_id: userId,
      tenant_id: tenantId,
      role,
      joined_at: serverTimestamp(),
    });
  },

  timestampToString(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  },
};
