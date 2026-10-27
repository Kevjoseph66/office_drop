/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPotluckShareText,
  formatRaffleShareText,
  PotluckTicketDetails,
  RaffleTicketDetails,
} from './ticketGenerator';

test('formatPotluckShareText formats WhatsApp / clipboard text with all key details', () => {
  const details: PotluckTicketDetails = {
    eventTitle: 'Fiesta de Fin de Mes',
    participantName: 'Rodrigo',
    item: {
      id: 'item-1',
      nombre: 'Papas fritas y snacks surtidos',
      cantidadEspecifica: '2 bolsas familiares',
      categoria: 'Snacks',
      costoEstimado: '$6 - $8',
      assignedTo: 'Rodrigo',
    },
    eventUrl: 'https://officedrop.app/?eventId=demo-potluck',
  };

  const text = formatPotluckShareText(details);
  assert.ok(text.includes('OfficeDrop - Mi Aporte de Oficina'));
  assert.ok(text.includes('Rodrigo'));
  assert.ok(text.includes('Fiesta de Fin de Mes'));
  assert.ok(text.includes('Papas fritas y snacks surtidos'));
  assert.ok(text.includes('2 bolsas familiares'));
  assert.ok(text.includes('$6 - $8'));
  assert.ok(text.includes('https://officedrop.app/?eventId=demo-potluck'));
});

test('formatRaffleShareText formats WhatsApp / clipboard text for raffle ticket', () => {
  const details: RaffleTicketDetails = {
    eventTitle: 'Gran Rifa Navideña',
    participantName: 'Ana',
    ticketNumber: 7,
    prizeTitle: 'Teclado Mecánico RGB',
    eventUrl: 'https://officedrop.app/?eventId=demo-raffle',
  };

  const text = formatRaffleShareText(details);
  assert.ok(text.includes('OfficeDrop - Mi Boleto de Rifa Arcade'));
  assert.ok(text.includes('Ana'));
  assert.ok(text.includes('Gran Rifa Navideña'));
  assert.ok(text.includes('Teclado Mecánico RGB'));
  assert.ok(text.includes('#007'));
  assert.ok(text.includes('https://officedrop.app/?eventId=demo-raffle'));
});
