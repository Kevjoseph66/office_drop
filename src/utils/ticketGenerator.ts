/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PotluckItem } from '../types';

export interface PotluckTicketDetails {
  eventTitle: string;
  participantName: string;
  item: PotluckItem;
  eventUrl?: string;
}

export interface RaffleTicketDetails {
  eventTitle: string;
  participantName: string;
  ticketNumber: number;
  prizeTitle?: string;
  eventUrl?: string;
}

/**
 * Prepares the formatted text string for WhatsApp and clipboard sharing
 */
export function formatPotluckShareText(details: PotluckTicketDetails): string {
  const { eventTitle, participantName, item, eventUrl } = details;
  const lines = [
    `🎮 *OfficeDrop - Mi Aporte de Oficina*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Jugador:* ${participantName}`,
    `🎉 *Evento:* ${eventTitle || 'Compartir de Oficina'}`,
    `📦 *Me tocó traer:* ${item.nombre}`,
    `🔢 *Cantidad:* ${item.cantidadEspecifica}`,
    `🏷️ *Categoría:* ${item.categoria}`,
    `💰 *Costo estimado:* ${item.costoEstimado || 'N/A'}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ *Asignación registrada en inventario oficial*`,
  ];

  if (eventUrl) {
    lines.push(`🔗 *Ver evento:* ${eventUrl}`);
  }

  lines.push(`¡Nos vemos en el compartir! 🙌`);
  return lines.join('\n');
}

/**
 * Prepares the formatted text string for raffle tickets
 */
export function formatRaffleShareText(details: RaffleTicketDetails): string {
  const { eventTitle, participantName, ticketNumber, prizeTitle, eventUrl } = details;
  const lines = [
    `🎟️ *OfficeDrop - Mi Boleto de Rifa Arcade*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Jugador:* ${participantName}`,
    `🎉 *Evento:* ${eventTitle || 'Rifa de Oficina'}`,
    `🎁 *Premio en juego:* ${prizeTitle || 'Gran Premio'}`,
    `🔢 *Número de Boleto:* #${ticketNumber.toString().padStart(3, '0')}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎰 *Registrado en la ruleta del organizador*`,
  ];

  if (eventUrl) {
    lines.push(`🔗 *Ver evento:* ${eventUrl}`);
  }

  lines.push(`¡A esperar el giro de la ruleta! 🍀`);
  return lines.join('\n');
}

/**
 * Helper to open WhatsApp share with pre-filled message
 */
export function shareToWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}

/**
 * Resilient copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback for older browsers or restricted iframe environments
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Triggers browser download of a base64 Data URL as an image file
 */
export function triggerImageDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an authentic 8-Bit Pixel Arcade Voucher PNG for food assignments
 */
export function generatePotluckVoucherCanvas(details: PotluckTicketDetails): string {
  const width = 640;
  const height = 440;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Dark Cyberpunk / Arcade Cabinet Background
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle CRT grid texture
  ctx.strokeStyle = '#0e172a';
  ctx.lineWidth = 1;
  const gridSize = 16;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Pixel Double Border (Neon Cyan + Dark Slate)
  ctx.strokeStyle = '#06b6d4'; // Cyan
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Corner Pixel Accents
  ctx.fillStyle = '#22d3ee';
  const cornerSize = 8;
  ctx.fillRect(12, 12, cornerSize, cornerSize);
  ctx.fillRect(width - 12 - cornerSize, 12, cornerSize, cornerSize);
  ctx.fillRect(12, height - 12 - cornerSize, cornerSize, cornerSize);
  ctx.fillRect(width - 12 - cornerSize, height - 12 - cornerSize, cornerSize, cornerSize);

  // 4. Header Bar
  ctx.fillStyle = '#0c1527';
  ctx.fillRect(20, 20, width - 40, 56);
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, 56);

  // Brand title
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText('★ OFFICEDROP 8-BIT ARCADE ★', 36, 46);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillText('PASE OFICIAL DE PARTICIPANTE', 36, 64);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillText('VERIFICADO ✓', width - 150, 52);

  // 5. Event and Player Line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('EVENTO:', 36, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Courier New", monospace';
  const truncatedTitle = details.eventTitle.length > 36 ? details.eventTitle.substring(0, 34) + '...' : details.eventTitle;
  ctx.fillText(truncatedTitle || 'Compartir de Oficina', 100, 110);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('JUGADOR:', 36, 138);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(details.participantName.toUpperCase(), 110, 138);

  // 6. Assigned Loot Hero Box
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(36, 160, width - 72, 140);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 160, width - 72, 140);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillText('🎒 ITEM DE COMIDA ASIGNADO:', 50, 185);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Courier New", monospace';
  const truncatedItem = details.item.nombre.length > 32 ? details.item.nombre.substring(0, 30) + '...' : details.item.nombre;
  ctx.fillText(truncatedItem, 50, 218);

  // Details inside box
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText(`CANTIDAD: ${details.item.cantidadEspecifica}`, 50, 252);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText(`CATEGORÍA: [${details.item.categoria}]  •  ESTIMADO: ${details.item.costoEstimado || '$0'}`, 50, 280);

  // 7. Footer Decorative Retro Barcode & Instructions
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(36, 320, width - 72, 40);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillText('▶ PRESENTA ESTE PASE O LLEVA EL ITEM EL DÍA DEL COMPARTIR', 50, 344);

  // Retro barcode pattern
  ctx.fillStyle = '#22d3ee';
  for (let b = 0; b < 24; b++) {
    const barX = 36 + b * 10;
    const barW = (b % 3 === 0) ? 4 : 2;
    ctx.fillRect(barX, 375, barW, 20);
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Courier New", monospace';
  const dateStr = new Date().toLocaleDateString();
  ctx.fillText(`PASS-ID: OD-${Math.abs(details.item.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0))}-8BIT  •  ${dateStr}`, 300, 388);

  return canvas.toDataURL('image/png');
}

/**
 * Generates a Golden Arcade Ticket PNG for Raffle entries
 */
export function generateRaffleTicketCanvas(details: RaffleTicketDetails): string {
  const width = 640;
  const height = 380;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Dark Golden Amber Background
  ctx.fillStyle = '#130e06';
  ctx.fillRect(0, 0, width, height);

  // 2. Texture grid
  ctx.strokeStyle = '#291e0a';
  ctx.lineWidth = 1;
  const gridSize = 16;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Golden Double Border
  ctx.strokeStyle = '#f59e0b'; // Amber 500
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Perforated notches on sides
  ctx.fillStyle = '#080c18';
  ctx.fillRect(8, height / 2 - 16, 16, 32);
  ctx.fillRect(width - 24, height / 2 - 16, 16, 32);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, height / 2 - 16, 16, 32);
  ctx.strokeRect(width - 24, height / 2 - 16, 16, 32);

  // 4. Header Bar
  ctx.fillStyle = '#261706';
  ctx.fillRect(36, 26, width - 72, 44);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 26, width - 72, 44);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText('★ OFFICEDROP • GOLDEN RAFFLE TICKET ★', 50, 54);

  // 5. Giant Ticket Number
  ctx.fillStyle = '#451a03';
  ctx.fillRect(36, 85, width - 72, 120);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 85, width - 72, 120);

  ctx.fillStyle = '#fde68a';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('TICKET NUMBER / BOLETO REGISTRADO', 50, 110);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.fillText(`#${details.ticketNumber.toString().padStart(3, '0')}`, 50, 168);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText('✓ EN TÓMBOLA OFICIAL', width - 230, 160);

  // 6. Player and Prize info
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText(`PLAYER: ${details.participantName.toUpperCase()}`, 50, 235);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText(`PREMIO: ${details.prizeTitle || 'Premio de Oficina'}`, 50, 265);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText(`EVENTO: ${details.eventTitle || 'Rifa de Oficina'}`, 50, 290);

  // 7. Footer
  ctx.fillStyle = '#78350f';
  ctx.font = '10px "Courier New", monospace';
  const dateStr = new Date().toLocaleDateString();
  ctx.fillText(`OFFICEDROP 8-BIT VERIFIED TICKET  •  ${dateStr}`, 50, 335);

  return canvas.toDataURL('image/png');
}
