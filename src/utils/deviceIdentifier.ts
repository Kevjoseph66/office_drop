/**
 * Persistent Device Identifier for Anti-Cheat Protection
 * Each physical browser / phone is assigned a unique UUID in localStorage.
 * This prevents participants from clearing their name or using incognito to grab multiple items or raffle tickets.
 */

const DEVICE_ID_KEY = 'officedrop_device_id_v1';
const ADMIN_AUTH_KEY = 'officedrop_admin_authenticated';

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId || deviceId.trim().length === 0) {
      deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (err) {
    // Fallback if localStorage is restricted
    return `dev-transient-${Date.now().toString(36)}`;
  }
}

export function isDeviceAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDeviceAdminAuthenticated(isAuth: boolean): void {
  try {
    if (isAuth) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  } catch {}
}
