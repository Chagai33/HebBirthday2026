export async function retryFirestoreOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (
        error?.code === 'permission-denied' ||
        error?.message?.includes('Missing or insufficient permissions')
      ) {
        if (attempt < maxRetries) {
          console.warn(
            `Permission denied, retrying (${attempt + 1}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}
