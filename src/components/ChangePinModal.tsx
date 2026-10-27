import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { updateAdminPinInFirestore } from '../services/adminAuthService';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotification?: (msg: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  onSuccessNotification,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPin.trim()) {
      setErrorMessage('Ingresa el PIN actual.');
      return;
    }

    if (newPin.trim().length < 4 || newPin.trim().length > 8) {
      setErrorMessage('El nuevo PIN debe tener entre 4 y 8 dígitos.');
      return;
    }

    if (!/^\d+$/.test(newPin.trim())) {
      setErrorMessage('El PIN debe contener únicamente números.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('Los nuevos PINs no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateAdminPinInFirestore(currentPin, newPin);
      if (res.success) {
        setSuccessMessage('¡PIN ACTUALIZADO CON ÉXITO EN FIRESTORE!');
        if (onSuccessNotification) {
          onSuccessNotification('¡PIN de organizador actualizado en la base de datos!');
        }
        setTimeout(() => {
          handleReset();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Error al actualizar el PIN.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión con Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pin-modal-title"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-[#0a0d16] border-4 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.35)] p-5 text-slate-100 font-retro crt-scanlines">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-amber-500/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#451a03]">
              <KeyRound className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="change-pin-modal-title" className="font-pixel text-xs text-amber-300 tracking-wider">
                SEGURIDAD: CAMBIAR PIN
              </h2>
              <p className="text-[11px] text-slate-400 font-retro">
                Guardado en la nube (Firestore) en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white border border-slate-700 bg-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloud Persistence Notice */}
        <div className="mb-4 p-3 bg-black/60 border border-amber-500/30 text-xs text-slate-300 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-amber-300 font-pixel text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SIN NECESIDAD DE RECONSTRUIR EN VERCEL</span>
          </div>
          <p className="text-[11px]">
            Al cambiar el PIN aquí, se almacena encriptado (SHA-256) directamente en tu base de datos de <strong>Firestore</strong>. No requieres volver a compilar (<code className="text-cyan-300">npm run build</code>) ni re-desplegar la aplicación.
          </p>
        </div>

        {successMessage ? (
          <div className="my-6 p-4 bg-emerald-950/90 border-2 border-emerald-400 text-center space-y-2 animate-in zoom-in-95">
            <div className="w-10 h-10 mx-auto bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="font-pixel text-xs text-emerald-300">{successMessage}</p>
            <p className="text-[11px] text-slate-300">
              Todos los organizadores deben usar ahora esta nueva clave.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMessage && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500 text-rose-300 text-xs font-pixel flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-pixel text-slate-300 mb-1">
                PIN ACTUAL (POR DEFECTO: 1234)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#121626] border-2 border-slate-700 focus:border-amber-400 px-3 py-2 text-white font-arcade tracking-[0.3em] text-center text-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-pixel text-amber-300 mb-1">
                NUEVO PIN (4 A 8 NÚMEROS)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#121626] border-2 border-amber-500/60 focus:border-amber-400 px-3 py-2 text-white font-arcade tracking-[0.3em] text-center text-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-pixel text-slate-300 mb-1">
                CONFIRMAR NUEVO PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#121626] border-2 border-slate-700 focus:border-amber-400 px-3 py-2 text-white font-arcade tracking-[0.3em] text-center text-lg outline-none"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                disabled={isSubmitting}
                className="px-3 py-2 bg-black border border-slate-700 text-slate-400 hover:text-white text-xs font-pixel"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="pixel-btn-amber px-4 py-2 text-xs font-pixel font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>GUARDANDO EN FIRESTORE...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>GUARDAR PIN EN BD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
