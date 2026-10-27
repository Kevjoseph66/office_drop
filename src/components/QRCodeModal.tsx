import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, Download, ExternalLink, QrCode, ShieldCheck } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventType: 'potluck' | 'raffle';
  eventId: string;
  onSwitchToParticipant: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  eventType,
  eventId,
  onSwitchToParticipant,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Requirement: QR URL includes eventId and locks role to participant
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?eventId=${eventId}&role=participant`
      : `https://officedrop.app?eventId=${eventId}&role=participant`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0a0d16',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `OfficeDrop-${eventType}-QR.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-[#0a0d16] border-4 border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.35)] p-5 sm:p-6 text-center text-slate-100 font-retro crt-scanlines">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-cyan-500/40 pb-3 mb-4">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-[2px_2px_0px_#083344]">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 id="qr-modal-title" className="font-pixel text-xs text-cyan-300 tracking-wider">
                ESCANEAR PARA PARTICIPAR
              </h2>
              <p className="text-[11px] text-slate-400 font-retro">
                Acceso móvil seguro para compañeros de oficina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white border border-slate-700 bg-black"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-300 text-[10px] font-pixel">
            {eventType === 'potluck' ? '★ COMIDA COMPARTIDA ★' : '★ RIFA DIGITAL ★'}
          </span>
          <h3 className="text-sm sm:text-base font-arcade text-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {eventTitle || 'Evento Activo'}
          </h3>
          <p className="text-xs text-slate-300 font-retro mt-1">
            Los participantes solo pueden registrar su turno y comida. El acceso de organizador está protegido.
          </p>
        </div>

        {/* Pixel Framed QR Container */}
        <div className="relative mx-auto my-4 w-60 h-60 bg-white p-3 border-4 border-cyan-400 shadow-[4px_4px_0px_#000] flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR del Evento"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-xs text-slate-900 font-pixel animate-pulse">GENERANDO QR...</div>
          )}
        </div>

        {/* Share Link Preview */}
        <div className="p-2 bg-black border-2 border-slate-700 flex items-center justify-between gap-2 text-xs mb-4 shadow-[2px_2px_0px_#000]">
          <span className="font-mono text-cyan-300 truncate text-[11px] text-left">
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-[#151928] hover:bg-[#1f263d] border border-cyan-500 text-cyan-300 shrink-0 flex items-center gap-1 text-[11px] font-pixel transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'COPIADO' : 'COPIAR'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="py-2.5 px-3 bg-[#151928] hover:bg-[#1e253d] text-slate-200 text-xs font-pixel border-2 border-slate-600 transition flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DESCARGAR PNG</span>
          </button>

          <button
            onClick={onSwitchToParticipant}
            className="pixel-btn-green py-2.5 px-3 text-xs font-pixel font-bold flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>PROBAR MÓVIL</span>
          </button>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-retro flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protegido con Anti-Trampas por ID de Teléfono</span>
        </div>
      </div>
    </div>
  );
};
