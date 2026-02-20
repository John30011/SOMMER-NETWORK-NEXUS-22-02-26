
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { NetworkFailure } from '../types';
import { 
    BarChart3, Clock, TrendingUp, Activity, Target, Zap, Server, 
    AlertTriangle, CalendarRange, ArrowDownRight, ArrowUpRight, 
    Minus, Flame, CalendarDays, MapPin, Info, CheckCircle2, AlertOctagon,
    Calendar, ChevronDown, Store, ChevronRight, Timer, FileText, Hash, Notebook,
    LineChart, X, MousePointerClick, Search, Plus, HelpCircle, Lightbulb, ChevronUp, Check, Globe, Trophy, PieChart
} from 'lucide-react';
import { MOCK_FAILURES } from '../constants';
import BitacoraModal from './BitacoraModal';

type SubModule = 'mom' | 'heatmap' | 'sla' | 'weekday' | 'trends';
type TimeRange = 'day' | 'week' | 'month' | 'year';

// Chart Constants
const CHART_COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f97316', // Orange
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#f59e0b'  // Amber
];

// HELP CONTENT DICTIONARY
const HELP_CONTENT: Record<SubModule, { title: string, items: string[] }> = {
    mom: {
        title: "Cómo leer la Comparativa",
        items: [
            "Muestra el rendimiento actual vs. el periodo anterior (Día, Semana, Mes, Año).",
            "La flecha verde/roja indica si el volumen de fallas ha aumentado o disminuido.",
            "El gráfico de barras muestra la cuota de fallas por ISP.",
            "Utilice esta vista para reportes ejecutivos y estado de salud general."
        ]
    },
    heatmap: {
        title: "Interpretación del Mapa de Calor",
        items: [
            "Eje Vertical (Y): Lista de Proveedores (ISP).",
            "Eje Horizontal (X): Últimos 30 días calendario.",
            "Intensidad de Color: Rojo más brillante = Mayor tiempo de caída (minutos) en ese día.",
            "Patrones: Una fila roja = ISP inestable. Una columna roja = Falla masiva regional."
        ]
    },
    sla: {
        title: "Lectura de SLA Histórico Avanzado",
        items: [
            "Gráfico Superior: Muestra la evolución del SLA (Línea) vs Minutos de Caída (Barras grises).",
            "Línea Punteada: Representa el objetivo contractual (Target 99.5%).",
            "Presupuesto de Error: Muestra cuántos minutos de caída 'sobraron' o se 'excedieron' ese mes.",
            "Top Offender: La tienda o proveedor que más impactó negativamente el SLA del mes seleccionado."
        ]
    },
    weekday: {
        title: "Análisis de Día Crítico",
        items: [
            "Distribución acumulada de incidentes por día de la semana.",
            "Haga clic en un punto del gráfico para ver qué proveedores y tiendas fallan ese día.",
            "Puntos altos indican los días donde históricamente ocurren más fallas."
        ]
    },
    trends: {
        title: "Lectura de Tendencias ISP (Multilínea)",
        items: [
            "Eje Vertical (Y): Cantidad de fallas simultáneas.",
            "Eje Horizontal (X): Tiempo. (Hora x Hora en vista 'Día', Diario en vista 'Mes').",
            "Cada línea representa un Proveedor distinto agrupado por País.",
            "Los puntos en la línea son interactivos: haga clic para ver qué tiendas fallaron en ese momento exacto."
        ]
    }
};

const Metrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubModule>('mom');
  const [totalDevices, setTotalDevices] = useState(500); // Default baseline
  
  // New State for Time Range
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Data State
  const [failures, setFailures] = useState<NetworkFailure[]>([]);
  
  // EXPANSION STATES FOR ISP CHART
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  // SLA INTERACTION STATE
  const [selectedSlaMonth, setSelectedSlaMonth] = useState<string | null>(null);

  // Bitacora Modal State - Added readOnly support
  const [bitacoraTarget, setBitacoraTarget] = useState<{id: string | number, networkId: string, name: string, readOnly?: boolean} | null>(null);

  // TRENDS SUB-MODULE STATE
  const [selectedTrendProviders, setSelectedTrendProviders] = useState<string[]>([]);
  // Select Dropdown States
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [providerSearchTerm, setProviderSearchTerm] = useState('');
  const [trendCountryFilter, setTrendCountryFilter] = useState('TODOS'); // New Country Filter State
  const providerSelectorRef = useRef<HTMLDivElement>(null);

  // WEEKDAY INTERACTION STATE
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // GLOBAL HELP STATE
  const [showHelp, setShowHelp] = useState(false);

  const [selectedPointData, setSelectedPointData] = useState<{
      provider: string;
      dateLabel: string;
      isoDate: string;
      failures: NetworkFailure[];
  } | null>(null);

  useEffect(() => {
    fetchMetricsData();
  }, []);

  // Handle click outside for provider selector
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (providerSelectorRef.current && !providerSelectorRef.current.contains(event.target as Node)) {
              setShowProviderSelector(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMetricsData = async () => {
    setLoading(true);
    try {
        // Fetch massive amount of data (last 12 months to support Year view)
        const now = new Date();
        const pastDate = new Date();
        pastDate.setMonth(now.getMonth() - 12);

        let data: NetworkFailure[] = [];
        let countDevices = 500;

        if (isDemoMode) {
            // GENERATE ROBUST MOCK DATA
            data = MOCK_FAILURES; 
            const dummyHistory = Array.from({ length: 600 }).map((_, i) => {
                // Ensure some recent data for "Day" view testing (Hourly)
                const isRecent = Math.random() > 0.85;
                const offset = isRecent 
                    ? Math.floor(Math.random() * 24 * 60 * 60 * 1000) // Last 24h
                    : Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000; // Last year
                
                const date = new Date(now.getTime() - offset);
                
                return {
                    id: `mock-hist-${i}`,
                    network_id: `MOCK-${i}`,
                    nombre_tienda: `Tienda Demo ${i}`, 
                    codigo_tienda: `T-${1000+i}`,
                    lifecycle_stage: 'Resuelta',
                    start_time: date.toISOString(),
                    wan1_provider_name: ['CANTV', 'INTER', 'MOVISTAR', 'CLARO'][Math.floor(Math.random() * 4)],
                    pais: ['VENEZUELA', 'COLOMBIA', 'MEXICO'][Math.floor(Math.random() * 3)],
                    total_downtime_minutes: Math.floor(Math.random() * 180),
                    wan1_ticket_ref: `INC-${10000+i}`,
                    wan2_ticket_ref: Math.random() > 0.5 ? `NOT-REQ` : `SEG-${500+i}`,
                    site_impact: Math.random() > 0.8 ? 'TOTAL' : 'PARCIAL'
                } as any;
            });
            data = [...data, ...dummyHistory];
            countDevices = 1250;
        } else {
            // Real Supabase Fetch
            const { data: dbData, error } = await supabase
                .from('network_failures_jj')
                .select('*')
                .gte('start_time', pastDate.toISOString());
            
            if (error) throw error;
            
            // Get Inventory Count for SLA calculation
            const { count } = await supabase.from('devices_inventory_jj').select('*', { count: 'exact', head: true });
            if (count) countDevices = count;

            if (dbData) {
                 const networkIds = dbData.map(f => f.network_id);
                 const { data: invData } = await supabase
                    .from('devices_inventory_jj')
                    .select('network_id, nombre_tienda, codigo_tienda, pais, wan1_provider:isp_providers_jj!wan1_provider_id(name)')
                    .in('network_id', networkIds);

                 data = dbData.map((f: any) => {
                    const inv = invData?.find((i:any) => i.network_id === f.network_id);
                    return {
                        ...f,
                        // PRIORITIZE NAME FROM INVENTORY
                        nombre_tienda: inv?.nombre_tienda || f.nombre_tienda || f.network_id,
                        codigo_tienda: inv?.codigo_tienda || f.codigo_tienda,
                        wan1_provider_name: inv?.wan1_provider?.name || 'Desconocido',
                        pais: inv?.pais || f.pais || 'Desconocido' // Ensure country is available
                    };
                 });
            }
        }

        setFailures(data);
        setTotalDevices(countDevices);

    } catch (err) {
        console.error("Error fetching metrics", err);
    } finally {
        setLoading(false);
    }
  };

  // --- DERIVED DATA FOR SEARCH ---
  // UPDATED: Now generates "PROVIDER (COUNTRY)" keys
  const allAvailableProviders = useMemo(() => {
      const providers = new Set<string>();
      failures.forEach(f => {
          if (f.wan1_provider_name) {
              const name = f.wan1_provider_name.toUpperCase();
              const country = (f.pais || 'N/A').toUpperCase();
              providers.add(`${name} (${country})`);
          }
      });
      return Array.from(providers).sort();
  }, [failures]);

  // Derived: Available Countries for Filter
  const availableTrendCountries = useMemo(() => {
      const countries = new Set<string>();
      allAvailableProviders.forEach(p => {
          // Extract country from "PROVIDER (COUNTRY)" string
          const match = p.match(/\((.*?)\)$/);
          if (match && match[1]) countries.add(match[1]);
      });
      return ['TODOS', ...Array.from(countries).sort()];
  }, [allAvailableProviders]);

  // Filter the list based on the search AND Country Filter
  const filteredProviderOptions = useMemo(() => {
      return allAvailableProviders.filter(p => {
          const matchesSearch = p.toLowerCase().includes(providerSearchTerm.toLowerCase());
          const matchesCountry = trendCountryFilter === 'TODOS' || p.includes(`(${trendCountryFilter})`);
          return matchesSearch && matchesCountry;
      });
  }, [allAvailableProviders, providerSearchTerm, trendCountryFilter]);

  const toggleTrendProvider = (providerName: string) => {
      setSelectedTrendProviders(prev => {
          if (prev.includes(providerName)) {
              return prev.filter(p => p !== providerName);
          } else {
              // REMOVED LIMIT: User requested unrestricted selection
              return [...prev, providerName];
          }
      });
  };


  // --- SUB-MODULE 1: COMPARATIVE STATS (Dynamic Range) ---
  const comparativeStats = useMemo(() => {
      const now = new Date();
      let currentStart = new Date();
      let prevStart = new Date();
      let prevEnd = new Date();

      switch (timeRange) {
          case 'day':
              currentStart.setHours(0,0,0,0);
              prevStart.setDate(now.getDate() - 1);
              prevStart.setHours(0,0,0,0);
              prevEnd.setDate(now.getDate() - 1);
              prevEnd.setHours(23,59,59,999);
              break;
          case 'week':
              const day = now.getDay() || 7; 
              if (day !== 1) currentStart.setHours(-24 * (day - 1)); 
              else currentStart.setHours(0,0,0,0); 

              prevStart = new Date(currentStart);
              prevStart.setDate(prevStart.getDate() - 7);
              
              prevEnd = new Date(currentStart);
              prevEnd.setDate(prevEnd.getDate() - 1);
              prevEnd.setHours(23,59,59,999);
              break;
          case 'year':
              currentStart = new Date(now.getFullYear(), 0, 1); 
              prevStart = new Date(now.getFullYear() - 1, 0, 1); 
              prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
              break;
      case 'month':
          default:
              currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
              prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
              break;
      }

      let currCount = 0;
      let prevCount = 0;
      let currDowntime = 0;
      let prevDowntime = 0;
      let activeNowCount = 0;

      const currentPeriodFailures: NetworkFailure[] = [];

      failures.forEach(f => {
          const d = new Date(f.start_time);
          const t = d.getTime();
          const downtime = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
          
          const isActive = ['Activa', 'En gestión', 'En observación'].includes(f.lifecycle_stage);
          if (isActive) activeNowCount++;

          if (t >= currentStart.getTime()) {
              currCount++;
              currDowntime += downtime;
              currentPeriodFailures.push(f);
          } 
          else if (t >= prevStart.getTime() && t <= prevEnd.getTime()) {
              prevCount++;
              prevDowntime += downtime;
          }
      });

      // Approx SLA
      let timeDivider = 1;
      if (timeRange === 'day') timeDivider = 1;
      if (timeRange === 'week') timeDivider = 7;
      if (timeRange === 'month') timeDivider = 30;
      if (timeRange === 'year') timeDivider = 365;

      const totalPotentialMinutes = totalDevices * timeDivider * 24 * 60;
      const sla = totalPotentialMinutes > 0 ? 100 - ((currDowntime / totalPotentialMinutes) * 100) : 100;

      let growth = 0;
      let insightText = "";
      let trend: 'positive' | 'negative' | 'neutral' = 'neutral';
      
      const rangeLabels: Record<TimeRange, string> = {
          day: 'ayer',
          week: 'la semana pasada',
          month: 'el mes pasado',
          year: 'el año pasado'
      };

      if (prevCount === 0) {
          if (currCount > 0) {
              insightText = "Estableciendo línea base.";
              trend = 'neutral';
              growth = 0;
          } else {
              insightText = "Sin datos previos.";
              trend = 'neutral';
          }
      } else {
          growth = ((currCount - prevCount) / prevCount) * 100;
          const isBetter = growth < 0; 
          const diffText = isBetter ? 'menos' : 'más';
          const label = rangeLabels[timeRange];
          insightText = `${Math.abs(growth).toFixed(1)}% ${diffText} vs ${label}`;
          trend = isBetter ? 'positive' : 'negative';
      }

      const downtimeGrowth = prevDowntime === 0 ? 0 : ((currDowntime - prevDowntime) / prevDowntime) * 100;

      return {
          incidents: { current: currCount, prev: prevCount, growth: growth },
          downtime: { current: currDowntime, prev: prevDowntime, growth: downtimeGrowth },
          mttr: {
              current: currCount ? (currDowntime / currCount) / 60 : 0,
              prev: prevCount ? (prevDowntime / prevCount) / 60 : 0
          },
          sla: sla < 0 ? 0 : sla,
          activeNow: activeNowCount,
          insightText,
          trend,
          currentPeriodData: currentPeriodFailures
      };
  }, [failures, totalDevices, timeRange]);

  // --- SUB-MODULE 1.1: CHARTS ---
  const comparativeCharts = useMemo(() => {
      const data = comparativeStats.currentPeriodData;
      
      const siteCounts: Record<string, { count: number, name: string, code: string }> = {};
      data.forEach(f => {
          const id = f.network_id;
          if (!siteCounts[id]) {
              siteCounts[id] = { 
                  count: 0, 
                  name: f.nombre_tienda || f.network_id,
                  code: f.codigo_tienda || 'N/A'
              };
          }
          siteCounts[id].count++;
      });
      
      const topSites = Object.values(siteCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      const provCounts: Record<string, number> = {};
      data.forEach(f => {
          const p = f.wan1_provider_name || 'Desconocido';
          provCounts[p] = (provCounts[p] || 0) + 1;
      });
      const topProviders = Object.entries(provCounts)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ 
              name, count, percent: data.length > 0 ? (count / data.length) * 100 : 0 
          }));

      return { topSites, topProviders };
  }, [comparativeStats]);

  // --- HELPER FOR ISP DETAILS EXPANSION ---
  const getProviderDetails = (providerName: string) => {
      const allFailures = comparativeStats.currentPeriodData;
      const relevant = allFailures.filter(f => (f.wan1_provider_name || 'Desconocido') === providerName);
      
      // Group by store
      const grouped: Record<string, NetworkFailure[]> = {};
      relevant.forEach(f => {
          const key = f.network_id;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(f);
      });
      
      return Object.entries(grouped).sort((a,b) => b[1].length - a[1].length);
  };


  // --- SUB-MODULE 2: HEATMAP ---
  const heatmapStats = useMemo(() => {
    const daysToShow = 30; 
    const dates: { label: string; iso: string }[] = [];
    
    for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push({
            iso: d.toISOString().split('T')[0],
            label: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
        });
    }

    const providerCounts: Record<string, number> = {};
    failures.forEach(f => {
        const p = f.wan1_provider_name || 'Desconocido';
        providerCounts[p] = (providerCounts[p] || 0) + 1;
    });
    const topProviders = Object.entries(providerCounts).sort((a,b) => b[1] - a[1]).slice(0, 8).map(p => p[0]);

    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};

    topProviders.forEach(p => {
        matrix[p] = {};
        rowTotals[p] = 0;
        dates.forEach(d => matrix[p][d.iso] = 0);
    });

    failures.forEach(f => {
        const pName = f.wan1_provider_name || 'Desconocido';
        const fDate = new Date(f.start_time).toISOString().split('T')[0];
        if (matrix[pName] && matrix[pName][fDate] !== undefined) {
             const downtime = f.total_downtime_minutes || f.wan1_downtime_minutes || 60; 
             matrix[pName][fDate] += downtime;
             rowTotals[pName] += downtime;
        }
    });

    return { dates, providers: topProviders, matrix, rowTotals };
  }, [failures]);

  // --- SUB-MODULE 3: SLA HISTORICAL (ADVANCED) ---
  const slaHistory = useMemo(() => {
      const stats: Record<string, { downtime: number, days: number, monthLabel: string, monthKey: string }> = {};
      const months: string[] = [];

      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          
          stats[key] = { 
              downtime: 0, 
              days: daysInMonth,
              monthLabel: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase(),
              monthKey: key
          };
          months.push(key);
      }

      failures.forEach(f => {
          const d = new Date(f.start_time);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (stats[key]) {
              stats[key].downtime += (f.total_downtime_minutes || f.wan1_downtime_minutes || 0);
          }
      });

      return months.map(key => {
          const { downtime, days, monthLabel, monthKey } = stats[key];
          const totalMinutes = days * 24 * 60 * totalDevices;
          const allowedDowntime = totalMinutes * 0.005; // 0.5% allowed failure
          const sla = totalMinutes > 0 ? 100 - ((downtime / totalMinutes) * 100) : 100;
          
          return { 
              label: monthLabel, 
              key: monthKey,
              sla: Math.max(0, sla), 
              downtime,
              totalMinutes,
              allowedDowntime: Math.round(allowedDowntime)
          };
      });
  }, [failures, totalDevices]);

  // --- SLA BREAKDOWN (DRILLDOWN) ---
  const slaBreakdown = useMemo(() => {
      if (!selectedSlaMonth) return null;

      const [year, month] = selectedSlaMonth.split('-').map(Number);
      
      // Filter failures for this month
      const monthlyFailures = failures.filter(f => {
          const d = new Date(f.start_time);
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });

      // Top Offenders: Stores
      const storeImpact: Record<string, number> = {};
      monthlyFailures.forEach(f => {
          const name = f.nombre_tienda || f.network_id;
          const dt = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
          storeImpact[name] = (storeImpact[name] || 0) + dt;
      });
      const topStores = Object.entries(storeImpact)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 3);

      // Top Offenders: Providers
      const provImpact: Record<string, number> = {};
      monthlyFailures.forEach(f => {
          const name = f.wan1_provider_name || 'Desconocido';
          const dt = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
          provImpact[name] = (provImpact[name] || 0) + dt;
      });
      const topProviders = Object.entries(provImpact)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 3);

      const monthData = slaHistory.find(s => s.key === selectedSlaMonth);
      
      return {
          monthData,
          topStores,
          topProviders,
          totalEvents: monthlyFailures.length
      };

  }, [selectedSlaMonth, failures, slaHistory]);

  // --- SUB-MODULE 4: WEEKDAY ---
  const weekdayStats = useMemo(() => {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const fullDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const counts = Array(7).fill(0);
      const downtime = Array(7).fill(0);
      const failuresByDay: NetworkFailure[][] = Array.from({ length: 7 }, () => []);

      failures.forEach(f => {
          const d = new Date(f.start_time);
          const dayIdx = d.getDay(); 
          counts[dayIdx]++;
          downtime[dayIdx] += (f.total_downtime_minutes || 0);
          failuresByDay[dayIdx].push(f);
      });

      const maxCount = Math.max(...counts);

      return days.map((label, idx) => ({
          label,
          fullName: fullDays[idx],
          count: counts[idx],
          downtime: downtime[idx],
          percentOfMax: maxCount > 0 ? (counts[idx] / maxCount) * 100 : 0,
          failures: failuresByDay[idx]
      }));
  }, [failures]);

  // --- SUB-MODULE 5: TRENDS ISP ---
  const trendsStats = useMemo(() => {
      if (activeTab !== 'trends') return null;

      const bucketMap: Record<string, { label: string, iso: string, order: number }> = {};
      const buckets: string[] = [];
      
      const now = new Date();
      
      if (timeRange === 'day') {
          // Last 24 hours (Hourly buckets) - strictly hours
          for(let i=23; i>=0; i--) {
              const d = new Date(now);
              d.setHours(d.getHours() - i);
              // Key is YYYY-MM-DD-HH
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;
              
              // Formatting label for Hourly: "14:00"
              const label = `${String(d.getHours()).padStart(2,'0')}:00`;
              
              bucketMap[key] = { label, iso: key, order: i };
              buckets.push(key);
          }
      } else if (timeRange === 'week') {
          for(let i=6; i>=0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - i);
              const key = d.toISOString().split('T')[0];
              bucketMap[key] = {
                  label: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
                  iso: key,
                  order: i
              };
              buckets.push(key);
          }
      } else if (timeRange === 'year') {
          for(let i=11; i>=0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              bucketMap[key] = {
                  label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                  iso: key,
                  order: i
              };
              buckets.push(key);
          }
      } else {
          // Month (Last 30 days)
          for(let i=29; i>=0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const key = d.toISOString().split('T')[0];
              bucketMap[key] = {
                  label: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
                  iso: key,
                  order: i
              };
              buckets.push(key);
          }
      }

      // UPDATED DATASETS KEY STRUCTURE
      const datasets: Record<string, { data: number[], failures: Record<string, NetworkFailure[]> }> = {};
      selectedTrendProviders.forEach(p => {
          datasets[p] = { 
              data: new Array(buckets.length).fill(0),
              failures: {} 
          };
          buckets.forEach(b => datasets[p].failures[b] = []);
      });

      failures.forEach(f => {
          // UPDATED: Generate Composite Key "PROVIDER (COUNTRY)"
          const pName = f.wan1_provider_name ? f.wan1_provider_name.toUpperCase() : 'DESCONOCIDO';
          const country = f.pais ? f.pais.toUpperCase() : 'N/A';
          const compositeKey = `${pName} (${country})`;

          if (!selectedTrendProviders.includes(compositeKey)) return;

          const d = new Date(f.start_time);
          let key = '';
          
          if (timeRange === 'day') {
              key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;
          } else if (timeRange === 'year') {
              key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          } else {
              key = d.toISOString().split('T')[0];
          }

          const bucketIndex = buckets.indexOf(key);
          if (bucketIndex !== -1) {
              datasets[compositeKey].data[bucketIndex]++;
              datasets[compositeKey].failures[key].push(f);
          }
      });

      let maxValue = 0;
      Object.values(datasets).forEach(ds => {
          maxValue = Math.max(maxValue, ...ds.data);
      });
      maxValue = maxValue === 0 ? 5 : Math.ceil(maxValue * 1.1);

      return { buckets, bucketMap, datasets, maxValue };
  }, [failures, selectedTrendProviders, timeRange, activeTab]);


  const getHeatmapColor = (minutes: number) => {
      if (minutes === 0) return 'bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/50 text-transparent'; 
      if (minutes < 30) return 'bg-red-900/30 border border-red-900/40 shadow-none text-red-400';
      if (minutes < 120) return 'bg-red-600/60 border border-red-500/50 text-white shadow-[0_0_8px_rgba(220,38,38,0.2)]';
      return 'bg-gradient-to-br from-red-600 to-orange-600 border border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]';
  };

  const getTrendIcon = (val: number) => {
      if (val > 0) return <ArrowUpRight className="w-3 h-3" />;
      if (val < 0) return <ArrowDownRight className="w-3 h-3" />;
      return <Minus className="w-3 h-3" />;
  };

  // Helper for SLA Chart Rendering (SVG)
  const renderSlaChart = () => {
      const height = 280;
      const width = 1000;
      const paddingX = 50;
      const paddingY = 30;
      const usableHeight = height - paddingY * 2;
      const usableWidth = width - paddingX * 2;
      const stepX = usableWidth / (slaHistory.length - 1);

      // We focus SLA scale from 98% to 100% to see small variations
      const minSla = 98;
      const maxSla = 100;
      
      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                  <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
              </defs>

              {/* Threshold Line at 99.5% */}
              {(() => {
                  const y995 = height - paddingY - (((99.5 - minSla) / (maxSla - minSla)) * usableHeight);
                  return (
                      <g>
                          <line x1={paddingX} y1={y995} x2={width - paddingX} y2={y995} stroke="#ffffff" strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.5" />
                          <text x={width - paddingX + 5} y={y995 + 3} className="text-[10px] fill-zinc-400 font-mono">99.5%</text>
                      </g>
                  )
              })()}

              {/* SLA Line Path */}
              {(() => {
                  const points = slaHistory.map((d, i) => {
                      const x = paddingX + (i * stepX);
                      // Clamp SLA for visual
                      const visualSla = Math.max(minSla, Math.min(maxSla, d.sla));
                      const y = height - paddingY - (((visualSla - minSla) / (maxSla - minSla)) * usableHeight);
                      return `${x},${y}`;
                  }).join(' ');

                  return (
                      <>
                          <polyline 
                              points={points} 
                              fill="none" 
                              stroke="#10b981" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className="drop-shadow-lg"
                          />
                          {slaHistory.map((d, i) => {
                              const x = paddingX + (i * stepX);
                              const visualSla = Math.max(minSla, Math.min(maxSla, d.sla));
                              const y = height - paddingY - (((visualSla - minSla) / (maxSla - minSla)) * usableHeight);
                              const isSelected = selectedSlaMonth === d.key;
                              
                              return (
                                  <g key={i} onClick={() => setSelectedSlaMonth(isSelected ? null : d.key)} className="cursor-pointer group">
                                      {/* Invisible hit area */}
                                      <rect x={x - stepX/2} y={paddingY} width={stepX} height={usableHeight} fill="transparent" />
                                      
                                      {/* Point */}
                                      <circle 
                                          cx={x} cy={y} r={isSelected ? 6 : 4} 
                                          fill={d.sla >= 99.5 ? '#10b981' : d.sla >= 98 ? '#facc15' : '#ef4444'} 
                                          stroke="#09090b" strokeWidth="2" 
                                          className="transition-all duration-200 group-hover:r-6"
                                      />
                                      
                                      {/* Label */}
                                      <text x={x} y={height - 5} textAnchor="middle" className={`text-[10px] font-bold uppercase transition-colors ${isSelected ? 'fill-white' : 'fill-zinc-500'}`}>
                                          {d.label}
                                      </text>

                                      {/* Value Label */}
                                      <text x={x} y={y - 10} textAnchor="middle" className={`text-[10px] font-bold transition-opacity ${isSelected || 'opacity-0 group-hover:opacity-100'} ${d.sla >= 99.5 ? 'fill-green-400' : 'fill-red-400'}`}>
                                          {d.sla.toFixed(2)}%
                                      </text>
                                  </g>
                              );
                          })}
                      </>
                  );
              })()}
          </svg>
      );
  };

  // Helper for SLA Details Panel
  const renderSlaDetails = () => {
      if (!slaBreakdown || !selectedSlaMonth) return null;
      const { monthData, topStores, topProviders } = slaBreakdown;
      if (!monthData) return null;

      const isBreached = monthData.sla < 99.5;
      const budgetUsedPercent = (monthData.downtime / monthData.allowedDowntime) * 100;
      
      return (
          <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isBreached ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          {isBreached ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                          <h4 className="text-white font-bold text-sm">Análisis Detallado: {monthData.label}</h4>
                          <p className="text-xs text-zinc-500">
                              Target 99.5% | Real: <span className={isBreached ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{monthData.sla.toFixed(2)}%</span>
                          </p>
                      </div>
                  </div>
                  <button onClick={() => setSelectedSlaMonth(null)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800">
                      <X className="w-4 h-4" />
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* COL 1: ERROR BUDGET */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex flex-col justify-center relative overflow-hidden">
                      <h5 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                          <PieChart className="w-3 h-3" /> Presupuesto de Error
                      </h5>
                      <div className="relative z-10">
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-400">Permitido</span>
                              <span className="text-white font-mono">{monthData.allowedDowntime} min</span>
                          </div>
                          <div className="flex justify-between text-xs mb-3">
                              <span className="text-zinc-400">Consumido</span>
                              <span className={`font-mono font-bold ${isBreached ? 'text-red-400' : 'text-green-400'}`}>{monthData.downtime} min</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${budgetUsedPercent > 100 ? 'bg-red-600' : budgetUsedPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                              ></div>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-2 text-center">
                              {budgetUsedPercent > 100 
                                ? `Presupuesto excedido en ${monthData.downtime - monthData.allowedDowntime} min` 
                                : `Disponible: ${monthData.allowedDowntime - monthData.downtime} min restantes`}
                          </p>
                      </div>
                  </div>

                  {/* COL 2: TOP OFFENDERS STORES */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                      <h5 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                          <Store className="w-3 h-3" /> Tiendas Críticas
                      </h5>
                      <div className="space-y-2">
                          {topStores.map(([name, mins], idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1 last:border-0">
                                  <span className="text-zinc-300 truncate pr-2 max-w-[140px]" title={name}>{name}</span>
                                  <span className="text-red-400 font-mono font-bold">{mins}m</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* COL 3: TOP OFFENDERS PROVIDERS */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                      <h5 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                          <Server className="w-3 h-3" /> Proveedores Críticos
                      </h5>
                      <div className="space-y-2">
                          {topProviders.map(([name, mins], idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1 last:border-0">
                                  <span className="text-zinc-300 truncate pr-2" title={name}>{name}</span>
                                  <span className="text-orange-400 font-mono font-bold">{mins}m</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // Helper for Trends Chart Rendering
  const renderTrendLines = () => {
      if (!trendsStats) return null;
      const { buckets, datasets, maxValue } = trendsStats;
      const height = 300;
      const width = 1000; 
      const paddingX = 40;
      const paddingY = 20;
      const usableHeight = height - paddingY * 2;
      const usableWidth = width - paddingX * 2;
      const stepX = usableWidth / (buckets.length - 1);

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = height - paddingY - (ratio * usableHeight);
                  return (
                      <g key={ratio}>
                          <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[9px] fill-zinc-600 font-mono">
                              {Math.round(ratio * maxValue)}
                          </text>
                      </g>
                  );
              })}

              {selectedTrendProviders.map((provider, pIdx) => {
                  const data = datasets[provider].data;
                  const color = CHART_COLORS[pIdx % CHART_COLORS.length];
                  
                  const points = data.map((val, idx) => {
                      const x = paddingX + (idx * stepX);
                      const y = height - paddingY - ((val / maxValue) * usableHeight);
                      return `${x},${y}`;
                  }).join(' ');

                  return (
                      <g key={provider}>
                          <polyline 
                              points={points} 
                              fill="none" 
                              stroke={color} 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className="drop-shadow-lg"
                          />
                          {data.map((val, idx) => {
                              const x = paddingX + (idx * stepX);
                              const y = height - paddingY - ((val / maxValue) * usableHeight);
                              const bucketKey = buckets[idx];
                              const bucketLabel = trendsStats.bucketMap[bucketKey].label;
                              
                              if (val === 0) return null; 

                              return (
                                  <circle 
                                      key={idx} 
                                      cx={x} 
                                      cy={y} 
                                      r="4" 
                                      fill={color} 
                                      stroke="#09090b" 
                                      strokeWidth="2"
                                      className="cursor-pointer hover:r-6 transition-all duration-200"
                                      onClick={() => setSelectedPointData({
                                          provider,
                                          dateLabel: bucketLabel,
                                          isoDate: bucketKey,
                                          failures: datasets[provider].failures[bucketKey]
                                      })}
                                  >
                                      <title>{`${provider}: ${val} fallas (${bucketLabel})`}</title>
                                  </circle>
                              );
                          })}
                      </g>
                  );
              })}

              {/* X Axis Labels */}
              {buckets.map((b, idx) => {
                  // Adaptive hiding
                  let showLabel = true;
                  if (timeRange === 'day') {
                      showLabel = idx % 2 === 0;
                  } else {
                      showLabel = buckets.length <= 15 || idx % 3 === 0;
                  }
                  
                  if (!showLabel) return null;
                  
                  const x = paddingX + (idx * stepX);
                  return (
                      <text key={b} x={x} y={height - 2} textAnchor="middle" className="text-[9px] fill-zinc-500 font-mono">
                          {trendsStats.bucketMap[b].label}
                      </text>
                  );
              })}
          </svg>
      );
  };

  // Helper for Weekday Line Chart
  const renderWeekdayLineChart = () => {
      const height = 280;
      const width = 800;
      const paddingX = 50;
      const paddingY = 30;
      
      const usableHeight = height - paddingY * 2;
      const usableWidth = width - paddingX * 2;
      
      const maxValue = Math.max(...weekdayStats.map(d => d.count)) || 1;
      const stepX = usableWidth / (weekdayStats.length - 1);

      // Generate Points
      const points = weekdayStats.map((d, i) => {
          const x = paddingX + (i * stepX);
          const y = height - paddingY - ((d.count / maxValue) * usableHeight);
          return `${x},${y}`;
      }).join(' ');

      // Generate Area Path (Close the loop to the bottom)
      const areaPath = `
          ${paddingX},${height - paddingY} 
          ${points} 
          ${paddingX + (weekdayStats.length - 1) * stepX},${height - paddingY}
      `;

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                  <linearGradient id="weekdayGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = height - paddingY - (ratio * usableHeight);
                  return (
                      <g key={ratio}>
                          <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-zinc-600 font-mono">
                              {Math.round(ratio * maxValue)}
                          </text>
                      </g>
                  );
              })}

              {/* Area Fill */}
              <polyline points={areaPath} fill="url(#weekdayGradient)" />

              {/* Line Stroke */}
              <polyline 
                  points={points} 
                  fill="none" 
                  stroke="#f97316" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="drop-shadow-lg"
              />

              {/* Dots & Interaction */}
              {weekdayStats.map((d, i) => {
                  const x = paddingX + (i * stepX);
                  const y = height - paddingY - ((d.count / maxValue) * usableHeight);
                  const isHovered = hoveredDayIndex === i;
                  const isSelected = selectedDayIndex === i;

                  return (
                      <g 
                        key={i} 
                        onMouseEnter={() => setHoveredDayIndex(i)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                        onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                        className="cursor-pointer"
                      >
                          {/* Invisible larger hit area for easier hovering */}
                          <circle cx={x} cy={y} r="20" fill="transparent" />
                          
                          {/* Visible Dot */}
                          <circle 
                              cx={x} 
                              cy={y} 
                              r={isHovered || isSelected ? 6 : 4} 
                              fill={isSelected ? "#ffffff" : "#f97316"} 
                              stroke={isSelected ? "#f97316" : "#09090b"} 
                              strokeWidth={isSelected ? 3 : 2} 
                              className="transition-all duration-200"
                          />

                          {/* X-Axis Label */}
                          <text 
                            x={x} 
                            y={height - 5} 
                            textAnchor="middle" 
                            className={`text-[11px] font-bold ${isHovered || isSelected ? 'fill-white' : 'fill-zinc-500'} transition-colors uppercase`}
                          >
                              {d.label}
                          </text>

                          {/* Tooltip on Hover (only if not selected to avoid clutter) */}
                          {isHovered && !isSelected && (
                              <g pointerEvents="none">
                                  <rect x={x - 45} y={y - 50} width="90" height="40" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" className="shadow-lg" />
                                  <text x={x} y={y - 28} textAnchor="middle" className="text-[10px] font-bold fill-orange-400 uppercase">
                                      {d.fullName}
                                  </text>
                                  <text x={x} y={y - 15} textAnchor="middle" className="text-[10px] font-mono fill-white">
                                      {d.count} Incidentes
                                  </text>
                              </g>
                          )}
                      </g>
                  );
              })}
          </svg>
      );
  };

  const renderWeekdayDetails = () => {
      if (selectedDayIndex === null) return null;
      
      const dayData = weekdayStats[selectedDayIndex];
      const failures = dayData.failures;

      // Group by Provider
      const byProvider: Record<string, NetworkFailure[]> = {};
      failures.forEach(f => {
          const prov = f.wan1_provider_name || 'Desconocido';
          if (!byProvider[prov]) byProvider[prov] = [];
          byProvider[prov].push(f);
      });

      const sortedProviders = Object.entries(byProvider).sort((a, b) => b[1].length - a[1].length);

      return (
          <div className="mt-6 bg-zinc-950/80 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
                  <div className="flex flex-col">
                      <h4 className="text-white font-bold flex items-center gap-2 text-xl">
                          <CalendarDays className="w-6 h-6 text-orange-500" />
                          Detalle del {dayData.fullName}
                      </h4>
                      <span className="text-sm text-zinc-500 ml-8">
                          Desglose de <strong className="text-white">{failures.length}</strong> incidentes reportados
                      </span>
                  </div>
                  <button 
                    onClick={() => setSelectedDayIndex(null)} 
                    className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-colors"
                  >
                      <X className="w-6 h-6" />
                  </button>
              </div>
              
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                  {sortedProviders.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-zinc-500 text-sm">
                          No hay incidentes registrados para este día.
                      </div>
                  ) : (
                      sortedProviders.map(([provider, fails]) => (
                          <div key={provider} className="bg-zinc-900 border border-zinc-800 rounded-lg p-0 overflow-hidden flex flex-col h-full hover:border-zinc-700 transition-colors shadow-sm">
                              <div className="bg-zinc-800/30 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                                  <span className="text-sm font-black text-blue-100 truncate pr-2">{provider}</span>
                                  <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                      {fails.length}
                                  </span>
                              </div>
                              <div className="flex-1 overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-zinc-700 p-1 space-y-0.5">
                                  {fails.map(f => (
                                      <div key={f.id} className="flex justify-between items-center px-3 py-2 hover:bg-white/5 rounded transition-colors group cursor-default">
                                          <div className="flex items-center gap-2 min-w-0 pr-3">
                                              <span className="text-xs font-bold text-blue-400 font-mono shrink-0 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">
                                                  {f.codigo_tienda || 'N/A'}
                                              </span>
                                              <span className="text-sm text-zinc-200 font-bold truncate" title={f.nombre_tienda}>
                                                  {f.nombre_tienda || f.network_id}
                                              </span>
                                          </div>
                                          <span className="text-xs text-zinc-500 font-mono group-hover:text-zinc-300 transition-colors">
                                              {new Date(f.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  // --- RENDER HELP PANEL ---
  const renderHelpPanel = () => {
      const content = HELP_CONTENT[activeTab];
      if (!showHelp || !content) return null;

      return (
          <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 mb-6 animate-in fade-in slide-in-from-top-2 relative">
              <button 
                  onClick={() => setShowHelp(false)}
                  className="absolute top-2 right-2 text-zinc-500 hover:text-blue-400"
              >
                  <X className="w-4 h-4" />
              </button>
              <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-sm">
                  <Lightbulb className="w-4 h-4" /> {content.title}
              </h4>
              <ul className="space-y-2">
                  {content.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                          <span>{item}</span>
                      </li>
                  ))}
              </ul>
          </div>
      );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-black overflow-y-auto pb-20 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-blue-500" />
            Métricas Operativas
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-1">
            Análisis detallado de rendimiento y disponibilidad.
          </p>
        </div>
      </div>

      {/* SUB-MODULE NAVIGATION with Help Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-zinc-800 pb-1">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('mom')} className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'mom' ? 'bg-zinc-900 text-blue-400 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <TrendingUp className="w-4 h-4" /> Comparativa
            </button>
            <button onClick={() => setActiveTab('heatmap')} className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'heatmap' ? 'bg-zinc-900 text-red-400 border-b-2 border-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Flame className="w-4 h-4" /> Mapa de Calor
            </button>
            <button onClick={() => setActiveTab('sla')} className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'sla' ? 'bg-zinc-900 text-green-400 border-b-2 border-green-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Activity className="w-4 h-4" /> SLA Histórico
            </button>
            <button onClick={() => setActiveTab('weekday')} className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'weekday' ? 'bg-zinc-900 text-orange-400 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <CalendarDays className="w-4 h-4" /> Día Crítico
            </button>
            <button onClick={() => setActiveTab('trends')} className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'trends' ? 'bg-zinc-900 text-purple-400 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <LineChart className="w-4 h-4" /> Tendencias ISP
            </button>
          </div>
          
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded transition-colors ${showHelp ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-900'}`}
          >
              <HelpCircle className="w-4 h-4" /> Guía de Lectura
          </button>
      </div>

      {/* RENDER HELP PANEL ABOVE CONTENT */}
      {renderHelpPanel()}

      {/* CONTENT AREA */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* A. MOM GROWTH (COMPARATIVE) */}
        {activeTab === 'mom' && (
            <div className="space-y-8">
                {/* ... (Kept existing content) ... */}
                {/* RANGE SELECTOR */}
                <div className="flex justify-center md:justify-end">
                    <div className="bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 flex items-center gap-1">
                        {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                                    timeRange === range 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                                {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1. TOP ROW: 4 KEY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* ... (Existing Cards - SLA, MTTR, Incidents, Active Now) ... */}
                    {/* CARD 1: DISPONIBILIDAD (SLA) -> AMBER/YELLOW */}
                    <div className="relative overflow-hidden rounded-2xl bg-[#D97706] p-6 shadow-xl shadow-yellow-900/40 transition-all hover:scale-[1.02] hover:shadow-yellow-900/60 group">
                        <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none group-hover:opacity-20 transition-opacity duration-500">
                            <CheckCircle2 className="w-40 h-40 text-black fill-current" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                                        <Target className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">DISPONIBILIDAD</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">OBJ: 99.5%</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md block mb-1">
                                    {comparativeStats.sla.toFixed(2)}%
                                </span>
                                <p className="text-[11px] text-white/80 font-bold uppercase tracking-wide">
                                    Nivel de servicio actual
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: MTTR PROMEDIO -> ORANGE */}
                    <div className="relative overflow-hidden rounded-2xl bg-[#EA580C] p-6 shadow-xl shadow-orange-900/40 transition-all hover:scale-[1.02] hover:shadow-orange-900/60 group">
                        <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none group-hover:opacity-20 transition-opacity duration-500">
                            <Clock className="w-40 h-40 text-black fill-current" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                                        <Clock className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">MTTR PROMEDIO</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md">{comparativeStats.mttr.current.toFixed(1)}</span>
                                    <span className="text-xl font-bold text-white/80">h</span>
                                </div>
                                <p className="text-[11px] text-white/80 font-bold uppercase tracking-wide">
                                    Tiempo medio de reparación
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: TOTAL INCIDENTES -> BLUE */}
                    <div className="relative overflow-hidden rounded-2xl bg-[#2563EB] p-6 shadow-xl shadow-blue-900/40 transition-all hover:scale-[1.02] hover:shadow-blue-900/60 group">
                        <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none group-hover:opacity-20 transition-opacity duration-500">
                            <BarChart3 className="w-40 h-40 text-black fill-current" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                                        <Activity className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">INCIDENTES</span>
                                </div>
                                {comparativeStats.incidents.prev > 0 && (
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full border backdrop-blur-sm font-bold text-[10px] ${
                                        comparativeStats.trend === 'positive' 
                                        ? 'bg-green-500/20 text-white border-green-400/30' 
                                        : 'bg-red-500/20 text-white border-red-400/30'
                                    }`}>
                                        {comparativeStats.incidents.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(comparativeStats.incidents.growth).toFixed(1)}%
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md block mb-1">
                                    {comparativeStats.incidents.current}
                                </span>
                                <p className="text-[11px] text-white/80 font-bold uppercase tracking-wide truncate" title={comparativeStats.insightText}>
                                    {comparativeStats.insightText}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 4: ACTIVOS AHORA -> RED */}
                    <div className="relative overflow-hidden rounded-2xl bg-[#B91C1C] p-6 shadow-xl shadow-red-900/40 transition-all hover:scale-[1.02] hover:shadow-red-900/60 group">
                        <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none group-hover:opacity-20 transition-opacity duration-500">
                            <AlertTriangle className="w-40 h-40 text-black fill-current" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                                        <AlertOctagon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest">ACTIVOS AHORA</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-red-950/30 px-2 py-1 rounded-full border border-red-200/20 backdrop-blur-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">LIVE</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md block mb-1">{comparativeStats.activeNow}</span>
                                <p className="text-[11px] text-white/80 font-bold uppercase tracking-wide">
                                    Tickets en curso
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. BOTTOM ROW: CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ... (Kept existing Left & Right Charts) ... */}
                    {/* LEFT CHART: ISP VOLUME */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                             <Server className="w-5 h-5 text-purple-400" />
                             Volumen de Fallas por ISP (Top 5)
                        </h3>
                        <div className="space-y-4">
                            {comparativeCharts.topProviders.length === 0 ? (
                                <div className="text-center text-zinc-500 text-xs py-4">Sin datos para este periodo</div>
                            ) : (
                                comparativeCharts.topProviders.map((prov, i) => {
                                    const isExpanded = expandedProvider === prov.name;
                                    return (
                                    <div key={i} className="group relative">
                                        <div 
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setExpandedProvider(isExpanded ? null : prov.name);
                                                setExpandedStore(null);
                                            }}
                                        >
                                            <div className="flex justify-between text-sm font-bold uppercase mb-1.5 z-10 relative">
                                                <div className="flex items-center gap-2 text-zinc-300 tracking-wider">
                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90 text-white' : 'text-zinc-500'}`} />
                                                    <span className={isExpanded ? 'text-white' : ''}>{prov.name}</span>
                                                </div>
                                                <span className="text-zinc-400 font-mono text-xs">
                                                    {prov.count} casos ({prov.percent.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden shadow-inner border border-zinc-800/50">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.3)]" 
                                                    style={{ width: `${prov.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        {/* Nested Expansion Logic (Kept Same) */}
                                        <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] mt-3 mb-4' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden">
                                                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-2 space-y-1">
                                                    {getProviderDetails(prov.name).map(([networkId, failures], idx) => {
                                                        const storeName = failures[0].nombre_tienda || networkId;
                                                        const storeCode = failures[0].codigo_tienda || 'N/A';
                                                        const isStoreExpanded = expandedStore === networkId;
                                                        return (
                                                            <div key={networkId} className="rounded overflow-hidden">
                                                                <div 
                                                                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isStoreExpanded ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
                                                                    onClick={() => setExpandedStore(isStoreExpanded ? null : networkId)}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <Store className="w-4 h-4 shrink-0" />
                                                                        <span className="text-sm font-bold text-blue-400 font-mono">{storeCode}</span>
                                                                        <span className="text-sm font-medium truncate" title={storeName}>{storeName}</span>
                                                                        {failures.length > 1 && (<span className="text-[10px] font-bold bg-zinc-700 px-1.5 rounded-full text-white">{failures.length}</span>)}
                                                                    </div>
                                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isStoreExpanded ? 'rotate-180' : ''}`} />
                                                                </div>
                                                                {/* Level 2 Expansion (Kept Same) */}
                                                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isStoreExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                                    <div className="overflow-hidden bg-black/20 rounded-b-lg">
                                                                         <div className="grid grid-cols-[1.2fr_1.2fr_0.6fr_1fr_0.8fr_0.5fr] gap-2 px-4 py-2 bg-zinc-900/50 border-y border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                                                                            <div className="flex items-center justify-center gap-1"><Calendar className="w-3 h-3"/> Inicio</div>
                                                                            <div className="flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> Fin</div>
                                                                            <div>Duración</div>
                                                                            <div className="truncate">N° TkT</div>
                                                                            <div>Impacto</div>
                                                                            <div>Bitácora</div>
                                                                        </div>
                                                                        {failures.map((fail, fIdx) => {
                                                                            const start = new Date(fail.start_time);
                                                                            const duration = fail.total_downtime_minutes || fail.wan1_downtime_minutes || 0;
                                                                            const end = new Date(start.getTime() + duration * 60000);
                                                                            const isTotal = fail.site_impact === 'TOTAL';
                                                                            return (
                                                                                <div key={fail.id} className={`grid grid-cols-[1.2fr_1.2fr_0.6fr_1fr_0.8fr_0.5fr] gap-2 px-4 py-2.5 items-center border-b border-zinc-800/30 text-[10px] hover:bg-white/5 transition-colors ${fIdx % 2 === 0 ? 'bg-zinc-900/20' : 'bg-transparent'}`}>
                                                                                    <div className="text-center"><span className="block text-zinc-300 font-medium font-mono">{start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit'})}, {start.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span></div>
                                                                                    <div className="text-center"><span className="block text-zinc-400 font-mono">{end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit'})}, {end.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span></div>
                                                                                    <div className="text-center font-mono font-bold text-zinc-300">{duration} <span className="text-zinc-600 text-[9px] font-sans font-normal">min</span></div>
                                                                                    <div className="text-center text-zinc-400 font-mono text-[9px] truncate" title={fail.wan1_ticket_ref || ''}>{fail.wan1_ticket_ref || '-'}</div>
                                                                                    <div className="text-center"><span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold border ${isTotal ? 'text-red-400 bg-red-900/10 border-red-900/20' : 'text-yellow-400 bg-yellow-900/10 border-yellow-900/20'}`}>{fail.site_impact}</span></div>
                                                                                    <div className="flex justify-center"><button onClick={(e) => {e.stopPropagation(); setBitacoraTarget({id: fail.id, networkId: fail.network_id, name: fail.nombre_tienda || fail.network_id, readOnly: true});}} className="p-1.5 hover:bg-yellow-500/20 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Ver Bitácora (Histórico)"><Notebook className="w-3.5 h-3.5" /></button></div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT CHART: TOP SITES */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                             <AlertTriangle className="w-5 h-5 text-orange-400" />
                             Top Sitios con Fallas
                        </h3>
                        <div className="space-y-3">
                             {comparativeCharts.topSites.length === 0 ? (
                                 <div className="text-center text-zinc-500 text-xs py-4">Sin datos para este periodo</div>
                             ) : (
                                 comparativeCharts.topSites.map((site, i) => (
                                     <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group">
                                         <div className="flex items-center gap-4 overflow-hidden">
                                             <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${i === 0 ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                                 {i + 1}
                                             </div>
                                             <div className="truncate text-sm font-bold text-zinc-300 group-hover:text-white transition-colors tracking-tight">
                                                 <span className="text-blue-400 mr-2 font-mono">{site.code}</span>
                                                 {site.name}
                                             </div>
                                         </div>
                                         <div className="text-sm font-bold text-red-400 font-mono">
                                             {site.count}
                                         </div>
                                     </div>
                                 ))
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* B. HEATMAP (Keep Existing) */}
        {activeTab === 'heatmap' && (
             <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-lg overflow-hidden">
                {/* ... (Existing Heatmap Content) ... */}
                <div className="flex flex-col mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-500" />
                                Mapa de Calor (Últimos 30 días)
                            </h3>
                        </div>
                        <div className="flex gap-4 md:gap-6 text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                             <div className="flex items-center gap-2"><div className="w-4 h-4 bg-zinc-900/40 border border-zinc-800/50 rounded-sm"></div><span>Sin fallas</span></div>
                             <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-900/30 border border-red-900/40 rounded-sm"></div><span>&lt; 30m</span></div>
                             <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-600/60 border border-red-500/50 rounded-sm shadow-[0_0_5px_rgba(220,38,38,0.2)]"></div><span>30-120m</span></div>
                             <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-br from-red-600 to-orange-600 border border-red-400 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div><span className="font-bold text-white">&gt; 120m</span></div>
                        </div>
                    </div>
                </div>
                {loading ? (<div className="h-60 bg-zinc-900/30 animate-pulse rounded-xl border border-zinc-800/50"></div>) : (
                    <div className="overflow-x-auto pb-4">
                        <div className="min-w-max">
                            <div className="flex items-end mb-4 h-24">
                                <div className="w-40 shrink-0"></div>
                                {heatmapStats.dates.map((d, i) => (<div key={i} className="w-10 flex justify-center"><div className="text-xs font-bold text-zinc-500 font-mono -rotate-45 origin-bottom-left translate-x-4 whitespace-nowrap">{d.label}</div></div>))}
                                <div className="w-20"></div>
                            </div>
                            <div className="space-y-2">
                                {heatmapStats.providers.map((provider) => (
                                    <div key={provider} className="flex items-center group hover:bg-zinc-900/40 rounded-lg transition-colors p-1 -mx-1">
                                        <div className="w-40 shrink-0 text-sm font-bold text-zinc-300 truncate pr-4 text-right group-hover:text-white transition-colors" title={provider}>{provider}</div>
                                        <div className="flex gap-1.5">
                                            {heatmapStats.dates.map((d) => {
                                                const minutes = heatmapStats.matrix[provider][d.iso] || 0;
                                                return (
                                                    <div key={`${provider}-${d.iso}`} className={`w-10 h-10 rounded-md transition-all duration-300 relative group/cell cursor-default flex items-center justify-center ${getHeatmapColor(minutes)}`}>
                                                        {minutes > 0 && (<span className="text-[9px] font-bold leading-none pointer-events-none drop-shadow-md">{minutes}</span>)}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/cell:block z-50 pointer-events-none">
                                                            <div className="bg-black/90 backdrop-blur-md text-white text-xs px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap border border-zinc-700 flex flex-col items-center">
                                                                <span className="font-bold text-zinc-400 uppercase text-[10px] mb-0.5">{d.label}</span>
                                                                <span className="font-mono font-bold text-sm">{minutes > 0 ? `${minutes} min` : 'Sin fallas'}</span>
                                                            </div>
                                                            <div className="w-2 h-2 bg-black/90 border-r border-b border-zinc-700 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                            <div className="h-8 w-px bg-zinc-800"></div>
                                            <div className="flex flex-col pl-2"><span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Total</span><span className={`text-xs font-mono font-bold ${heatmapStats.rowTotals[provider] > 0 ? 'text-white' : 'text-zinc-500'}`}>{heatmapStats.rowTotals[provider]}m</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* C. SLA HISTORICAL (NEW ADVANCED VIEW) */}
        {activeTab === 'sla' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-lg relative min-h-[500px] flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        SLA Histórico Avanzado
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> 99.5%+
                            <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></span> 98-99.5%
                            <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> &lt;98%
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full bg-zinc-900/20 rounded-lg border border-zinc-800/50 p-4 relative overflow-hidden h-72">
                    {renderSlaChart()}
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 mb-6">
                    <MousePointerClick className="w-3 h-3" />
                    <span>Haz clic en un punto del gráfico para ver el análisis de causa raíz y presupuesto de error.</span>
                </div>

                {renderSlaDetails()}
            </div>
        )}

        {/* D. WEEKDAY ANALYSIS (Keep Existing) */}
        {activeTab === 'weekday' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-orange-500" />
                        Distribución de Fallas por Día de la Semana
                    </h3>
                </div>
                <div className="h-72 w-full bg-zinc-900/20 rounded-lg border border-zinc-800/50 p-4 relative overflow-hidden">
                    {renderWeekdayLineChart()}
                </div>
                {renderWeekdayDetails()}
                {!selectedDayIndex && (
                    <div className="mt-6 p-4 bg-zinc-900/30 rounded-lg border border-zinc-900 text-xs text-zinc-400 text-center">
                        El día más crítico es el <span className="text-orange-400 font-bold uppercase">{weekdayStats.reduce((a, b) => a.count > b.count ? a : b).label}</span>, concentrando la mayor cantidad de incidentes reportados históricamente.
                    </div>
                )}
            </div>
        )}

        {/* E. ISP TRENDS (NEW SUB-MODULE WITH COUNTRY FILTER) */}
        {activeTab === 'trends' && trendsStats && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-lg relative min-h-[500px] flex flex-col">
                {/* Header and Controls */}
                <div className="flex flex-col xl:flex-row justify-between xl:items-start gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 shrink-0">
                            <LineChart className="w-4 h-4 text-purple-500" />
                            Tendencia de Fallas (Multilínea)
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                            Compare el rendimiento histórico de múltiples proveedores.
                        </p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        
                        {/* MULTI-SELECT DROPDOWN REPLACING INPUT */}
                        <div className="relative flex-1 md:w-80" ref={providerSelectorRef}>
                            <button 
                                onClick={() => setShowProviderSelector(!showProviderSelector)}
                                className={`w-full flex items-center justify-between px-3 py-2 bg-zinc-900 border rounded-lg transition-all text-xs focus:outline-none ${
                                    showProviderSelector ? 'border-purple-500 ring-1 ring-purple-500/30 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                                <span className="truncate">
                                    {selectedTrendProviders.length === 0 
                                        ? 'Seleccionar proveedores...' 
                                        : `${selectedTrendProviders.length} Proveedores seleccionados`}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showProviderSelector ? 'rotate-180' : ''}`} />
                            </button>

                            {/* DROPDOWN PANEL WITH COUNTRY FILTER */}
                            {showProviderSelector && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-80">
                                    
                                    {/* INTERNAL SEARCH & COUNTRY FILTER */}
                                    <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 flex flex-col">
                                        
                                        {/* Country Tabs (Horizontal Scroll) */}
                                        <div className="p-2 pb-0 overflow-x-auto no-scrollbar flex gap-1.5 border-b border-zinc-800/50">
                                            {availableTrendCountries.map(country => (
                                                <button
                                                    key={country}
                                                    onClick={() => setTrendCountryFilter(country)}
                                                    className={`px-2 py-1.5 rounded-t-md text-[10px] font-bold uppercase whitespace-nowrap transition-colors border-t border-x border-b-0 ${
                                                        trendCountryFilter === country 
                                                        ? 'bg-zinc-800 text-white border-zinc-700' 
                                                        : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {country === 'TODOS' ? <Globe className="w-3 h-3 inline mr-1" /> : null}
                                                    {country}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Search Input */}
                                        <div className="p-2">
                                            <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800 focus-within:border-purple-500/50">
                                                <Search className="w-3 h-3 text-zinc-500" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Filtrar lista..." 
                                                    value={providerSearchTerm}
                                                    onChange={(e) => setProviderSearchTerm(e.target.value)}
                                                    className="bg-transparent border-none text-xs text-white placeholder:text-zinc-600 focus:outline-none w-full p-0"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* SCROLLABLE LIST */}
                                    <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                        {filteredProviderOptions.length > 0 ? (
                                            filteredProviderOptions.map((prov) => {
                                                const isSelected = selectedTrendProviders.includes(prov);
                                                // Identify Country part for styling
                                                const parts = prov.match(/(.*)\s\((.*)\)$/);
                                                const name = parts ? parts[1] : prov;
                                                const country = parts ? parts[2] : '';

                                                return (
                                                    <div 
                                                        key={prov}
                                                        onClick={() => toggleTrendProvider(prov)}
                                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs transition-colors mb-0.5 group ${
                                                            isSelected ? 'bg-purple-600/10 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate pr-2">
                                                            <span>{name}</span>
                                                            {country && (
                                                                <span className={`text-[9px] px-1.5 rounded border ${isSelected ? 'bg-purple-500/20 border-purple-500/30 text-purple-200' : 'bg-zinc-900 border-zinc-700 text-zinc-500 group-hover:text-zinc-400'}`}>
                                                                    {country}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" strokeWidth={3} />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-4 text-center text-[10px] text-zinc-600 italic">No se encontraron resultados</div>
                                        )}
                                    </div>
                                    
                                    {/* FOOTER */}
                                    <div className="p-2 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between items-center">
                                        <span>{filteredProviderOptions.length} resultados</span>
                                        {selectedTrendProviders.length > 0 && (
                                            <button onClick={() => setSelectedTrendProviders([])} className="text-purple-400 hover:underline">
                                                Limpiar selección ({selectedTrendProviders.length})
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Range Selector */}
                        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 shrink-0 self-start">
                            {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                        timeRange === range 
                                        ? 'bg-purple-600 text-white shadow-md' 
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Selected Providers Chips */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                    {selectedTrendProviders.map((prov, i) => {
                        const color = CHART_COLORS[i % CHART_COLORS.length];
                        return (
                            <div 
                                key={prov}
                                className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 rounded-md border border-zinc-800 text-[10px] font-bold text-zinc-300 shadow-sm transition-all hover:bg-zinc-800"
                                style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
                            >
                                {prov}
                                <button 
                                    onClick={() => setSelectedTrendProviders(prev => prev.filter(p => p !== prov))}
                                    className="ml-1 text-zinc-500 hover:text-red-400 p-0.5 rounded hover:bg-zinc-900/50"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                    {selectedTrendProviders.length === 0 && (
                        <span className="text-[10px] text-zinc-600 italic py-1">Ningún proveedor seleccionado. Use el selector para agregar.</span>
                    )}
                </div>

                {/* SVG CHART CONTAINER */}
                <div className="flex-1 w-full bg-zinc-900/20 rounded-lg border border-zinc-800/50 p-4 relative overflow-hidden">
                    {selectedTrendProviders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                            <LineChart className="w-8 h-8 opacity-20" />
                            <span className="text-xs italic">Agregue proveedores para visualizar la comparativa.</span>
                        </div>
                    ) : (
                        renderTrendLines()
                    )}
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
                    <MousePointerClick className="w-3 h-3" />
                    <span>Haz clic en un punto del gráfico para ver el detalle de las tiendas afectadas.</span>
                </div>

                {/* DETAILS SIDE-DRAWER */}
                <div 
                    className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-zinc-950 border-l border-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
                        selectedPointData ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {selectedPointData && (
                        <>
                            <div className="p-5 border-b border-zinc-900 bg-zinc-900/50 backdrop-blur-md flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        {selectedPointData.provider}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1 text-zinc-400 text-xs">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{selectedPointData.dateLabel}</span>
                                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-white font-bold ml-1">
                                            {selectedPointData.failures.length} Eventos
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedPointData(null)}
                                    className="p-1.5 bg-zinc-900 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedPointData.failures.length === 0 ? (
                                    <div className="text-center text-zinc-600 text-xs py-10">Sin detalles disponibles</div>
                                ) : (
                                    selectedPointData.failures.map((fail, i) => {
                                        const start = new Date(fail.start_time);
                                        const duration = fail.total_downtime_minutes || fail.wan1_downtime_minutes || 0;
                                        const end = new Date(start.getTime() + duration * 60000);
                                        
                                        return (
                                            <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-3 hover:bg-zinc-900/60 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-xs font-bold text-blue-400 font-mono mb-0.5">{fail.codigo_tienda || 'N/A'}</div>
                                                        <div className="text-xs text-zinc-200 font-bold truncate max-w-[200px]" title={fail.nombre_tienda}>
                                                            {fail.nombre_tienda || fail.network_id}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Ticket BMC</span>
                                                        <span className="text-[10px] font-mono text-zinc-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                                            {fail.wan1_ticket_ref || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 bg-zinc-950/30 p-2 rounded mb-2">
                                                    <div>
                                                        <span className="block text-zinc-600 font-bold uppercase mb-0.5">Inicio</span>
                                                        <span className="font-mono text-white">{start.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-zinc-600 font-bold uppercase mb-0.5">Fin</span>
                                                        <span className="font-mono text-white">{end.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex items-center gap-1 text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                                                            <MapPin className="w-3 h-3" /> {fail.pais}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => setBitacoraTarget({id: fail.id, networkId: fail.network_id, name: fail.nombre_tienda || fail.network_id})}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 bg-yellow-900/10 hover:bg-yellow-900/20 px-2 py-1 rounded border border-yellow-900/30 transition-colors"
                                                    >
                                                        <Notebook className="w-3 h-3" /> Bitácora
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
                
                {/* Backdrop for Drawer */}
                {selectedPointData && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setSelectedPointData(null)}
                    ></div>
                )}
            </div>
        )}

      </div>

      {/* Bitacora Modal */}
      {bitacoraTarget && (
          <BitacoraModal 
              failureId={bitacoraTarget.id}
              networkId={bitacoraTarget.networkId}
              storeName={bitacoraTarget.name}
              onClose={() => setBitacoraTarget(null)}
              readOnly={bitacoraTarget.readOnly}
          />
      )}
    </div>
  );
};

export default Metrics;
