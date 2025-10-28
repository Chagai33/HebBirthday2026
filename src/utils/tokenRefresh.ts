import { auth } from '../config/firebase';

export async function ensureTokenWithClaims(maxRetries: number = 5): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    console.error('No user signed in');
    return false;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tokenResult = await user.getIdTokenResult(true);

      if (tokenResult.claims.tenantId && tokenResult.claims.role) {
        console.log('Token claims verified:', {
          tenantId: tokenResult.claims.tenantId,
          role: tokenResult.claims.role
        });
        return true;
      }

      console.warn(`Token missing claims, retrying (${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing token:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('Failed to get token with claims after retries');
  return false;
}
