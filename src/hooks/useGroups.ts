import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '../services/group.service';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { GroupType } from '../types';

export const useGroups = () => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['groups', currentTenant?.id],
    queryFn: () => {
      if (!currentTenant) return Promise.resolve([]);
      return groupService.getTenantGroups(currentTenant.id);
    },
    enabled: !!currentTenant,
  });
};

export const useRootGroups = () => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['rootGroups', currentTenant?.id],
    queryFn: () => {
      if (!currentTenant) return Promise.resolve([]);
      return groupService.getRootGroups(currentTenant.id);
    },
    enabled: !!currentTenant,
  });
};

export const useChildGroups = (parentId: string | null) => {
  return useQuery({
    queryKey: ['childGroups', parentId],
    queryFn: () => {
      if (!parentId) return Promise.resolve([]);
      return groupService.getChildGroups(parentId);
    },
    enabled: !!parentId,
  });
};

export const useGroupsByType = (type: GroupType | null) => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['groupsByType', currentTenant?.id, type],
    queryFn: () => {
      if (!currentTenant || !type) return Promise.resolve([]);
      return groupService.getGroupsByType(currentTenant.id, type);
    },
    enabled: !!currentTenant && !!type,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      parentId,
      color,
      calendarPreference,
    }: {
      name: string;
      parentId?: string | null;
      color?: string;
      calendarPreference?: 'gregorian' | 'hebrew' | 'both';
    }) => {
      if (!currentTenant || !user) {
        throw new Error('No tenant or user found');
      }
      return groupService.createGroup(
        currentTenant.id,
        { name, parentId, color, calendarPreference },
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['childGroups'] });
      queryClient.invalidateQueries({ queryKey: ['rootGroups'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name?: string; color?: string; calendarPreference?: 'gregorian' | 'hebrew' | 'both' };
    }) => {
      return groupService.updateGroup(groupId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['childGroups'] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, deleteBirthdays }: { groupId: string; deleteBirthdays: boolean }) =>
      groupService.deleteGroup(groupId, deleteBirthdays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['childGroups'] });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    },
  });
};

export const useGroupBirthdaysCount = (groupId: string | null) => {
  return useQuery({
    queryKey: ['groupBirthdaysCount', groupId],
    queryFn: () => {
      if (!groupId) return Promise.resolve(0);
      return groupService.getGroupBirthdaysCount(groupId);
    },
    enabled: !!groupId,
  });
};

export const useInitializeRootGroups = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (language: 'he' | 'en' = 'he') => {
      if (!currentTenant || !user) {
        throw new Error('No tenant or user found');
      }
      return groupService.initializeRootGroups(currentTenant.id, user.id, language);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['rootGroups'] });
    },
  });
};
