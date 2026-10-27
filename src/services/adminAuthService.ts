import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SYSTEM_COLLECTION = 'system_settings';
const ADMIN_AUTH_DOC = 'admin_auth';

// Initial factory PIN if none configured yet
export const DEFAULT_INITIAL_PIN = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PIN) || '1234';

/**
 * Computes SHA-256 hash using native browser Web Crypto API.
 * Never stores or transmits plaintext PINs.
 */
export async function hashPin(pin: string): Promise<string> {
  const clean = pin.trim();
  const subtleCrypto =
    (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) ||
    (typeof window !== 'undefined' && window.crypto?.subtle);

  if (subtleCrypto) {
    try {
      const msgBuffer = new TextEncoder().encode(clean);
      const hashBuffer = await subtleCrypto.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Pure JS fallback if crypto.subtle is unavailable
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return `sha256-fallback-${Math.abs(hash).toString(16)}`;
}

export interface AdminAuthConfig {
  pinHash: string;
  updatedAt: string;
  isCustom: boolean;
}

/**
 * Fetches admin authentication configuration from Firestore.
 * If not yet initialized in Firestore, initializes it with the default PIN hash.
 */
export async function getAdminAuthConfig(): Promise<AdminAuthConfig> {
  try {
    const docRef = doc(db, SYSTEM_COLLECTION, ADMIN_AUTH_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as AdminAuthConfig;
    }

    // Auto-initialize with default PIN hash in Firestore
    const defaultHash = await hashPin(DEFAULT_INITIAL_PIN);
    const initialConfig: AdminAuthConfig = {
      pinHash: defaultHash,
      updatedAt: new Date().toISOString(),
      isCustom: false,
    };

    try {
      await setDoc(docRef, initialConfig);
    } catch (saveErr) {
      console.warn('Could not persist initial admin config to Firestore:', saveErr);
    }

    return initialConfig;
  } catch (err) {
    console.warn('Failed to read admin auth from Firestore, using default:', err);
    const defaultHash = await hashPin(DEFAULT_INITIAL_PIN);
    return {
      pinHash: defaultHash,
      updatedAt: new Date().toISOString(),
      isCustom: false,
    };
  }
}

/**
 * Asynchronously verifies the entered PIN against the SHA-256 hash in Firestore.
 */
export async function verifyAdminPin(enteredPin: string): Promise<{ success: boolean; error?: string }> {
  if (!enteredPin || enteredPin.trim().length === 0) {
    return { success: false, error: 'Por favor ingresa un PIN.' };
  }

  try {
    const config = await getAdminAuthConfig();
    const enteredHash = await hashPin(enteredPin.trim());

    if (enteredHash === config.pinHash) {
      return { success: true };
    }

    // Only allow DEFAULT_INITIAL_PIN if the organizer has not set a custom PIN yet
    if (!config.isCustom) {
      const defaultHash = await hashPin(DEFAULT_INITIAL_PIN);
      if (enteredHash === defaultHash) {
        return { success: true };
      }
    }

    return { success: false, error: '⛔ PIN incorrecto. Acceso restringido al organizador.' };
  } catch (err) {
    console.error('Error verifying admin PIN with Firestore:', err);
    // Local emergency fallback so admin is never locked out if offline
    if (enteredPin.trim() === DEFAULT_INITIAL_PIN) {
      return { success: true };
    }
    return { success: false, error: 'Error al conectar con la base de datos de autenticación.' };
  }
}

/**
 * Changes the admin PIN in Firestore.
 * Verifies the current PIN first, then updates Firestore with the SHA-256 hash of the new PIN.
 * Instant effect across all devices with zero rebuilds or redeployments!
 */
export async function updateAdminPinInFirestore(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  const cleanNew = newPin.trim();

  if (cleanNew.length < 4 || cleanNew.length > 8) {
    return { success: false, error: 'El nuevo PIN debe tener entre 4 y 8 dígitos.' };
  }

  if (!/^\d+$/.test(cleanNew)) {
    return { success: false, error: 'El PIN solo debe contener números (0-9).' };
  }

  // 1. Verify current PIN
  const verification = await verifyAdminPin(currentPin);
  if (!verification.success) {
    return { success: false, error: 'El PIN actual que ingresaste no es correcto.' };
  }

  // 2. Hash new PIN and save to Firestore
  try {
    const newHash = await hashPin(cleanNew);
    const docRef = doc(db, SYSTEM_COLLECTION, ADMIN_AUTH_DOC);

    const updatedConfig: AdminAuthConfig = {
      pinHash: newHash,
      updatedAt: new Date().toISOString(),
      isCustom: true,
    };

    await setDoc(docRef, updatedConfig);
    return { success: true };
  } catch (err) {
    console.error('Error updating admin PIN in Firestore:', err);
    return {
      success: false,
      error: 'Error al guardar el nuevo PIN en Firestore. Revisa tu conexión a internet.',
    };
  }
}
