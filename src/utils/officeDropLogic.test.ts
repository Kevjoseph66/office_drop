import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRandomPotluckItem,
  unassignPotluckItem,
  registerRaffleTicket,
  selectRaffleWinner,
  calculatePotluckStats,
  toggleItemPurchased,
} from './officeDropLogic';
import { PotluckItem, RaffleTicket } from '../types';

test('assignRandomPotluckItem assigns an unassigned item correctly', () => {
  const initialItems: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5' },
    { id: '2', nombre: 'Pan', cantidadEspecifica: '10 u', categoria: 'Panadería', costoEstimado: '$5' },
  ];

  const result = assignRandomPotluckItem(initialItems, 'Carlos');
  assert.equal(result.isExisting, false);
  assert.ok(result.assignedItem);
  assert.equal(result.assignedItem?.assignedTo, 'Carlos');
  assert.ok(result.assignedItem?.assignedAt);

  const updatedAssigned = result.updatedItems.filter((i) => i.assignedTo === 'Carlos');
  assert.equal(updatedAssigned.length, 1);
});

test('assignRandomPotluckItem returns existing item for the same participant name', () => {
  const initialItems: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Sofia' },
    { id: '2', nombre: 'Pan', cantidadEspecifica: '10 u', categoria: 'Panadería', costoEstimado: '$5' },
  ];

  const result = assignRandomPotluckItem(initialItems, 'sofia');
  assert.equal(result.isExisting, true);
  assert.equal(result.assignedItem?.id, '1');
  assert.equal(result.assignedItem?.nombre, 'Jugo');
});

test('assignRandomPotluckItem errors when all items are taken', () => {
  const initialItems: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos' },
  ];

  const result = assignRandomPotluckItem(initialItems, 'Mateo');
  assert.equal(result.assignedItem, null);
  assert.ok(result.error?.includes('ya han sido tomados'));
});

test('unassignPotluckItem resets item assignment', () => {
  const items: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos' },
  ];

  const updated = unassignPotluckItem(items, '1');
  assert.equal(updated[0].assignedTo, null);
  assert.equal(updated[0].assignedAt, null);
});

test('registerRaffleTicket assigns incremental ticket numbers', () => {
  const tickets: RaffleTicket[] = [];

  const res1 = registerRaffleTicket(tickets, 'Carlos');
  assert.equal(res1.ticket?.ticketNumber, 1);
  assert.equal(res1.ticket?.userName, 'Carlos');

  const res2 = registerRaffleTicket(res1.updatedTickets, 'Sofia');
  assert.equal(res2.ticket?.ticketNumber, 2);
  assert.equal(res2.ticket?.userName, 'Sofia');

  // Duplicate user should return same ticket
  const res3 = registerRaffleTicket(res2.updatedTickets, 'carlos');
  assert.equal(res3.isExisting, true);
  assert.equal(res3.ticket?.ticketNumber, 1);
  assert.equal(res3.updatedTickets.length, 2);
});

test('selectRaffleWinner chooses a ticket', () => {
  const tickets: RaffleTicket[] = [
    { ticketNumber: 1, userName: 'Carlos', joinedAt: '2026-10-26T12:00:00Z' },
    { ticketNumber: 2, userName: 'Sofia', joinedAt: '2026-10-26T12:05:00Z' },
  ];

  const winner = selectRaffleWinner(tickets, 1);
  assert.equal(winner?.userName, 'Sofia');
  assert.equal(winner?.ticketNumber, 2);

  const randomWinner = selectRaffleWinner(tickets);
  assert.ok(randomWinner);
  assert.ok(randomWinner?.ticketNumber === 1 || randomWinner?.ticketNumber === 2);
});

test('calculatePotluckStats calculates accurate totals, percentages and category counts', () => {
  const items: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos' },
    { id: '2', nombre: 'Agua', cantidadEspecifica: '3L', categoria: 'Bebidas', costoEstimado: '$4' },
    { id: '3', nombre: 'Tarta', cantidadEspecifica: '1 u', categoria: 'Postre', costoEstimado: '$7', assignedTo: 'Sofia' },
    { id: '4', nombre: 'Papas', cantidadEspecifica: '2 b', categoria: 'Snacks', costoEstimado: '$5' },
  ];

  const stats = calculatePotluckStats(items);
  assert.equal(stats.total, 4);
  assert.equal(stats.assigned, 2);
  assert.equal(stats.remaining, 2);
  assert.equal(stats.percent, 50);
  assert.equal(stats.categories['Bebidas'].total, 2);
  assert.equal(stats.categories['Bebidas'].assigned, 1);
  assert.equal(stats.categories['Postre'].total, 1);
  assert.equal(stats.categories['Postre'].assigned, 1);
});

test('assignRandomPotluckItem detects same deviceId even if user changes name (Anti-Cheat)', () => {
  const initialItems: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos', assignedDeviceId: 'phone-xyz-123' },
    { id: '2', nombre: 'Pan', cantidadEspecifica: '10 u', categoria: 'Panadería', costoEstimado: '$5' },
  ];

  // Cheating attempt: same phone device, different name 'Mateo'
  const result = assignRandomPotluckItem(initialItems, 'Mateo', 'phone-xyz-123');
  assert.equal(result.isExisting, true);
  assert.equal(result.assignedItem?.id, '1');
  assert.equal(result.assignedItem?.assignedTo, 'Carlos');
});

test('registerRaffleTicket detects same deviceId even if user changes name (Anti-Cheat)', () => {
  const tickets: RaffleTicket[] = [
    { ticketNumber: 1, userName: 'Carlos', deviceId: 'phone-xyz-123', joinedAt: '2026-10-26T12:00:00Z' },
  ];

  // Cheating attempt: same phone device, different name 'Mateo'
  const res = registerRaffleTicket(tickets, 'Mateo', 'phone-xyz-123');
  assert.equal(res.isExisting, true);
  assert.equal(res.ticket?.ticketNumber, 1);
  assert.equal(res.ticket?.userName, 'Carlos');
});

test('hashPin produces deterministic 64-character SHA-256 hex string', async () => {
  const { hashPin } = await import('../services/adminAuthService');
  const hash1 = await hashPin('1234');
  const hash2 = await hashPin('1234');
  const hashOther = await hashPin('5678');

  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashOther);
});

test('toggleItemPurchased sets purchased to true with timestamp and can toggle back', () => {
  const items: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos' },
    { id: '2', nombre: 'Pan', cantidadEspecifica: '10 u', categoria: 'Panadería', costoEstimado: '$5' },
  ];

  const marked = toggleItemPurchased(items, '1', true);
  assert.equal(marked[0].purchased, true);
  assert.ok(marked[0].purchasedAt);

  const unmarked = toggleItemPurchased(marked, '1', false);
  assert.equal(unmarked[0].purchased, false);
  assert.equal(unmarked[0].purchasedAt, null);
});

test('calculatePotluckStats calculates purchased count and percentage correctly', () => {
  const items: PotluckItem[] = [
    { id: '1', nombre: 'Jugo', cantidadEspecifica: '2L', categoria: 'Bebidas', costoEstimado: '$5', assignedTo: 'Carlos', purchased: true },
    { id: '2', nombre: 'Pan', cantidadEspecifica: '10 u', categoria: 'Panadería', costoEstimado: '$5', assignedTo: 'Sofia', purchased: false },
    { id: '3', nombre: 'Tarta', cantidadEspecifica: '1 u', categoria: 'Postre', costoEstimado: '$7' },
  ];

  const stats = calculatePotluckStats(items);
  assert.equal(stats.total, 3);
  assert.equal(stats.assigned, 2);
  assert.equal(stats.purchased, 1);
  assert.equal(stats.purchasedPercent, 50); // 1 out of 2 assigned
});

test('assignRandomPotluckItem prevents duplicate claiming by phone or email anti-cheat', () => {
  const items: PotluckItem[] = [
    {
      id: '1',
      nombre: 'Jugo de Naranja',
      cantidadEspecifica: '2L',
      categoria: 'Bebidas',
      costoEstimado: '$4',
      assignedTo: 'Carlos M.',
      assignedPhoneOrEmail: '+584121234567',
    },
    {
      id: '2',
      nombre: 'Galletas',
      cantidadEspecifica: '2 paquetes',
      categoria: 'Snacks',
      costoEstimado: '$3',
    },
  ];

  // Attempting to claim under a different name but same phone number:
  const result = assignRandomPotluckItem(items, 'Carlos Fake', undefined, '+584121234567');
  assert.equal(result.isExisting, true);
  assert.equal(result.assignedItem?.id, '1');
  assert.equal(result.assignedItem?.nombre, 'Jugo de Naranja');
  // Should NOT take the unassigned cookies
  const stillAvailable = result.updatedItems.filter((i) => !i.assignedTo);
  assert.equal(stillAvailable.length, 1);
  assert.equal(stillAvailable[0].id, '2');
});

test('registerRaffleTicket prevents duplicate ticket generation by phone or email anti-cheat', () => {
  const tickets: RaffleTicket[] = [
    {
      ticketNumber: 1,
      userName: 'Elena Gomez',
      phoneOrEmail: 'elena@empresa.com',
      joinedAt: '2026-10-26T12:00:00Z',
    },
  ];

  // Attempting to generate a second ticket under an alias with the same email:
  const result = registerRaffleTicket(tickets, 'Elena G. (Alias)', undefined, 'elena@empresa.com');
  assert.equal(result.isExisting, true);
  assert.equal(result.ticket?.ticketNumber, 1);
  assert.equal(result.updatedTickets.length, 1);
});

