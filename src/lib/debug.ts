// Centralized debug flag and logger.
// Enable by setting VITE_DEBUG_LOGS=true in your env.

export const isDebugEnabled: boolean = (import.meta as any)?.env?.VITE_DEBUG_LOGS === 'true';

export function logDebug(...args: any[]) {
  if (isDebugEnabled) {
    console.log(...args);
  }
}
