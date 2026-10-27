/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OfficeEvent, SimulationUser, EventType, RaffleTicket } from './types';
import {
  INITIAL_POTLUCK_EVENT,
  INITIAL_RAFFLE_EVENT,
  SIMULATION_USERS,
} from './data/initialEvents';
import {
  saveEventToFirestore,
  subscribeToFirestoreEvent,
  setRaffleWinnerInFirestore,
  seedInitialEventsToFirestore,
  clearEventAssignmentsInFirestore,
  resetEventToEmptyInFirestore,
  restoreInitialDemoEventsInFirestore,
} from './services/eventService';
import { SimulationBar } from './components/SimulationBar';
import { OrganizerView } from './components/OrganizerView';
import { ParticipantMobileView } from './components/ParticipantMobileView';
import { QRCodeModal } from './components/QRCodeModal';
import { RouletteModal } from './components/RouletteModal';
import { ResetModal } from './components/ResetModal';
import { AdminPinModal } from './components/AdminPinModal';
import { isDeviceAdminAuthenticated, setDeviceAdminAuthenticated } from './utils/deviceIdentifier';

const STORAGE_KEY_USERS = 'officedrop_users_v1';
const STORAGE_KEY_ACTIVE_USER = 'officedrop_active_user_v1';

export default function App() {
  // Events state synchronized in real-time with Firebase Firestore
  const [potluckEvent, setPotluckEvent] = useState<OfficeEvent>(INITIAL_POTLUCK_EVENT);
  const [raffleEvent, setRaffleEvent] = useState<OfficeEvent>(INITIAL_RAFFLE_EVENT);

  // Active custom event loaded via ?eventId=... if not in initial events
  const [customEvent, setCustomEvent] = useState<OfficeEvent | null>(null);
  const [urlEventId, setUrlEventId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('eventId');
    } catch {
      return null;
    }
  });
  const [isEventNotFound, setIsEventNotFound] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  const [simulatedUsers, setSimulatedUsers] = useState<SimulationUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SIMULATION_USERS;
  });

  const [activeUser, setActiveUser] = useState<SimulationUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SIMULATION_USERS[0];
  });

  // Admin Authentication & Role Security
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isDeviceAdminAuthenticated());
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isParticipantFromQr, setIsParticipantFromQr] = useState(false);

  // Current view: organizer or participant
  const [currentView, setCurrentView] = useState<'organizer' | 'participant'>(() => {
    // If opened via URL with eventId or participant mode, default strictly to participant
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('eventId') || params.get('mode') === 'participant' || params.get('role') === 'participant') {
        return 'participant';
      }
    } catch {}
    return 'organizer';
  });

  // Active event type toggle: potluck or raffle
  const [activeEventType, setActiveEventType] = useState<EventType>('potluck');

  // Modals state
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Check URL query parameters on initial load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramEventId = params.get('eventId');
      const paramMode = params.get('mode');
      const paramRole = params.get('role');
      const paramType = params.get('type');

      // If someone opens via QR code or link with ?eventId=XYZ or role=participant:
      // Lock them into Participant view so they cannot cheat or tamper with event admin!
      if (paramEventId || paramMode === 'participant' || paramRole === 'participant') {
        setIsParticipantFromQr(true);
        setCurrentView('participant');
        if (paramEventId) {
          setUrlEventId(paramEventId);
        }
      }

      if (paramType === 'raffle') {
        setActiveEventType('raffle');
      }
    } catch (err) {
      console.warn('URL params check error:', err);
    }
  }, []);

  // Initialize and seed demo events to Firestore if needed
  useEffect(() => {
    seedInitialEventsToFirestore().catch((err) => {
      console.warn('Firestore seeding notice:', err);
    });
  }, []);

  // Listen to Firestore real-time updates for potluck event via onSnapshot
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreEvent(
      potluckEvent.id,
      (liveEvent) => {
        if (liveEvent) {
          setPotluckEvent(liveEvent);
        }
      },
      (err) => console.warn('Potluck live sync warning:', err)
    );
    return () => unsubscribe();
  }, [potluckEvent.id]);

  // Listen to Firestore real-time updates for raffle event via onSnapshot
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreEvent(
      raffleEvent.id,
      (liveEvent) => {
        if (liveEvent) {
          setRaffleEvent(liveEvent);
        }
      },
      (err) => console.warn('Raffle live sync warning:', err)
    );
    return () => unsubscribe();
  }, [raffleEvent.id]);

  // If a custom eventId is present in URL (different from initial potluck/raffle), subscribe to it too
  useEffect(() => {
    if (!urlEventId) return;

    if (urlEventId === potluckEvent.id) {
      setActiveEventType('potluck');
      return;
    }
    if (urlEventId === raffleEvent.id) {
      setActiveEventType('raffle');
      return;
    }

    setIsLoadingEvent(true);
    setIsEventNotFound(false);

    const unsubscribe = subscribeToFirestoreEvent(
      urlEventId,
      (liveEvent) => {
        setIsLoadingEvent(false);
        if (liveEvent) {
          setCustomEvent(liveEvent);
          setActiveEventType(liveEvent.type);
          setIsEventNotFound(false);
        } else {
          setIsEventNotFound(true);
        }
      },
      (err) => {
        setIsLoadingEvent(false);
        setIsEventNotFound(true);
        console.warn('Custom event subscription error:', err);
      }
    );
    return () => unsubscribe();
  }, [urlEventId, potluckEvent.id, raffleEvent.id]);

  // Save users state locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(simulatedUsers));
    } catch {}
  }, [simulatedUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(activeUser));
    } catch {}
  }, [activeUser]);

  // Resolve current active event (custom event from URL or active potluck/raffle)
  const currentEvent =
    customEvent && customEvent.type === activeEventType
      ? customEvent
      : activeEventType === 'potluck'
      ? potluckEvent
      : raffleEvent;

  // Update active event and push changes to Firestore immediately
  const handleUpdateEvent = async (updated: OfficeEvent) => {
    if (updated.type === 'potluck') {
      setPotluckEvent(updated);
    } else {
      setRaffleEvent(updated);
    }
    if (customEvent && customEvent.id === updated.id) {
      setCustomEvent(updated);
    }

    try {
      await saveEventToFirestore(updated);
    } catch (err) {
      console.warn('Could not save event to Firestore (offline fallback active):', err);
    }
  };

  // Add new simulated user
  const handleAddNewUser = (name: string) => {
    const newUser: SimulationUser = {
      id: `u-${Date.now().toString(36)}`,
      name,
      avatarColor: 'bg-indigo-500',
      role: 'participant',
    };
    setSimulatedUsers((prev) => [...prev, newUser]);
    setActiveUser(newUser);
  };

  // Helper to remove participant tokens for all events from localStorage
  const clearLocalParticipantTokens = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('officedrop_participant_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Could not clear local tokens:', err);
    }
  };

  // Option 1: Clean Round (unassign items, wipe tickets, clear local memory)
  const handleCleanRound = async () => {
    clearLocalParticipantTokens();
    await clearEventAssignmentsInFirestore(currentEvent.id);
  };

  // Option 2: Restore full demo initial events
  const handleRestoreDemo = async () => {
    clearLocalParticipantTokens();
    await restoreInitialDemoEventsInFirestore();
    setPotluckEvent(INITIAL_POTLUCK_EVENT);
    setRaffleEvent(INITIAL_RAFFLE_EVENT);
    setSimulatedUsers(SIMULATION_USERS);
    setActiveUser(SIMULATION_USERS[0]);
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
  };

  // Option 3: Wipe inventory to completely empty (Blank event for production, no sample players)
  const handleResetEmpty = async () => {
    clearLocalParticipantTokens();

    // 1. Clear simulated test users from memory & storage
    setSimulatedUsers([]);
    setActiveUser({ id: '', name: '', avatarColor: 'bg-emerald-500', role: 'participant' });
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);

    // 2. Clear current event state immediately for snappy UI feedback
    if (activeEventType === 'potluck') {
      setPotluckEvent((prev) => ({
        ...prev,
        title: '',
        description: '',
        items: [],
        tickets: [],
        winnerTicket: null,
        winnerSelectedAt: null,
        status: 'draft',
      }));
    } else {
      setRaffleEvent((prev) => ({
        ...prev,
        title: '',
        description: '',
        prizeTitle: '',
        prizeDescription: '',
        items: [],
        tickets: [],
        winnerTicket: null,
        winnerSelectedAt: null,
        status: 'draft',
      }));
    }

    if (customEvent && customEvent.id === currentEvent.id) {
      setCustomEvent((prev) => (prev ? {
        ...prev,
        title: '',
        description: '',
        prizeTitle: '',
        prizeDescription: '',
        items: [],
        tickets: [],
        winnerTicket: null,
        winnerSelectedAt: null,
        status: 'draft',
      } : null));
    }

    // 3. Clear document in Firestore
    await resetEventToEmptyInFirestore(currentEvent.id);
  };

  // Handle winner picked in roulette and persist to Firestore
  const handleWinnerSelected = async (winner: RaffleTicket) => {
    const now = new Date().toISOString();
    setRaffleEvent((prev) => ({
      ...prev,
      winnerTicket: winner,
      winnerSelectedAt: now,
    }));

    try {
      await setRaffleWinnerInFirestore(raffleEvent.id, winner);
    } catch (err) {
      console.warn('Could not set winner in Firestore:', err);
    }
  };

  const handleViewChange = (view: 'organizer' | 'participant') => {
    if (view === 'organizer') {
      if (isAdminAuthenticated) {
        setCurrentView('organizer');
      } else {
        setIsAdminPinModalOpen(true);
      }
    } else {
      setCurrentView('participant');
    }
  };

  const handleAdminLock = () => {
    setDeviceAdminAuthenticated(false);
    setIsAdminAuthenticated(false);
    setCurrentView('participant');
  };

  const potluckAssignedCount = currentEvent.items.filter((i) => Boolean(i.assignedTo)).length;

  return (
    <div className="min-h-screen bg-[#070a14] arcade-grid-bg flex flex-col text-slate-100 font-retro selection:bg-cyan-500 selection:text-slate-950">
      {/* Simulation Top Bar */}
      <SimulationBar
        currentView={currentView}
        onViewChange={handleViewChange}
        activeEventType={activeEventType}
        onEventTypeChange={setActiveEventType}
        simulatedUsers={simulatedUsers}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        onAddNewUser={handleAddNewUser}
        onResetData={() => setIsResetModalOpen(true)}
        onOpenQR={() => setIsQRModalOpen(true)}
        potluckAssignedCount={potluckAssignedCount}
        potluckTotalCount={currentEvent.items.length}
        raffleTicketsCount={raffleEvent.tickets.length}
        isAdminAuthenticated={isAdminAuthenticated}
        onRequestAdminAccess={() => setIsAdminPinModalOpen(true)}
        onLockAdmin={handleAdminLock}
        isParticipantFromQr={isParticipantFromQr}
      />

      {/* Main View Area */}
      <main className="flex-1 py-4">
        {isLoadingEvent ? (
          <div className="max-w-md mx-auto my-16 p-8 bg-[#101422] border-2 border-cyan-500/60 text-center font-retro shadow-[0_0_25px_rgba(6,182,212,0.3)]">
            <div className="w-10 h-10 mx-auto mb-3 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <h3 className="font-pixel text-xs text-cyan-300">CONECTANDO CON FIRESTORE...</h3>
            <p className="text-[11px] text-slate-400 mt-2 font-retro">
              Sincronizando evento en tiempo real...
            </p>
          </div>
        ) : isEventNotFound ? (
          <div className="max-w-lg mx-auto my-12 p-6 bg-[#14121b] border-2 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.3)] text-center font-retro space-y-4">
            <div className="w-14 h-14 mx-auto bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-3xl font-arcade">
              👾
            </div>
            <h2 className="font-pixel text-sm text-rose-300 tracking-wider">
              ¡EVENTO NO ENCONTRADO EN FIRESTORE!
            </h2>
            <p className="text-xs text-slate-300 font-retro leading-relaxed">
              No existe ninguna partida o evento registrado con el ID:
              <br />
              <span className="inline-block mt-2 font-mono text-cyan-300 bg-black px-2 py-1 border border-slate-700 text-xs">
                {urlEventId}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 font-retro">
              Es posible que el organizador haya reiniciado los datos o que el enlace QR haya expirado.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  window.history.replaceState({}, '', window.location.pathname);
                  setUrlEventId(null);
                  setIsEventNotFound(false);
                  setCurrentView('organizer');
                }}
                className="pixel-btn-cyan px-4 py-2.5 text-xs font-pixel font-bold"
              >
                🕹️ IR AL EVENTO PRINCIPAL
              </button>
            </div>
          </div>
        ) : currentView === 'organizer' ? (
          !isAdminAuthenticated ? (
            <div className="max-w-md mx-auto my-12 p-6 bg-[#0e1220] border-4 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.3)] text-center font-retro space-y-4 crt-scanlines">
              <div className="w-12 h-12 mx-auto bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-[3px_3px_0px_#451a03]">
                🔒
              </div>
              <h2 className="font-pixel text-xs text-amber-300 tracking-wider">
                CONSOLA RESTRINGIDA (SOLO ORGANIZADOR)
              </h2>
              <p className="text-xs text-slate-300 font-retro leading-relaxed">
                Los participantes solo tienen acceso a la vista móvil. Para crear eventos, configurar comidas o girar la ruleta debes ingresar el PIN de organizador.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  onClick={() => setIsAdminPinModalOpen(true)}
                  className="pixel-btn-amber px-4 py-2 text-xs font-pixel font-bold"
                >
                  🔑 INGRESAR PIN
                </button>
                <button
                  onClick={() => setCurrentView('participant')}
                  className="px-4 py-2 bg-black border border-slate-700 text-slate-400 hover:text-white text-xs font-pixel"
                >
                  VOLVER A MÓVIL
                </button>
              </div>
            </div>
          ) : (
            <OrganizerView
              event={currentEvent}
              onUpdateEvent={handleUpdateEvent}
              onOpenQR={() => setIsQRModalOpen(true)}
              onOpenRoulette={() => setIsRouletteModalOpen(true)}
              onSwitchToParticipant={() => setCurrentView('participant')}
            />
          )
        ) : (
          <ParticipantMobileView
            event={currentEvent}
            currentUserName={activeUser?.name && activeUser.name !== 'Tú' ? activeUser.name : ''}
            onUpdateEvent={handleUpdateEvent}
            onUserNameChange={(newName) => {
              setActiveUser((prev) =>
                prev
                  ? { ...prev, name: newName }
                  : { id: 'u1', name: newName, avatarColor: 'bg-emerald-500', role: 'participant' }
              );
            }}
          />
        )}
      </main>

      {/* QR Code Modal with eventId in URL */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        eventTitle={currentEvent.title}
        eventType={activeEventType}
        eventId={currentEvent.id}
        onSwitchToParticipant={() => {
          setIsQRModalOpen(false);
          setCurrentView('participant');
        }}
      />

      {/* Roulette Wheel Modal */}
      <RouletteModal
        isOpen={isRouletteModalOpen}
        onClose={() => setIsRouletteModalOpen(false)}
        prizeTitle={raffleEvent.prizeTitle || 'Premio de Oficina'}
        tickets={raffleEvent.tickets}
        onWinnerSelected={handleWinnerSelected}
        currentWinner={raffleEvent.winnerTicket}
      />

      {/* Reset Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        eventTitle={currentEvent.title}
        onCleanRound={handleCleanRound}
        onRestoreDemo={handleRestoreDemo}
        onResetEmpty={handleResetEmpty}
      />

      {/* Admin PIN Gate Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setCurrentView('organizer');
        }}
      />
    </div>
  );
}
