
import React, { useState, useEffect } from 'react';
import { NetworkFailure } from '../types';
import { STAGE_CONFIG } from '../constants';
import { Clock, AlertCircle, Wrench, Eye, Lock, Box, Undo2, ExternalLink, MapPin, Notebook, Mail, Slack, Trello, Hourglass, Activity } from 'lucide-react';
import BitacoraModal from './BitacoraModal';

interface FailureCardProps {
  failure: NetworkFailure;
  onViewInventory?: (networkId: string) => void;
  onNavigateToLogin?: () => void;
}

const FailureCard: React.FC<FailureCardProps> = ({ failure, onViewInventory, onNavigateToLogin }) => {
  const config = STAGE_CONFIG[failure.lifecycle_stage] || STAGE_CONFIG['Activa'];
  const [elapsed, setElapsed] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  
  // State for Bitacora Modal
  const [showBitacora, setShowBitacora] = useState(false);

  // LOGIC FOR SLACK ICON STATE
  // Active ONLY if "slack_thread_ts" exists in DB (is not null/empty)
  const hasSlackThread = Boolean(failure.slack_thread_ts);

  // DISPLAY LOGIC
  const displayTitle = (failure.nombre_tienda || 'DESCONOCIDO').toUpperCase();
  const displayCode = failure.codigo_tienda ? failure.codigo_tienda.toUpperCase() : 'N/A';
  
  // NOTE: Back face now uses Store Code instead of Network ID as requested
  const displayBackIdentifier = displayCode; 

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

  // HELPERS FOR DATE/TIME
  const formatTime = (isoString: string) => {
      if (!isoString) return '--:--';
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const formatDate = (isoString: string) => {
      if (!isoString) return '--/--/----';
      const date = new Date(isoString);
      return date.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  // Helper for static minutes (from DB) - UPDATED FORMAT
  const formatMinutes = (mins: number | undefined) => {
      if (mins === undefined || mins === null || mins <= 0) return '--';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      // Digital Clock Style Format: 02H 35M
      const hStr = h.toString().padStart(2, '0');
      const mStr = m.toString().padStart(2, '0');
      
      if (h > 0) return `${hStr}H:${mStr}M`;
      return `${mStr}M`;
  };

  // LOGICA DE TIEMPO TRANSCURRIDO (Live)
  useEffect(() => {
    const updateTime = () => {
      const start = new Date(failure.start_time).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setElapsed(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m`);
      } else {
        setElapsed(`${minutes}m`);
      }
    };

    updateTime(); 
    const interval = setInterval(updateTime, 60000); 
    return () => clearInterval(interval);
  }, [failure.start_time]);

  const getStatusIcon = () => {
      switch(failure.lifecycle_stage) {
          case 'Activa': return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />; 
          case 'En gestión': return <Wrench className="w-3.5 h-3.5 mr-1.5" />;
          case 'En observación': return <Eye className="w-3.5 h-3.5 mr-1.5" />;
          case 'Intermitencia': return <Activity className="w-3.5 h-3.5 mr-1.5" />;
          case 'Pendiente por cierre': return <Lock className="w-3.5 h-3.5 mr-1.5" />;
          default: return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
      }
  }

  const isUp = (status: string) => {
      if (!status) return false;
      const s = status.toUpperCase();
      return s === 'UP' || s === 'ACTIVE';
  }

  // Toned down WAN status colors (less neon, more solid)
  const getWanStatusColor = (status: string) => {
      return isUp(status) 
        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
        : 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]';
  }

  const handleCardClick = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('textarea')) return;
      setIsFlipped(!isFlipped);
  };

  // HEADER COLOR MAPPING
  const HEADER_BG: Record<string, string> = {
    'Activa': 'bg-red-800', 
    'En gestión': 'bg-orange-700', 
    'En observación': 'bg-yellow-600', 
    'Intermitencia': 'bg-purple-800', 
    'Pendiente por cierre': 'bg-blue-900', 
    'Resuelta': 'bg-emerald-800', 
    'Falso Positivo': 'bg-zinc-700' 
  };

  const headerBgClass = HEADER_BG[failure.lifecycle_stage] || 'bg-zinc-800';

  // Providers fallback logic
  const wan1Provider = failure.wan1_provider_name || 'SIN PROVEEDOR';
  const wan2Provider = failure.wan2_provider_name || 'SIN PROVEEDOR';

  // WAN Details Rendering Helper
  const renderWanDetails = (
      label: string, 
      status: string, 
      ticketRef: string | null | undefined, 
      downtimeMinutes?: number,
      recoveryTime?: string | null,
      emailStatus?: string // NEW FIELD: "OK" triggers color
  ) => {
      const isLinkUp = isUp(String(status));
      const dotColor = getWanStatusColor(String(status));
      
      // Determine if this WAN interface is "affected" by the failure.
      // Logic: Currently Down OR has recorded downtime OR has a recovery time set
      const isAffected = !isLinkUp || (downtimeMinutes !== undefined && downtimeMinutes > 0) || (recoveryTime !== null && recoveryTime !== undefined);
      
      // --- ICON LOGIC ---
      // 1. Mail: On if affected AND emailStatus is 'OK'
      const isMailActive = isAffected && emailStatus === 'OK';
      
      // 2. Slack: On if affected AND global thread exists
      const isSlackActive = isAffected && hasSlackThread;

      // 3. Jira: On if affected AND this specific WAN has a ticket reference
      const isJiraActive = isAffected && Boolean(ticketRef);

      // Start/End Logic
      const startDateStr = isAffected ? formatDate(failure.start_time) : '--/--/----';
      const startTimeStr = isAffected ? formatTime(failure.start_time) : '--:--';
      
      let durVal = '--';
      let endDateStr = null;
      let endTimeStr = null;

      if (isAffected) {
          if (downtimeMinutes && downtimeMinutes > 0) {
              durVal = formatMinutes(downtimeMinutes);
          } else if (!isLinkUp) {
              durVal = elapsed;
          }

          if (recoveryTime) {
              const endObj = new Date(recoveryTime);
              endDateStr = endObj.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
              endTimeStr = endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
          }
      }

      const tktVal = ticketRef || (isAffected && !isLinkUp ? 'PENDIENTE' : '---');

      return (
          <div className={`bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 mb-2 flex-1 flex flex-col justify-center ${!isAffected ? 'opacity-50' : ''}`}>
              
              {/* HEADER ROW: Label + Icons + Status */}
              <div className="flex items-center justify-between mb-2 border-b border-zinc-800/60 pb-1.5">
                  {/* LEFT: Label & Status Dot */}
                  <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-bold text-xs">{label}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
                  </div>

                  {/* RIGHT: Icons Group & Optional Text */}
                  <div className="flex items-center gap-3">
                      {/* ICONS GROUP */}
                      <div className="flex items-center gap-1.5">
                          
                          {/* 1. MAIL ICON */}
                          <div 
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                                isMailActive 
                                ? 'bg-orange-500 text-white border-orange-600 shadow-[0_0_5px_rgba(249,115,22,0.4)]' 
                                : 'bg-zinc-900/50 text-zinc-700 border-zinc-800'
                            }`}
                            title={isMailActive ? "Correo Enviado" : "Correo Inactivo"}
                          >
                              <Mail className="w-3 h-3" /> 
                          </div>

                          {/* 2. SLACK ICON (LINKED) */}
                          {isSlackActive ? (
                              <a 
                                  href={`https://app.slack.com/client/T28BJ8LUE/C07FZE49ZPW/thread/C07FZE49ZPW-${failure.slack_thread_ts}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-6 h-6 rounded flex items-center justify-center border transition-colors bg-[#4A154B] text-white border-[#6e226f] shadow-[0_0_5px_rgba(74,21,75,0.4)] hover:bg-[#5c1b5e] cursor-pointer"
                                  title="Ir al Hilo de Slack"
                              >
                                  <Slack className="w-3 h-3" />
                              </a>
                          ) : (
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center border transition-colors bg-zinc-900/50 text-zinc-700 border-zinc-800"
                                title="Sin Slack"
                              >
                                  <Slack className="w-3 h-3" />
                              </div>
                          )}

                          {/* 3. JIRA/TICKET ICON */}
                          <div 
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                                isJiraActive 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-[0_0_5px_rgba(37,99,235,0.4)]' 
                                : 'bg-zinc-900/50 text-zinc-700 border-zinc-800'
                            }`}
                            title={isJiraActive ? `Ticket: ${ticketRef}` : "Sin Ticket"}
                          >
                              <Trello className="w-3 h-3" />
                          </div>
                      </div>

                      {/* Operativo Text (Only if healthy) */}
                      {!isAffected && <span className="text-[9px] text-zinc-600 font-mono tracking-wider">OPERATIVO</span>}
                  </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-4 gap-2 text-[10px] leading-tight">
                  {/* INICIO */}
                  <div>
                      <span className="block text-zinc-500 font-bold uppercase mb-0.5 tracking-wider">INICIO</span>
                      <div className="flex flex-col">
                          <span className={`font-mono text-[10px] ${isAffected ? 'text-zinc-300' : 'text-zinc-600'}`}>{startDateStr}</span>
                          <span className={`font-mono text-[9px] ${isAffected ? 'text-zinc-400' : 'text-zinc-700'}`}>{startTimeStr}</span>
                      </div>
                  </div>

                  {/* FIN */}
                  <div>
                      <span className="block text-zinc-500 font-bold uppercase mb-0.5 tracking-wider">FIN</span>
                      <div className="flex flex-col">
                          {isAffected ? (
                              (endDateStr && endTimeStr) ? (
                                  <>
                                      <span className="text-emerald-400 font-mono text-[10px]">{endDateStr}</span>
                                      <span className="text-emerald-500/70 font-mono text-[9px]">{endTimeStr}</span>
                                  </>
                              ) : (
                                  !isLinkUp ? (
                                      <span className="text-zinc-600 font-mono italic mt-1">EN CURSO</span>
                                  ) : (
                                      <span className="text-zinc-600 font-mono text-[10px]">---</span>
                                  )
                              )
                          ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">---</span>
                          )}
                      </div>
                  </div>

                  {/* DURACIÓN */}
                  <div>
                      <span className="block text-zinc-500 font-bold uppercase mb-0.5 tracking-wider">DURACIÓN</span>
                      <span className={`font-mono text-[11px] font-bold ${durVal !== '--' ? 'text-white' : 'text-zinc-600'}`}>
                          {durVal}
                      </span>
                  </div>

                  {/* TICKET */}
                  <div>
                      <span className="block text-zinc-500 font-bold uppercase mb-0.5 tracking-wider">TKT</span>
                      <span className={`font-mono truncate text-[11px] ${tktVal !== '---' ? 'text-zinc-300' : 'text-zinc-600'}`} title={tktVal}>{tktVal}</span>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <>
        {/* CONTAINER with Height Transition */}
        <div 
            className={`perspective-1000 group w-full cursor-pointer relative select-none transition-[height] duration-500 ease-in-out ${isFlipped ? 'h-[360px]' : 'h-[170px]'}`}
            onClick={handleCardClick}
        >
        
        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* ================= FRONT FACE ================= */}
            <div className="absolute inset-0 backface-hidden rounded-xl shadow-lg overflow-hidden flex flex-col border border-zinc-800/50 bg-zinc-950">
                
                {/* 1. COLORED HEADER */}
                <div className={`${headerBgClass} px-4 py-3 relative shrink-0`}>
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0"></div>
                            <div className="flex items-baseline gap-2 overflow-hidden">
                                <span className="text-white/70 text-lg font-mono font-bold leading-none">{displayCode}</span>
                                <h3 className="text-white font-black text-lg leading-none truncate tracking-tight drop-shadow-sm opacity-95" title={displayTitle}>
                                    {displayTitle}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <span className="px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-black/30 text-white border border-white/10 shadow-sm backdrop-blur-md">
                            IMPACTO {failure.site_impact}
                        </span>
                    </div>
                </div>

                {/* 2. DARK BODY */}
                <div className="flex-1 bg-zinc-900 border-x border-b border-zinc-800 rounded-b-xl flex flex-col justify-between">
                    <div className="px-4 flex-1 flex items-center justify-center">
                        <div className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-tight py-2 border-b border-zinc-800/50 border-dashed">
                            
                            {/* WAN 1: [Duration] [Label] [Dot] [Provider] */}
                            <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                                {failure.wan1_downtime_minutes && failure.wan1_downtime_minutes > 0 ? (
                                    <div className="flex items-center gap-0.5 mr-1 text-white">
                                        <Hourglass className="w-3 h-3 text-orange-400" />
                                        <span className="text-[13px] font-digital tracking-tight text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]">
                                            {formatMinutes(failure.wan1_downtime_minutes)}
                                        </span>
                                    </div>
                                ) : null}

                                <span className="text-zinc-500 shrink-0">WAN1</span>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${getWanStatusColor(String(failure.wan1_status))}`}></div>
                                
                                <span className={`truncate max-w-[80px] ${wan1Provider === 'SIN PROVEEDOR' ? 'text-zinc-600 italic' : 'text-zinc-300'}`}>
                                    {wan1Provider}
                                </span>
                            </div>

                            {/* Separator */}
                            <div className="h-3 w-px bg-zinc-700 mx-0.5 shrink-0"></div>
                            
                            {/* WAN 2: [Label] [Dot] [Provider] [Duration] */}
                            <div className="flex items-center gap-1 flex-1 justify-start min-w-0">
                                <span className="text-zinc-500 shrink-0">WAN2</span>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${getWanStatusColor(String(failure.wan2_status))}`}></div>
                                
                                <span className={`truncate max-w-[80px] ${wan2Provider === 'SIN PROVEEDOR' ? 'text-zinc-600 italic' : 'text-zinc-300'}`}>
                                    {wan2Provider}
                                </span>

                                {failure.wan2_downtime_minutes && failure.wan2_downtime_minutes > 0 ? (
                                    <div className="flex items-center gap-0.5 ml-1 text-white">
                                        <Hourglass className="w-3 h-3 text-orange-400" />
                                        <span className="text-[13px] font-digital tracking-tight text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]">
                                            {formatMinutes(failure.wan2_downtime_minutes)}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="py-2.5 px-4 flex justify-between items-center relative shrink-0">
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800 shadow-inner">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            <span className="text-[11px] font-black text-white tracking-wide leading-none">
                                {getCountryCode(failure.pais)}
                            </span>
                        </div>
                        <div className={`flex items-center px-3 py-1 rounded-full ${headerBgClass} text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-black/20 border border-white/10`}>
                            {getStatusIcon()}
                            <span>{failure.lifecycle_stage}</span>
                        </div>
                        <div className="w-8"></div> 
                    </div>
                </div>
            </div>

            {/* ================= BACK FACE (EXPANDED & DETAILED) ================= */}
            <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden`}>
                
                {/* 1. Thin Color Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${headerBgClass}`}></div>

                <div className="p-4 flex-1 flex flex-col h-full">
                    
                    {/* 2. Header Title */}
                    <div className="flex items-center justify-between mt-2 mb-4 shrink-0">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div>
                            <h3 className="text-lg font-black text-white leading-none truncate flex items-baseline">
                                <span className="text-zinc-500 mr-2 text-base font-bold tracking-tight">{displayBackIdentifier}</span>
                                <span className="truncate">{displayTitle}</span>
                            </h3>
                        </div>
                        
                        <div className="flex flex-col items-end shrink-0 justify-center pb-1">
                            <span className="text-zinc-500 font-mono text-[10px]">ID: {failure.id}</span>
                        </div>
                    </div>

                    {/* 3. WAN 1 Details Panel - With Icons */}
                    {renderWanDetails('WAN 1', String(failure.wan1_status), failure.wan1_ticket_ref, failure.wan1_downtime_minutes, failure.wan1_recovery_start_time, failure.email_status_w1)}

                    {/* 4. WAN 2 Details Panel - With Icons */}
                    {renderWanDetails('WAN 2', String(failure.wan2_status), failure.wan2_ticket_ref, failure.wan2_downtime_minutes, failure.wan2_recovery_start_time, failure.email_status_w2)}

                    {/* 5. Footer Actions (Large Buttons + Flip) */}
                    <div className="flex items-center gap-2 mt-auto pt-2 shrink-0">
                        {onViewInventory && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewInventory(failure.network_id);
                                }}
                                className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-[10px] font-bold uppercase transition-all shadow-sm"
                            >
                                <Box className="w-3.5 h-3.5" />
                                Inventario
                            </button>
                        )}
                        
                        <a 
                        href={failure.meraki_url || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`flex-1 h-9 flex items-center justify-center gap-1.5 ${failure.meraki_url ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'} border rounded text-[10px] font-bold uppercase transition-all shadow-sm`}
                        >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Meraki
                        </a>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBitacora(true);
                            }}
                            className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-yellow-600 hover:bg-yellow-500 text-white border border-yellow-500 rounded text-[10px] font-bold uppercase transition-all shadow-sm"
                        >
                            <Notebook className="w-3.5 h-3.5" />
                            Bitácora
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFlipped(false);
                            }}
                            className="ml-2 text-zinc-500 hover:text-white text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider"
                        >
                            Voltear <Undo2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

        </div>
        </div>

        {/* MODAL BITACORA */}
        {showBitacora && (
            <BitacoraModal 
                failureId={failure.id}
                networkId={failure.network_id}
                storeName={displayTitle}
                onClose={() => setShowBitacora(false)}
                onNavigateToLogin={onNavigateToLogin}
            />
        )}
    </>
  );
};

export default FailureCard;
