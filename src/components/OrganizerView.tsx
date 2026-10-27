import React, { useState } from 'react';
import { OfficeEvent, PotluckItem } from '../types';
import { calculatePotluckStats, unassignPotluckItem } from '../utils/officeDropLogic';
import {
  Sparkles,
  QrCode,
  Utensils,
  Ticket,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Trophy,
  Users,
  Search,
  CheckCircle2,
  Clock,
  RotateCw,
  ShoppingBag,
  Smartphone,
  AlertCircle,
  Lightbulb,
  Gamepad2,
  Sword,
  Shield,
  Zap,
  Layers,
  KeyRound,
} from 'lucide-react';
import { ChangePinModal } from './ChangePinModal';

interface OrganizerViewProps {
  event: OfficeEvent;
  onUpdateEvent: (updated: OfficeEvent) => void;
  onOpenQR: () => void;
  onOpenRoulette: () => void;
  onSwitchToParticipant: () => void;
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  event,
  onUpdateEvent,
  onOpenQR,
  onOpenRoulette,
  onSwitchToParticipant,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newType, setNewType] = useState<'potluck' | 'raffle'>(event.type);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [participantsCount, setParticipantsCount] = useState<number>(event.targetParticipants || 10);
  const [customBudget, setCustomBudget] = useState('Gasto similar (~$5 a $8 por persona)');
  const [prizeTitle, setPrizeTitle] = useState(event.prizeTitle || '');
  const [prizeDescription, setPrizeDescription] = useState(event.prizeDescription || '');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<Partial<PotluckItem>>({});

  const [isAddingSingleItem, setIsAddingSingleItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCat, setNewItemCat] = useState('Salado');
  const [newItemCost, setNewItemCost] = useState('$5 - $8');

  // Bulk import state (Paste text list)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Manual assignment state on rows
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [manualAssigneeName, setManualAssigneeName] = useState('');

  // Guide accordion toggle
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Admin PIN management modal in Firestore
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [pinToast, setPinToast] = useState<string | null>(null);

  const potluckStats = calculatePotluckStats(event.items);

  // Bulk paste importer
  const handleProcessBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const imported: PotluckItem[] = lines.map((line, idx) => {
      // Basic smart detection of category
      const lower = line.toLowerCase();
      let cat = 'Salado';
      if (lower.includes('jugo') || lower.includes('refresco') || lower.includes('bebida') || lower.includes('agua') || lower.includes('café') || lower.includes('leche')) {
        cat = 'Bebidas';
      } else if (lower.includes('postre') || lower.includes('tarta') || lower.includes('dulce') || lower.includes('galleta') || lower.includes('chocolate') || lower.includes('muffin')) {
        cat = 'Dulce';
      } else if (lower.includes('vaso') || lower.includes('plato') || lower.includes('servilleta') || lower.includes('cubierto')) {
        cat = 'Desechables';
      } else if (lower.includes('fruta') || lower.includes('ensalada') || lower.includes('yogurt')) {
        cat = 'Saludable';
      } else if (lower.includes('pan') || lower.includes('croissant') || lower.includes('medialuna') || lower.includes('bagel')) {
        cat = 'Panadería';
      }

      return {
        id: `bulk-${Date.now().toString(36)}-${idx}`,
        nombre: line,
        cantidadEspecifica: '1 porción para compartir',
        categoria: cat,
        costoEstimado: '$5 - $8',
        assignedTo: null,
        assignedAt: null,
      };
    });

    onUpdateEvent({
      ...event,
      items: [...event.items, ...imported],
    });

    setBulkText('');
    setIsBulkImportOpen(false);
  };

  // Quick manual assign directly on row
  const handleQuickAssign = (itemId: string) => {
    if (!manualAssigneeName.trim()) return;
    const now = new Date().toISOString();
    const updated = event.items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          assignedTo: manualAssigneeName.trim(),
          assignedAt: now,
        };
      }
      return it;
    });
    onUpdateEvent({ ...event, items: updated });
    setAssigningItemId(null);
    setManualAssigneeName('');
  };

  // Handle Gemini AI generation
  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const response = await fetch('/api/generate-potluck-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          participantsCount,
          themeDescription: description,
          customBudget,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con el servicio de IA');
      }

      const generatedItems: PotluckItem[] = data.items.map((it: any) => ({
        id: it.id || `item-${Math.random().toString(36).slice(2, 9)}`,
        nombre: it.nombre,
        cantidadEspecifica: it.cantidadEspecifica,
        categoria: it.categoria,
        costoEstimado: it.costoEstimado,
        assignedTo: null,
        assignedAt: null,
      }));

      onUpdateEvent({
        ...event,
        title,
        description,
        targetParticipants: participantsCount,
        type: 'potluck',
        items: generatedItems,
      });

      setAiSuccessMsg(
        `★ INVENTARIO GENERADO (${generatedItems.length} ÍTEMS CON IA) ★`
      );
      setTimeout(() => setAiSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'No se pudo generar la lista con IA.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyPresetTemplate = (type: 'desayuno' | 'tacos' | 'merienda' | 'monitor' | 'auriculares') => {
    if (type === 'desayuno') {
      setNewType('potluck');
      setTitle('Desayuno de Viernes del Equipo');
      setDescription('Desayuno variado y energizante para cerrar la semana laboral.');
      setParticipantsCount(12);
      setCustomBudget('Gasto moderado (~$5 a $8 por persona)');
    } else if (type === 'tacos') {
      setNewType('potluck');
      setTitle('Tacos & Nachos Party en la Oficina');
      setDescription('Almuerzo estilo taquiza mexicana, totopos, salsas y guacamole.');
      setParticipantsCount(15);
      setCustomBudget('Gasto equilibrado (~$7 a $10 por persona)');
    } else if (type === 'merienda') {
      setNewType('potluck');
      setTitle('Coffee Break y Merienda Dulce');
      setDescription('Café, tés especiales, pasteles caseros y snacks.');
      setParticipantsCount(10);
      setCustomBudget('Económico (~$4 a $6 por persona)');
    } else if (type === 'monitor') {
      setNewType('raffle');
      setTitle('Rifa Fin de Mes: Monitor Gamer 27" 144Hz');
      setDescription('¡Gánate un monitor extra para tu setup de trabajo y gaming!');
      setPrizeTitle('Monitor IPS 27" Full HD 144Hz FreeSync');
      setPrizeDescription('Ideal para programación, diseño y gaming con puertos DisplayPort y HDMI.');
    } else if (type === 'auriculares') {
      setNewType('raffle');
      setTitle('Rifa Tecnológica: Auriculares Noise-Cancelling');
      setDescription('Sorteo entre todos los miembros activos del equipo.');
      setPrizeTitle('Auriculares Bluetooth con Cancelación de Ruido Activa');
      setPrizeDescription('Batería de 40 horas, sonido espacial y micrófono de alta fidelidad.');
    }
  };

  const handlePublishEvent = () => {
    onUpdateEvent({
      ...event,
      type: newType,
      title: title.trim() || (newType === 'potluck' ? 'Compartir de Oficina' : 'Rifa de Oficina'),
      description: description.trim(),
      targetParticipants: participantsCount,
      status: 'published',
      prizeTitle: newType === 'raffle' ? prizeTitle.trim() : undefined,
      prizeDescription: newType === 'raffle' ? prizeDescription.trim() : undefined,
    });
    setIsCreatingNew(false);
    onOpenQR();
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = event.items.filter((i) => i.id !== itemId);
    onUpdateEvent({ ...event, items: updated });
  };

  const handleUnassignItem = (itemId: string) => {
    const updated = unassignPotluckItem(event.items, itemId);
    onUpdateEvent({ ...event, items: updated });
  };

  const handleSaveItemEdit = (itemId: string) => {
    const updated = event.items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          nombre: editItemForm.nombre || it.nombre,
          cantidadEspecifica: editItemForm.cantidadEspecifica || it.cantidadEspecifica,
          categoria: editItemForm.categoria || it.categoria,
          costoEstimado: editItemForm.costoEstimado || it.costoEstimado,
        };
      }
      return it;
    });
    onUpdateEvent({ ...event, items: updated });
    setEditingItemId(null);
    setEditItemForm({});
  };

  const handleAddSingleItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: PotluckItem = {
      id: `item-manual-${Date.now().toString(36)}`,
      nombre: newItemName.trim(),
      cantidadEspecifica: newItemQty.trim() || '1 porción para compartir',
      categoria: newItemCat.trim() || 'Varios',
      costoEstimado: newItemCost.trim() || '$5 - $8',
      assignedTo: null,
      assignedAt: null,
    };

    onUpdateEvent({
      ...event,
      items: [...event.items, newItem],
    });

    setNewItemName('');
    setNewItemQty('');
    setIsAddingSingleItem(false);
  };

  const filteredItems = event.items.filter((it) => {
    const matchesQuery =
      it.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.assignedTo && it.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;
    if (filterMode === 'assigned') return Boolean(it.assignedTo);
    if (filterMode === 'available') return !it.assignedTo;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
      {pinToast && (
        <div className="p-3 bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-pixel text-xs flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{pinToast}</span>
          </div>
          <button onClick={() => setPinToast(null)} className="text-slate-400 hover:text-white font-mono">
            [X]
          </button>
        </div>
      )}

      {/* Top Header Card - Arcade Console Banner */}
      <div className="pixel-box-cyan p-5 sm:p-7 relative overflow-hidden text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-pixel border ${
                  event.type === 'potluck'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 shadow-[2px_2px_0px_#042f2e]'
                    : 'bg-amber-950/80 text-amber-300 border-amber-400 shadow-[2px_2px_0px_#451a03]'
                }`}
              >
                {event.type === 'potluck' ? <Utensils className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
                {event.type === 'potluck' ? 'STAGE 1: COMPARTIR' : 'STAGE 2: RIFA'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-pixel bg-emerald-950/90 text-emerald-400 border border-emerald-500 shadow-[2px_2px_0px_#022c22]">
                <span className="w-2 h-2 bg-emerald-400 animate-arcade-blink" />
                ONLINE / EN VIVO
              </span>
            </div>

            {event.title.trim() ? (
              <>
                <h1 className="text-xl sm:text-2xl font-arcade text-white tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {event.title}
                </h1>
                <p className="text-xs text-slate-300 font-retro mt-2 max-w-2xl leading-relaxed">
                  {event.description || 'Sin descripción. Configura los detalles de tu evento.'}
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="inline-block px-2 py-0.5 bg-cyan-950 border border-cyan-400 font-pixel text-[10px] text-cyan-300 mb-1">
                  PRODUCCIÓN LIMPIA
                </div>
                <h1 className="text-xl sm:text-2xl font-arcade text-cyan-300 tracking-wide leading-relaxed drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                  ★ EVENTO EN BLANCO (LISTO PARA CONFIGURAR) ★
                </h1>
                <p className="text-xs text-slate-300 font-retro leading-relaxed max-w-2xl">
                  El evento no tiene título ni comidas de muestra. Haz clic en <strong className="text-cyan-300 underline cursor-pointer" onClick={() => setIsCreatingNew(true)}>CONFIG / NUEVO</strong> para asignarle el nombre a tu comida o rifa real.
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="px-3 py-2.5 bg-[#1b2238] hover:bg-[#252f4d] text-amber-300 text-xs font-pixel border-2 border-amber-500/50 shadow-[3px_3px_0px_#000] transition flex items-center gap-1.5"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>{showHowItWorks ? 'CERRAR GUÍA' : '¿CÓMO FUNCIONA?'}</span>
            </button>

            <button
              onClick={onOpenQR}
              className="pixel-btn-cyan px-4 py-2.5 text-xs font-pixel flex items-center gap-2 font-bold"
            >
              <QrCode className="w-4 h-4" />
              <span>QR CODE</span>
            </button>

            <button
              onClick={onSwitchToParticipant}
              className="pixel-btn-green px-4 py-2.5 text-xs font-pixel flex items-center gap-2 font-bold"
            >
              <Smartphone className="w-4 h-4" />
              <span>TEST MÓVIL</span>
            </button>

            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="px-3 py-2.5 bg-[#181d2e] hover:bg-[#20273d] text-cyan-300 text-xs font-pixel border-2 border-slate-600 shadow-[3px_3px_0px_#000] transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreatingNew ? 'CERRAR' : 'CONFIG'}</span>
            </button>

            <button
              onClick={() => setIsChangePinModalOpen(true)}
              className="px-3 py-2.5 bg-[#251809] hover:bg-[#3d260c] text-amber-300 text-xs font-pixel border-2 border-amber-500/70 shadow-[3px_3px_0px_#000] transition flex items-center gap-1.5"
              title="Cambiar PIN de Organizador almacenado en Firestore (BD)"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>PIN BD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide Banner: How to add food items and users */}
      {showHowItWorks && (
        <div className="pixel-box-amber p-5 sm:p-6 text-slate-100 space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2 text-amber-300 font-arcade text-xs">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>GUÍA: ¿CÓMO AGREGAR COMIDAS Y PARTICIPANTES?</span>
            </div>
            <button
              onClick={() => setShowHowItWorks(false)}
              className="text-xs font-pixel text-slate-400 hover:text-white"
            >
              [X]
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-retro">
            {/* Column 1: Adding Food Items */}
            <div className="p-3.5 bg-black/60 border border-slate-700 space-y-2">
              <div className="font-arcade text-[10px] text-cyan-300 uppercase">
                1. ¿CÓMO AGREGAR LAS COMIDAS?
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-white font-pixel">A) Con la IA (Gemini):</strong> Abre <span className="text-cyan-300 font-pixel">[CONFIG]</span>, pon el tema (ej. <em>"Desayuno variado con café"</em>) y dale a <span className="text-cyan-300 font-pixel">[GENERAR CON IA]</span>. La IA creará una lista equilibrada en costos para todos.
                </li>
                <li>
                  <strong className="text-white font-pixel">B) Pegar lista masiva:</strong> En la sección del inventario abajo, usa <span className="text-pink-300 font-pixel">[📋 PEGAR LISTA]</span> para copiar y pegar tu lista de supermercado o WhatsApp de una sola vez.
                </li>
                <li>
                  <strong className="text-white font-pixel">C) Manual 1 a 1:</strong> Haz clic en <span className="text-cyan-300 font-pixel">[+ ITEM MANUAL]</span> para escribir el nombre, cantidad (ej. <em>2L Jugo</em>) y costo.
                </li>
              </ul>
            </div>

            {/* Column 2: Adding Users / Assigning */}
            <div className="p-3.5 bg-black/60 border border-slate-700 space-y-2">
              <div className="font-arcade text-[10px] text-emerald-300 uppercase">
                2. ¿CÓMO SE ASIGNAN LOS USUARIOS?
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-white font-pixel">A) Con el Código QR (Recomendado):</strong> Muestras el QR en la pantalla de la oficina o lo envías por chat. Cada compañero escanea con su teléfono, escribe su nombre y toca el <span className="text-amber-300 font-pixel">[COFRE SECRETO]</span> para recibir su ítem al azar sin repetidos.
                </li>
                <li>
                  <strong className="text-white font-pixel">B) Asignación Manual Directa:</strong> Si ya sabes quién llevará qué, en la lista de abajo cada ítem libre tiene un botón <span className="text-emerald-300 font-pixel">[+ ASIGNAR]</span> para escribir el nombre del compañero directamente.
                </li>
                <li>
                  <strong className="text-white font-pixel">C) Simulador en vivo:</strong> En la barra superior puedes cambiar entre perfiles de prueba para ver en tiempo real cómo se van tachando los ítems.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Retro AI Event Creator Accordion */}
      {isCreatingNew && (
        <div className="pixel-box-purple p-6 sm:p-8 space-y-6 text-slate-100 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b-2 border-purple-500/40 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-arcade text-pink-400 uppercase tracking-wider mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                AI QUEST & LOOT GENERATOR
              </div>
              <h2 className="text-sm sm:text-base font-arcade text-purple-200">
                CREADOR DE DINÁMICA CON GEMINI 3.8
              </h2>
            </div>
            <button
              onClick={() => setIsCreatingNew(false)}
              className="text-xs font-pixel text-slate-400 hover:text-white"
            >
              [ESC] CERRAR
            </button>
          </div>

          {/* Preset Arcade Templates */}
          <div>
            <div className="text-xs font-pixel text-purple-300 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>QUICK TEMPLATES (1-CLICK LOAD):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPresetTemplate('desayuno')}
                className="px-2.5 py-1.5 bg-[#21163b] hover:bg-[#2d1e4e] text-xs font-pixel text-purple-200 border border-purple-500/50 shadow-[2px_2px_0px_#000]"
              >
                🍳 DESAYUNO (12P)
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('tacos')}
                className="px-2.5 py-1.5 bg-[#21163b] hover:bg-[#2d1e4e] text-xs font-pixel text-purple-200 border border-purple-500/50 shadow-[2px_2px_0px_#000]"
              >
                🌮 TACOS PARTY (15P)
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('merienda')}
                className="px-2.5 py-1.5 bg-[#21163b] hover:bg-[#2d1e4e] text-xs font-pixel text-purple-200 border border-purple-500/50 shadow-[2px_2px_0px_#000]"
              >
                ☕ COFFEE BREAK (10P)
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('monitor')}
                className="px-2.5 py-1.5 bg-[#3b2713] hover:bg-[#4d3319] text-xs font-pixel text-amber-300 border border-amber-500/50 shadow-[2px_2px_0px_#000]"
              >
                🖥️ RIFA MONITOR 27"
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('auriculares')}
                className="px-2.5 py-1.5 bg-[#3b2713] hover:bg-[#4d3319] text-xs font-pixel text-amber-300 border border-amber-500/50 shadow-[2px_2px_0px_#000]"
              >
                🎧 RIFA AURICULARES
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Type Selector */}
            <div className="col-span-1 md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNewType('potluck')}
                className={`flex-1 p-3 text-xs font-pixel border-2 transition flex items-center justify-center gap-2 ${
                  newType === 'potluck'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-[4px_4px_0px_#042f2e]'
                    : 'bg-[#181d2e] text-slate-400 border-slate-700 hover:text-cyan-300'
                }`}
              >
                <Utensils className="w-4 h-4" />
                MODO 1: COMPARTIR COMIDA (IA)
              </button>
              <button
                type="button"
                onClick={() => setNewType('raffle')}
                className={`flex-1 p-3 text-xs font-pixel border-2 transition flex items-center justify-center gap-2 ${
                  newType === 'raffle'
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-[4px_4px_0px_#451a03]'
                    : 'bg-[#181d2e] text-slate-400 border-slate-700 hover:text-amber-300'
                }`}
              >
                <Ticket className="w-4 h-4" />
                MODO 2: RIFA / SORTEO ARCADE
              </button>
            </div>

            {/* Event Title */}
            <div>
              <label className="block text-xs font-pixel text-purple-300 mb-1.5">
                TÍTULO DEL EVENTO
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej: Desayuno de Viernes del Equipo"
                className="w-full px-3 py-2 bg-black border-2 border-purple-500/60 text-purple-200 text-xs font-retro focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Target Participants */}
            <div>
              <label className="block text-xs font-pixel text-purple-300 mb-1.5">
                N° PARTICIPANTES ({newType === 'potluck' ? 'Genera exactamente N ítems' : 'Cupo estimado'})
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={participantsCount}
                onChange={(e) => setParticipantsCount(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 bg-black border-2 border-purple-500/60 text-purple-200 text-xs font-retro focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Description */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-pixel text-purple-300 mb-1.5">
                DESCRIPCIÓN / TEMÁTICA
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ej: Comida variada, que todos gasten parecido, equilibrado entre dulce y salado."
                className="w-full px-3 py-2 bg-black border-2 border-purple-500/60 text-purple-200 text-xs font-retro focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Potluck Budget */}
            {newType === 'potluck' && (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-pixel text-purple-300 mb-1.5">
                  DIRECTRIZ DE EQUIDAD PARA LA IA
                </label>
                <input
                  type="text"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value)}
                  placeholder="ej: Gasto parejo de ~$6 a $9 dólares por cada participante"
                  className="w-full px-3 py-2 bg-black border-2 border-purple-500/60 text-purple-200 text-xs font-retro focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* Raffle Prize */}
            {newType === 'raffle' && (
              <>
                <div>
                  <label className="block text-xs font-pixel text-amber-300 mb-1.5">
                    PREMIO DE LA RIFA
                  </label>
                  <input
                    type="text"
                    value={prizeTitle}
                    onChange={(e) => setPrizeTitle(e.target.value)}
                    placeholder="ej: Monitor Gamer 27 pulgadas"
                    className="w-full px-3 py-2 bg-black border-2 border-amber-500/60 text-amber-200 text-xs font-retro focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-pixel text-amber-300 mb-1.5">
                    DETALLES DEL PREMIO
                  </label>
                  <input
                    type="text"
                    value={prizeDescription}
                    onChange={(e) => setPrizeDescription(e.target.value)}
                    placeholder="ej: Nuevo en caja con garantía."
                    className="w-full px-3 py-2 bg-black border-2 border-amber-500/60 text-amber-200 text-xs font-retro focus:outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}
          </div>

          {/* Feedback */}
          {aiError && (
            <div className="p-3 bg-rose-950/80 border-2 border-rose-500 text-xs font-retro text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 text-xs font-pixel text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{aiSuccessMsg}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 flex-wrap pt-2">
            {newType === 'potluck' && (
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
                className="pixel-btn-cyan px-5 py-3 text-xs font-pixel flex items-center gap-2 font-bold disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                {isGeneratingAI ? 'GENERANDO CON GEMINI...' : `GENERAR ${participantsCount} ITEMS CON IA`}
              </button>
            )}

            <button
              type="button"
              onClick={handlePublishEvent}
              className="pixel-btn-amber px-6 py-3 text-xs font-pixel flex items-center gap-2 font-black"
            >
              <QrCode className="w-4 h-4" />
              <span>PUBLICAR EVENTO Y QR</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STAGE 1: POTLUCK DASHBOARD ================= */}
      {event.type === 'potluck' ? (
        <div className="space-y-6">
          {/* Progress / EXP Bar */}
          <div className="pixel-box p-5 sm:p-6 text-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] font-arcade text-cyan-400 uppercase tracking-widest">
                  PARTY PROGRESS: {potluckStats.percent}%
                </div>
                <div className="text-base sm:text-lg font-pixel text-white mt-1">
                  {potluckStats.assigned} / {potluckStats.total} ITEMS ASIGNADOS
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-pixel px-2.5 py-1 bg-[#1a1f30] text-amber-300 border border-amber-500/40">
                  {potluckStats.remaining} RESTANTES
                </span>
                <button
                  onClick={onOpenQR}
                  className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-pixel text-xs border border-cyan-400 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR</span>
                </button>
              </div>
            </div>

            {/* Segmented 8-Bit Retro HP Bar */}
            <div className="w-full h-4 bg-black border-2 border-slate-700 p-0.5 relative overflow-hidden">
              <div
                style={{ width: `${potluckStats.percent}%` }}
                className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-emerald-400 transition-all duration-300"
              />
            </div>

            {/* Categories Chips */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-pixel text-[11px]">LOOT TYPES:</span>
              {Object.entries(potluckStats.categories).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-[#161a29] border border-slate-700 text-slate-300 font-pixel text-[10px] flex items-center gap-1.5"
                >
                  <span>{cat}</span>
                  <span className="px-1 bg-black text-cyan-300 font-mono font-bold">
                    {count.assigned}/{count.total}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Items Management List */}
          <div className="pixel-box p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-arcade text-white tracking-wide">
                  INVENTARIO DE COMIDA ({event.items.length} ITEMS)
                </h3>
                <p className="text-xs text-slate-400 font-retro mt-1">
                  Cada compañero escanea el QR y obtiene un aporte secreto balanceado.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setIsBulkImportOpen(!isBulkImportOpen);
                    setIsAddingSingleItem(false);
                  }}
                  className="pixel-btn-pink px-3 py-1.5 text-xs font-pixel flex items-center gap-1.5 font-bold"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>📋 PEGAR LISTA</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddingSingleItem(!isAddingSingleItem);
                    setIsBulkImportOpen(false);
                  }}
                  className="pixel-btn-cyan px-3 py-1.5 text-xs font-pixel flex items-center gap-1.5 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ITEM MANUAL</span>
                </button>
              </div>
            </div>

            {/* Bulk Paste Importer Form */}
            {isBulkImportOpen && (
              <form
                onSubmit={handleProcessBulkImport}
                className="p-4 bg-[#141824] border-2 border-pink-500/60 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-pixel text-pink-300">
                    PEGAR LISTA DE SUPERMERCADO O WHATSAPP (1 ÍTEM POR LÍNEA)
                  </label>
                  <span className="text-[10px] text-slate-400 font-retro">
                    Ej: 2 botellas de jugo, 1 docena de empanadas, etc.
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`2 Botellas de Refresco 2L\nBandeja de 12 Empanadas\n1 Tarta de Frutillas o Manzana\nVasos y servilletas desechables\nBolsa de Totopos y Guacamole`}
                  className="w-full p-2.5 bg-black border border-slate-700 text-pink-200 text-xs font-retro focus:outline-none focus:border-pink-400"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkImportOpen(false)}
                    className="px-3 py-1.5 text-xs font-pixel text-slate-400 hover:text-white"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="pixel-btn-pink px-4 py-1.5 text-xs font-pixel font-bold"
                  >
                    CARGAR ÍTEMS A LA LISTA
                  </button>
                </div>
              </form>
            )}

            {/* Add Manual Item Form */}
            {isAddingSingleItem && (
              <form
                onSubmit={handleAddSingleItem}
                className="p-4 bg-[#141824] border-2 border-cyan-500/60 grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in"
              >
                <div>
                  <label className="block text-[10px] font-pixel text-cyan-300 mb-1">NOMBRE</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="ej: Jugo de Manzana"
                    required
                    className="w-full px-2 py-1 text-xs bg-black border border-slate-700 text-white font-retro"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-pixel text-cyan-300 mb-1">CANTIDAD</label>
                  <input
                    type="text"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder="ej: 2 Botellas 1.5L"
                    className="w-full px-2 py-1 text-xs bg-black border border-slate-700 text-white font-retro"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-pixel text-cyan-300 mb-1">CATEGORÍA</label>
                  <input
                    type="text"
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    placeholder="ej: Bebidas"
                    className="w-full px-2 py-1 text-xs bg-black border border-slate-700 text-white font-retro"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-pixel text-cyan-300 mb-1">COSTO EST.</label>
                    <input
                      type="text"
                      value={newItemCost}
                      onChange={(e) => setNewItemCost(e.target.value)}
                      placeholder="ej: $5 - $7"
                      className="w-full px-2 py-1 text-xs bg-black border border-slate-700 text-white font-retro"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-pixel text-xs font-bold"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSingleItem(false)}
                    className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              </form>
            )}

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 bg-black p-1 border border-slate-800">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-xs font-pixel transition ${
                    filterMode === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ALL ({event.items.length})
                </button>
                <button
                  onClick={() => setFilterMode('assigned')}
                  className={`px-2.5 py-1 text-xs font-pixel transition ${
                    filterMode === 'assigned'
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  TOMADOS ({potluckStats.assigned})
                </button>
                <button
                  onClick={() => setFilterMode('available')}
                  className={`px-2.5 py-1 text-xs font-pixel transition ${
                    filterMode === 'available'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  LIBRES ({potluckStats.remaining})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="BUSCAR LOOT O JUGADOR..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-black border border-slate-700 text-cyan-200 font-pixel focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-slate-800 border-2 border-slate-800 bg-[#0d0f17]">
              {event.items.length === 0 ? (
                <div className="p-8 text-center bg-[#090b12] space-y-4">
                  <div className="w-14 h-14 mx-auto bg-[#131622] border-2 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center text-3xl font-arcade">
                    📦
                  </div>
                  <div>
                    <h3 className="font-pixel text-xs text-cyan-300 tracking-wider">
                      ¡INVENTARIO VACÍO: 0 ÍTEMS EN ESTE EVENTO!
                    </h3>
                    <p className="text-xs text-slate-400 font-retro max-w-md mx-auto mt-1.5 leading-relaxed">
                      Aún no hay comidas ni bebidas registradas para que tus compañeros elijan. Puedes agregarlas de 3 formas rápidas:
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="pixel-btn-cyan px-3.5 py-2 text-xs font-pixel font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ GENERAR CON IA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkImportOpen(true)}
                      className="pixel-btn-pink px-3.5 py-2 text-xs font-pixel font-bold flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>📋 PEGAR LISTA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSingleItem(true)}
                      className="px-3.5 py-2 bg-[#1b2033] hover:bg-[#252c47] text-white border-2 border-slate-600 font-pixel text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ÍTEM MANUAL</span>
                    </button>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-pixel text-xs">
                  NO SE ENCONTRARON ÍTEMS CON EL FILTRO O BÚSQUEDA ACTUAL.
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.assignedTo
                          ? 'bg-emerald-950/20 border-l-4 border-l-emerald-400'
                          : 'hover:bg-[#141724]'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={editItemForm.nombre ?? item.nombre}
                            onChange={(e) => setEditItemForm({ ...editItemForm, nombre: e.target.value })}
                            className="text-xs px-2 py-1 bg-black border border-slate-700 text-white font-retro"
                          />
                          <input
                            type="text"
                            value={editItemForm.cantidadEspecifica ?? item.cantidadEspecifica}
                            onChange={(e) => setEditItemForm({ ...editItemForm, cantidadEspecifica: e.target.value })}
                            className="text-xs px-2 py-1 bg-black border border-slate-700 text-white font-retro"
                          />
                          <input
                            type="text"
                            value={editItemForm.categoria ?? item.categoria}
                            onChange={(e) => setEditItemForm({ ...editItemForm, categoria: e.target.value })}
                            className="text-xs px-2 py-1 bg-black border border-slate-700 text-white font-retro"
                          />
                          <input
                            type="text"
                            value={editItemForm.costoEstimado ?? item.costoEstimado}
                            onChange={(e) => setEditItemForm({ ...editItemForm, costoEstimado: e.target.value })}
                            className="text-xs px-2 py-1 bg-black border border-slate-700 text-white font-retro"
                          />
                        </div>
                      ) : (
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className={`w-7 h-7 flex items-center justify-center text-xs font-arcade border ${
                              item.assignedTo
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-pixel text-sm text-white font-bold">{item.nombre}</span>
                              <span className="text-[10px] font-pixel px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                {item.categoria}
                              </span>
                              <span className="text-[10px] font-pixel px-1.5 py-0.5 bg-[#1e2338] text-amber-300 border border-amber-500/30">
                                {item.costoEstimado}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-retro mt-1">
                              {item.cantidadEspecifica}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status & actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveItemEdit(item.id)}
                              className="p-1.5 bg-emerald-500 text-slate-950 font-bold"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setEditItemForm({});
                              }}
                              className="p-1.5 bg-slate-700 text-slate-300 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            {item.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-pixel bg-emerald-950 text-emerald-300 border border-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{item.assignedTo}</span>
                                </span>
                                <button
                                  onClick={() => handleUnassignItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400"
                                  title="Liberar ítem"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : assigningItemId === item.id ? (
                              <div className="flex items-center gap-1 animate-in fade-in">
                                <input
                                  type="text"
                                  placeholder="COMPAÑERO..."
                                  value={manualAssigneeName}
                                  onChange={(e) => setManualAssigneeName(e.target.value)}
                                  autoFocus
                                  className="px-2 py-0.5 text-xs bg-black border border-emerald-400 text-emerald-300 font-pixel uppercase w-28 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuickAssign(item.id)}
                                  className="p-1 bg-emerald-500 text-slate-950 font-bold"
                                  title="Confirmar"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssigningItemId(null);
                                    setManualAssigneeName('');
                                  }}
                                  className="p-1 bg-slate-700 text-slate-300 text-xs"
                                  title="Cancelar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 text-[10px] font-pixel bg-amber-950/60 text-amber-300 border border-amber-500/50">
                                  LIBRE
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssigningItemId(item.id);
                                    setManualAssigneeName('');
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-pixel bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/60 transition"
                                  title="Asignar manualmente a un compañero"
                                >
                                  + ASIGNAR
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditItemForm({ ...item });
                              }}
                              className="p-1.5 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-400"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-400"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= STAGE 2: RAFFLE DASHBOARD ================= */
        <div className="space-y-6">
          {/* Winner Celebration Banner */}
          {event.winnerTicket && (
            <div className="pixel-box-amber p-6 text-slate-950 relative overflow-hidden bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 border-4 border-amber-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-950 text-amber-300 border-2 border-amber-200 shadow-[4px_4px_0px_#000] flex items-center justify-center font-arcade text-2xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <div className="text-[10px] font-arcade text-slate-900 uppercase tracking-widest">
                      ★ WINNER ANNOUNCEMENT ★
                    </div>
                    <div className="text-2xl sm:text-3xl font-arcade text-slate-950 mt-1">
                      {event.winnerTicket.userName}
                    </div>
                    <div className="text-xs font-pixel text-slate-900 mt-1">
                      TICKET #{event.winnerTicket.ticketNumber.toString().padStart(3, '0')} • {event.prizeTitle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onOpenRoulette}
                  className="px-5 py-3 bg-slate-950 hover:bg-slate-900 text-amber-300 font-pixel text-xs border-2 border-amber-300 shadow-[3px_3px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>RE-SPIN RULETA</span>
                </button>
              </div>
            </div>
          )}

          {/* Prize and Spin Action Console */}
          <div className="pixel-box-cyan p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-arcade text-amber-400 uppercase tracking-wider mb-2">
                <Trophy className="w-4 h-4" />
                ARCADE LUCKY DRAW
              </div>
              <h2 className="text-lg sm:text-xl font-arcade text-white">{event.prizeTitle}</h2>
              {event.prizeDescription && (
                <p className="text-xs text-slate-300 font-retro mt-2 max-w-lg">{event.prizeDescription}</p>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs font-pixel text-cyan-300">
                <span className="flex items-center gap-1.5 bg-black/60 px-3 py-1 border border-cyan-500/40">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  {event.tickets.length} JUGADORES EN TÓMBOLA
                </span>
              </div>
            </div>

            {/* Giant Arcade Spin Button */}
            <button
              data-testid="open-roulette-button"
              onClick={onOpenRoulette}
              className="pixel-btn-amber px-6 sm:px-8 py-4 font-arcade text-xs sm:text-sm tracking-wide shadow-[6px_6px_0px_#451a03] flex items-center justify-center gap-3 shrink-0"
            >
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>► GIRAR RULETA ARCADE ◄</span>
            </button>
          </div>

          {/* Registered Tickets Grid */}
          <div className="pixel-box p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-arcade text-white">
                  TICKETS REGISTRADOS ({event.tickets.length})
                </h3>
                <p className="text-xs text-slate-400 font-retro mt-1">
                  Cada jugador que escanea el QR recibe un ticket único.
                </p>
              </div>

              <button
                onClick={onOpenQR}
                className="pixel-btn-cyan px-3.5 py-1.5 text-xs font-pixel flex items-center gap-1.5 font-bold"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>MOSTRAR QR</span>
              </button>
            </div>

            {event.tickets.length === 0 ? (
              <div className="p-8 text-center bg-[#090b12] border-2 border-dashed border-amber-500/40 space-y-3">
                <div className="w-12 h-12 mx-auto bg-[#181512] border-2 border-amber-500/60 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  🎟️
                </div>
                <h4 className="font-pixel text-xs text-amber-300">
                  ¡AÚN NO HAY JUGADORES EN LA TÓMBOLA!
                </h4>
                <p className="text-xs text-slate-400 font-retro max-w-sm mx-auto leading-relaxed">
                  Muestra el código QR a los miembros del equipo para que ingresen desde sus teléfonos y obtengan su número de boleto en tiempo real.
                </p>
                <button
                  type="button"
                  onClick={onOpenQR}
                  className="pixel-btn-amber px-4 py-2 text-xs font-pixel font-bold inline-flex items-center gap-2"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>PROYECTAR CÓDIGO QR</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {event.tickets.map((t) => {
                  const isTicketWinner = event.winnerTicket?.ticketNumber === t.ticketNumber;

                  return (
                    <div
                      key={t.ticketNumber}
                      className={`p-3.5 border-2 transition flex items-center justify-between gap-3 ${
                        isTicketWinner
                          ? 'bg-amber-950/40 border-amber-400 shadow-[4px_4px_0px_#f59e0b]'
                          : 'bg-[#10131f] border-slate-700 hover:border-cyan-400 shadow-[2px_2px_0px_#000]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 border flex items-center justify-center font-arcade text-xs ${
                            isTicketWinner
                              ? 'bg-amber-400 text-slate-950 border-white'
                              : 'bg-black text-cyan-300 border-cyan-500/50'
                          }`}
                        >
                          #{t.ticketNumber.toString().padStart(3, '0')}
                        </div>
                        <div>
                          <div className="font-pixel text-xs text-white font-bold flex items-center gap-1.5">
                            <span>{t.userName}</span>
                            {isTicketWinner && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(t.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {isTicketWinner && (
                        <span className="text-[9px] font-arcade bg-amber-400 text-slate-950 px-2 py-0.5">
                          WINNER
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal to change Admin PIN stored in Firestore */}
      <ChangePinModal
        isOpen={isChangePinModalOpen}
        onClose={() => setIsChangePinModalOpen(false)}
        onSuccessNotification={(msg) => {
          setPinToast(msg);
          setTimeout(() => setPinToast(null), 6000);
        }}
      />
    </div>
  );
};
