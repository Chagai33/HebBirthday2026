import { supabase } from '../config/supabase';
import { Tenant, UserRole } from '../types';

export const tenantService = {
  async createTenant(name: string, ownerId: string): Promise<string> {
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name,
        owner_id: ownerId,
        default_language: 'he',
        timezone: 'Asia/Jerusalem',
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  },

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const { data: memberships, error } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', userId);

    if (error) throw error;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const tenantIds = memberships.map((m) => m.tenant_id);

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .in('id', tenantIds);

    if (tenantsError) throw tenantsError;

    return tenants || [];
  },

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.default_language !== undefined) updateData.default_language = data.default_language;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    const { error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (error) throw error;
  },

  async getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;

    return data?.role as UserRole | null;
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
    const { error } = await supabase.from('tenant_members').insert({
      user_id: userId,
      tenant_id: tenantId,
      role,
    });

    if (error) throw error;
  },
};
