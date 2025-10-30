import {
  collection,
  doc,
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
import { WishlistItem, WishlistPriority } from '../types';

export const wishlistService = {
  async createItem(
    birthdayId: string,
    tenantId: string,
    itemName: string,
    description: string,
    priority: WishlistPriority
  ): Promise<string> {
    const itemData = {
      birthday_id: birthdayId,
      tenant_id: tenantId,
      item_name: itemName,
      description: description || '',
      priority,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    const itemRef = await addDoc(collection(db, 'wishlist_items'), itemData);

    return itemRef.id;
  },

  async updateItem(
    itemId: string,
    data: { itemName?: string; description?: string; priority?: WishlistPriority }
  ): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.itemName !== undefined) updateData.item_name = data.itemName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;

    await updateDoc(doc(db, 'wishlist_items', itemId), updateData);
  },

  async deleteItem(itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'wishlist_items', itemId));
  },

  async getItemsForBirthday(birthdayId: string, tenantId?: string): Promise<WishlistItem[]> {
    const constraints = [where('birthday_id', '==', birthdayId)];

    if (tenantId) {
      constraints.push(where('tenant_id', '==', tenantId));
    }

    const q = query(collection(db, 'wishlist_items'), ...constraints);

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => this.docToWishlistItem(doc.id, doc.data()));

    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  docToWishlistItem(id: string, data: any): WishlistItem {
    return {
      id,
      birthday_id: data.birthday_id,
      tenant_id: data.tenant_id,
      item_name: data.item_name,
      description: data.description || '',
      priority: data.priority,
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
