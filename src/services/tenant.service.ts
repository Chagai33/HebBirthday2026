import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Tenant, UserRole } from '../types';

export const tenantService = {
  async createTenant(name: string, ownerId: string): Promise<string> {
    const tenantsRef = collection(db, 'tenants');
    const tenantDoc = await addDoc(tenantsRef, {
      name,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        defaultLanguage: 'he',
        timezone: 'Asia/Jerusalem',
      },
    });

    const membershipRef = doc(db, 'userTenantMemberships', `${ownerId}_${tenantDoc.id}`);
    await setDoc(membershipRef, {
      userId: ownerId,
      tenantId: tenantDoc.id,
      role: 'owner' as UserRole,
      joinedAt: serverTimestamp(),
    });

    const userRef = doc(db, 'users', ownerId);
    const userDoc = await getDoc(userRef);
    const currentTenants = userDoc.data()?.tenants || [];

    await updateDoc(userRef, {
      tenants: [...currentTenants, tenantDoc.id],
    });

    return tenantDoc.id;
  },

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const snapshot = await getDoc(tenantRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Tenant;
  },

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const membershipQuery = query(
      collection(db, 'userTenantMemberships'),
      where('userId', '==', userId)
    );

    const membershipSnapshot = await getDocs(membershipQuery);
    const tenantIds = membershipSnapshot.docs.map(doc => doc.data().tenantId);

    if (tenantIds.length === 0) {
      return [];
    }

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
    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
    const membershipRef = doc(db, 'userTenantMemberships', `${userId}_${tenantId}`);
    const snapshot = await getDoc(membershipRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data().role as UserRole;
  },

  async inviteUserToTenant(
    email: string,
    tenantId: string,
    role: UserRole,
    invitedBy: string
  ): Promise<void> {
    const invitationsRef = collection(db, 'tenantInvitations');
    await addDoc(invitationsRef, {
      email,
      tenantId,
      role,
      invitedBy,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  },

  async addUserToTenant(userId: string, tenantId: string, role: UserRole): Promise<void> {
    const membershipRef = doc(db, 'userTenantMemberships', `${userId}_${tenantId}`);
    await setDoc(membershipRef, {
      userId,
      tenantId,
      role,
      joinedAt: serverTimestamp(),
    });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentTenants = userDoc.data()?.tenants || [];

    await updateDoc(userRef, {
      tenants: [...currentTenants, tenantId],
    });
  },
};
