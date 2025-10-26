import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tenantService } from '../services/tenant.service';
import { Tenant, TenantContextType, UserRole } from '../types';
import { useAuth } from './AuthContext';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserTenants = async () => {
      if (!user) {
        setUserTenants([]);
        setCurrentTenant(null);
        setLoading(false);
        return;
      }

      try {
        const tenants = await tenantService.getUserTenants(user.id);
        setUserTenants(tenants);

        const savedTenantId = localStorage.getItem('currentTenantId');

        if (savedTenantId && tenants.some(t => t.id === savedTenantId)) {
          const tenant = tenants.find(t => t.id === savedTenantId);
          setCurrentTenant(tenant || null);
        } else if (tenants.length > 0) {
          setCurrentTenant(tenants[0]);
          localStorage.setItem('currentTenantId', tenants[0].id);
        } else {
          setCurrentTenant(null);
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
        setUserTenants([]);
        setCurrentTenant(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserTenants();
  }, [user]);

  const switchTenant = (tenantId: string) => {
    const tenant = userTenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      localStorage.setItem('currentTenantId', tenantId);
    }
  };

  const createTenant = async (name: string): Promise<string> => {
    if (!user) throw new Error('No user signed in');

    const tenantId = await tenantService.createTenant(name, user.id);

    const newTenant = await tenantService.getTenant(tenantId);
    if (newTenant) {
      setUserTenants(prev => [...prev, newTenant]);
      setCurrentTenant(newTenant);
      localStorage.setItem('currentTenantId', tenantId);
    }

    return tenantId;
  };

  const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
    await tenantService.updateTenant(tenantId, data);

    const updatedTenant = await tenantService.getTenant(tenantId);
    if (updatedTenant) {
      setUserTenants(prev =>
        prev.map(t => (t.id === tenantId ? updatedTenant : t))
      );

      if (currentTenant?.id === tenantId) {
        setCurrentTenant(updatedTenant);
      }
    }
  };

  const inviteUserToTenant = async (email: string, role: UserRole) => {
    if (!user || !currentTenant) throw new Error('No user or tenant selected');

    await tenantService.inviteUserToTenant(email, currentTenant.id, role, user.id);
  };

  const value: TenantContextType = {
    currentTenant,
    userTenants,
    loading,
    switchTenant,
    createTenant,
    updateTenant,
    inviteUserToTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
