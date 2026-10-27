import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRandomPotluckItem,
  unassignPotluckItem,
  registerRaffleTicket,
  selectRaffleWinner,
  calculatePotluckStats,
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
