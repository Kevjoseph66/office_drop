import test from 'node:test';
import assert from 'node:assert/strict';
import { PotluckItem, RaffleTicket, OfficeEvent } from '../types';

/**
 * In-Memory Atomic Transaction Simulator replicating Firestore runTransaction semantics:
 * 1. Read document snapshot.
 * 2. Execute transaction function.
 * 3. Commit with version check (Optimistic Concurrency Control).
 * 4. If document version changed during execution, automatically retry with exponential backoff.
 */
class MockFirestoreDoc<T extends { items?: PotluckItem[]; tickets?: RaffleTicket[] }> {
  private data: T;
  private version: number = 0;

  constructor(initialData: T) {
    this.data = JSON.parse(JSON.stringify(initialData));
  }

  getData(): T {
    return JSON.parse(JSON.stringify(this.data));
  }

  async runTransaction<R>(
    txFn: (snapshot: { data: T }) => Promise<{ update: Partial<T>; result: R }>
  ): Promise<R> {
    const maxRetries = 40;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const readVersion = this.version;
      const snapshot = { data: JSON.parse(JSON.stringify(this.data)) };

      // Simulate microtask execution
      await new Promise((r) => setTimeout(r, Math.random() * 4 + 1));

      const { update, result } = await txFn(snapshot);

      // OCC check: If version changed, another concurrent client committed first.
      if (this.version !== readVersion) {
        // Jittered exponential backoff like Firestore SDK
        const backoff = Math.min(100, Math.pow(1.3, attempt) * 5) + Math.random() * 15;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      // Commit
      this.data = { ...this.data, ...JSON.parse(JSON.stringify(update)) };
      this.version += 1;
      return result;
    }
    throw new Error('Transaction exceeded max retries due to high contention');
  }
}

test('Concurrency: 20 participants claim items simultaneously with ZERO duplicates', async () => {
  const initialItems: PotluckItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i + 1}`,
    nombre: `Comida ${i + 1}`,
    cantidadEspecifica: '1 porción',
    categoria: 'Salado',
    costoEstimado: '$5',
    assignedTo: null,
    assignedAt: null,
  }));

  const mockDb = new MockFirestoreDoc<{ items: PotluckItem[] }>({ items: initialItems });

  // 20 participants click "ABRIR REGALO" at the exact same millisecond
  const participants = Array.from({ length: 20 }, (_, i) => `Usuario_${i + 1}`);

  const results = await Promise.all(
    participants.map((userName) =>
      mockDb.runTransaction(async (snap) => {
        const items = snap.data.items;
        const available = items.filter((it) => !it.assignedTo);
        if (available.length === 0) {
          return { update: { items }, result: { item: null, error: 'Agotado' } };
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const chosen = available[randomIndex];
        const updated = items.map((it) =>
          it.id === chosen.id
            ? { ...it, assignedTo: userName, assignedAt: new Date().toISOString() }
            : it
        );

        return {
          update: { items: updated },
          result: { item: { ...chosen, assignedTo: userName }, error: null },
        };
      })
    )
  );

  // 1. Verify every participant received an item
  const assignedItems = results.map((r) => r.item).filter(Boolean) as PotluckItem[];
  assert.equal(assignedItems.length, 20);

  // 2. Verify all assigned item IDs are strictly unique (0 duplicates / race condition overwrites)
  const uniqueIds = new Set(assignedItems.map((it) => it.id));
  assert.equal(uniqueIds.size, 20);

  // 3. Verify database document state has 20 unique assigned participants
  const finalState = mockDb.getData();
  const dbAssignedUsers = new Set(finalState.items.map((it) => it.assignedTo).filter(Boolean));
  assert.equal(dbAssignedUsers.size, 20);
});

test('Concurrency: 30 participants compete for 10 items (over-subscription handling)', async () => {
  const initialItems: PotluckItem[] = Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i + 1}`,
    nombre: `Comida ${i + 1}`,
    cantidadEspecifica: '1 porción',
    categoria: 'Salado',
    costoEstimado: '$5',
    assignedTo: null,
    assignedAt: null,
  }));

  const mockDb = new MockFirestoreDoc<{ items: PotluckItem[] }>({ items: initialItems });

  const participants = Array.from({ length: 30 }, (_, i) => `Persona_${i + 1}`);

  const results = await Promise.all(
    participants.map((userName) =>
      mockDb.runTransaction(async (snap) => {
        const items = snap.data.items;
        const available = items.filter((it) => !it.assignedTo);
        if (available.length === 0) {
          return { update: { items }, result: { item: null, error: 'Agotado' } };
        }

        const chosen = available[0];
        const updated = items.map((it) =>
          it.id === chosen.id
            ? { ...it, assignedTo: userName, assignedAt: new Date().toISOString() }
            : it
        );

        return {
          update: { items: updated },
          result: { item: { ...chosen, assignedTo: userName }, error: null },
        };
      })
    )
  );

  const successful = results.filter((r) => r.item !== null);
  const exhausted = results.filter((r) => r.error === 'Agotado');

  // Exactly 10 successful claims, and exactly 20 exhausted notifications
  assert.equal(successful.length, 10);
  assert.equal(exhausted.length, 20);

  // Verify unique assignments in database
  const finalState = mockDb.getData();
  const unassigned = finalState.items.filter((it) => !it.assignedTo);
  assert.equal(unassigned.length, 0);
});

test('Concurrency: 25 participants register raffle tickets simultaneously with sequential numbering', async () => {
  const mockDb = new MockFirestoreDoc<{ tickets: RaffleTicket[] }>({ tickets: [] });

  const participants = Array.from({ length: 25 }, (_, i) => `Raffler_${i + 1}`);

  const results = await Promise.all(
    participants.map((userName) =>
      mockDb.runTransaction(async (snap) => {
        const tickets = snap.data.tickets;
        const nextNumber =
          tickets.length > 0 ? Math.max(...tickets.map((t) => t.ticketNumber)) + 1 : 1;
        const newTicket: RaffleTicket = {
          ticketNumber: nextNumber,
          userName,
          joinedAt: new Date().toISOString(),
        };

        return {
          update: { tickets: [...tickets, newTicket] },
          result: newTicket,
        };
      })
    )
  );

  assert.equal(results.length, 25);

  // Verify ticket numbers are strictly 1 through 25 with no duplicates
  const ticketNumbers = results.map((t) => t.ticketNumber).sort((a, b) => a - b);
  assert.equal(ticketNumbers[0], 1);
  assert.equal(ticketNumbers[24], 25);

  const uniqueNumbers = new Set(ticketNumbers);
  assert.equal(uniqueNumbers.size, 25);
});

test('Concurrency: Same participant sending 5 concurrent clicks returns the same item (Idempotency)', async () => {
  const initialItems: PotluckItem[] = [
    { id: '1', nombre: 'Arepas', cantidadEspecifica: '6 u', categoria: 'Salado', costoEstimado: '$8' },
    { id: '2', nombre: 'Jugo', cantidadEspecifica: '2 L', categoria: 'Bebidas', costoEstimado: '$4' },
  ];

  const mockDb = new MockFirestoreDoc<{ items: PotluckItem[] }>({ items: initialItems });

  // Rapid spam-clicking from the same device and user
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      mockDb.runTransaction(async (snap) => {
        const items = snap.data.items;
        const existing = items.find((it) => it.assignedTo === 'Kevin' || it.assignedDeviceId === 'dev-123');
        if (existing) {
          return { update: { items }, result: existing };
        }

        const available = items.filter((it) => !it.assignedTo);
        const chosen = available[0];
        const updated = items.map((it) =>
          it.id === chosen.id
            ? { ...it, assignedTo: 'Kevin', assignedDeviceId: 'dev-123', assignedAt: new Date().toISOString() }
            : it
        );

        return {
          update: { items: updated },
          result: { ...chosen, assignedTo: 'Kevin', assignedDeviceId: 'dev-123' },
        };
      })
    )
  );

  // All 5 calls must resolve to the EXACT SAME item ID
  const itemIds = results.map((r) => r.id);
  assert.equal(new Set(itemIds).size, 1);

  // Only 1 item assigned in database; 1 item remains free
  const finalState = mockDb.getData();
  const assigned = finalState.items.filter((it) => it.assignedTo);
  assert.equal(assigned.length, 1);
});
