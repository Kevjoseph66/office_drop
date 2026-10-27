import React, { useState } from 'react';
import { SimulationUser, EventType } from '../types';
import {
  Smartphone,
  Shield,
  RotateCcw,
  Utensils,
  Ticket,
  Plus,
  Check,
  QrCode,
  User,
  Lock,
  Unlock,
  Gamepad2,
} from 'lucide-react';

interface SimulationBarProps {
  currentView: 'organizer' | 'participant';
  onViewChange: (view: 'organizer' | 'participant') => void;
  activeEventType: EventType;
  onEventTypeChange: (type: EventType) => void;
  simulatedUsers: SimulationUser[];
  activeUser: SimulationUser;
  onSelectUser: (user: SimulationUser) => void;
  onAddNewUser: (name: string) => void;
  onResetData: () => void;
  onOpenQR: () => void;
  potluckAssignedCount: number;
  potluckTotalCount: number;
  raffleTicketsCount: number;
  isAdminAuthenticated: boolean;
  onRequestAdminAccess: () => void;
  onLockAdmin: () => void;
  isParticipantFromQr?: boolean;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  currentView,
  onViewChange,
  activeEventType,
  onEventTypeChange,
  simulatedUsers,
  activeUser,
  onSelectUser,
  onAddNewUser,
  onResetData,
  onOpenQR,
  potluckAssignedCount,
  potluckTotalCount,
  raffleTicketsCount,
  isAdminAuthenticated,
  onRequestAdminAccess,
  onLockAdmin,
  isParticipantFromQr,
}) => {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onAddNewUser(newUserName.trim());
      setNewUserName('');
      setIsAddingUser(false);
    }
  };

  const handleOrganizerClick = () => {
    if (isAdminAuthenticated) {
      onViewChange('organizer');
    } else {
      onRequestAdminAccess();
    }
  };

  // If opened directly on a participant phone via QR code, render a clean, distraction-free arcade strip
  if (isParticipantFromQr && currentView === 'participant') {
    return (
      <aside
        aria-label="Barra de participante arcade"
        className="sticky top-0 z-40 bg-[#080b14] border-b-2 border-cyan-500/40 text-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.6)] font-retro crt-scanlines"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-cyan-500 text-slate-950 font-arcade text-[10px] flex items-center justify-center font-bold shadow-[2px_2px_0px_#083344]">
              OD
            </div>
            <span className="font-arcade text-xs text-cyan-300 tracking-wider">
              OFFICEDROP
            </span>
            <span className="font-pixel text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300">
              ● ONLINE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-pixel text-[9px] text-slate-400 hidden sm:inline">
              MODO PARTICIPANTE (PROTEGIDO)
            </span>
            <button
              onClick={handleOrganizerClick}
              className="px-2 py-1 bg-black/70 hover:bg-slate-900 border border-amber-500/60 text-amber-300 text-[10px] font-pixel flex items-center gap-1 shadow-[2px_2px_0px_#000]"
              title="Acceso exclusivo para el organizador con PIN"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>ADMIN PIN</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Barra de control arcade y administración"
      className="sticky top-0 z-40 bg-[#070a14] border-b-2 border-cyan-500/50 text-slate-100 shadow-[0_4px_25px_rgba(6,182,212,0.15)] font-retro crt-scanlines"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Arcade Cabinet Brand & Event Stage Switcher */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-cyan-500 border-2 border-cyan-300 flex items-center justify-center font-arcade text-xs text-slate-950 font-bold shadow-[3px_3px_0px_#083344]">
                <Gamepad2 className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-arcade text-xs text-cyan-300 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                    OFFICEDROP
                  </span>
                  <span className="text-[9px] font-pixel px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500">
                    8-BIT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-retro">
                  SISTEMA DE DINÁMICAS ARCADE
                </div>
              </div>
            </div>

            {/* Stage Mode Switcher (Potluck vs Raffle) */}
            <div className="flex items-center bg-[#0d1222] p-1 border-2 border-slate-700 shadow-[3px_3px_0px_#000]">
              <button
                onClick={() => onEventTypeChange('potluck')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel transition-all ${
                  activeEventType === 'potluck'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-[2px_2px_0px_#083344]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Compartir de Comida"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>STAGE 1: COMIDA</span>
                <span
                  className={`text-[9px] px-1 py-0.2 font-arcade ${
                    activeEventType === 'potluck'
                      ? 'bg-cyan-950 text-cyan-200'
                      : 'bg-black/80 text-slate-400'
                  }`}
                >
                  {potluckAssignedCount}/{potluckTotalCount}
                </span>
              </button>

              <button
                onClick={() => onEventTypeChange('raffle')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel transition-all ${
                  activeEventType === 'raffle'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-[2px_2px_0px_#451a03]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Rifa / Sorteo"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>STAGE 2: RIFA</span>
                <span
                  className={`text-[9px] px-1 py-0.2 font-arcade ${
                    activeEventType === 'raffle'
                      ? 'bg-amber-950 text-amber-200'
                      : 'bg-black/80 text-slate-400'
                  }`}
                >
                  {raffleTicketsCount}
                </span>
              </button>
            </div>
          </div>

          {/* Role Switching & Security Lock */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="flex items-center bg-[#0d1222] p-1 border-2 border-slate-700 shadow-[3px_3px_0px_#000]">
              <button
                onClick={handleOrganizerClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel transition-all ${
                  currentView === 'organizer'
                    ? 'bg-purple-600 text-white font-bold shadow-[2px_2px_0px_#3b0764]'
                    : 'text-slate-400 hover:text-purple-300'
                }`}
                title={
                  isAdminAuthenticated
                    ? 'Consola de Organizador (Admin)'
                    : 'Requiere PIN de administrador'
                }
              >
                {isAdminAuthenticated ? (
                  <Shield className="w-3.5 h-3.5 text-purple-300" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>ORGANIZADOR {isAdminAuthenticated ? '(ADMIN)' : '(PIN 🔒)'}</span>
              </button>

              <button
                onClick={() => onViewChange('participant')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel transition-all ${
                  currentView === 'participant'
                    ? 'bg-emerald-600 text-slate-950 font-bold shadow-[2px_2px_0px_#022c22]'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
                title="Vista Participante (Móvil)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>PARTICIPANTE (MÓVIL)</span>
              </button>
            </div>

            {/* Quick Actions: QR Modal, Reset, and Lock status */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenQR}
                className="px-2.5 py-1.5 bg-[#12192a] hover:bg-[#1c2742] text-cyan-300 border-2 border-cyan-500/60 text-xs font-pixel flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                title="Ver código QR para que los participantes escaneen"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">QR CODE</span>
              </button>

              {isAdminAuthenticated && (
                <button
                  onClick={onLockAdmin}
                  className="px-2.5 py-1.5 bg-[#1a1216] hover:bg-[#2b1820] text-amber-300 border-2 border-amber-600/60 text-xs font-pixel flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                  title="Bloquear sesión de administrador"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">BLOQUEAR</span>
                </button>
              )}

              {/* Reset button strictly restricted to authenticated organizer */}
              {currentView === 'organizer' && isAdminAuthenticated && (
                <button
                  onClick={onResetData}
                  className="px-2.5 py-1.5 bg-[#200e16] hover:bg-[#331523] text-rose-300 border-2 border-rose-500/70 text-xs font-pixel flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                  title="Panel de reinicio y vaciado de evento (Solo Administrador)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>REINICIAR</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Participant Test Switcher (Only active when in participant view on desktop) */}
        {currentView === 'participant' && !isParticipantFromQr && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-pixel text-slate-300">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">SIMULADOR DE JUGADORES:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap max-w-full">
              {simulatedUsers.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
                  {simulatedUsers.map((u) => {
                    const isSelected = activeUser.name.toLowerCase() === u.name.toLowerCase();
                    return (
                      <button
                        key={u.id}
                        onClick={() => onSelectUser(u)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-xs font-pixel border transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-300 shadow-[2px_2px_0px_#022c22]'
                            : 'bg-black border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span>{u.name}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-pixel text-emerald-400 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/60">
                    ★ MODO PRODUCCIÓN: CADA PERSONA INGRESA SU NOMBRE AL ESCANEAR EL QR ★
                  </span>
                </div>
              )}

              {isAddingUser ? (
                <form onSubmit={handleCreateUser} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nombre..."
                    autoFocus
                    className="px-2 py-0.5 text-xs bg-black border border-emerald-500 text-slate-100 placeholder:text-slate-600 font-retro w-32 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-emerald-600 text-slate-950 font-pixel text-[10px] font-bold border border-emerald-400"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-1 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-pixel bg-black hover:bg-slate-900 text-emerald-400 border border-dashed border-emerald-500/50 transition"
                  title="Añadir jugador de prueba local"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ TEST JUGADOR</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
