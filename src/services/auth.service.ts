import { supabase } from '../config/supabase';
import { AppUser } from '../types';

export const authService = {
  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      });
    }
  },

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<AppUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      phone_number: profile.phone_number,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  },

  async updateProfile(userId: string, data: Partial<AppUser>): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.display_name !== undefined) updateData.display_name = data.display_name;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  },
};
