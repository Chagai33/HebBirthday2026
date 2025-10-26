import { supabase } from '../config/supabase';
import { Birthday, BirthdayFormData } from '../types';

export const birthdayService = {
  async createBirthday(
    tenantId: string,
    data: BirthdayFormData,
    userId: string
  ): Promise<string> {
    const { data: birthday, error } = await supabase
      .from('birthdays')
      .insert({
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
      })
      .select()
      .single();

    if (error) throw error;

    await this.calculateHebrewDates(birthday.id);

    return birthday.id;
  },

  async calculateHebrewDates(birthdayId: string): Promise<void> {
    try {
      const { data: birthday } = await supabase
        .from('birthdays')
        .select('birth_date_gregorian, after_sunset')
        .eq('id', birthdayId)
        .single();

      if (!birthday) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-hebrew-dates`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          birthdayId,
          birthDateGregorian: birthday.birth_date_gregorian,
          afterSunset: birthday.after_sunset,
        }),
      });
    } catch (error) {
      console.error('Error calculating Hebrew dates:', error);
    }
  },

  async updateBirthday(
    birthdayId: string,
    data: Partial<BirthdayFormData>,
    userId: string
  ): Promise<void> {
    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    let needsRecalculation = false;

    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.birthDateGregorian !== undefined) {
      updateData.birth_date_gregorian = data.birthDateGregorian.toISOString().split('T')[0];
      updateData.birth_date_hebrew_string = null;
      updateData.next_upcoming_hebrew_birthday = null;
      updateData.future_hebrew_birthdays = null;
      needsRecalculation = true;
    }
    if (data.afterSunset !== undefined) {
      updateData.after_sunset = data.afterSunset;
      needsRecalculation = true;
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { error } = await supabase
      .from('birthdays')
      .update(updateData)
      .eq('id', birthdayId);

    if (error) throw error;

    if (needsRecalculation) {
      await this.calculateHebrewDates(birthdayId);
    }
  },

  async deleteBirthday(birthdayId: string): Promise<void> {
    const { error } = await supabase.from('birthdays').delete().eq('id', birthdayId);

    if (error) throw error;
  },

  async archiveBirthday(birthdayId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('birthdays')
      .update({
        archived: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', birthdayId);

    if (error) throw error;
  },

  async getBirthday(birthdayId: string): Promise<Birthday | null> {
    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .eq('id', birthdayId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async getTenantBirthdays(tenantId: string, includeArchived = false): Promise<Birthday[]> {
    let query = supabase
      .from('birthdays')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('birth_date_gregorian', { ascending: true });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async getUpcomingBirthdays(tenantId: string, days: number = 30): Promise<Birthday[]> {
    const now = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('archived', false)
      .gte('next_upcoming_hebrew_birthday', now)
      .lte('next_upcoming_hebrew_birthday', futureDateStr)
      .order('next_upcoming_hebrew_birthday', { ascending: true });

    if (error) throw error;

    return data || [];
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
    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName);

    if (error) throw error;

    return data || [];
  },
};
