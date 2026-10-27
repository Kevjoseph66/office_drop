import React, { useState } from 'react';
import { RotateCcw, Sparkles, Trash2, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleanRound: () => Promise<void>;
  onRestoreDemo: () => Promise<void>;
  onResetEmpty: () => Promise<void>;
  eventTitle: string;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onCleanRound,
  onRestoreDemo,
  onResetEmpty,
  eventTitle,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = async (actionName: string, actionFn: () => Promise<void>) => {
    try {
      setLoadingAction(actionName);
      setStatusMessage(null);
      await actionFn();
      setStatusMessage('¡Operación completada en Firestore con éxito!');
      setTimeout(() => {
        setStatusMessage(null);
        setLoadingAction(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error al ejecutar la acción: ' + (err?.message || 'Error desconocido'));
      setLoadingAction(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#0e111a] border-2 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.35)] p-5 text-slate-100 font-retro crt-scanlines">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-rose-500/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-600 border border-rose-400 flex items-center justify-center font-bold text-slate-950 font-arcade text-sm shadow-[2px_2px_0px_#4c0519]">
              ⚠️
            </div>
            <div>
              <h2 id="reset-modal-title" className="font-pixel text-xs text-rose-300 tracking-wider">
                PANEL DE REINICIO ARCADE
              </h2>
              <p className="text-[10px] text-slate-400 font-retro truncate max-w-[280px]">
                Evento activo: {eventTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={Boolean(loadingAction)}
            className="p-1 text-slate-400 hover:text-white border border-slate-700 bg-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className="mb-4 p-2.5 bg-emerald-950/70 border border-emerald-500 text-emerald-300 font-pixel text-[11px] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <p className="text-xs text-slate-300 font-retro mb-4 leading-relaxed">
          ¿Qué tipo de reinicio deseas realizar en la base de datos de Firestore y en tu navegador?
        </p>

        {/* 3 Main Reset Options */}
        <div className="space-y-3">
          {/* Option 1: Clean Round */}
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => handleAction('clean', onCleanRound)}
            className="w-full text-left p-3 bg-[#151928] hover:bg-[#1b2238] border-2 border-cyan-500/60 shadow-[3px_3px_0px_#000] transition group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-pixel text-xs text-cyan-300 group-hover:text-cyan-200">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'clean' ? 'animate-spin' : ''}`} />
                <span>1. RONDA LIMPIA (VACÍAR ASIGNACIONES)</span>
              </div>
              <span className="text-[9px] font-pixel px-1.5 py-0.5 bg-cyan-950 border border-cyan-500 text-cyan-300">
                RECOMENDADO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-retro mt-1 pl-5">
              Conserva la lista de comidas o tickets, pero <strong className="text-white">libera todos los ítems</strong> y borra tu recuerdo de participante local para que cualquiera pueda volver a escanear y sacar comida desde cero.
            </p>
          </button>

          {/* Option 2: Restore Demo */}
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => handleAction('demo', onRestoreDemo)}
            className="w-full text-left p-3 bg-[#1a1829] hover:bg-[#25203d] border-2 border-purple-500/60 shadow-[3px_3px_0px_#000] transition group disabled:opacity-50"
          >
            <div className="flex items-center gap-2 font-pixel text-xs text-purple-300 group-hover:text-purple-200">
              <Sparkles className={`w-3.5 h-3.5 ${loadingAction === 'demo' ? 'animate-spin' : ''}`} />
              <span>2. RESTAURAR DATOS DEMO ORIGINALES</span>
            </div>
            <p className="text-[11px] text-slate-400 font-retro mt-1 pl-5">
              Restaura los 12 alimentos equilibrados del desayuno de oficina y la rifa del monitor gamer en Firestore, limpiando los tokens de participantes.
            </p>
          </button>

          {/* Option 3: Wipe to Empty for Production */}
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => handleAction('empty', onResetEmpty)}
            className="w-full text-left p-3 bg-[#26131b] hover:bg-[#381a27] border-2 border-rose-500/60 shadow-[3px_3px_0px_#000] transition group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-pixel text-xs text-rose-300 group-hover:text-rose-200">
                <Trash2 className={`w-3.5 h-3.5 ${loadingAction === 'empty' ? 'animate-spin' : ''}`} />
                <span>3. VACIAR TODO A MODO PRODUCCIÓN (EN BLANCO)</span>
              </div>
              <span className="text-[9px] font-pixel px-1.5 py-0.5 bg-rose-950 border border-rose-500 text-rose-300">
                NUEVO EVENTO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-retro mt-1 pl-5">
              Limpia el <strong className="text-white">título, la descripción, todos los ítems/tickets</strong> y elimina todos los jugadores de prueba simulados. Deja el evento 100% en blanco para crear tu dinámica real desde cero en producción.
            </p>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-retro flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Sincronizado en tiempo real con Firestore
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(loadingAction)}
            className="px-3 py-1.5 bg-black border border-slate-700 text-slate-400 hover:text-white font-pixel text-[10px]"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
};
