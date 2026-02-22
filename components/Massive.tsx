
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { getFriendlyErrorMessage, isNetworkError } from '../utils/errorHandling';
import { MassiveIncident, NetworkFailure } from '../types';
import MassiveIncidentCard from './MassiveIncidentCard';
import { Radio, Loader2, Search, Filter, AlertTriangle, CheckCircle2, History, X, RefreshCw, Calendar, Clock, Globe, ChevronDown, ChevronUp, Store, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { MOCK_MASSIVE } from '../constants';

// --- CUSTOM CALENDAR RANGE PICKER COMPONENT (Reused) ---
interface DateRange {
    start: Date | null;
    end: Date | null;
}

interface CalendarWidgetProps {
    range: DateRange;
    onChange: (range: DateRange) => void;
    onClose: () => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ range, onChange, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        let newRange = { ...range };

        if (!newRange.start || (newRange.start && newRange.end)) {
            newRange = { start: clickedDate, end: null };
        } else {
            if (clickedDate < newRange.start) {
                newRange = { start: clickedDate, end: newRange.start };
            } else {
                newRange = { start: newRange.start, end: clickedDate };
            }
        }
        onChange(newRange);
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            const isStart = isSameDay(currentDate, range.start);
            const isEnd = isSameDay(currentDate, range.end);
            const isInRange = range.start && range.end && currentDate > range.start && currentDate < range.end;
            const isToday = isSameDay(currentDate, new Date());

            let bgClass = 'hover:bg-zinc-800 text-zinc-300';
            if (isStart || isEnd) bgClass = 'bg-red-600 text-white font-bold shadow-md shadow-red-900/50'; // Red theme for Massive
            else if (isInRange) bgClass = 'bg-red-600/20 text-red-200';

            let roundedClass = 'rounded-md';
            if (range.start && range.end) {
                if (isStart && !isSameDay(range.start, range.end)) roundedClass = 'rounded-l-md rounded-r-none';
                if (isEnd && !isSameDay(range.start, range.end)) roundedClass = 'rounded-r-md rounded-l-none';
                if (isInRange) roundedClass = 'rounded-none';
            }

            days.push(
                <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); handleDayClick(i); }}
                    className={`h-8 w-full flex items-center justify-center text-xs transition-all ${bgClass} ${roundedClass} ${isToday && !isStart && !isEnd ? 'border border-red-500/50' : ''}`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 w-72 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-bold text-white capitalize">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 mb-2 text-center">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-zinc-600">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {renderDays()}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center">
                <button onClick={() => { const t = new Date(); onChange({ start: t, end: t }); }} className="text-[10px] text-zinc-500 hover:text-red-400 font-medium">Hoy</button>
                <button onClick={onClose} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold">Cerrar</button>
            </div>
        </div>
    );
};

const Massive: React.FC = () => {
    const [incidents, setIncidents] = useState<MassiveIncident[]>([]);
    const [failures, setFailures] = useState<NetworkFailure[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [searchTerm, setSearchTerm] = useState('');

    // Date Range State
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // State for expanding history items
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | number | null>(null);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(() => fetchData(true), 60000); // Auto refresh en tiempo real cada 1 min

        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            clearInterval(intervalId);
        };
    }, []);

    const fetchData = async (isBackgroundSync = false) => {
        if (!isBackgroundSync) setLoading(true);
        try {
            if (isDemoMode) {
                setIncidents([
                    ...MOCK_MASSIVE,
                    {
                        id: 999,
                        provider_name: 'ETB Fibra',
                        country: 'CO',
                        status: 'Resuelta',
                        recovery_status: 'Finalizada',
                        current_active_count: 5,
                        total_provider_inventory: 50,
                        recovery_percentage: 100,
                        start_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 48h ago
                        end_time: new Date(Date.now() - 1000 * 60 * 60 * 45).toISOString()
                    } as MassiveIncident
                ]);

                if (failures.length === 0) {
                    setFailures([
                        { id: 'h1', network_id: 'CO-001', codigo_tienda: 'T-101', nombre_tienda: 'Bogota Centro', wan1_provider_name: 'ETB Fibra', wan2_provider_name: 'CLARO', wan1_massive_incident_id: 999 } as any,
                        { id: 'h2', network_id: 'CO-002', codigo_tienda: 'T-102', nombre_tienda: 'Bogota Norte', wan1_provider_name: 'ETB Fibra', wan2_provider_name: 'MOVISTAR', wan1_massive_incident_id: 999 } as any,
                        { id: 'h3', network_id: 'CO-003', codigo_tienda: 'T-103', nombre_tienda: 'Cali Sur', wan1_provider_name: 'ETB Fibra', wan2_provider_name: 'TIGO', wan1_massive_incident_id: 999 } as any,
                        { id: 'h4', network_id: 'CO-004', codigo_tienda: 'T-104', nombre_tienda: 'Medellin Plaza', wan1_provider_name: 'ETB Fibra', wan2_provider_name: 'CLARO', wan1_massive_incident_id: 999 } as any,
                        { id: 'h5', network_id: 'CO-005', codigo_tienda: 'T-105', nombre_tienda: 'Cartagena Mall', wan1_provider_name: 'ETB Fibra', wan2_provider_name: 'MOVISTAR', wan1_massive_incident_id: 999 } as any,
                    ]);
                }

                setLoading(false);
                return;
            }

            // Parallelize fetches
            const [massRes, failRes] = await Promise.all([
                supabase
                    .from('massive_incidents_jj')
                    .select('*')
                    .order('start_time', { ascending: false }),
                supabase
                    .from('network_failures_jj')
                    .select('*')
                    .eq('es_falla_masiva', true)
                    .limit(1000)
            ]);

            if (massRes.error) throw massRes.error;
            const massData = massRes.data;
            const failData = failRes.data;

            // Join inventory data for names
            let enrichedFailures: NetworkFailure[] = [];
            if (failData && failData.length > 0) {
                const ids = [...new Set(failData.map((f: any) => f.network_id))];
                const { data: invData } = await supabase
                    .from('devices_inventory_jj')
                    .select('network_id, nombre_tienda, codigo_tienda, wan1_provider:isp_providers_jj!wan1_provider_id(name), wan2_provider:isp_providers_jj!wan2_provider_id(name)')
                    .in('network_id', ids);

                enrichedFailures = failData.map((f: any) => {
                    const inv = invData?.find((i: any) => i.network_id === f.network_id);
                    return {
                        ...f,
                        nombre_tienda: inv?.nombre_tienda || f.nombre_tienda,
                        codigo_tienda: inv?.codigo_tienda || null,
                        wan1_provider_name: inv?.wan1_provider?.name,
                        wan2_provider_name: inv?.wan2_provider?.name
                    }
                });
            }

            setIncidents(massData as MassiveIncident[] || []);
            setFailures(enrichedFailures);

        } catch (err: any) {
            console.warn("Error fetching massive incidents:", err);
            if (isNetworkError(err)) {
                // Fallback to mock data if fetch fails
                setIncidents([
                    ...MOCK_MASSIVE,
                    {
                        id: 999,
                        provider_name: 'ETB Fibra',
                        country: 'CO',
                        status: 'Resuelta',
                        recovery_status: 'Finalizada',
                        current_active_count: 5,
                        total_provider_inventory: 50,
                        recovery_percentage: 100,
                        start_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                        end_time: new Date(Date.now() - 1000 * 60 * 60 * 45).toISOString()
                    } as MassiveIncident
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER: Determine color for provider in table ---
    const getProviderStyle = (incidentProvider: string, storeProvider: string | undefined | null) => {
        if (!storeProvider) return 'text-zinc-600 hidden';

        const iName = incidentProvider.toLowerCase().trim();
        const sName = storeProvider.toLowerCase().trim();

        // If this provider matches the massive incident provider, highlight RED
        if (sName.includes(iName) || iName.includes(sName)) {
            return 'text-red-500 font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.4)]';
        }
        // Otherwise it's the backup/other link, highlight GREEN
        else {
            return 'text-emerald-500 font-medium opacity-80';
        }
    };

    // --- FILTER LOGIC ---
    const activeIncidents = incidents.filter(i =>
        i.status === 'Activa' || i.status === 'En observación' || i.status === 'Pendiente por cierre'
    );

    // Historical: "Resuelta" ONLY as requested
    const historyIncidents = incidents.filter(i =>
        i.status === 'Resuelta'
    );

    const displayedIncidents = activeTab === 'active' ? activeIncidents : historyIncidents;

    const filteredDisplay = useMemo(() => {
        return displayedIncidents.filter(i => {
            // 1. Text Search
            const textMatch = i.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.country.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Date Match
            let dateMatch = true;
            if (dateRange.start) {
                const incDate = new Date(i.start_time);
                incDate.setHours(0, 0, 0, 0);

                const start = new Date(dateRange.start);
                start.setHours(0, 0, 0, 0);

                if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(23, 59, 59, 999);
                    dateMatch = incDate.getTime() >= start.getTime() && incDate.getTime() <= end.getTime();
                } else {
                    dateMatch = incDate.getTime() === start.getTime();
                }
            }

            return textMatch && dateMatch;
        });
    }, [displayedIncidents, searchTerm, dateRange]);

    const getDuration = (start: string, end?: string) => {
        if (!end) return 'En curso';
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diffMins = Math.floor((e - s) / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    // Helper to display date range string
    const getDateRangeLabel = () => {
        if (!dateRange.start) return "Filtrar por Fecha";
        const startStr = dateRange.start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        if (!dateRange.end || dateRange.start.getTime() === dateRange.end.getTime()) {
            return startStr;
        }
        const endStr = dateRange.end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return `${startStr} - ${endStr}`;
    };

    return (
        <div className="p-4 md:p-8 h-screen flex flex-col bg-black overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <Radio className="text-red-500 animate-pulse" />
                        Gestión de Fallas Masivas
                    </h1>
                    <p className="text-zinc-500 text-xs md:text-sm mt-1">
                        Monitoreo y auditoría de incidentes de infraestructura ISP
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                    <button
                        onClick={() => { setActiveTab('active'); setDateRange({ start: null, end: null }); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'active' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        En Curso ({activeIncidents.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setDateRange({ start: null, end: null }); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Historial ({historyIncidents.length})
                    </button>
                </div>
            </div>

            {/* Toolbar - ALIGNED RIGHT */}
            <div className="flex flex-col md:flex-row md:justify-end items-center gap-3 mb-6">

                {/* CALENDAR PICKER */}
                <div className="relative w-full md:w-auto z-30" ref={calendarRef}>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full md:w-48 flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm ${dateRange.start
                            ? 'bg-zinc-900 border-red-500/50 text-white ring-1 ring-red-500/20'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <CalendarDays className={`w-4 h-4 ${dateRange.start ? 'text-red-500' : 'text-zinc-500'}`} />
                            <span className="truncate text-xs font-medium">{getDateRangeLabel()}</span>
                        </div>
                        {dateRange.start ? (
                            <div
                                onClick={(e) => { e.stopPropagation(); setDateRange({ start: null, end: null }); }}
                                className="p-0.5 hover:bg-zinc-800 rounded-full cursor-pointer"
                            >
                                <X className="w-3 h-3 text-zinc-500" />
                            </div>
                        ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-600" />
                        )}
                    </button>

                    {showCalendar && (
                        <CalendarWidget
                            range={dateRange}
                            onChange={(r) => setDateRange(r)}
                            onClose={() => setShowCalendar(false)}
                        />
                    )}
                </div>

                {/* SEARCH INPUT - Fixed width (Compact on right) */}
                <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar proveedor o país..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-8 text-sm text-zinc-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* REFRESH BUTTON */}
                <button
                    onClick={fetchData}
                    className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors shrink-0"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                    </div>
                ) : filteredDisplay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-xl">
                        <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-bold">No hay incidentes encontrados</p>
                        <p className="text-sm mt-1">
                            {dateRange.start ? 'Intente cambiar el rango de fechas.' : 'Todo parece estar operando normalmente.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* --- ACTIVE VIEW: CARDS --- */}
                        {activeTab === 'active' ? (
                            <div className="space-y-8">
                                {['Activa', 'En observación', 'Pendiente por cierre'].map(statusGroup => {
                                    const groupIncidents = filteredDisplay.filter(i => i.status === statusGroup);
                                    if (groupIncidents.length === 0) return null;
                                    return (
                                        <div key={statusGroup}>
                                            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                                                {statusGroup === 'Activa' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : statusGroup === 'En observación' ? <Search className="w-5 h-5 text-yellow-500" /> : <Clock className="w-5 h-5 text-blue-500" />}
                                                {statusGroup} ({groupIncidents.length})
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {groupIncidents.map(incident => {
                                                    const affected = failures.filter(f =>
                                                        (String(f.wan1_massive_incident_id) === String(incident.id) || String(f.wan2_massive_incident_id) === String(incident.id))
                                                    );
                                                    return (
                                                        <MassiveIncidentCard
                                                            key={incident.id}
                                                            incident={incident}
                                                            affectedFailures={affected}
                                                            onStatusChange={() => {
                                                                fetchData(); // Force refresh on status change
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* --- HISTORICAL VIEW: EXPANDABLE LIST --- */
                            <div className="space-y-3">
                                {filteredDisplay.map(incident => {
                                    const isExpanded = expandedHistoryId === incident.id;

                                    // Get affected failures for this incident (details)
                                    const affected = failures.filter(f =>
                                        (String(f.wan1_massive_incident_id) === String(incident.id) || String(f.wan2_massive_incident_id) === String(incident.id))
                                    );

                                    // Fix: Use the maximum count found to avoid "21 vs 128" discrepancies in history
                                    // For history, the detail list count is usually the most accurate "Total Impact"
                                    const displayCount = Math.max(incident.current_active_count, affected.length);

                                    return (
                                        <div key={incident.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden hover:bg-zinc-900/60 transition-all group">

                                            {/* Main Bar (Clickable) */}
                                            <div
                                                onClick={() => setExpandedHistoryId(isExpanded ? null : incident.id)}
                                                className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer relative z-20 bg-zinc-900/40"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Status Icon Box */}
                                                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-green-400 group-hover:bg-green-500/10 transition-colors shrink-0">
                                                        <CheckCircle2 className="w-6 h-6" />
                                                    </div>

                                                    {/* Incident Summary */}
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-lg font-black text-white">{incident.provider_name}</h3>
                                                            <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold text-zinc-400 border border-zinc-700 uppercase">
                                                                {incident.recovery_status || 'Finalizada'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                            <span className="flex items-center gap-1 font-bold text-zinc-400">
                                                                <Globe className="w-3 h-3" /> {incident.country}
                                                            </span>
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Calendar className="w-3 h-3" /> {new Date(incident.start_time).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metrics Section */}
                                                <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 border-zinc-800 pt-3 md:pt-0 pl-0 md:pl-8">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Duración</span>
                                                        <span className="text-sm font-mono font-bold text-zinc-300">
                                                            {getDuration(incident.start_time, incident.end_time || new Date().toISOString())}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Sitios Afectados</span>
                                                        <span className="text-sm font-mono font-bold text-white">{displayCount}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Hora Cierre</span>
                                                        <span className="text-sm font-mono font-bold text-zinc-300">
                                                            {incident.end_time ? new Date(incident.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </span>
                                                    </div>
                                                    <div className={`ml-2 text-zinc-600 group-hover:text-white transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                                        <ChevronDown className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Detail View - ANIMATED WITH CSS GRID */}
                                            <div
                                                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                                    }`}
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="border-t border-zinc-800 bg-zinc-950/50 p-4">
                                                        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                                            <Store className="w-3.5 h-3.5" />
                                                            Detalle de Tiendas Afectadas ({affected.length})
                                                        </div>

                                                        <div className="border border-zinc-800 rounded-lg overflow-hidden">
                                                            {/* Table Header */}
                                                            <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 bg-zinc-900/80 px-4 py-2 border-b border-zinc-800">
                                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tienda</span>
                                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">W1</span>
                                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">W2</span>
                                                            </div>

                                                            {/* Table Body */}
                                                            <div className="max-h-60 overflow-y-auto bg-zinc-900/20">
                                                                {affected.length > 0 ? (
                                                                    affected.map((fail, idx) => (
                                                                        <div
                                                                            key={fail.id}
                                                                            className={`grid grid-cols-[1.5fr_1fr_1fr] gap-2 px-4 py-2 border-b border-zinc-800/50 items-center hover:bg-zinc-900/40 transition-colors ${idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-transparent'}`}
                                                                        >
                                                                            {/* Store Info */}
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span className="text-[10px] font-bold text-blue-400 font-mono shrink-0 bg-blue-900/10 px-1.5 rounded border border-blue-900/20">
                                                                                    {fail.codigo_tienda || 'N/A'}
                                                                                </span>
                                                                                <span className="text-[11px] font-medium text-zinc-300 truncate" title={fail.nombre_tienda}>
                                                                                    {fail.nombre_tienda || fail.network_id}
                                                                                </span>
                                                                            </div>

                                                                            {/* W1 Provider */}
                                                                            <div className={`text-[10px] uppercase tracking-wide text-center truncate ${getProviderStyle(incident.provider_name, fail.wan1_provider_name)}`}>
                                                                                {fail.wan1_provider_name || '-'}
                                                                            </div>

                                                                            {/* W2 Provider */}
                                                                            <div className={`text-[10px] uppercase tracking-wide text-center truncate ${getProviderStyle(incident.provider_name, fail.wan2_provider_name)}`}>
                                                                                {fail.wan2_provider_name || '-'}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-6 text-center text-zinc-500 text-xs italic">
                                                                        No hay detalle de tiendas disponible para este histórico.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Massive;
