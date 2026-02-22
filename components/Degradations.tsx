import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { NetworkDegradation } from '../types';
import { Activity, Clock, FileText, CheckCircle, Search, Box, AlertCircle, RefreshCw, Undo2, Save, Terminal, Notebook, Mail, Volume2, Square } from 'lucide-react';

// Helper for date formatting
const formatDate = (isoString: string) => {
  if (!isoString) return '--/--/----';
  const date = new Date(isoString);
  return date.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Helper to extract country ISO code
const getCountryCode = (pais: string | undefined) => {
  if (!pais) return '??';
  const p = pais.toUpperCase();
  if (p === 'VENEZUELA') return 'VE';
  if (p === 'COLOMBIA') return 'CO';
  if (p === 'MEXICO') return 'MX';
  if (p === 'CHILE') return 'CL';
  if (p === 'PERU') return 'PE';
  if (p === 'PANAMA') return 'PA';
  return p.substring(0, 2);
};

// --- DEGRADATION CARD COMPONENT ---
interface DegradationCardProps {
  degradation: NetworkDegradation;
  onCloseCase: (id: string | number) => void;
  onUpdateNotes: (id: string | number, newNotes: any) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToMassive?: () => void;
}

const DegradationCard: React.FC<DegradationCardProps> = ({ degradation, onCloseCase, onUpdateNotes, onNavigateToDashboard, onNavigateToMassive }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech if modal is closed
  useEffect(() => {
    if (isClosingModal && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isClosingModal, isSpeaking]);

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Español Americano (Neutro/USA)
    utterance.lang = 'es-US';
    utterance.rate = 1.05; // Toque juvenil, levemente más veloz
    utterance.pitch = 1.0;

    const selectMaleVoice = () => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const latamVoices = voices.filter(v => v.lang.startsWith('es') && !v.lang.includes('es-ES') && !v.lang.includes('ES') && !v.lang.includes('es_ES'));
      const fallbackSpanishVoices = voices.filter(v => v.lang.startsWith('es'));

      let bestVoice = latamVoices.find(v =>
        /Natural|Online/i.test(v.name) &&
        /Alonso|Rodrigo|Fernando|Gerardo|Jorge|Tomas|Emilio/i.test(v.name)
      );

      if (!bestVoice) bestVoice = latamVoices.find(v => /Natural|Online/i.test(v.name) && v.lang.includes('US') && !/Sabina|Helena|Laura|Paulina|Mia|Dalia|Beatriz|Carmen|Paloma/i.test(v.name));
      if (!bestVoice) bestVoice = latamVoices.find(v => /Natural|Online/i.test(v.name) && !/Sabina|Helena|Laura|Paulina|Mia|Dalia|Beatriz|Carmen|Paloma/i.test(v.name));
      if (!bestVoice) bestVoice = latamVoices.find(v => /Alonso|Rodrigo|Fernando|Jorge|Gerardo|Antonio|Raul|Diego|Carlos|Miguel/i.test(v.name));
      if (!bestVoice) bestVoice = latamVoices.find(v => !/Sabina|Helena|Laura|Paulina|Mia|Dalia|Beatriz|Carmen|Paloma/i.test(v.name) && (/Google.*US/i.test(v.name) || /Microsoft.*US/i.test(v.name)));

      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log("Voz Degradations seleccionada:", bestVoice.name);
      } else if (latamVoices.length > 0) {
        utterance.voice = latamVoices[0];
      } else if (fallbackSpanishVoices.length > 0) {
        utterance.voice = fallbackSpanishVoices[0];
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    let initialVoices = window.speechSynthesis.getVoices();
    if (initialVoices.length > 0) {
      selectMaleVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        selectMaleVoice();
      };
    }
  };

  // Join data handler
  const deviceInfo = degradation.device_info || (degradation as any).devices_inventory_jj;
  const storeName = deviceInfo?.nombre_tienda || 'TIENDA DESCONOCIDA';
  const storeCode = deviceInfo?.codigo_tienda || 'N/A';
  const countryCode = getCountryCode(deviceInfo?.pais);

  const isClosed = degradation.status === 'Cerrada' || degradation.status === 'Resuelta';

  // Status Colors Mapping
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'activa') return 'bg-purple-800 border-purple-600 shadow-[0_0_15px_rgba(107,33,168,0.5)]';
    if (s === 'en gestión') return 'bg-purple-600 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.4)]';
    if (s === 'pendiente por cierre') return 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
    if (s === 'intermitencia') return 'bg-fuchsia-700 border-fuchsia-500 shadow-[0_0_10px_rgba(162,28,175,0.4)]';
    if (s === 'cerrada' || s === 'resuelta') return 'bg-zinc-800 border-zinc-700';
    return 'bg-purple-900 border-purple-700';
  };

  const hasSlack = Boolean(degradation.slack_thread_ts);
  const hasEmail = degradation.email_status === 'OK' && Boolean(degradation.email_ts);

  const handleOpen = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('input')) return;
    setIsFlipped(true);
    setTimeout(() => setShowModal(true), 150);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingModal(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosingModal(false);
      setIsFlipped(false);
    }, 450); // Match CSS animation duration
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setIsSaving(true);
    try {
      const currentNotes = Array.isArray(degradation.analyst_notes) ? degradation.analyst_notes : [];
      const newNoteEntry = { timestamp: new Date().toISOString(), user: 'Admin (Nexus)', note: noteInput };
      const updatedNotes = [...currentNotes, newNoteEntry];
      await onUpdateNotes(degradation.id, updatedNotes);
      setNoteInput('');
    } catch (error) {
      console.error("Error updating notes", error);
    } finally {
      setIsSaving(false);
    }
  };

  const logs = Array.isArray(degradation.system_logs) ? degradation.system_logs : [];
  const notes = Array.isArray(degradation.analyst_notes) ? degradation.analyst_notes : [];

  const renderEvidence = () => {
    if (!degradation.evidence_data) return <span className="text-zinc-500 italic">Sin evidencia adjunta.</span>;
    try {
      return <pre className="text-zinc-300 bg-zinc-900 shadow-inner p-4 rounded-xl text-[12px] font-mono whitespace-pre-wrap">{JSON.stringify(degradation.evidence_data, null, 2)}</pre>;
    } catch {
      return <span className="text-zinc-300 bg-zinc-900 shadow-inner p-4 rounded-xl">{String(degradation.evidence_data)}</span>;
    }
  };

  const buttonBgColor = getStatusColor(degradation.status).split(' ')[0];

  return (
    <>
      <style>{`
        .flip-expand-in {
          animation: flipExpandIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .flip-expand-out {
          animation: flipExpandOut 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes flipExpandIn {
          0% { transform: perspective(1500px) scale(0.6) rotateY(-180deg); opacity: 0.5; }
          100% { transform: perspective(1500px) scale(1) rotateY(0deg); opacity: 1; }
        }
        @keyframes flipExpandOut {
          0% { transform: perspective(1500px) scale(1) rotateY(0deg); opacity: 1; }
          100% { transform: perspective(1500px) scale(0.6) rotateY(180deg); opacity: 0; }
        }
      `}</style>

      {/* TARJETA EN EL GRID (FRONTAL) */}
      <div className="relative perspective-1000 w-full z-10 h-[180px] cursor-pointer group" onClick={handleOpen}>
        <div
          className={`absolute inset-0 w-full h-[180px] rounded-2xl transform-style-3d transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isFlipped ? 'rotate-y-180 scale-90 opacity-0' : 'group-hover:-translate-y-2 group-hover:scale-[1.02] shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}`}
        >
          {/* CARA FRONTAL EN GRID */}
          <div className="absolute inset-0 backface-hidden rounded-2xl flex flex-col overflow-hidden bg-[#0c0c0c] border border-zinc-800 shadow-[inset_0_4px_20px_rgba(0,0,0,0.2)]">
            <div className={`px-5 py-4 ${getStatusColor(degradation.status).split(' ')[0]} border-b border-black/50 flex justify-between items-start shrink-0`}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-white/70 font-mono text-[10px] font-bold tracking-widest uppercase truncate">{storeCode}</span>
                <span className="text-white font-black text-lg leading-tight tracking-tight drop-shadow-md truncate">{storeName}</span>
              </div>
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="text-white/80 font-black text-xl leading-none opacity-50 drop-shadow-sm">{countryCode}</span>
              </div>
            </div>

            <div className="flex-1 p-5 flex flex-col justify-between relative bg-gradient-to-b from-zinc-900/50 to-[#0a0a0a]">
              <Activity className="absolute bottom-[-10%] right-[-5%] w-32 h-32 text-purple-500/5 rotate-12 pointer-events-none" />
              <div className="flex justify-between items-start w-full z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Network ID</span>
                  <span className="text-zinc-200 font-mono text-base font-bold tracking-tight bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{degradation.network_id}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 font-bold bg-black/40 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {formatDate(degradation.created_at || '')}
                  </span>
                  <div className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white border ${getStatusColor(degradation.status)}`}>
                    {degradation.status}
                  </div>
                </div>
              </div>

              <div className="flex justify-start items-center gap-2 mt-auto pt-2 z-10 w-full">
                {hasSlack && (
                  <div className="w-7 h-7 rounded-md bg-[#4A154B] text-white border border-[#6e226f] flex items-center justify-center shadow-lg" title="Hilo de Slack Activo">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522v-2.521zm-1.272 0a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.521 2.522v6.313zM15.163 18.958a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zm0-1.272a2.528 2.528 0 0 1-2.521-2.52 2.528 2.528 0 0 1 2.52-2.522h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z" /></svg>
                  </div>
                )}
                {hasEmail && (
                  <div className="w-7 h-7 rounded-md bg-orange-600/20 text-orange-500 border border-orange-600/50 flex items-center justify-center shadow-lg" title="Email Enviado">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARA TRASERA FANTASMA PARA EL GIRO EN GRID (ANTES DEL MODAL) */}
          <div className="absolute inset-0 backface-hidden bg-zinc-950 rounded-2xl rotate-y-180 border border-zinc-800"></div>
        </div>
      </div>

      {/* MODAL TRASERO (CARA EXPANDIDA) */}
      {showModal && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 perspective-1000 ${isClosingModal ? 'pointer-events-none' : ''}`}>

          {/* FADE BACKDROP */}
          <div
            className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isClosingModal ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
          />

          {/* THE EXPANDED BACK CARD (ANIMADA CON KEYFRAMES) */}
          <div
            className={`relative w-full max-w-5xl h-[85vh] md:h-[75vh] bg-[#0c0c0c] border border-zinc-800 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden ${isClosingModal ? 'flip-expand-out' : 'flip-expand-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-2.5 w-full ${getStatusColor(degradation.status).split(' ')[0]} border-b-0`}></div>

            <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-950/50 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <span className="text-zinc-500 font-mono text-xl bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{storeCode}</span>
                  {storeName}
                </h2>
                <div className="text-sm font-mono text-zinc-500 mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Box className="w-3 h-3" /> UUID: {degradation.id}</span>
                  <span className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded"><Activity className="w-3 h-3" /> NET_ID: {degradation.network_id}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 max-w-sm">
                {degradation.related_failure_id && onNavigateToDashboard && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigateToDashboard(); }}
                    className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/30 hover:border-blue-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2"
                    title={`Ver Falla #${degradation.related_failure_id}`}
                  >
                    <AlertCircle className="w-4 h-4" /> Falla
                  </button>
                )}
                {degradation.related_massive_id && onNavigateToMassive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigateToMassive(); }}
                    className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 hover:border-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2"
                    title={`Ver Falla Masiva #${degradation.related_massive_id}`}
                  >
                    <Activity className="w-4 h-4" /> Masiva
                  </button>
                )}

                {!isClosed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCloseCase(degradation.id); handleClose(e); }}
                    className={`${buttonBgColor} hover:brightness-110 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 shadow-lg`}
                  >
                    <CheckCircle className="w-4 h-4" /> Resolver
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="w-full lg:w-[45%] bg-zinc-950 border-r border-zinc-800/80 p-6 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <section className="mb-6 shrink-0">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                    <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Diagnóstico
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSpeak(degradation.diagnosis_text || 'Sin texto de diagnóstico provisto por el analista o AIOps.'); }}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isSpeaking ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-transparent text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                      title={isSpeaking ? "Detener lectura" : "Escuchar diagnóstico (AIOps Voice)"}
                    >
                      {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-emerald-300 font-medium text-sm leading-relaxed bg-black p-5 rounded-xl border border-zinc-800 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] whitespace-pre-wrap font-mono">
                    {degradation.diagnosis_text || 'Sin texto de diagnóstico provisto por el analista o AIOps.'}
                  </div>
                </section>

                <section className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
                  <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2 border-b border-zinc-900 pb-2">
                    <Box className="w-4 h-4" /> Datos de Evidencia (AIOps Engine)
                  </h3>
                  <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pt-2 font-mono text-[11px] lg:text-[12px]">
                    {renderEvidence()}
                  </div>
                </section>
              </div>

              <div className="w-full lg:w-[55%] p-6 flex flex-col bg-[#101010] gap-4 overflow-hidden">
                <div className="flex-1 min-h-[150px] lg:min-h-0 bg-black border border-zinc-800/80 rounded-xl p-4 flex flex-col shadow-inner">
                  <div className="flex items-center gap-2 mb-4 shrink-0 border-b border-zinc-800/50 pb-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">System Logs</span>
                  </div>
                  <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 pr-2 pb-2">
                    {logs.length > 0 ? logs.map((log: any, i: number) => (
                      <div key={i} className="flex flex-col border-l-2 border-emerald-900/50 pl-3 py-1 bg-zinc-900/40 rounded-r">
                        <span className="text-zinc-500 block text-[9px] mb-0.5">[{formatDate(log.timestamp)}]</span>
                        <span className="text-emerald-400 font-medium text-[11px] leading-relaxed">{'>'}{'>'} {log.message}</span>
                      </div>
                    )) : (
                      <span className="text-zinc-600 italic">No hay logs automáticos registrados.</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-[200px] lg:min-h-0 flex flex-col border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Notebook className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Notas del Analista</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-zinc-900/30 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                    {notes.length > 0 ? notes.map((note: any, i: number) => (
                      <div key={i} className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-1.5 border-b border-zinc-800/50 pb-1.5">
                          <span className="font-bold text-[11px] text-blue-400 uppercase tracking-wide">{note.user || 'NEXUS'}</span>
                          <span className="text-zinc-500 font-mono text-[10px]">{formatDate(note.timestamp)}</span>
                        </div>
                        <span className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed">{note.note}</span>
                      </div>
                    )) : (
                      <span className="text-zinc-500 italic text-sm">No se han registrado notas manuales.</span>
                    )}
                  </div>

                  {!isClosed && (
                    <div className="p-3 bg-zinc-950 border-t border-zinc-800/80 shrink-0 flex gap-3">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Ingresa una nueva nota para la bitácora..."
                        className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none resize-none h-12 shadow-inner"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddNote(); }}
                        disabled={isSaving || !noteInput.trim()}
                        className={`${buttonBgColor} hover:brightness-110 disabled:opacity-50 disabled:brightness-100 text-white rounded-lg px-6 font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg`}
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-black py-4 px-6 border-t border-zinc-800 flex justify-between items-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] z-10">
              <span className="text-[10px] text-zinc-600 font-mono tracking-widest font-black">NEXUS STATUS 2026 // AIOPS DIAGNOSTIC CARD</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleClose(e); }}
                className="px-5 py-2.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:text-white text-zinc-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 tracking-widest shadow-md"
              >
                Cerrar Panel <Undo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- MAIN MODULE COMPONENT ---
interface DegradationsProps {
  onNavigateToDashboard?: () => void;
  onNavigateToMassive?: () => void;
}

const Degradations: React.FC<DegradationsProps> = ({ onNavigateToDashboard, onNavigateToMassive }) => {
  const [degradations, setDegradations] = useState<NetworkDegradation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Activa' | 'Cerrada'>('All');

  const fetchDegradations = async (isBackgroundSync = false) => {
    if (!isBackgroundSync) setLoading(true);
    try {
      if (isDemoMode) {
        // Mock Data implementation could go here, but focusing on real logic
        loadMockData();
      } else {
        // Querying Supabase with joined device info
        const { data, error } = await supabase
          .from('network_degradations_jj')
          .select('*, devices_inventory_jj(*)')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            loadMockData();
            return;
          }
          throw error;
        }
        setDegradations(data || []);
      }
    } catch (error) {
      console.error("Error fetching degradations:", error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setDegradations([
      {
        id: 'DEG-10293',
        network_id: 'N_MOCK_1',
        status: 'Activa',
        diagnosis_text: 'Falla intermitente en BGP Peer (Tier 1). Posible saturación de enlaces primarios.',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        device_info: { nombre_tienda: 'CDMX SUR MOCK', codigo_tienda: 'MX-001', pais: 'Mexico' } as any,
        system_logs: [{ timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'Alerta Meraki: Packet Loss > 5%.' }],
        analyst_notes: [{ timestamp: new Date().toISOString(), user: 'Bot', note: 'Caso asignado automáticamente a Proveedor.' }]
      } as any,
      {
        id: 'DEG-10294',
        network_id: 'N_MOCK_2',
        status: 'Cerrada',
        diagnosis_text: 'Flapping port en router CE. Estabilizado tras reinicio lógico.',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        device_info: { nombre_tienda: 'BOGOTA NORTE', codigo_tienda: 'CO-099', pais: 'Colombia' } as any,
        system_logs: [],
        analyst_notes: []
      } as any
    ]);
  };

  useEffect(() => {
    fetchDegradations();
    const intervalId = setInterval(() => fetchDegradations(true), 60000); // 60 segundos
    return () => clearInterval(intervalId);
  }, []);

  const handleCloseCase = async (id: string | number) => {
    if (isDemoMode) {
      setDegradations(prev => prev.map(d => d.id === id ? { ...d, status: 'Cerrada' } : d));
      return;
    }

    try {
      const { error } = await supabase
        .from('network_degradations_jj')
        .update({ status: 'Cerrada', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchDegradations(); // Refresh
    } catch (error) {
      console.error("Error closing case:", error);
    }
  };

  const handleUpdateNotes = async (id: string | number, updatedNotes: any) => {
    if (isDemoMode) {
      setDegradations(prev => prev.map(d => d.id === id ? { ...d, analyst_notes: updatedNotes } : d));
      return;
    }

    try {
      const { error } = await supabase
        .from('network_degradations_jj')
        .update({
          analyst_notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      // Optimistic update locally to avoid full fetch delay
      setDegradations(prev => prev.map(d => d.id === id ? { ...d, analyst_notes: updatedNotes } : d));
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const filteredData = useMemo(() => {
    return degradations.filter(d => {
      const term = searchTerm.toLowerCase();
      const matchSearch = term === '' ||
        String(d.id).toLowerCase().includes(term) ||
        (d.device_info as any)?.nombre_tienda?.toLowerCase().includes(term) ||
        (d.device_info as any)?.codigo_tienda?.toLowerCase().includes(term) ||
        String(d.network_id).toLowerCase().includes(term) ||
        d.status.toLowerCase().includes(term) ||
        (d.diagnosis_text || '').toLowerCase().includes(term) ||
        (d.evidence_data ? JSON.stringify(d.evidence_data).toLowerCase() : '').includes(term);

      const matchStatus = filterStatus === 'All' ||
        (filterStatus === 'Activa' ? d.status !== 'Cerrada' && d.status !== 'Resuelta' : (d.status === 'Cerrada' || d.status === 'Resuelta'));
      return matchSearch && matchStatus;
    });
  }, [degradations, searchTerm, filterStatus]);

  return (
    <div className="p-8 text-white h-screen flex flex-col bg-black relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
            <Activity className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">Monitor de Degradaciones</h1>
            <p className="text-zinc-400 text-sm font-medium tracking-wide">Detección y seguimiento de intermitencias en la red</p>
          </div>
        </div>

        {/* Metrics / KPI Summary */}
        <div className="flex gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-2.5 flex flex-col justify-center items-center shadow-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Activas</span>
            <span className="text-xl font-digital text-orange-400 font-bold">{degradations.filter(d => d.status !== 'Cerrada' && d.status !== 'Resuelta').length}</span>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-2.5 flex flex-col justify-center items-center shadow-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Resueltas</span>
            <span className="text-xl font-digital text-emerald-500 font-bold">{degradations.filter(d => d.status === 'Cerrada' || d.status === 'Resuelta').length}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 relative z-10 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por código de tienda, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-orange-500 transition-all shadow-md"
          />
        </div>

        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shadow-md">
          {(['All', 'Activa', 'Cerrada'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${filterStatus === status ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {status === 'All' ? 'Todas' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 pb-20">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin opacity-50" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <Box className="w-16 h-16 text-zinc-700 mb-4 stroke-[1]" />
            <h3 className="text-xl font-medium text-zinc-400">Sin Degradaciones</h3>
            <p className="text-sm text-zinc-600 mt-2">No se encontraron casos de rendimiento que coincidan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 md:gap-8 auto-rows-max px-2 pt-2">
            {filteredData.map(d => (
              <DegradationCard
                key={d.id}
                degradation={d}
                onCloseCase={handleCloseCase}
                onUpdateNotes={handleUpdateNotes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Degradations;
