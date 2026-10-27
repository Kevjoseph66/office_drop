import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RaffleTicket } from '../types';
import { sounds } from '../utils/soundEffects';
import { Trophy, X, RotateCw, Sparkles, PartyPopper, Users } from 'lucide-react';

interface RouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeTitle: string;
  tickets: RaffleTicket[];
  onWinnerSelected: (winner: RaffleTicket) => void;
  currentWinner?: RaffleTicket | null;
}

const MODERN_SLICE_COLORS = [
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

export const RouletteModal: React.FC<RouletteModalProps> = ({
  isOpen,
  onClose,
  prizeTitle,
  tickets,
  onWinnerSelected,
  currentWinner,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [localWinner, setLocalWinner] = useState<RaffleTicket | null>(currentWinner || null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setLocalWinner(currentWinner || null);
  }, [currentWinner, isOpen]);

  if (!isOpen) return null;

  const numTickets = tickets.length;

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const handleSpin = () => {
    if (isSpinning || numTickets === 0) return;

    setIsSpinning(true);
    setLocalWinner(null);

    const winnerIndex = Math.floor(Math.random() * numTickets);
    const chosenWinner = tickets[winnerIndex];

    const sliceAngle = 360 / numTickets;
    const sliceCenterAngle = winnerIndex * sliceAngle + sliceAngle / 2;
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const targetDegree = rotationDegree + extraSpins + (360 - (sliceCenterAngle % 360));

    setRotationDegree(targetDegree);

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      sounds.playTick();
      if (tickCount > 35) {
        clearInterval(tickInterval);
      }
    }, 110);

    timerRef.current = setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setLocalWinner(chosenWinner);
      sounds.playFanfare();
      triggerConfetti();
      onWinnerSelected(chosenWinner);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-100 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Roulette Wheel */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Sorteo en vivo
          </div>

          <h3 className="text-base font-bold text-white text-center mb-1">
            {prizeTitle}
          </h3>
          <p className="text-xs text-slate-400 text-center mb-4">
            {numTickets === 0
              ? 'Esperando que los participantes escaneen el QR y obtengan sus tickets'
              : `${numTickets} ${numTickets === 1 ? 'ticket registrado' : 'tickets registrados'}`}
          </p>

          {/* Wheel Graphic */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
            {/* Pointer Pin at Top */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]" />

            {/* Spinning Circle */}
            <div
              className="w-full h-full rounded-full border-4 border-slate-800 shadow-2xl relative overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${rotationDegree}deg)`,
                transitionDuration: isSpinning ? '4500ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.25, 1)',
              }}
            >
              {numTickets > 0 ? (
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {tickets.map((t, idx) => {
                    const sliceAngle = 360 / numTickets;
                    const startAngle = idx * sliceAngle;
                    const endAngle = startAngle + sliceAngle;

                    const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    const color = MODERN_SLICE_COLORS[idx % MODERN_SLICE_COLORS.length];

                    return (
                      <path
                        key={t.ticketNumber}
                        d={pathData}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth="0.8"
                      />
                    );
                  })}
                </svg>
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center p-4 text-center text-xs text-slate-400">
                  Sin tickets registrados aún
                </div>
              )}

              {/* Center Hub */}
              <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-slate-950 border-4 border-slate-800 shadow-lg flex items-center justify-center z-10">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Spin Trigger Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || numTickets === 0}
            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Girando ruleta...' : '¡Girar Ruleta en Vivo!'}</span>
          </button>
        </div>

        {/* Right Side: Winner Spotlight & Tickets List */}
        <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-5">
          {/* Winner announcement */}
          {localWinner ? (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/80 to-slate-900 border border-emerald-500 text-center animate-in zoom-in-95 duration-200 mb-4">
              <PartyPopper className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
              <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                ¡GANADOR DEL SORTEO!
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {localWinner.userName}
              </div>
              <div className="text-sm font-mono text-amber-300 font-bold mt-1">
                Ticket #{String(localWinner.ticketNumber).padStart(3, '0')}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center mb-4">
              <Sparkles className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
              <div className="text-xs font-medium text-slate-300">
                Gira la ruleta para elegir al ganador al azar
              </div>
            </div>
          )}

          {/* Live Tickets List */}
          <div className="flex-1 min-h-[140px] flex flex-col">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Tickets en sorteo</span>
              </span>
              <span className="font-mono text-cyan-400">{numTickets}</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-48 pr-1">
              {tickets.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  Nadie ha obtenido ticket todavía. Comparte el QR para que se sumen.
                </div>
              ) : (
                tickets.map((t) => {
                  const isCurrent = localWinner && localWinner.ticketNumber === t.ticketNumber;
                  return (
                    <div
                      key={t.ticketNumber}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border transition ${
                        isCurrent
                          ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate max-w-[130px]">{t.userName}</span>
                      <span className="font-mono font-bold text-[11px] text-amber-400">
                        #{String(t.ticketNumber).padStart(3, '0')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
