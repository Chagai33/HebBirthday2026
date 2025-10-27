import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '../services/wishlist.service';
import { WishlistPriority } from '../types';
import { useTenant } from '../contexts/TenantContext';

export const useWishlistItems = (birthdayId: string) => {
  return useQuery({
    queryKey: ['wishlist', birthdayId],
    queryFn: () => wishlistService.getItemsForBirthday(birthdayId),
    enabled: !!birthdayId,
  });
};

export const useCreateWishlistItem = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async ({
      birthdayId,
      itemName,
      description,
      priority,
    }: {
      birthdayId: string;
      itemName: string;
      description: string;
      priority: WishlistPriority;
    }) => {
      if (!currentTenant) {
        throw new Error('No tenant found');
      }
      return wishlistService.createItem(
        birthdayId,
        currentTenant.id,
        itemName,
        description,
        priority
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', variables.birthdayId] });
    },
  });
};

export const useUpdateWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      birthdayId,
      data,
    }: {
      itemId: string;
      birthdayId: string;
      data: { itemName?: string; description?: string; priority?: WishlistPriority };
    }) => {
      return wishlistService.updateItem(itemId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', variables.birthdayId] });
    },
  });
};

export const useDeleteWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, birthdayId }: { itemId: string; birthdayId: string }) => {
      return wishlistService.deleteItem(itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', variables.birthdayId] });
    },
  });
};
