import React, { useState } from 'react';
import { Lock, ShieldAlert, X, Check, KeyRound, RefreshCw } from 'lucide-react';
import { setDeviceAdminAuthenticated } from '../utils/deviceIdentifier';
import { verifyAdminPin } from '../services/adminAuthService';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('Por favor ingresa tu PIN.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const result = await verifyAdminPin(pinInput);
      if (result.success) {
        setDeviceAdminAuthenticated(true);
        setErrorMsg(null);
        setPinInput('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg(result.error || '⛔ PIN incorrecto. Acceso exclusivo para el organizador.');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de conexión al verificar el PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyClick = (digit: string) => {
    if (pinInput.length < 8 && !isVerifying) {
      setPinInput((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    if (!isVerifying) {
      setPinInput((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-sm bg-[#0a0d16] border-4 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)] p-5 text-slate-100 font-retro crt-scanlines">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-amber-500/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#451a03]">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="admin-pin-title" className="font-pixel text-xs text-amber-300 tracking-wider">
                CONTROL DE ORGANIZADOR
              </h2>
              <p className="text-[11px] text-slate-400 font-retro">
                Validado en base de datos Firestore en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="p-1 text-slate-400 hover:text-white border border-slate-700 bg-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 font-retro mb-3 leading-relaxed">
          Los participantes que escanean el QR solo pueden participar. Para entrar a la consola de administración ingresa el PIN de organizador:
        </p>

        {/* PIN display */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center justify-center tracking-[0.5em] text-2xl font-arcade bg-black/80 border-2 border-amber-500/70 px-4 py-2 w-full text-amber-300 shadow-[inset_0_0_10px_rgba(245,158,11,0.2)]">
            {isVerifying ? (
              <span className="text-cyan-300 text-xs tracking-normal font-pixel flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                VERIFICANDO...
              </span>
            ) : pinInput ? (
              '•'.repeat(pinInput.length)
            ) : (
              <span className="text-slate-600 text-sm tracking-normal font-pixel">INGRESA PIN</span>
            )}
          </div>
          {errorMsg && (
            <p className="text-[11px] font-pixel text-rose-400 mt-2 animate-in fade-in">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Retro Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeyClick(d)}
              className="py-2.5 bg-[#151928] hover:bg-[#1e253d] active:bg-amber-500 active:text-black border-2 border-slate-700 text-sm font-arcade text-white shadow-[2px_2px_0px_#000] transition active:translate-y-0.5 disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleBackspace}
            className="py-2.5 bg-[#1a1216] hover:bg-[#2b1820] border-2 border-rose-900/60 text-xs font-pixel text-rose-300 shadow-[2px_2px_0px_#000] disabled:opacity-50"
          >
            BORRAR
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeyClick('0')}
            className="py-2.5 bg-[#151928] hover:bg-[#1e253d] active:bg-amber-500 active:text-black border-2 border-slate-700 text-sm font-arcade text-white shadow-[2px_2px_0px_#000] disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleVerify()}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 border-2 border-emerald-400 text-slate-950 font-pixel text-xs font-bold shadow-[2px_2px_0px_#022c22] flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                ENTRAR
              </>
            )}
          </button>
        </div>

        {/* Footer Hint */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-retro">
          <span className="flex items-center gap-1 text-amber-400">
            <KeyRound className="w-3.5 h-3.5" />
            PIN por defecto: <strong>1234</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
