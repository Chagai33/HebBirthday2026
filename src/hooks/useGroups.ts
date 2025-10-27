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

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      type,
      color,
    }: {
      name: string;
      type: GroupType;
      color: string;
    }) => {
      if (!currentTenant || !user) {
        throw new Error('No tenant or user found');
      }
      return groupService.createGroup(currentTenant.id, name, type, color, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      data: { name?: string; type?: GroupType; color?: string };
    }) => {
      return groupService.updateGroup(groupId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => groupService.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    },
  });
};
