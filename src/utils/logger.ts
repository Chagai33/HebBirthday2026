/**
 * Production-safe logger utility
 * Logs are only printed in development mode to avoid exposing sensitive data
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log information - only in development
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warnings - only in development
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log errors - always logged (critical for debugging production issues)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug information - only in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages - only in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};
