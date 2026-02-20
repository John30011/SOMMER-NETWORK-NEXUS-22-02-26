
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { NetworkFailure } from '../types';
import { MOCK_FAILURES } from '../constants';
import { CheckCircle, Search, Calendar, Clock, RotateCw, AlertTriangle, FileCheck, MapPin, ExternalLink, X, ListFilter, Timer, ArrowRight, History, BarChart2, TrendingDown, Server, ShieldCheck, CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import BitacoraModal from './BitacoraModal';

// --- CUSTOM CALENDAR RANGE PICKER COMPONENT ---
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
    const [viewDate, setViewDate] = useState(new Date()); // Controls the month currently viewed

    // Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

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
            // Start new selection (reset if full range existed)
            newRange = { start: clickedDate, end: null };
        } else {
            // We have a start, assume this is end
            if (clickedDate < newRange.start) {
                // If clicked before start, swap or reset
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
        const startDay = getFirstDayOfMonth(year, month); // 0-6
        
        const days = [];
        
        // Empty slots for prev month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            
            // Determine styling based on selection
            const isStart = isSameDay(currentDate, range.start);
            const isEnd = isSameDay(currentDate, range.end);
            const isInRange = range.start && range.end && currentDate > range.start && currentDate < range.end;
            const isToday = isSameDay(currentDate, new Date());

            let bgClass = 'hover:bg-zinc-800 text-zinc-300';
            if (isStart || isEnd) bgClass = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/50';
            else if (isInRange) bgClass = 'bg-blue-600/20 text-blue-200';
            
            // Rounding for range visuals
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
                    className={`h-8 w-full flex items-center justify-center text-xs transition-all ${bgClass} ${roundedClass} ${isToday && !isStart && !isEnd ? 'border border-blue-500/50' : ''}`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="absolute top-full right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 w-72 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-bold text-white capitalize">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 mb-2 text-center">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-zinc-600">{d}</span>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {renderDays()}
            </div>

            {/* Footer / Presets */}
            <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center">
                <button 
                    onClick={() => {
                        const today = new Date();
                        onChange({ start: today, end: today });
                    }}
                    className="text-[10px] text-zinc-500 hover:text-blue-400 font-medium"
                >
                    Hoy
                </button>
                <button 
                    onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - 7);
                        onChange({ start, end });
                    }}
                    className="text-[10px] text-zinc-500 hover:text-blue-400 font-medium"
                >
                    Últ. 7 días
                </button>
                <button onClick={onClose} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold">
                    Cerrar
                </button>
            </div>
        </div>
    );
};


const Resolved: React.FC = () => {
  const [failures, setFailures] = useState<NetworkFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [showBitacoraId, setShowBitacoraId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchResolvedIncidents();
    
    // Close calendar on click outside
    const handleClickOutside = (event: MouseEvent) => {
        if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
            setShowCalendar(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  const fetchResolvedIncidents = async () => {
    setLoading(true);
    try {
      let fetchedFailures: NetworkFailure[] = [];

      if (isDemoMode) {
        // Mock data filtering
        fetchedFailures = MOCK_FAILURES.filter(f => f.lifecycle_stage === 'Resuelta' || f.lifecycle_stage === 'Falso Positivo');
        // Add some dummy resolved items for demo visualization if list is empty
        if (fetchedFailures.length === 0) {
            fetchedFailures = [
                {
                    id: 901,
                    network_id: 'L_MOCK_RES_001',
                    nombre_tienda: 'Tienda Ejemplo Histórico',
                    codigo_tienda: 'T-HIST',
                    lifecycle_stage: 'Resuelta',
                    site_impact: 'TOTAL',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
                    wan1_status: 'UP',
                    wan1_provider_name: 'CANTV',
                    wan2_status: 'UP',
                    wan2_provider_name: 'INTER',
                    pais: 'VENEZUELA',
                    total_downtime_minutes: 145, // Demo Total Failure
                    wan1_downtime_minutes: 145,
                    wan2_downtime_minutes: 140
                } as NetworkFailure,
                {
                    id: 902,
                    network_id: 'L_MOCK_RES_002',
                    nombre_tienda: 'Tienda Parcial WAN1',
                    codigo_tienda: 'T-PAR1',
                    lifecycle_stage: 'Resuelta',
                    site_impact: 'PARCIAL',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
                    wan1_status: 'UP',
                    wan1_provider_name: 'MOVISTAR',
                    wan2_status: 'UP',
                    wan2_provider_name: 'CLARO',
                    pais: 'COLOMBIA',
                    wan1_downtime_minutes: 45, // Demo Partial WAN1
                    wan2_downtime_minutes: 0,
                    total_downtime_minutes: 0
                } as NetworkFailure,
                 {
                    id: 903,
                    network_id: 'L_MOCK_RES_003',
                    nombre_tienda: 'Tienda Centro Lima',
                    codigo_tienda: 'T-LIMA',
                    lifecycle_stage: 'Resuelta',
                    site_impact: 'TOTAL',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // 28h ago
                    wan1_status: 'UP',
                    wan1_provider_name: 'CLARO',
                    wan2_status: 'UP',
                    wan2_provider_name: 'MOVISTAR',
                    pais: 'PERU',
                    total_downtime_minutes: 320, 
                    wan1_downtime_minutes: 320,
                    wan2_downtime_minutes: 300
                } as NetworkFailure
            ];
        }
      } else {
        // Real fetch
        // 1. Fetch Failures with status 'Resuelta' or 'Falso Positivo'
        // Increase limit to allow client-side filtering of recent items
        const { data: failData, error: failError } = await supabase
          .from('network_failures_jj')
          .select('*')
          .in('lifecycle_stage', ['Resuelta', 'Falso Positivo'])
          .order('start_time', { ascending: false })
          .limit(300); // Increased limit

        if (failError) throw failError;

        if (failData && failData.length > 0) {
            const networkIds = failData.map((f: any) => f.network_id);
            
            // 2. Fetch Store Details to join names
            const { data: invData } = await supabase
                .from('devices_inventory_jj')
                .select(`
                  network_id, 
                  nombre_tienda, 
                  codigo_tienda, 
                  meraki_url,
                  pais,
                  wan1_provider:isp_providers_jj!wan1_provider_id(name),
                  wan2_provider:isp_providers_jj!wan2_provider_id(name)
                `)
                .in('network_id', networkIds);
  
            fetchedFailures = failData.map((f: any) => {
                const invMatch: any = invData?.find((i: any) => i.network_id === f.network_id);
                return {
                    ...f,
                    nombre_tienda: invMatch?.nombre_tienda || f.nombre_tienda,
                    codigo_tienda: invMatch?.codigo_tienda || null,
                    meraki_url: invMatch?.meraki_url || null,
                    pais: invMatch?.pais || null,
                    wan1_provider_name: invMatch?.wan1_provider?.name || null,
                    wan2_provider_name: invMatch?.wan2_provider?.name || null
                };
            });
        }
      }

      // 3. FILTER LOGIC: ONLY SHOW IF > 24 HOURS OLD (Closed more than 24h ago)
      const now = new Date().getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      const historicalFailures = fetchedFailures.filter(f => {
          // Calculate approx end time
          const start = new Date(f.start_time).getTime();
          const durationMinutes = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
          const endTimestamp = start + (durationMinutes * 60 * 1000);

          // ONLY keep if it ended MORE than 24 hours ago
          return (now - endTimestamp) > ONE_DAY_MS;
      });

      setFailures(historicalFailures);
    } catch (err) {
      console.error("Error fetching resolved incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFailures = useMemo(() => {
    return failures.filter(f => {
        // Text Search
        const term = searchTerm.toLowerCase();
        const searchString = `${f.network_id} ${f.nombre_tienda} ${f.codigo_tienda} ${f.wan1_provider_name} ${f.wan2_provider_name}`.toLowerCase();
        const matchesSearch = searchString.includes(term);

        // Date Range Filter Logic
        let matchesDate = true;
        if (dateRange.start) {
            const incDate = new Date(f.start_time);
            incDate.setHours(0,0,0,0); // Normalize to midnight for comparison

            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0);

            if (dateRange.end) {
                const end = new Date(dateRange.end);
                end.setHours(23,59,59,999); // End of day
                matchesDate = incDate.getTime() >= start.getTime() && incDate.getTime() <= end.getTime();
            } else {
                // Single day selection
                matchesDate = incDate.getTime() === start.getTime();
            }
        }

        return matchesSearch && matchesDate;
    });
  }, [failures, searchTerm, dateRange]);

  // --- KPI CALCULATION ---
  const metrics = useMemo(() => {
      const total = filteredFailures.length;
      if (total === 0) return { total: 0, totalImpactPercent: 0, avgDowntime: 0, topIsp: 'N/A' };

      const totalImpactCount = filteredFailures.filter(f => f.site_impact === 'TOTAL').length;
      const totalImpactPercent = Math.round((totalImpactCount / total) * 100);
      
      const totalMinutes = filteredFailures.reduce((acc, curr) => {
          const duration = curr.total_downtime_minutes || curr.wan1_downtime_minutes || 0;
          return acc + duration;
      }, 0);
      const avgDowntime = Math.round(totalMinutes / total);

      // Mode of ISP (WAN1)
      const ispCounts: Record<string, number> = {};
      filteredFailures.forEach(f => {
          const p = f.wan1_provider_name || 'Desconocido';
          ispCounts[p] = (ispCounts[p] || 0) + 1;
      });
      // Sort and pick top
      const topIsp = Object.entries(ispCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return { total, totalImpactPercent, avgDowntime, topIsp };
  }, [filteredFailures]);


  // Helper to format minutes into "Xh Ym"
  const formatDuration = (minutes: number | undefined | null) => {
      if (!minutes || minutes <= 0) return '0m';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
  };

  // Helper for End Time Calculation
  const getEndTime = (startIso: string, minutes: number | undefined | null) => {
      if (!minutes) return null;
      const d = new Date(startIso);
      return new Date(d.getTime() + minutes * 60000);
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
    <div className="p-4 md:p-8 h-screen flex flex-col bg-black overflow-hidden font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <History className="text-emerald-500" />
                    Historial de Resolución
                </h1>
                <p className="text-zinc-500 text-xs mt-1 font-medium">
                    Auditoría de incidentes cerrados (Antigüedad &gt; 24h)
                </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                 
                 {/* CALENDAR RANGE PICKER BUTTON */}
                 <div className="relative w-full md:w-auto" ref={calendarRef}>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full md:w-48 flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm ${
                            dateRange.start 
                            ? 'bg-zinc-900 border-emerald-500/50 text-white ring-1 ring-emerald-500/20' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <CalendarDays className={`w-4 h-4 ${dateRange.start ? 'text-emerald-500' : 'text-zinc-500'}`} />
                            <span className="truncate">{getDateRangeLabel()}</span>
                        </div>
                        {dateRange.start ? (
                            <div 
                                onClick={(e) => { e.stopPropagation(); setDateRange({start:null, end:null}); }}
                                className="p-0.5 hover:bg-zinc-800 rounded-full cursor-pointer"
                            >
                                <X className="w-3 h-3 text-zinc-500" />
                            </div>
                        ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-600" />
                        )}
                    </button>

                    {/* POPUP CALENDAR */}
                    {showCalendar && (
                        <CalendarWidget 
                            range={dateRange} 
                            onChange={(r) => setDateRange(r)} 
                            onClose={() => setShowCalendar(false)} 
                        />
                    )}
                 </div>

                 {/* Text Search Input */}
                 <div className="relative group flex-1 md:min-w-[300px] w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-emerald-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar por ID, Tienda, ISP..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-8 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                <button 
                    onClick={fetchResolvedIncidents}
                    className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors shadow-sm w-full md:w-auto flex justify-center"
                    title="Actualizar lista"
                >
                    <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>

        {/* METRICS ROW (KPIs) */}
        {filteredFailures.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FileCheck className="w-5 h-5" /></div>
                    <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Total Casos</span>
                        <span className="text-xl font-bold text-white font-mono">{metrics.total}</span>
                    </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><AlertTriangle className="w-5 h-5" /></div>
                    <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Impacto Total</span>
                        <span className="text-xl font-bold text-white font-mono">{metrics.totalImpactPercent}%</span>
                    </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Timer className="w-5 h-5" /></div>
                    <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Tiempo Promedio</span>
                        <span className="text-xl font-bold text-white font-mono">{formatDuration(metrics.avgDowntime)}</span>
                    </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Server className="w-5 h-5" /></div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">ISP Recurrente</span>
                        <span className="text-lg font-bold text-white truncate block" title={metrics.topIsp}>{metrics.topIsp}</span>
                    </div>
                </div>
            </div>
        )}

        {/* DATA TABLE CONTAINER */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex-1 flex flex-col shadow-2xl relative">
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-zinc-900/95 sticky top-0 z-20 backdrop-blur-md border-b border-zinc-800 shadow-sm">
                        <tr>
                            <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-[25%]">Tienda / Ubicación</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-[20%]">Línea de Tiempo</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-[15%]">Duración</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-[25%]">Proveedores (WAN)</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right w-[15%]">Auditoría</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-4" colSpan={5}><div className="h-8 bg-zinc-900/50 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredFailures.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="h-[50vh]">
                                    <div className="flex flex-col items-center justify-center h-full w-full text-zinc-500">
                                        <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 border border-zinc-800 shadow-inner">
                                            {dateRange.start ? <Calendar className="w-8 h-8 text-emerald-700" strokeWidth={1.5} /> : <FileCheck className="w-8 h-8 text-zinc-700" strokeWidth={1.5} />}
                                        </div>
                                        <h3 className="text-lg font-bold text-zinc-300 mb-1">Sin Registros Encontrados</h3>
                                        <p className="text-xs text-zinc-500 max-w-sm text-center">
                                            {dateRange.start
                                                ? `No hay incidentes resueltos registrados para el periodo seleccionado.`
                                                : "No se han encontrado incidentes resueltos con antigüedad > 24h que coincidan con su búsqueda."
                                            }
                                        </p>
                                        {dateRange.start && (
                                            <button onClick={() => setDateRange({start: null, end: null})} className="mt-4 text-emerald-500 hover:text-emerald-400 text-xs font-bold hover:underline">
                                                Limpiar fecha
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredFailures.map((failure) => {
                                const duration = failure.total_downtime_minutes || failure.wan1_downtime_minutes || 0;
                                const endTime = getEndTime(failure.start_time, duration);
                                const isTotal = failure.site_impact === 'TOTAL';

                                return (
                                <tr key={failure.id} className="hover:bg-zinc-900/40 transition-colors group">
                                    
                                    {/* COL 1: Store Identity */}
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-400 font-mono text-sm font-black bg-blue-900/10 px-2 py-0.5 rounded border border-blue-900/20 shrink-0">
                                                    {failure.codigo_tienda || 'N/A'}
                                                </span>
                                                <span className="text-base font-bold text-white truncate max-w-[220px]" title={failure.nombre_tienda}>
                                                    {failure.nombre_tienda}
                                                </span>
                                            </div>
                                            {/* Network ID Removed */}
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400 font-bold uppercase tracking-wide">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {failure.pais || '---'}
                                            </div>
                                        </div>
                                    </td>

                                    {/* COL 2: Timeline */}
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                <span className="font-mono text-[11px]">{new Date(failure.start_time).toLocaleString('es-ES', { month: 'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            {endTime && (
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    <span className="font-mono text-[11px]">{endTime.toLocaleString('es-ES', { month: 'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* COL 3: Duration & Impact */}
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Timer className="w-4 h-4 text-zinc-500" />
                                                <span className="text-lg font-mono font-bold text-white tracking-tight">
                                                    {formatDuration(duration)}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                                isTotal 
                                                ? 'bg-red-950/40 text-red-400 border-red-900/30' 
                                                : 'bg-yellow-950/40 text-yellow-400 border-yellow-900/30'
                                            }`}>
                                                {isTotal ? <AlertTriangle className="w-3 h-3"/> : <ShieldCheck className="w-3 h-3"/>}
                                                {failure.site_impact}
                                            </span>
                                        </div>
                                    </td>

                                    {/* COL 4: Providers Grid */}
                                    <td className="p-4 align-middle">
                                        <div className="grid grid-cols-1 gap-2">
                                            {(() => {
                                                // Determine failure state based on downtime history or current status (if not UP yet)
                                                // For resolved items, status is usually UP, so we rely on downtime metrics
                                                const wan1Failed = (failure.wan1_downtime_minutes || 0) > 0 || failure.wan1_status !== 'UP';
                                                const wan2Failed = (failure.wan2_downtime_minutes || 0) > 0 || failure.wan2_status !== 'UP';
                                                
                                                return (
                                                    <>
                                                        {/* WAN 1 */}
                                                        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded border transition-colors ${
                                                            wan1Failed
                                                            ? 'bg-red-950/20 border-red-900/30' 
                                                            : 'bg-zinc-900/30 border-zinc-800/30 opacity-60'
                                                        }`}>
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`text-[10px] font-black tracking-wider w-8 ${wan1Failed ? 'text-red-400' : 'text-zinc-600'}`}>WAN1</span>
                                                                <span className={`text-[10px] font-mono truncate max-w-[120px] ${wan1Failed ? 'text-red-200 font-bold' : 'text-zinc-500'}`} title={failure.wan1_provider_name || ''}>
                                                                    {failure.wan1_provider_name || '---'}
                                                                </span>
                                                            </div>
                                                            {wan1Failed ? (
                                                                <div className="relative flex h-2 w-2 mr-1" title={`Falla registrada (${failure.wan1_downtime_minutes || '?'} min)`}>
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                                                </div>
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-1.5" title="Sin incidentes"></div>
                                                            )}
                                                        </div>

                                                        {/* WAN 2 */}
                                                        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded border transition-colors ${
                                                            wan2Failed
                                                            ? 'bg-red-950/20 border-red-900/30' 
                                                            : 'bg-zinc-900/30 border-zinc-800/30 opacity-60'
                                                        }`}>
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`text-[10px] font-black tracking-wider w-8 ${wan2Failed ? 'text-red-400' : 'text-zinc-600'}`}>WAN2</span>
                                                                <span className={`text-[10px] font-mono truncate max-w-[120px] ${wan2Failed ? 'text-red-200 font-bold' : 'text-zinc-500'}`} title={failure.wan2_provider_name || ''}>
                                                                    {failure.wan2_provider_name || '---'}
                                                                </span>
                                                            </div>
                                                            {wan2Failed ? (
                                                                <div className="relative flex h-2 w-2 mr-1" title={`Falla registrada (${failure.wan2_downtime_minutes || '?'} min)`}>
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                                                </div>
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-1.5" title="Sin incidentes"></div>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>

                                    {/* COL 5: Actions */}
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setShowBitacoraId(failure.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-emerald-900/20 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-800 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider"
                                            >
                                                <ListFilter className="w-3.5 h-3.5" />
                                                Bitácora
                                            </button>
                                            {failure.meraki_url && (
                                                <a 
                                                    href={failure.meraki_url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="p-1.5 hover:bg-blue-600 hover:text-white text-zinc-500 rounded transition-colors"
                                                    title="Ver en Meraki"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </td>

                                </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Stats */}
            <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between items-center shrink-0">
                 <span>Mostrando <strong className="text-zinc-300">{filteredFailures.length}</strong> registros históricos</span>
                 <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Ordenado por fecha de cierre (descendente)</span>
            </div>
        </div>

        {/* Bitacora Modal */}
        {showBitacoraId && (
            <BitacoraModal 
                failureId={showBitacoraId}
                networkId={failures.find(f => f.id === showBitacoraId)?.network_id || ''}
                storeName={failures.find(f => f.id === showBitacoraId)?.nombre_tienda || ''}
                onClose={() => setShowBitacoraId(null)}
                readOnly={true} // Historical is always Read Only
            />
        )}
    </div>
  );
};

export default Resolved;
