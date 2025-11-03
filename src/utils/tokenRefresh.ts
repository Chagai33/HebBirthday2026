import { auth } from '../config/firebase';
import { logger } from './logger';

export async function ensureTokenWithClaims(maxRetries: number = 5): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    logger.error('❌ No user signed in');
    return false;
  }

  logger.log('🔍 Checking token claims for user:', user.uid);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tokenResult = await user.getIdTokenResult(true);

      logger.log('📋 Token claims (attempt ' + (attempt + 1) + '):', {
        tenantId: tokenResult.claims.tenantId,
        role: tokenResult.claims.role,
        allClaims: tokenResult.claims
      });

      if (tokenResult.claims.tenantId && tokenResult.claims.role) {
        logger.log('✅ Token claims verified successfully');
        return true;
      }

      logger.warn(`⚠️ Token missing claims, retrying (${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('❌ Error refreshing token:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  logger.error('❌ CRITICAL: No custom claims found. User needs migration!');
  logger.error('📌 Please run the migrateExistingUsers Cloud Function');
  return false;
}
