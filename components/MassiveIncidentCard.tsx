
import React, { useState, useEffect } from 'react';
import { MassiveIncident, NetworkFailure } from '../types';
import { Zap, Globe, Store, Clock, AlertTriangle, Undo2, Calendar, TrendingUp, Notebook, Mail, Slack, Trello, MapPinned } from 'lucide-react';
import BitacoraModal from './BitacoraModal';
interface MassiveIncidentCardProps {
    incident: MassiveIncident;
    affectedFailures?: NetworkFailure[];
    isAutoFlipped?: boolean;
    onNavigateToLogin?: () => void;
    onStatusChange?: (newStatus: string) => void;
    onOpenMap?: () => void;
}

const MassiveIncidentCard: React.FC<MassiveIncidentCardProps> = ({ incident, affectedFailures = [], isAutoFlipped = false, onNavigateToLogin, onStatusChange, onOpenMap }) => {
    const [elapsed, setElapsed] = useState('');
    const [isManualFlipped, setIsManualFlipped] = useState(false);
    const [showBitacora, setShowBitacora] = useState(false);

    // Combine manual interaction with auto-flip logic
    const isFlipped = isManualFlipped || isAutoFlipped;

    // Icon Logic
    const isMailActive = incident.email_status_isp === 'OK';
    const hasSlackThread = Boolean(incident.slack_thread_ts);
    const slackUrl = hasSlackThread
        ? `https://app.slack.com/client/T28BJ8LUE/C07FZE49ZPW/thread/C07FZE49ZPW-${incident.slack_thread_ts}`
        : '#';

    // Update timer every minute
    useEffect(() => {
        const updateTime = () => {
            const start = new Date(incident.start_time).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, now - start);

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // Format: "1h 57m"
            setElapsed(`${hours}h ${minutes}m`);
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [incident.start_time]);

    // Handle Flip
    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent flip if clicking specific buttons (like external links if we add them later)
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
        setIsManualFlipped(!isManualFlipped);
    };

    // Metrics Logic
    const affectedCount = Math.max(incident.current_active_count || 0, affectedFailures.length || 0);

    const totalInventory = incident.total_provider_inventory || 0;

    const impactPercentage = totalInventory > 0
        ? Math.round((affectedCount / totalInventory) * 100)
        : 0;

    const startDate = new Date(incident.start_time).toLocaleDateString();
    const startTime = new Date(incident.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const getProviderStyle = (storeProvider: string | undefined | null) => {
        if (!storeProvider) return 'hidden';

        const iName = incident.provider_name.toLowerCase().trim();
        const sName = storeProvider.toLowerCase().trim();

        if (sName.includes(iName) || iName.includes(sName)) {
            return 'text-red-500 font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.4)]';
        } else {
            return 'text-emerald-500 font-medium opacity-80';
        }
    };

    return (
        // CONTAINER WRAPPER with dynamic height transition
        <div
            className={`perspective-1000 group w-full cursor-pointer relative select-none transition-[height] duration-500 ease-in-out ${isFlipped ? 'h-[500px]' : 'h-[200px]'}`}
            onClick={handleCardClick}
        >
            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                {/* ================= FRONT FACE (RED ALERT) ================= */}
                {/* Added pointer-events-none when flipped to prevent front face from blocking back face clicks */}
                <div className={`absolute inset-0 backface-hidden rounded-2xl bg-[#B91C1C] text-white shadow-xl shadow-red-900/40 p-5 flex flex-col justify-between overflow-hidden transition-opacity duration-300 ${isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>

                    {/* Decorative Background Element */}
                    <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none group-hover:opacity-15 transition-opacity duration-500">
                        <Zap className="w-40 h-40" fill="currentColor" />
                    </div>

                    {/* --- TOP ROW: PILLS --- */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex gap-2">
                            {/* Country Pill */}
                            <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md border border-black/5">
                                <Globe className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{incident.country || 'N/A'}</span>
                            </div>

                            {/* Type Pill */}
                            <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md border border-black/5">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">MASIVA</span>
                            </div>
                        </div>

                        {/* Timer Pill */}
                        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-sm">
                            <Clock className="w-3 h-3 opacity-90" />
                            <span className="text-[11px] font-black font-mono tracking-wide">{elapsed}</span>
                        </div>
                    </div>

                    {/* --- MIDDLE ROW: PROVIDER TITLE --- */}
                    <div className="relative z-10 flex flex-col justify-start flex-1 min-h-0 pt-4 pb-1">
                        <h1 className="text-2xl md:text-3xl font-black uppercase leading-tight tracking-tight drop-shadow-md line-clamp-2" title={incident.provider_name}>
                            {incident.provider_name}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-1 text-red-100/90">
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Falla de ISP Detectada</span>
                        </div>
                    </div>

                    {/* --- BOTTOM ROW: METRICS & ACTION --- */}
                    <div className="relative z-10 flex items-end justify-between border-t border-white/20 pt-2 mt-auto">

                        {/* Affected Count & Map Action - ALIGNED HORIZONTALLY */}
                        <div className="flex flex-col gap-1">
                            <span className="block text-[9px] font-bold uppercase tracking-widest opacity-80">
                                Tiendas Afectadas
                            </span>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Store className="w-5 h-5" />
                                    <span className="text-3xl font-black leading-none">{affectedCount}</span>
                                </div>

                                {/* Option 1: Quick Map Access Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenMap) onOpenMap();
                                    }}
                                    className={`flex items-center gap-1.5 w-max px-2.5 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm 
                                        ${affectedFailures.some(f => f.coordenadas_geo)
                                            ? 'bg-red-950/40 text-red-200 border-red-500/30 hover:bg-red-900/60 hover:border-red-500/50 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                            : 'bg-black/20 text-white/50 border-white/10 opacity-50 cursor-not-allowed'
                                        } pointer-events-auto`}
                                    title={affectedFailures.some(f => f.coordenadas_geo) ? 'Ver Impacto en Mapa' : 'Sin coordenadas registradas'}
                                >
                                    <MapPinned className="w-3.5 h-3.5" />
                                    Mapa
                                </button>
                            </div>
                        </div>

                        {/* Status Badge Button */}
                        <div className="flex items-center">
                            <div className="px-4 py-1.5 rounded-md border border-white/30 bg-white/20 backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                                    {incident.status?.toUpperCase() || 'ACTIVA'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Gradient for depth */}
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                </div>

                {/* ================= BACK FACE (DETAILS & LIST) ================= */}
                {/* Added pointer-events-auto only when flipped */}
                <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}>

                    {/* Header Strip */}
                    <div className="h-1.5 w-full bg-[#B91C1C] shrink-0"></div>

                    <div className="p-5 flex-1 flex flex-col min-h-0">

                        {/* Header Info */}
                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-900 shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white leading-tight uppercase">{incident.provider_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                        {incident.country}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">ID: {String(incident.id).substring(0, 6)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end text-zinc-400 text-[10px] font-mono mb-0.5">
                                    <Calendar className="w-3 h-3" /> {startDate}
                                </div>
                                <div className="flex items-center gap-1 justify-end text-zinc-400 text-[10px] font-mono">
                                    <Clock className="w-3 h-3" /> {startTime}
                                </div>
                            </div>
                        </div>

                        {/* --- ICONS ROW --- */}
                        <div className="flex items-center justify-center gap-4 mb-4 shrink-0 bg-zinc-900/50 py-2 rounded-lg border border-zinc-800/50">

                            {/* 1. MAIL ICON */}
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isMailActive
                                    ? 'bg-orange-600 text-white border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                                    : 'bg-zinc-900 text-zinc-700 border-zinc-800'
                                    }`}
                                title={isMailActive ? "Correo Masivo Enviado" : "Correo Inactivo"}
                            >
                                <Mail className="w-4 h-4" />
                            </div>

                            {/* 2. SLACK ICON (LINKED) */}
                            {hasSlackThread ? (
                                <a
                                    href={slackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all bg-[#4A154B] text-white border-[#6e226f] shadow-[0_0_8px_rgba(74,21,75,0.5)] hover:bg-[#5c1b5e] hover:scale-105 cursor-pointer"
                                    title="Ir al Hilo de Slack"
                                >
                                    <Slack className="w-4 h-4" />
                                </a>
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all bg-zinc-900/50 text-zinc-700 border-zinc-800"
                                    title="Sin hilo de Slack"
                                >
                                    <Slack className="w-4 h-4" />
                                </div>
                            )}

                            {/* 3. JIRA/TICKET ICON (Placeholder for now as per prompt instructions, inactive) */}
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all bg-zinc-900/50 text-zinc-700 border-zinc-800"
                                title="Sin Ticket Jira"
                            >
                                <Trello className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Impacto Proveedor</span>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-orange-500" />
                                    <span className="text-lg font-mono font-bold text-white">{impactPercentage}%</span>
                                </div>
                                <div className="w-full bg-zinc-800 h-1 rounded-full mt-1 overflow-hidden">
                                    <div className="bg-orange-500 h-full" style={{ width: `${Math.min(impactPercentage, 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Total Inventario</span>
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    <span className="text-lg font-mono font-bold text-white">{totalInventory}</span>
                                </div>
                                <span className="text-[9px] text-zinc-600">Sitios con este ISP</span>
                            </div>
                        </div>

                        {/* Affected Stores List (TABLE STYLE) */}
                        <div className="flex-1 min-h-0 flex flex-col mb-4">
                            <div className="flex items-center justify-between mb-2 shrink-0">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tiendas Afectadas ({affectedFailures.length})</span>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 bg-zinc-900 border border-zinc-800 rounded-t-lg px-3 py-2 shrink-0">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-left">Tienda</span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">W1</span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">W2</span>
                            </div>

                            {/* Scrollable Rows */}
                            <div className="flex-1 overflow-y-auto bg-zinc-900/30 border-x border-b border-zinc-900 rounded-b-lg p-0 scrollbar-thin scrollbar-thumb-zinc-700 pointer-events-auto z-10">
                                {affectedFailures.length > 0 ? (
                                    <div className="flex flex-col">
                                        {affectedFailures.map((fail, index) => (
                                            <div
                                                key={fail.id}
                                                className={`grid grid-cols-[1.5fr_1fr_1fr] gap-2 px-3 py-2 border-b border-zinc-900/50 items-center hover:bg-zinc-900/50 transition-colors ${index % 2 === 0 ? 'bg-zinc-950/30' : 'bg-transparent'}`}
                                            >
                                                {/* Store Column (Inline Code + Name) */}
                                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                                    <span className="text-[10px] font-bold text-blue-400 font-mono shrink-0 bg-blue-900/10 px-1.5 rounded border border-blue-900/20">
                                                        {fail.codigo_tienda || 'N/A'}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-zinc-200 truncate leading-none" title={fail.nombre_tienda}>{fail.nombre_tienda || fail.network_id}</span>
                                                </div>

                                                {/* WAN 1 Column */}
                                                <div className={`text-[9px] uppercase tracking-tighter text-center truncate ${getProviderStyle(fail.wan1_provider_name)}`}>
                                                    {fail.wan1_provider_name || '-'}
                                                </div>

                                                {/* WAN 2 Column */}
                                                <div className={`text-[9px] uppercase tracking-tighter text-center truncate ${getProviderStyle(fail.wan2_provider_name)}`}>
                                                    {fail.wan2_provider_name || '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] italic p-4">
                                        No hay detalle de tiendas disponible
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto shrink-0 flex flex-col gap-2">
                            {/* Bitacora Button - Updated to Solid Yellow style */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBitacora(true);
                                }}
                                className="w-full py-2 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-yellow-500 shadow-sm shrink-0 pointer-events-auto cursor-pointer"
                            >
                                <Notebook className="w-4 h-4" /> Bitácora
                            </button>

                            {/* Flip Back Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsManualFlipped(false);
                                }}
                                className="w-full py-2 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-zinc-800 shrink-0 pointer-events-auto cursor-pointer"
                            >
                                <Undo2 className="w-4 h-4" /> Volver
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Bitacora */}
            {
                showBitacora && (
                    <BitacoraModal
                        failureId={incident.id}
                        networkId={String(incident.id)} // Use Massive Incident ID as Network ID proxy for display
                        storeName={`${incident.provider_name} (${incident.country})`}
                        onClose={() => setShowBitacora(false)}
                        tableName='massive_incidents_jj' // Target massive incidents table
                        onNavigateToLogin={onNavigateToLogin}
                        onStatusChange={onStatusChange}
                    />
                )
            }
        </div >
    );
};

export default MassiveIncidentCard;
