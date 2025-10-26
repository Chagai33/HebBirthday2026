import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { birthdayService } from '../services/birthday.service';
import { Birthday, BirthdayFormData } from '../types';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

export const useBirthdays = (includeArchived = false) => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['birthdays', currentTenant?.id, includeArchived],
    queryFn: async () => {
      if (!currentTenant) return [];
      return await birthdayService.getTenantBirthdays(currentTenant.id, includeArchived);
    },
    enabled: !!currentTenant,
  });
};

export const useUpcomingBirthdays = (days: number = 30) => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['upcomingBirthdays', currentTenant?.id, days],
    queryFn: async () => {
      if (!currentTenant) return [];
      return await birthdayService.getUpcomingBirthdays(currentTenant.id, days);
    },
    enabled: !!currentTenant,
  });
};

export const useBirthday = (birthdayId: string | null) => {
  return useQuery({
    queryKey: ['birthday', birthdayId],
    queryFn: async () => {
      if (!birthdayId) return null;
      return await birthdayService.getBirthday(birthdayId);
    },
    enabled: !!birthdayId,
  });
};

export const useCreateBirthday = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BirthdayFormData) => {
      if (!currentTenant || !user) throw new Error('No tenant or user');
      return await birthdayService.createBirthday(currentTenant.id, data, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
    },
  });
};

export const useUpdateBirthday = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      birthdayId,
      data,
    }: {
      birthdayId: string;
      data: Partial<BirthdayFormData>;
    }) => {
      if (!user) throw new Error('No user');
      return await birthdayService.updateBirthday(birthdayId, data, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
      queryClient.invalidateQueries({ queryKey: ['birthday'] });
    },
  });
};

export const useDeleteBirthday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (birthdayId: string) => {
      return await birthdayService.deleteBirthday(birthdayId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
    },
  });
};

export const useArchiveBirthday = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (birthdayId: string) => {
      if (!user) throw new Error('No user');
      return await birthdayService.archiveBirthday(birthdayId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
    },
  });
};

export const useCheckDuplicates = () => {
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async ({
      firstName,
      lastName,
    }: {
      firstName: string;
      lastName: string;
    }) => {
      if (!currentTenant) throw new Error('No tenant');
      return await birthdayService.checkDuplicates(
        currentTenant.id,
        firstName,
        lastName
      );
    },
  });
};
