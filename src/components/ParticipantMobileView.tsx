import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { OfficeEvent, PotluckItem, RaffleTicket } from '../types';
import {
  assignPotluckItemWithTransaction,
  registerRaffleTicketWithTransaction,
  unassignPotluckItemInFirestore,
  togglePotluckItemPurchasedInFirestore,
} from '../services/eventService';
import {
  assignRandomPotluckItem,
  registerRaffleTicket,
  unassignPotluckItem,
  toggleItemPurchased,
} from '../utils/officeDropLogic';
import { sounds } from '../utils/soundEffects';
import { getOrCreateDeviceId } from '../utils/deviceIdentifier';
import {
  Gift,
  Ticket,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  Trophy,
  RotateCcw,
  Calendar,
  Layers,
  PartyPopper,
  Clock,
  Gamepad2,
  Sword,
  Zap,
  Download,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Lock,
} from 'lucide-react';
import {
  formatPotluckShareText,
  formatRaffleShareText,
  shareToWhatsApp,
  copyToClipboard,
  triggerImageDownload,
  generatePotluckVoucherCanvas,
  generateRaffleTicketCanvas,
} from '../utils/ticketGenerator';

interface ParticipantMobileViewProps {
  event: OfficeEvent;
  currentUserName: string;
  onUpdateEvent: (updated: OfficeEvent) => void;
  onUserNameChange: (newName: string) => void;
}

export const ParticipantMobileView: React.FC<ParticipantMobileViewProps> = ({
  event,
  currentUserName,
  onUpdateEvent,
  onUserNameChange,
}) => {
  const [inputName, setInputName] = useState(currentUserName);
  const [isEditingName, setIsEditingName] = useState(!currentUserName);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [showOtherItems, setShowOtherItems] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<'potluck' | 'raffle' | null>(null);
  const [isConfirmPurchaseModalOpen, setIsConfirmPurchaseModalOpen] = useState(false);
  const [isUpdatingPurchase, setIsUpdatingPurchase] = useState(false);

  // Restore participant name from localStorage for this specific eventId
  React.useEffect(() => {
    try {
      const savedName = localStorage.getItem(`officedrop_participant_${event.id}`);
      if (savedName && savedName.trim() && savedName.trim() !== 'Tú') {
        onUserNameChange(savedName.trim());
        setInputName(savedName.trim());
        setIsEditingName(false);
      } else {
        if (!currentUserName || currentUserName === 'Tú') {
          onUserNameChange('');
          setInputName('');
          setIsEditingName(true);
        }
      }
    } catch {}
  }, [event.id]);

  const deviceId = getOrCreateDeviceId();

  // ONLY match assignedItem if a specific user name has been entered and is NOT empty or generic 'Tú'
  const validUserName =
    currentUserName && currentUserName.trim() !== '' && currentUserName.trim() !== 'Tú'
      ? currentUserName.trim().toLowerCase()
      : null;

  const assignedItem =
    event.type === 'potluck' && validUserName
      ? event.items.find(
          (it) =>
            it.assignedTo &&
            it.assignedTo.trim().toLowerCase() === validUserName
        ) || null
      : null;

  const userTicket =
    event.type === 'raffle' && validUserName
      ? event.tickets.find(
          (t) =>
            t.userName &&
            t.userName.trim().toLowerCase() === validUserName
        ) || null
      : null;

  const isWinner =
    event.type === 'raffle' &&
    event.winnerTicket &&
    userTicket &&
    event.winnerTicket.ticketNumber === userTicket.ticketNumber;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      const trimmed = inputName.trim();
      onUserNameChange(trimmed);
      try {
        localStorage.setItem(`officedrop_participant_${event.id}`, trimmed);
      } catch {}
      setIsEditingName(false);
      setErrorMsg(null);
    }
  };

  const handleDiscoverPotluckItem = async () => {
    if (!currentUserName.trim()) {
      setIsEditingName(true);
      setErrorMsg('Por favor ingresa tu nombre de jugador primero.');
      return;
    }

    // Anti-cheat check: If device already has an assigned item, show it directly
    if (assignedItem) {
      setErrorMsg(`¡Tu teléfono ya tiene asignado: "${assignedItem.nombre}"!`);
      return;
    }

    setErrorMsg(null);
    setIsOpeningBox(true);
    try {
      sounds.playTick();
    } catch {}

    // High-Concurrency & Safari Safety Guard:
    // When 20+ participants click simultaneously, Firestore OCC takes 2-5s to serialize retries.
    const safetyTimeout = setTimeout(() => {
      setIsOpeningBox(false);
    }, 9500);

    try {
      // 1. Save participant session to localStorage
      try {
        localStorage.setItem(`officedrop_participant_${event.id}`, currentUserName.trim());
      } catch {}

      // 2. Call safe Firestore atomic transaction with deviceId and concurrency-aware timeout
      const transactionPromise = assignPotluckItemWithTransaction(event.id, currentUserName, deviceId);
      const timeoutPromise = new Promise<{ item: null; isExisting: false; error: string }>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_CONCURRENCY')), 8500)
      );

      const result = await Promise.race([transactionPromise, timeoutPromise]);
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      if (result.item) {
        const updatedItems = event.items.map((it) =>
          it.id === result.item!.id ? result.item! : it
        );
        onUpdateEvent({ ...event, items: updatedItems });
      }

      try {
        sounds.playReveal();
      } catch {}
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } catch (err: any) {
      console.warn('Firestore transaction slow or failed in Safari/network, using local fallback:', err);
      // Resilient fallback to local logic if Firestore fails or times out in Safari
      const fallbackResult = assignRandomPotluckItem(event.items, currentUserName, deviceId);
      if (fallbackResult.error) {
        setErrorMsg(fallbackResult.error);
        return;
      }
      onUpdateEvent({ ...event, items: fallbackResult.updatedItems });
      try {
        sounds.playReveal();
      } catch {}
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } finally {
      clearTimeout(safetyTimeout);
      setIsOpeningBox(false);
    }
  };

  const handleTogglePurchased = async (newPurchasedState: boolean) => {
    if (!assignedItem) return;
    setIsUpdatingPurchase(true);

    try {
      // 1. Cache purchase state locally immediately
      try {
        localStorage.setItem(
          `officedrop_purchased_${event.id}_${assignedItem.id}`,
          newPurchasedState ? 'true' : 'false'
        );
      } catch {}

      // 2. Instant optimistic UI update
      const updated = toggleItemPurchased(event.items, assignedItem.id, newPurchasedState);
      onUpdateEvent({ ...event, items: updated });

      // 3. Audio & visual celebration on purchase confirmation
      if (newPurchasedState) {
        try {
          sounds.playFanfare();
        } catch {}
        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.65 },
          });
        } catch {}
      }

      // 4. Persist to Firestore
      await togglePotluckItemPurchasedInFirestore(event.id, assignedItem.id, newPurchasedState);
    } catch (err) {
      console.warn('Could not persist purchase status to Firestore (offline fallback maintained):', err);
    } finally {
      setIsUpdatingPurchase(false);
      setIsConfirmPurchaseModalOpen(false);
    }
  };

  const handleUnassignMine = async () => {
    if (!assignedItem) return;
    try {
      await unassignPotluckItemInFirestore(event.id, assignedItem.id);
    } catch (err: any) {
      console.error(err);
      const updated = unassignPotluckItem(event.items, assignedItem.id);
      onUpdateEvent({
        ...event,
        items: updated,
      });
    }
  };

  const handleJoinRaffle = async () => {
    if (!currentUserName.trim()) {
      setIsEditingName(true);
      setErrorMsg('Por favor ingresa tu nombre de jugador primero.');
      return;
    }

    // Anti-cheat check: If phone already has a ticket, show it directly
    if (userTicket) {
      setErrorMsg(`¡Tu teléfono ya tiene el boleto #${userTicket.ticketNumber}!`);
      return;
    }

    setErrorMsg(null);
    try {
      try {
        localStorage.setItem(`officedrop_participant_${event.id}`, currentUserName.trim());
      } catch {}

      const result = await registerRaffleTicketWithTransaction(event.id, currentUserName, deviceId);
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      if (result.ticket) {
        onUpdateEvent({ ...event, tickets: [...event.tickets.filter(t => t.ticketNumber !== result.ticket!.ticketNumber), result.ticket] });
      }

      try {
        sounds.playReveal();
      } catch {}
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } catch (err: any) {
      console.error(err);
      const fallback = registerRaffleTicket(event.tickets, currentUserName, deviceId);
      if (fallback.error) {
        setErrorMsg(fallback.error);
        return;
      }
      onUpdateEvent({ ...event, tickets: fallback.updatedTickets });
      try {
        sounds.playReveal();
      } catch {}
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    }
  };

  // Self-Share & Download handlers for Potluck item
  const handleSharePotluckWhatsApp = () => {
    if (!assignedItem) return;
    const text = formatPotluckShareText({
      eventTitle: event.title,
      participantName: currentUserName,
      item: assignedItem,
      eventUrl: window.location.href,
    });
    shareToWhatsApp(text);
  };

  const handleDownloadPotluckVoucher = () => {
    if (!assignedItem) return;
    const dataUrl = generatePotluckVoucherCanvas({
      eventTitle: event.title,
      participantName: currentUserName,
      item: assignedItem,
      eventUrl: window.location.href,
    });
    if (dataUrl) {
      const safeName = assignedItem.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerImageDownload(dataUrl, `OfficeDrop-Pase-${safeName}.png`);
    }
  };

  const handleCopyPotluckInfo = async () => {
    if (!assignedItem) return;
    const text = formatPotluckShareText({
      eventTitle: event.title,
      participantName: currentUserName,
      item: assignedItem,
      eventUrl: window.location.href,
    });
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyFeedback('potluck');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  // Self-Share & Download handlers for Raffle ticket
  const handleShareRaffleWhatsApp = () => {
    if (!userTicket) return;
    const text = formatRaffleShareText({
      eventTitle: event.title,
      participantName: currentUserName,
      ticketNumber: userTicket.ticketNumber,
      prizeTitle: event.prizeTitle,
      eventUrl: window.location.href,
    });
    shareToWhatsApp(text);
  };

  const handleDownloadRaffleTicket = () => {
    if (!userTicket) return;
    const dataUrl = generateRaffleTicketCanvas({
      eventTitle: event.title,
      participantName: currentUserName,
      ticketNumber: userTicket.ticketNumber,
      prizeTitle: event.prizeTitle,
      eventUrl: window.location.href,
    });
    if (dataUrl) {
      triggerImageDownload(dataUrl, `OfficeDrop-Boleto-${userTicket.ticketNumber}.png`);
    }
  };

  const handleCopyRaffleInfo = async () => {
    if (!userTicket) return;
    const text = formatRaffleShareText({
      eventTitle: event.title,
      participantName: currentUserName,
      ticketNumber: userTicket.ticketNumber,
      prizeTitle: event.prizeTitle,
      eventUrl: window.location.href,
    });
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyFeedback('raffle');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const availableItemsCount =
    event.type === 'potluck' ? event.items.filter((i) => !i.assignedTo).length : 0;

  return (
    <div className="w-full flex items-center justify-center px-2 py-2 sm:py-6 text-slate-100">
      {/* Handheld Retro GameBoy / Cyber-Arcade Mockup Frame */}
      <div className="w-full max-w-md bg-[#121522] border-4 border-[#252c44] shadow-[8px_8px_0px_#000] overflow-hidden relative flex flex-col min-h-[580px]">
        {/* Retro Handheld Console Bezel & Screen Header */}
        <div className="bg-[#0a0d16] border-b-2 border-[#252c44] px-4 pt-2.5 pb-2 flex items-center justify-between text-xs font-pixel">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="tracking-widest">OFFICEDROP 8-BIT</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-arcade-blink" />
            <span className="text-[10px] text-emerald-400">2P LINKED</span>
          </div>
        </div>

        {/* Dynamic Header Screen Banner */}
        <div
          className={`p-4 border-b-2 border-slate-700 relative overflow-hidden crt-scanlines ${
            event.type === 'potluck'
              ? 'bg-gradient-to-r from-cyan-950 via-purple-950 to-slate-900'
              : 'bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-pixel uppercase tracking-wider bg-black/60 border border-slate-600 text-cyan-300">
              {event.type === 'potluck' ? 'STAGE 1: POTLUCK' : 'STAGE 2: RAFFLE'}
            </span>
            <span className="text-[10px] text-amber-300 font-pixel">
              ★ READY TO PLAY ★
            </span>
          </div>

          <h1 className="text-base sm:text-lg font-arcade text-white tracking-wide leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {event.title.trim() || (event.type === 'potluck' ? 'COMPARTIR DE OFICINA' : 'RIFA DE OFICINA')}
          </h1>
          <p className="text-xs text-slate-300 font-retro mt-1 line-clamp-2">
            {event.description.trim() || '¡Bienvenido! Ingresa tu nombre para participar en la dinámica de equipo.'}
          </p>
        </div>

        {/* Player Tag Identification Bar */}
        <div className="bg-[#161a2c] border-b-2 border-[#252c44] px-4 py-2.5 flex items-center justify-between gap-2">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="TU NOMBRE DE JUGADOR..."
                autoFocus
                className="w-full px-2.5 py-1 text-xs bg-black border-2 border-cyan-400 text-cyan-300 font-pixel uppercase focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 text-xs font-pixel font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[2px_2px_0px_#000]"
              >
                SET
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2 font-pixel">
                <span className="text-sm">👾</span>
                <div>
                  <div className="text-[10px] text-slate-400">PLAYER:</div>
                  <div className="text-xs font-bold text-cyan-300 tracking-wider">
                    {validUserName ? currentUserName : 'SIN REGISTRAR'}
                  </div>
                </div>
              </div>
              {validUserName && !assignedItem && (
                <button
                  onClick={() => {
                    setInputName(currentUserName);
                    setIsEditingName(true);
                  }}
                  className="text-[10px] font-pixel text-slate-400 hover:text-cyan-300 underline"
                >
                  [CAMBIAR]
                </button>
              )}
            </>
          )}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-950/80 border-2 border-rose-500 text-xs font-retro text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Game Screen Area */}
        <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
          {/* ================= STAGE 1: POTLUCK QUEST ================= */}
          {event.type === 'potluck' && (
            <div className="space-y-4">
              {!validUserName ? (
                /* STEP 1: Enter Player Name First */
                <div className="p-5 sm:p-6 bg-[#0f1424] border-4 border-cyan-400 shadow-[6px_6px_0px_#000] text-center space-y-4 my-2 crt-scanlines">
                  <div className="w-16 h-16 mx-auto bg-black border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse">
                    👾
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-pixel mb-2">
                      ★ PASO 1: TU JUGADOR ★
                    </span>
                    <h2 className="text-base sm:text-lg font-arcade text-white tracking-wide">
                      ¿CÓMO TE LLAMAS?
                    </h2>
                    <p className="text-xs text-slate-300 font-retro mt-1 max-w-xs mx-auto">
                      Ingresa tu nombre o apodo para que tus compañeros sepan qué llevarás al compartir.
                    </p>
                  </div>

                  <form onSubmit={handleSaveName} className="space-y-3 pt-1">
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="ESCRIBE TU NOMBRE..."
                      autoFocus
                      maxLength={30}
                      className="w-full px-3 py-2.5 text-center text-xs bg-black border-2 border-cyan-400 text-cyan-300 font-pixel uppercase focus:outline-none focus:border-emerald-400 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!inputName.trim()}
                      className="pixel-btn-green w-full py-3 text-xs font-arcade font-bold flex items-center justify-center gap-2 tracking-wider shadow-[3px_3px_0px_#000] disabled:opacity-50"
                    >
                      <span>CONTINUAR AL COFRE</span>
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : !assignedItem ? (
                /* STEP 2: Player Name is confirmed. Mystery Chest is closed and ready to open! */
                event.items.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-[#131625] border-2 border-dashed border-amber-500/50 my-4 space-y-3">
                    <div className="w-12 h-12 mx-auto bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      ⏳
                    </div>
                    <h3 className="font-pixel text-xs text-amber-300">
                      ¡MENÚ EN PREPARACIÓN!
                    </h3>
                    <p className="text-xs text-slate-300 font-retro leading-relaxed">
                      El anfitrión aún no ha añadido los ítems de comida para esta reunión.
                    </p>
                    <p className="text-[11px] text-slate-400 font-retro">
                      En cuanto los agregue en Firestore, la pantalla se actualizará automáticamente sin recargar la página.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 border border-slate-700 text-[10px] text-emerald-400 font-pixel mt-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      ESCUCHANDO CAMBIOS EN VIVO...
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-pixel bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      PASO 2: ABRIR REGALO
                    </div>

                    <h2 className="text-base sm:text-lg font-arcade text-white tracking-wide">
                      ¡HOLA, {currentUserName}!
                    </h2>
                    <p className="text-xs text-slate-300 font-retro max-w-xs mx-auto">
                      Toca el cofre secreto o presiona el botón para descubrir qué comida o bebida te tocará traer.
                    </p>

                    {/* 8-Bit Pixel Mystery Chest Button */}
                    <div className="my-5 relative flex justify-center">
                      <button
                        onClick={handleDiscoverPotluckItem}
                        disabled={isOpeningBox || availableItemsCount === 0}
                        className={`group relative w-44 h-44 bg-[#1a1f33] border-4 border-cyan-400 shadow-[6px_6px_0px_#042f2e,0_0_20px_rgba(6,182,212,0.25)] flex flex-col items-center justify-center p-3 transition active:translate-x-1 active:translate-y-1 hover:border-pink-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isOpeningBox ? 'animate-bounce' : 'hover:scale-105'
                        }`}
                      >
                        <div className="w-16 h-16 bg-black/60 border-2 border-dashed border-amber-400 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition">
                          <span className="text-3xl filter drop-shadow">
                            {isOpeningBox ? '⚡' : '🎁'}
                          </span>
                        </div>
                        <span className="font-arcade text-[10px] text-amber-300 uppercase tracking-widest text-center mt-1">
                          {isOpeningBox ? 'ABRIENDO...' : '► ABRIR REGALO ◄'}
                        </span>
                        <span className="text-[10px] font-pixel text-cyan-300 mt-1">
                          {availableItemsCount} DISPONIBLES
                        </span>
                      </button>
                    </div>

                    {availableItemsCount === 0 ? (
                      <div className="p-3 bg-amber-950/80 border-2 border-amber-500 text-xs font-pixel text-amber-300">
                        ¡TODOS LOS ITEMS HAN SIDO RECLAMADOS!
                      </div>
                    ) : (
                      <button
                        onClick={handleDiscoverPotluckItem}
                        disabled={isOpeningBox}
                        className="pixel-btn-cyan w-full py-3.5 text-xs font-arcade tracking-wider flex items-center justify-center gap-2 font-bold shadow-[4px_4px_0px_#000]"
                      >
                        <Gift className="w-4 h-4" />
                        <span>{isOpeningBox ? 'ABRIENDO COFRE...' : '¡ABRIR REGALO Y DESCUBRIR!'}</span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* STEP 3: Assigned: Retro Quest Loot Card with Sub-items Support */
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="pixel-box-cyan p-5 relative overflow-hidden bg-gradient-to-b from-[#101524] to-[#171b30]">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-arcade mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>★ MISIÓN ASIGNADA ★</span>
                    </div>

                    <div className="text-[11px] font-pixel text-slate-400">
                      AGENTE: {currentUserName}
                    </div>
                    <div className="text-base sm:text-lg font-pixel font-bold text-white mt-1 leading-snug">
                      {assignedItem.nombre}
                    </div>

                    <div className="mt-3 p-3 bg-black border-2 border-slate-700 space-y-2">
                      <div>
                        <div className="text-[9px] uppercase font-arcade text-slate-400">CANTIDAD PRINCIPAL:</div>
                        <div className="text-xs font-retro font-bold text-cyan-300 mt-0.5">
                          {assignedItem.cantidadEspecifica}
                        </div>
                      </div>

                      {/* Sub-items / Combo List Support */}
                      {assignedItem.subItems && assignedItem.subItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                          <div className="text-[10px] font-pixel text-purple-300 flex items-center gap-1.5 uppercase">
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                            <span>ESTE TICKET INCLUYE {assignedItem.subItems.length} PRODUCTOS:</span>
                          </div>
                          <div className="space-y-1.5">
                            {assignedItem.subItems.map((sub, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2 bg-[#101424] border border-purple-500/40 text-xs font-retro flex items-start gap-2"
                              >
                                <span className="text-purple-400 font-pixel text-[11px] font-bold">
                                  [{sIdx + 1}]
                                </span>
                                <div className="flex-1">
                                  <div className="font-bold text-white text-xs">{sub.nombre}</div>
                                  <div className="text-[11px] text-cyan-300 mt-0.5">
                                    {sub.cantidadEspecifica}
                                  </div>
                                </div>
                                {sub.categoria && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-black text-slate-300 border border-slate-700">
                                    {sub.categoria}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-pixel">
                        <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px]">
                          {assignedItem.categoria}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px]">
                          EST: {assignedItem.costoEstimado}
                        </span>
                      </div>
                    </div>

                    {/* Quest instructions & Persistence confirmation */}
                    <div className="mt-3 p-2.5 bg-[#0a0d16] border border-slate-800 text-[11px] font-retro text-slate-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-pixel text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>GUARDADO EN ESTE TELÉFONO Y EN FIRESTORE</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-retro leading-tight">
                        Si cierras o recargas esta página, tu ítem sigue asignado aquí. ¡Usa las opciones abajo para guardártelo!
                      </p>
                    </div>

                    {/* Stage 3: Item Purchase / Aporte Confirmation Card */}
                    <div className="mt-3 p-3 bg-[#0d111d] border-2 border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-arcade text-cyan-300 tracking-wider uppercase flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
                          ★ ESTADO DE COMPRA / APORTE ★
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-pixel border ${
                            assignedItem.purchased
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-400 animate-pulse'
                              : 'bg-amber-950 text-amber-300 border-amber-500'
                          }`}
                        >
                          {assignedItem.purchased ? '✓ COMPRADO' : '⏳ PENDIENTE'}
                        </span>
                      </div>

                      {assignedItem.purchased ? (
                        <div className="p-2.5 bg-emerald-950/70 border border-emerald-500 text-slate-200 space-y-2">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <div className="font-pixel text-emerald-300 text-[10px] font-bold">
                                ¡APORTE ASEGURADO Y LISTO!
                              </div>
                              <p className="text-[10px] text-slate-300 font-retro mt-0.5">
                                Confirmaste que ya compraste o preparaste este ítem. Tus compañeros y organizador lo ven listo.
                              </p>
                              {assignedItem.purchasedAt && (
                                <span className="block text-[9px] text-slate-400 font-mono mt-1">
                                  Confirmado: {new Date(assignedItem.purchasedAt).toLocaleDateString()} {new Date(assignedItem.purchasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleTogglePurchased(false)}
                            disabled={isUpdatingPurchase}
                            className="w-full py-1 text-[10px] font-pixel text-slate-400 hover:text-amber-300 underline text-center block"
                          >
                            [Desmarcar / Cambiar a pendiente si te equivocaste]
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-300 font-retro leading-tight">
                            ¿Ya fuiste a comprar o preparaste tu ítem? Confírmalo aquí para que el organizador y tus compañeros sepan que la comida ya está lista.
                          </p>
                          <button
                            onClick={() => setIsConfirmPurchaseModalOpen(true)}
                            disabled={isUpdatingPurchase}
                            className="pixel-btn-green w-full py-2.5 text-xs font-arcade flex items-center justify-center gap-2 font-bold shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>CONFIRMAR QUE YA LO COMPRÉ</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Self-Share & Download 8-Bit Arcade Actions */}
                    <div className="mt-3.5 pt-3 border-t-2 border-slate-800/80 space-y-2">
                      <div className="text-[9px] font-arcade text-cyan-300 tracking-wider uppercase">
                        ▼ COMPARTIRTE O GUARDAR TU ASIGNACIÓN ▼
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* WhatsApp Self-Share button */}
                        <button
                          onClick={handleSharePotluckWhatsApp}
                          className="px-3 py-2 bg-[#0d2a1d] hover:bg-[#133e2b] text-emerald-300 border-2 border-emerald-500/80 text-[11px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition"
                          title="Enviar a tu propio WhatsApp o al grupo de oficina"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ENVIARME POR WHATSAPP</span>
                        </button>

                        {/* Download Canvas PNG Voucher */}
                        <button
                          onClick={handleDownloadPotluckVoucher}
                          className="px-3 py-2 bg-[#0e2133] hover:bg-[#163450] text-cyan-300 border-2 border-cyan-500/80 text-[11px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition"
                          title="Descargar pase arcade en imagen PNG para tu galería"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>DESCARGAR PASE (PNG)</span>
                        </button>
                      </div>

                      {/* Quick Copy to clipboard */}
                      <button
                        onClick={handleCopyPotluckInfo}
                        className={`w-full px-3 py-1.5 border-2 text-[10px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition ${
                          copyFeedback === 'potluck'
                            ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                            : 'bg-black/70 hover:bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        {copyFeedback === 'potluck' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="font-bold text-emerald-300">¡DETALLES COPIADOS AL PORTAPAPELES!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>COPIAR INFORMACIÓN AL PORTAPAPELES</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Anti-cheat lock info (Participant cannot tamper or re-roll) */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-pixel text-slate-400">
                      <div className="flex items-center gap-1 text-slate-400" title="Asignación fija en inventario">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>ASIGNACIÓN OFICIAL BLOQUEADA</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[9px]">
                        {new Date(assignedItem.assignedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Accordion: Colleague Quest Loot */}
              <div className="border-2 border-slate-800 bg-[#0d0f17] text-xs font-pixel">
                <button
                  onClick={() => setShowOtherItems(!showOtherItems)}
                  className="w-full p-3 flex items-center justify-between text-slate-300 hover:bg-[#151928] transition"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                    ¿QUÉ TRAEN LOS DEMÁS?
                  </span>
                  {showOtherItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showOtherItems && (
                  <div className="p-3 pt-0 space-y-2 divide-y divide-slate-800 max-h-48 overflow-y-auto">
                    {event.items.map((it) => (
                      <div key={it.id} className="pt-2 flex items-center justify-between text-slate-300">
                        <div>
                          <div className="font-bold text-white text-xs">{it.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-retro">{it.cantidadEspecifica}</div>
                        </div>
                        <div className="text-right">
                          {it.assignedTo ? (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500 text-[10px]">
                              ✓ {it.assignedTo}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px]">
                              LIBRE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STAGE 2: RAFFLE QUEST ================= */}
          {event.type === 'raffle' && (
            <div className="space-y-4">
              {/* Prize Card */}
              <div className="pixel-box-amber p-4 text-center">
                <div className="inline-flex items-center gap-1 text-[10px] font-arcade text-amber-400 uppercase tracking-wider bg-black/60 px-2 py-0.5 border border-amber-500/40 mb-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  GRAND PRIZE LOOT
                </div>
                <h2 className="text-sm font-arcade text-white">{event.prizeTitle}</h2>
                {event.prizeDescription && (
                  <p className="text-xs text-slate-300 font-retro mt-1">{event.prizeDescription}</p>
                )}
              </div>

              {/* Ticket State */}
              {!validUserName ? (
                <div className="p-5 bg-[#1c1510] border-4 border-amber-400 shadow-[6px_6px_0px_#000] text-center space-y-4 my-2 crt-scanlines">
                  <div className="w-16 h-16 mx-auto bg-black border-2 border-amber-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse">
                    🎟️
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-pixel mb-2">
                      ★ PASO 1: TU JUGADOR ★
                    </span>
                    <h2 className="text-base font-arcade text-white">¿A NOMBRE DE QUIÉN EL BOLETO?</h2>
                    <p className="text-xs text-slate-300 font-retro mt-1 max-w-xs mx-auto">
                      Ingresa tu nombre para emitir tu número de boleto en la ruleta del organizador.
                    </p>
                  </div>

                  <form onSubmit={handleSaveName} className="space-y-3 pt-1">
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="ESCRIBE TU NOMBRE..."
                      autoFocus
                      maxLength={30}
                      className="w-full px-3 py-2.5 text-center text-xs bg-black border-2 border-amber-400 text-amber-300 font-pixel uppercase focus:outline-none focus:border-yellow-300 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!inputName.trim()}
                      className="pixel-btn-amber w-full py-3 text-xs font-arcade font-bold flex items-center justify-center gap-2 tracking-wider shadow-[3px_3px_0px_#000] disabled:opacity-50"
                    >
                      <span>CONTINUAR AL BOLETO</span>
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : !userTicket ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 bg-black border-4 border-amber-400 flex items-center justify-center mx-auto text-3xl shadow-[4px_4px_0px_#451a03]">
                    🎟️
                  </div>
                  <div>
                    <h3 className="text-sm font-arcade text-white">
                      ¡HOLA {currentUserName}, OBTÉN TU TICKET!
                    </h3>
                    <p className="text-xs text-slate-400 font-retro mt-1 max-w-xs mx-auto">
                      Quedarás registrado en la ruleta para cuando el admin inicie el sorteo.
                    </p>
                  </div>

                  <button
                    onClick={handleJoinRaffle}
                    className="pixel-btn-amber w-full py-3.5 text-xs font-arcade tracking-wider flex items-center justify-center gap-2 font-bold"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>¡INGRESAR A LA TÓMBOLA!</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  {/* Winner banner */}
                  {isWinner && (
                    <div className="p-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-center font-arcade text-xs border-2 border-white shadow-[4px_4px_0px_#000] animate-bounce">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        🎉 ¡ERES EL GANADOR OFICIAL! 🎉
                      </div>
                      <div className="mt-1 font-pixel text-xs">Acércate al organizador para tu premio.</div>
                    </div>
                  )}

                  {/* Golden Arcade Pixel Ticket */}
                  <div className="relative bg-[#1c1510] border-4 border-amber-400 p-5 shadow-[6px_6px_0px_#451a03,0_0_20px_rgba(245,158,11,0.25)] text-slate-100 overflow-hidden">
                    {/* Perforated Pixel Cutouts */}
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-5 h-5 bg-[#121522] border-2 border-amber-400" />
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 bg-[#121522] border-2 border-amber-400" />

                    <div className="flex items-center justify-between border-b-2 border-amber-500/30 pb-2.5 font-pixel text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Ticket className="w-4 h-4" />
                        <span>ARCADE TICKET</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-black text-amber-400 border border-amber-500/50 text-[10px]">
                        VERIFIED
                      </span>
                    </div>

                    <div className="my-4 text-center">
                      <div className="text-[10px] font-arcade text-slate-400 tracking-widest uppercase">
                        NÚMERO DE BOLETO
                      </div>
                      <div className="text-3xl sm:text-4xl font-arcade text-amber-300 my-1 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                        #{userTicket.ticketNumber.toString().padStart(3, '0')}
                      </div>
                      <div className="text-xs font-pixel text-white font-bold tracking-wider">
                        PLAYER: {userTicket.userName}
                      </div>
                    </div>

                    <div className="border-t-2 border-dashed border-amber-500/30 pt-3 flex items-center justify-between text-xs font-pixel">
                      <div>
                        <div className="text-[9px] text-slate-400">TIEMPO:</div>
                        <div className="text-slate-200 font-mono">
                          {new Date(userTicket.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400">ESTADO:</div>
                        <div className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> EN TÓMBOLA
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Self-Share & Download Golden Ticket Actions */}
                  <div className="p-3 bg-[#17120a] border-2 border-amber-500/70 space-y-2">
                      <div className="text-[9px] font-arcade text-amber-300 tracking-wider uppercase">
                        ▼ COMPARTIRTE O GUARDAR TU BOLETO ▼
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* WhatsApp Self-Share button */}
                        <button
                          onClick={handleShareRaffleWhatsApp}
                          className="px-3 py-2 bg-[#0d2a1d] hover:bg-[#133e2b] text-emerald-300 border-2 border-emerald-500/80 text-[11px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition"
                          title="Enviar a tu propio WhatsApp o al grupo de oficina"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ENVIARME POR WHATSAPP</span>
                        </button>

                        {/* Download Golden Ticket PNG */}
                        <button
                          onClick={handleDownloadRaffleTicket}
                          className="px-3 py-2 bg-[#2d1b06] hover:bg-[#432809] text-amber-300 border-2 border-amber-500/80 text-[11px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition"
                          title="Descargar boleto arcade dorado en imagen PNG para tu galería"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>DESCARGAR BOLETO (PNG)</span>
                        </button>
                      </div>

                      {/* Quick Copy to clipboard */}
                      <button
                        onClick={handleCopyRaffleInfo}
                        className={`w-full px-3 py-1.5 border-2 text-[10px] font-pixel flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition ${
                          copyFeedback === 'raffle'
                            ? 'bg-amber-950 border-amber-400 text-amber-300'
                            : 'bg-black/70 hover:bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        {copyFeedback === 'raffle' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="font-bold text-emerald-300">¡BOLETO COPIADO AL PORTAPAPELES!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>COPIAR INFORMACIÓN DEL BOLETO</span>
                          </>
                        )}
                      </button>
                    </div>

                  {/* Lottery Status */}
                  <div className="p-3 bg-black border border-slate-700 text-xs font-retro text-slate-300 space-y-1">
                    <div className="font-pixel text-cyan-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {event.winnerTicket
                        ? isWinner
                          ? '★ ¡GANASTE EL SORTEO! ★'
                          : `SORTEO COMPLETADO: GANÓ TICKET #${event.winnerTicket.ticketNumber} (${event.winnerTicket.userName})`
                        : `ESPERANDO GIRO DEL ADMIN (${event.tickets.length} PARTICIPANTES)...`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Retro Branding */}
          <div className="mt-4 pt-3 border-t-2 border-[#252c44] text-center">
            <div className="text-[10px] font-arcade text-slate-500">
              OFFICEDROP ★ ARCADE EDITION
            </div>
          </div>
        </div>

        {/* Purchase Confirmation Retro Modal */}
        {isConfirmPurchaseModalOpen && assignedItem && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#101424] border-4 border-emerald-400 p-5 shadow-[8px_8px_0px_#000] space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2.5">
                <span className="text-xs font-arcade text-emerald-300 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  ★ CONFIRMAR COMPRA ★
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfirmPurchaseModalOpen(false)}
                  className="text-slate-400 hover:text-white font-mono text-xs px-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-retro text-slate-200 leading-relaxed">
                  ¿Confirmas que ya compraste o preparaste este ítem para el compartir de oficina?
                </p>

                <div className="p-3 bg-black border-2 border-slate-700 space-y-1.5">
                  <div className="text-[9px] font-pixel text-cyan-400 uppercase">ÍTEM A CONFIRMAR:</div>
                  <div className="text-sm font-pixel font-bold text-white leading-snug">{assignedItem.nombre}</div>
                  <div className="text-xs font-retro text-amber-300 font-bold">{assignedItem.cantidadEspecifica}</div>

                  {assignedItem.subItems && assignedItem.subItems.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[9px] font-pixel text-slate-400">INCLUYE TODO ESTE PAQUETE:</span>
                      {assignedItem.subItems.map((sub, idx) => (
                        <div key={idx} className="text-[11px] font-retro text-emerald-300 flex items-center gap-1.5">
                          <span>✓</span>
                          <span>{sub.cantidadEspecifica} {sub.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-retro">
                  Esto quedará guardado en la base de datos para que el organizador y tus compañeros vean que tu aporte está garantizado.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmPurchaseModalOpen(false)}
                  disabled={isUpdatingPurchase}
                  className="px-3 py-2.5 text-xs font-pixel text-slate-400 hover:text-white border border-slate-700 bg-black shadow-[2px_2px_0px_#000]"
                >
                  AÚN PENDIENTE
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePurchased(true)}
                  disabled={isUpdatingPurchase}
                  className="pixel-btn-green py-2.5 text-xs font-arcade font-bold flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                >
                  <span>✓ SÍ, YA LO COMPRÉ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
