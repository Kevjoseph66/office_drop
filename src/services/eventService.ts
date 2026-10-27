import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { OfficeEvent, PotluckItem, RaffleTicket } from '../types';
import { INITIAL_POTLUCK_EVENT, INITIAL_RAFFLE_EVENT } from '../data/initialEvents';

const EVENTS_COLLECTION = 'events';

// Sanitize objects to ensure undefined fields don't cause Firestore errors
function cleanForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item));
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }
  return data;
}

/**
 * Saves or updates an event in Firestore 'events' collection
 */
export async function saveEventToFirestore(event: OfficeEvent): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, event.id);
    const cleaned = cleanForFirestore(event);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    console.error('Error saving event to Firestore:', error);
    throw error;
  }
}

/**
 * Subscribes to real-time changes of an event in Firestore using onSnapshot
 */
export function subscribeToFirestoreEvent(
  eventId: string,
  onUpdate: (event: OfficeEvent | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as OfficeEvent;
        onUpdate({
          ...data,
          id: docSnap.id,
          items: data.items || [],
          tickets: data.tickets || [],
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error(`Firestore subscription error on event ${eventId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Atomic Firestore transaction to assign a random available potluck item.
 * Guarantees no two concurrent users claim the same item.
 */
export async function assignPotluckItemWithTransaction(
  eventId: string,
  userName: string,
  deviceId?: string
): Promise<{ item: PotluckItem | null; isExisting: boolean; error?: string }> {
  const cleanName = userName.trim();
  if (!cleanName) {
    return { item: null, isExisting: false, error: 'El nombre es obligatorio.' };
  }

  const docRef = doc(db, EVENTS_COLLECTION, eventId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error('El evento no existe en Firestore.');
      }

      const eventData = docSnap.data() as OfficeEvent;
      const items: PotluckItem[] = eventData.items || [];

      // 1. Anti-Cheat: Check if this user name OR this phone device ID already has an item assigned
      const existing = items.find(
        (it) =>
          (it.assignedTo && it.assignedTo.trim().toLowerCase() === cleanName.toLowerCase()) ||
          (Boolean(deviceId) && Boolean(it.assignedDeviceId) && it.assignedDeviceId === deviceId)
      );
      if (existing) {
        return { item: existing, isExisting: true };
      }

      // 2. Find available items
      const availableItems = items.filter((it) => !it.assignedTo);
      if (availableItems.length === 0) {
        return {
          item: null,
          isExisting: false,
          error: '¡Todos los ítems de comida ya han sido tomados por otros compañeros!',
        };
      }

      // 3. Pick random available item
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const chosenItem = availableItems[randomIndex];
      const now = new Date().toISOString();

      const updatedItems = items.map((it) => {
        if (it.id === chosenItem.id) {
          return {
            ...it,
            assignedTo: cleanName,
            assignedDeviceId: deviceId || null,
            assignedAt: now,
          };
        }
        return it;
      });

      // 4. Commit atomic update
      transaction.update(docRef, { items: cleanForFirestore(updatedItems) });

      return {
        item: { ...chosenItem, assignedTo: cleanName, assignedDeviceId: deviceId || null, assignedAt: now },
        isExisting: false,
      };
    });

    return result;
  } catch (error: any) {
    console.error('Transaction error in assignPotluckItem:', error);
    return { item: null, isExisting: false, error: error?.message || 'Error en la transacción de Firestore.' };
  }
}

/**
 * Atomic Firestore transaction to register a raffle ticket.
 * Increments ticket numbers safely without collisions and checks device ID.
 */
export async function registerRaffleTicketWithTransaction(
  eventId: string,
  userName: string,
  deviceId?: string
): Promise<{ ticket: RaffleTicket | null; isExisting: boolean; error?: string }> {
  const cleanName = userName.trim();
  if (!cleanName) {
    return { ticket: null, isExisting: false, error: 'El nombre es obligatorio.' };
  }

  const docRef = doc(db, EVENTS_COLLECTION, eventId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error('El evento no existe en Firestore.');
      }

      const eventData = docSnap.data() as OfficeEvent;
      const tickets: RaffleTicket[] = eventData.tickets || [];

      // Anti-Cheat: Check if user name OR phone device ID already has a ticket
      const existing = tickets.find(
        (t) =>
          t.userName.trim().toLowerCase() === cleanName.toLowerCase() ||
          (Boolean(deviceId) && Boolean(t.deviceId) && t.deviceId === deviceId)
      );
      if (existing) {
        return { ticket: existing, isExisting: true };
      }

      const nextNumber =
        tickets.length > 0 ? Math.max(...tickets.map((t) => t.ticketNumber)) + 1 : 1;
      const newTicket: RaffleTicket = {
        ticketNumber: nextNumber,
        userName: cleanName,
        deviceId: deviceId || null,
        joinedAt: new Date().toISOString(),
      };

      const updatedTickets = [...tickets, newTicket];
      transaction.update(docRef, { tickets: cleanForFirestore(updatedTickets) });

      return { ticket: newTicket, isExisting: false };
    });

    return result;
  } catch (error: any) {
    console.error('Transaction error in registerRaffleTicket:', error);
    return { ticket: null, isExisting: false, error: error?.message || 'Error en la transacción de Firestore.' };
  }
}

/**
 * Unassigns a potluck item in Firestore
 */
export async function unassignPotluckItemInFirestore(
  eventId: string,
  itemId: string
): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) return;

    const eventData = docSnap.data() as OfficeEvent;
    const items = eventData.items || [];
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          assignedTo: null,
          assignedAt: null,
        };
      }
      return it;
    });

    transaction.update(docRef, { items: cleanForFirestore(updated) });
  });
}

/**
 * Updates winner in Firestore
 */
export async function setRaffleWinnerInFirestore(
  eventId: string,
  winner: RaffleTicket
): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const now = new Date().toISOString();
  await setDoc(
    docRef,
    {
      winnerTicket: cleanForFirestore(winner),
      winnerSelectedAt: now,
    },
    { merge: true }
  );
}

/**
 * Clears all assignments and tickets for an event so a brand new round can start from scratch
 */
export async function clearEventAssignmentsInFirestore(eventId: string): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) return;
    const eventData = docSnap.data() as OfficeEvent;
    const items = (eventData.items || []).map((it) => ({
      ...it,
      assignedTo: null,
      assignedAt: null,
    }));
    transaction.update(docRef, {
      items: cleanForFirestore(items),
      tickets: [],
      winnerTicket: null,
      winnerSelectedAt: null,
    });
  });
}

/**
 * Resets an event to completely blank state (title, description, items, tickets)
 * Ready for clean production use.
 */
export async function resetEventToEmptyInFirestore(eventId: string): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await setDoc(
    docRef,
    {
      title: '',
      description: '',
      prizeTitle: '',
      prizeDescription: '',
      items: [],
      tickets: [],
      winnerTicket: null,
      winnerSelectedAt: null,
      status: 'draft',
    },
    { merge: true }
  );
}

/**
 * Restores initial demo events to Firestore
 */
export async function restoreInitialDemoEventsInFirestore(): Promise<void> {
  const potluckRef = doc(db, EVENTS_COLLECTION, INITIAL_POTLUCK_EVENT.id);
  const raffleRef = doc(db, EVENTS_COLLECTION, INITIAL_RAFFLE_EVENT.id);
  await setDoc(potluckRef, cleanForFirestore(INITIAL_POTLUCK_EVENT));
  await setDoc(raffleRef, cleanForFirestore(INITIAL_RAFFLE_EVENT));
}

/**
 * Seeds initial demo events into Firestore if they do not exist
 */
export async function seedInitialEventsToFirestore(): Promise<void> {
  try {
    const potluckRef = doc(db, EVENTS_COLLECTION, INITIAL_POTLUCK_EVENT.id);
    const potluckSnap = await getDoc(potluckRef);
    if (!potluckSnap.exists() || !potluckSnap.data()?.items || potluckSnap.data()?.items?.length === 0) {
      await setDoc(potluckRef, cleanForFirestore(INITIAL_POTLUCK_EVENT));
      console.log('Seeded INITIAL_POTLUCK_EVENT to Firestore');
    }

    const raffleRef = doc(db, EVENTS_COLLECTION, INITIAL_RAFFLE_EVENT.id);
    const raffleSnap = await getDoc(raffleRef);
    if (!raffleSnap.exists()) {
      await setDoc(raffleRef, cleanForFirestore(INITIAL_RAFFLE_EVENT));
      console.log('Seeded INITIAL_RAFFLE_EVENT to Firestore');
    }
  } catch (error) {
    console.warn('Could not seed initial events to Firestore (might be offline):', error);
  }
}
