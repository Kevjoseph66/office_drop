import { PotluckItem, RaffleTicket } from '../types';

/**
 * Assigns a random available item to a participant.
 * If user already has an item assigned, returns that item.
 */
export function assignRandomPotluckItem(
  items: PotluckItem[],
  userName: string,
  deviceId?: string
): { updatedItems: PotluckItem[]; assignedItem: PotluckItem | null; isExisting: boolean; error?: string } {
  const cleanName = userName.trim();
  if (!cleanName) {
    return { updatedItems: items, assignedItem: null, isExisting: false, error: 'El nombre es obligatorio.' };
  }

  // Check if user already has an assigned item (by name or by deviceId)
  const existing = items.find(
    (item) =>
      (item.assignedTo && item.assignedTo.trim().toLowerCase() === cleanName.toLowerCase()) ||
      (Boolean(deviceId) && Boolean(item.assignedDeviceId) && item.assignedDeviceId === deviceId)
  );
  if (existing) {
    return { updatedItems: items, assignedItem: existing, isExisting: true };
  }

  // Find all unassigned items
  const availableItems = items.filter((item) => !item.assignedTo);
  if (availableItems.length === 0) {
    return {
      updatedItems: items,
      assignedItem: null,
      isExisting: false,
      error: '¡Todos los ítems de la lista ya han sido tomados por otros compañeros!',
    };
  }

  // Select random available item
  const randomIndex = Math.floor(Math.random() * availableItems.length);
  const chosen = availableItems[randomIndex];

  const now = new Date().toISOString();
  const updatedItems = items.map((item) => {
    if (item.id === chosen.id) {
      return {
        ...item,
        assignedTo: cleanName,
        assignedDeviceId: deviceId || null,
        assignedAt: now,
      };
    }
    return item;
  });

  const assignedItem = updatedItems.find((i) => i.id === chosen.id) || null;
  return { updatedItems, assignedItem, isExisting: false };
}

/**
 * Unassigns a potluck item
 */
export function unassignPotluckItem(items: PotluckItem[], itemId: string): PotluckItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        assignedTo: null,
        assignedAt: null,
        assignedDeviceId: null,
      };
    }
    return item;
  });
}

/**
 * Registers a raffle ticket for a user.
 * If user already has a ticket, returns the existing ticket.
 */
export function registerRaffleTicket(
  tickets: RaffleTicket[],
  userName: string,
  deviceId?: string
): { updatedTickets: RaffleTicket[]; ticket: RaffleTicket | null; isExisting: boolean; error?: string } {
  const cleanName = userName.trim();
  if (!cleanName) {
    return { updatedTickets: tickets, ticket: null, isExisting: false, error: 'El nombre es obligatorio.' };
  }

  const existing = tickets.find(
    (t) =>
      t.userName.trim().toLowerCase() === cleanName.toLowerCase() ||
      (Boolean(deviceId) && Boolean(t.deviceId) && t.deviceId === deviceId)
  );
  if (existing) {
    return { updatedTickets: tickets, ticket: existing, isExisting: true };
  }

  const nextNumber = tickets.length > 0 ? Math.max(...tickets.map((t) => t.ticketNumber)) + 1 : 1;
  const newTicket: RaffleTicket = {
    ticketNumber: nextNumber,
    userName: cleanName,
    deviceId: deviceId || null,
    joinedAt: new Date().toISOString(),
  };

  return {
    updatedTickets: [...tickets, newTicket],
    ticket: newTicket,
    isExisting: false,
  };
}

/**
 * Picks a raffle winner randomly from registered tickets
 */
export function selectRaffleWinner(tickets: RaffleTicket[], seedIndex?: number): RaffleTicket | null {
  if (!tickets || tickets.length === 0) return null;
  if (typeof seedIndex === 'number' && seedIndex >= 0 && seedIndex < tickets.length) {
    return tickets[seedIndex];
  }
  const randomIndex = Math.floor(Math.random() * tickets.length);
  return tickets[randomIndex];
}

/**
 * Computes statistics for a potluck dynamic
 */
export function calculatePotluckStats(items: PotluckItem[]) {
  const total = items.length;
  const assigned = items.filter((i) => Boolean(i.assignedTo)).length;
  const remaining = total - assigned;
  const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;

  const categories: Record<string, { total: number; assigned: number }> = {};
  items.forEach((item) => {
    const cat = item.categoria || 'Varios';
    if (!categories[cat]) {
      categories[cat] = { total: 0, assigned: 0 };
    }
    categories[cat].total += 1;
    if (item.assignedTo) {
      categories[cat].assigned += 1;
    }
  });

  return {
    total,
    assigned,
    remaining,
    percent,
    categories,
  };
}
