
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { getFriendlyErrorMessage, isNetworkError } from '../utils/errorHandling';
import { NetworkFailure } from '../types';
import {
    BarChart3, Clock, TrendingUp, Activity, Target, Zap, Server,
    AlertTriangle, CalendarRange, ArrowDownRight, ArrowUpRight,
    Minus, Flame, CalendarDays, MapPin, Info, CheckCircle2, AlertOctagon,
    Calendar, ChevronDown, Store, ChevronRight, Timer, FileText, Hash, Notebook,
    LineChart, X, MousePointerClick, Search, Plus, HelpCircle, Lightbulb, ChevronUp, Check, Globe, Trophy, PieChart, Loader2,
    Mail, Slack, Trello, ExternalLink, MessageSquare
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
    const [inventoryProviders, setInventoryProviders] = useState<string[]>([]);

    // EXPANSION STATES FOR ISP CHART
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [expandedStore, setExpandedStore] = useState<string | null>(null);

    // SLA INTERACTION STATE
    const [selectedSlaMonth, setSelectedSlaMonth] = useState<string | null>(null);

    // Bitacora Modal State - Added readOnly support
    const [bitacoraTarget, setBitacoraTarget] = useState<{ id: string | number, networkId: string, name: string, readOnly?: boolean } | null>(null);

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

    // CONFIG STATE FOR TOP RANKINGS (Comparativa)
    const [topRankingLimit, setTopRankingLimit] = useState<number>(5);

    const [selectedPointData, setSelectedPointData] = useState<{
        provider: string;
        dateLabel: string;
        isoDate: string;
        failures: NetworkFailure[];
    } | null>(null);

    const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{
        provider: string;
        dateLabel: string;
        isoDate: string;
        failures: NetworkFailure[];
    } | null>(null);

    // SLA HISTORICAL TIMEFRAME STATE
    const [slaTimeframe, setSlaTimeframe] = useState<3 | 6 | 12>(6);

    // DYNAMIC HEALTH METRIC ALIGNED WITH DASHBOARD
    const activeIncidentsCount = useMemo(() => {
        const activeMassiveIds = new Set(
            failures
                .filter(f => f.event_type === 'Falla Masiva' && (f.lifecycle_stage === 'Activa' || f.lifecycle_stage === 'En observación'))
                .map(f => String(f.id).replace('mas-', ''))
        );

        return failures.filter(f => {
            if (f.event_type !== 'Falla Estándar') return false;

            const isActiveStage = ['Activa', 'En gestión', 'En observación', 'Intermitencia'].includes(f.lifecycle_stage);
            if (!isActiveStage) return false;

            // Check specifically like Dashboard does
            const isMassive = (f as any).es_falla_masiva;
            if (isMassive) {
                const p1 = (f as any).wan1_massive_incident_id ? String((f as any).wan1_massive_incident_id) : null;
                const p2 = (f as any).wan2_massive_incident_id ? String((f as any).wan2_massive_incident_id) : null;
                const parentIsActive = (p1 && activeMassiveIds.has(p1)) || (p2 && activeMassiveIds.has(p2));
                if ((p1 || p2) && !parentIsActive) return false;
            }
            return true;
        }).length;
    }, [failures]);

    const healthMetric = useMemo(() => {
        if (totalDevices === 0) return 100;
        const percent = ((totalDevices - activeIncidentsCount) / totalDevices) * 100;
        return Math.max(0, Math.min(100, percent)).toFixed(2);
    }, [totalDevices, activeIncidentsCount]);

    useEffect(() => {
        fetchMetricsData();
        const intervalId = setInterval(() => fetchMetricsData(true), 60000); // 60 segundos
        return () => clearInterval(intervalId);
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

    const fetchMetricsData = async (isBackgroundSync = false) => {
        if (!isBackgroundSync) setLoading(true);
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
                        codigo_tienda: `T-${1000 + i}`,
                        lifecycle_stage: 'Resuelta',
                        start_time: date.toISOString(),
                        wan1_provider_name: ['CANTV', 'INTER', 'MOVISTAR', 'CLARO'][Math.floor(Math.random() * 4)],
                        pais: ['VENEZUELA', 'COLOMBIA', 'MEXICO'][Math.floor(Math.random() * 3)],
                        total_downtime_minutes: Math.floor(Math.random() * 180),
                        wan1_ticket_ref: `INC-${10000 + i}`,
                        wan2_ticket_ref: Math.random() > 0.5 ? `NOT-REQ` : `SEG-${500 + i}`,
                        site_impact: Math.random() > 0.8 ? 'TOTAL' : 'PARCIAL',
                        cruce_tienda: ['Av. Principal Centro', 'Esq. Comercial Sur', 'Calle 50 con Cra 10', 'Plaza Mayor'][Math.floor(Math.random() * 4)]
                    } as any;
                });
                data = [...data, ...dummyHistory];
                countDevices = 1250;
            } else {
                // Real Supabase Fetch - Parallelized and Optimized (No time limit to fetch all DB)
                const [failRes, degRes, masRes, countRes, provsRes, invRes] = await Promise.all([
                    supabase
                        .from('network_failures_jj')
                        .select('id, network_id, start_time, lifecycle_stage, total_downtime_minutes, wan1_downtime_minutes, wan2_downtime_minutes, site_impact, root_cause, liability, wan1_massive_incident_id, wan2_massive_incident_id, es_falla_masiva')
                        .limit(500000), // High limit to fetch "all" safely without default 1000 pagination
                    supabase
                        .from('network_degradations_jj')
                        .select('id, network_id, created_at, status')
                        .limit(500000),
                    supabase
                        .from('massive_incidents_jj')
                        .select('id, provider_name, country, start_time, status')
                        .limit(500000),
                    supabase
                        .from('devices_inventory_jj')
                        .select('*', { count: 'exact', head: true }),
                    supabase
                        .from('isp_providers_jj')
                        .select('name, country'),
                    supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda, codigo_tienda, pais, cruce_tienda, wan1_provider:isp_providers_jj!wan1_provider_id(name)')
                ]);

                if (failRes.error) throw failRes.error;

                const dbData = failRes.data || [];
                const degData = degRes.data || [];
                const masData = masRes.data || [];
                const invData = invRes.data || [];

                if (countRes.count) countDevices = countRes.count;

                // Load all 51 providers regardless of failures
                if (provsRes.data) {
                    const provs = new Set<string>();
                    provsRes.data.forEach((row: any) => {
                        const name = row.name?.toUpperCase()?.trim();
                        const country = row.country?.toUpperCase()?.trim();
                        if (name && country) provs.add(`${name} (${country})`);
                    });
                    setInventoryProviders(Array.from(provs));
                }

                // Map standard failures
                const mappedFailures = dbData.map((f: any) => {
                    const inv = invData.find((i: any) => i.network_id === f.network_id);
                    return {
                        ...f,
                        nombre_tienda: inv?.nombre_tienda || f.nombre_tienda || f.network_id,
                        codigo_tienda: inv?.codigo_tienda || f.codigo_tienda,
                        cruce_tienda: inv?.cruce_tienda || f.cruce_tienda,
                        wan1_provider_name: inv?.wan1_provider?.name || 'Desconocido',
                        pais: inv?.pais || f.pais || 'Desconocido',
                        event_type: 'Falla Estándar',
                        wan1_massive_incident_id: f.wan1_massive_incident_id,
                        wan2_massive_incident_id: f.wan2_massive_incident_id,
                        es_falla_masiva: f.es_falla_masiva
                    };
                });

                // Map degradations
                const mappedDegradations = degData.map((d: any) => {
                    const inv = invData.find((i: any) => i.network_id === d.network_id);
                    return {
                        id: `deg-${d.id}`,
                        network_id: d.network_id,
                        start_time: d.created_at,
                        lifecycle_stage: d.status,
                        nombre_tienda: inv?.nombre_tienda || d.network_id,
                        codigo_tienda: inv?.codigo_tienda,
                        cruce_tienda: inv?.cruce_tienda,
                        wan1_provider_name: inv?.wan1_provider?.name || 'Desconocido',
                        pais: inv?.pais || 'Desconocido',
                        site_impact: 'DEGRADACIÓN',
                        event_type: 'Degradación',
                        total_downtime_minutes: 0
                    };
                });

                // Map massive incidents
                const mappedMassive = masData.map((m: any) => {
                    return {
                        id: `mas-${m.id}`,
                        network_id: `MASIVA-${m.id}`,
                        start_time: m.start_time,
                        lifecycle_stage: m.status,
                        nombre_tienda: `Afectación Masiva ${m.country}`,
                        wan1_provider_name: m.provider_name || 'Desconocido',
                        pais: m.country || 'Desconocido',
                        site_impact: 'MASIVO',
                        event_type: 'Falla Masiva',
                        total_downtime_minutes: 0
                    };
                });

                data = [...mappedFailures, ...mappedDegradations, ...mappedMassive];
            }

            setFailures(data);
            setTotalDevices(countDevices);

        } catch (err: any) {
            const msg = err.message || String(err);
            console.warn("Metrics Sync:", msg);
            if (msg.includes('fetch') || msg.includes('NetworkError')) {
                // Fallback to mock data generation logic if fetch fails
                const mockFailures: NetworkFailure[] = [];
                const providers = ['CANTV', 'INTER', 'CLARO', 'MOVISTAR', 'TIGO'];
                const countries = ['VENEZUELA', 'COLOMBIA', 'MEXICO'];

                for (let i = 0; i < 100; i++) {
                    const start = new Date();
                    start.setDate(start.getDate() - Math.floor(Math.random() * 365));
                    mockFailures.push({
                        id: i,
                        network_id: `MOCK-${i}`,
                        nombre_tienda: `Tienda Mock ${i}`,
                        wan1_provider_name: providers[Math.floor(Math.random() * providers.length)],
                        pais: countries[Math.floor(Math.random() * countries.length)],
                        start_time: start.toISOString(),
                        total_downtime_minutes: Math.floor(Math.random() * 500),
                        cruce_tienda: ['Av. Fallback', 'Calle Alterna'][Math.floor(Math.random() * 2)]
                    } as any);
                }
                setFailures(mockFailures);
                setTotalDevices(500);
            }
        } finally {
            setLoading(false);
        }
    };

    // DERIVED DATA FOR SEARCH
    // UPDATED: Now generates "PROVIDER (COUNTRY)" keys, including all known from inventory
    const allAvailableProviders = useMemo(() => {
        const providers = new Set<string>();

        inventoryProviders.forEach(p => providers.add(p));

        failures.forEach(f => {
            if (f.wan1_provider_name) {
                const name = f.wan1_provider_name.toUpperCase().trim();
                const country = (f.pais || 'N/A').toUpperCase().trim();
                providers.add(`${name} (${country})`);
            }
        });
        return Array.from(providers).sort();
    }, [failures, inventoryProviders]);

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

    // Filter available providers based on search and country
    const filteredProviderOptions = useMemo(() => {
        let result = allAvailableProviders;

        if (trendCountryFilter !== 'TODOS') {
            result = result.filter(p => p.includes(`(${trendCountryFilter})`));
        }

        if (providerSearchTerm) {
            const lowerSearch = providerSearchTerm.toLowerCase();
            result = result.filter(p => p.toLowerCase().includes(lowerSearch));
        }

        return result;
    }, [allAvailableProviders, providerSearchTerm, trendCountryFilter]);

    // INITIALIZATION & RESIZING
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

    const selectAllFilteredProviders = () => {
        const allFiltered = filteredProviderOptions;
        const allSelected = allFiltered.every(p => selectedTrendProviders.includes(p));

        if (allSelected) {
            // Unselect all filtered
            setSelectedTrendProviders(prev => prev.filter(p => !allFiltered.includes(p)));
        } else {
            // Select all filtered
            setSelectedTrendProviders(prev => {
                const newSelection = [...prev];
                allFiltered.forEach(p => {
                    if (!newSelection.includes(p)) newSelection.push(p);
                });
                return newSelection;
            });
        }
    };


    // --- SUB-MODULE 1: COMPARATIVE STATS (Dynamic Range) ---
    const comparativeStats = useMemo(() => {
        const now = new Date();
        let currentStart = new Date();
        let prevStart = new Date();
        let prevEnd = new Date();

        switch (timeRange) {
            case 'day':
                currentStart.setHours(0, 0, 0, 0);
                prevStart.setDate(now.getDate() - 1);
                prevStart.setHours(0, 0, 0, 0);
                prevEnd.setDate(now.getDate() - 1);
                prevEnd.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay() || 7;
                if (day !== 1) currentStart.setHours(-24 * (day - 1));
                else currentStart.setHours(0, 0, 0, 0);

                prevStart = new Date(currentStart);
                prevStart.setDate(prevStart.getDate() - 7);

                prevEnd = new Date(currentStart);
                prevEnd.setDate(prevEnd.getDate() - 1);
                prevEnd.setHours(23, 59, 59, 999);
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

        const topSites = Object.values(siteCounts).sort((a, b) => b.count - a.count).slice(0, topRankingLimit);

        const provCounts: Record<string, number> = {};
        data.forEach(f => {
            const p = f.wan1_provider_name || 'Desconocido';
            provCounts[p] = (provCounts[p] || 0) + 1;
        });
        const topProviders = Object.entries(provCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topRankingLimit)
            .map(([name, count]) => ({
                name, count, percent: data.length > 0 ? (count / data.length) * 100 : 0
            }));

        return { topSites, topProviders };
    }, [comparativeStats, topRankingLimit]);

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

        return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    };


    // --- SUB-MODULE 2: HEATMAP ---
    const heatmapStats = useMemo(() => {
        const daysToShow = 30;
        const dates: { label: string; iso: string }[] = [];

        // Helper for local date key
        const getLocalKey = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push({
                iso: getLocalKey(d),
                label: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
            });
        }

        const providerCounts: Record<string, number> = {};
        failures.forEach(f => {
            const p = f.wan1_provider_name || 'Desconocido';
            providerCounts[p] = (providerCounts[p] || 0) + 1;
        });
        const topProviders = Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(p => p[0]);

        const matrix: Record<string, Record<string, number>> = {};
        const failuresMap: Record<string, Record<string, NetworkFailure[]>> = {};
        const rowTotals: Record<string, number> = {};

        topProviders.forEach(p => {
            matrix[p] = {};
            failuresMap[p] = {};
            rowTotals[p] = 0;
            dates.forEach(d => {
                matrix[p][d.iso] = 0;
                failuresMap[p][d.iso] = [];
            });
        });

        failures.forEach(f => {
            const pName = f.wan1_provider_name || 'Desconocido';
            const fDate = getLocalKey(new Date(f.start_time));
            if (matrix[pName] && matrix[pName][fDate] !== undefined) {
                const downtime = f.total_downtime_minutes || f.wan1_downtime_minutes || 60;
                matrix[pName][fDate] += downtime;
                failuresMap[pName][fDate].push(f);
                rowTotals[pName] += downtime;
            }
        });

        // Calculate daily totals for the "High Management" summary
        const dailyTotals: Record<string, number> = {};
        dates.forEach(d => {
            dailyTotals[d.iso] = topProviders.reduce((acc, p) => acc + (matrix[p][d.iso] || 0), 0);
        });

        return { dates, providers: topProviders, matrix, failuresMap, rowTotals, dailyTotals };
    }, [failures]);

    // --- SUB-MODULE 3: SLA HISTORICAL (ADVANCED) ---
    const slaHistory = useMemo(() => {
        const stats: Record<string, { downtime: number, days: number, monthLabel: string, monthKey: string }> = {};
        const months: string[] = [];

        for (let i = slaTimeframe - 1; i >= 0; i--) {
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

            let status: 'optimal' | 'warning' | 'critical' = 'optimal';
            if (sla < 99.5) status = 'critical';
            else if (sla < 99.8) status = 'warning';

            return {
                label: monthLabel,
                key: monthKey,
                sla: Math.max(0, sla),
                downtime,
                totalMinutes,
                allowedDowntime: Math.round(allowedDowntime),
                status
            };
        });
    }, [failures, totalDevices, slaTimeframe]);

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
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        // Top Offenders: Providers
        const provImpact: Record<string, number> = {};
        monthlyFailures.forEach(f => {
            const name = f.wan1_provider_name || 'Desconocido';
            const dt = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
            provImpact[name] = (provImpact[name] || 0) + dt;
        });
        const topProviders = Object.entries(provImpact)
            .sort((a, b) => b[1] - a[1])
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
            for (let i = 23; i >= 0; i--) {
                const d = new Date(now);
                d.setHours(d.getHours() - i);
                // Key is YYYY-MM-DD-HH
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;

                // Formatting label for Hourly: "14:00"
                const label = `${String(d.getHours()).padStart(2, '0')}:00`;

                bucketMap[key] = { label, iso: key, order: i };
                buckets.push(key);
            }
        } else if (timeRange === 'week') {
            for (let i = 6; i >= 0; i--) {
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
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                bucketMap[key] = {
                    label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                    iso: key,
                    order: i
                };
                buckets.push(key);
            }
        } else {
            // Month (Last 30 days)
            for (let i = 29; i >= 0; i--) {
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
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
            } else if (timeRange === 'year') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
        if (minutes === 0) return 'bg-zinc-900/20 hover:bg-zinc-800/40 border border-zinc-800/30 text-transparent';
        if (minutes < 30) return 'bg-red-500/10 border border-red-500/20 text-red-300/60';
        if (minutes < 120) return 'bg-red-500/40 border border-red-400/40 text-white shadow-[0_0_10px_rgba(239,68,68,0.15)]';
        if (minutes < 480) return 'bg-red-600 border border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]';
        return 'bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 border border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] animate-pulse-subtle';
    };

    const getTrendIcon = (val: number) => {
        if (val > 0) return <ArrowUpRight className="w-3 h-3" />;
        if (val < 0) return <ArrowDownRight className="w-3 h-3" />;
        return <Minus className="w-3 h-3" />;
    };

    // Helper for SLA Chart Rendering (SVG)
    const renderSlaChart = () => {
        const height = 320;
        const width = 1000;
        const paddingX = 60;
        const paddingY = 40;
        const usableHeight = height - paddingY * 2;
        const usableWidth = width - paddingX * 2;
        const stepX = usableWidth / (slaHistory.length - 1);

        const minSla = 98.5; // Zoom in more
        const maxSla = 100;

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible select-none">
                <defs>
                    <linearGradient id="slaAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Grid Lines */}
                {[98.5, 99, 99.5, 100].map((val) => {
                    const y = height - paddingY - (((val - minSla) / (maxSla - minSla)) * usableHeight);
                    return (
                        <g key={val}>
                            <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.1" />
                            <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-xs fill-zinc-400 font-mono font-bold">{val}%</text>
                        </g>
                    );
                })}

                {/* Threshold Line at 99.5% */}
                {(() => {
                    const y995 = height - paddingY - (((99.5 - minSla) / (maxSla - minSla)) * usableHeight);
                    return (
                        <g>
                            <line x1={paddingX} y1={y995} x2={width - paddingX} y2={y995} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
                            <rect x={width - paddingX + 5} y={y995 - 8} width="40" height="16" rx="4" fill="#ef4444" fillOpacity="0.1" />
                            <text x={width - paddingX + 25} y={y995 + 3} textAnchor="middle" className="text-[9px] fill-red-400 font-black tracking-tighter">TARGET</text>
                        </g>
                    )
                })()}

                {/* Area Path */}
                {(() => {
                    const points = slaHistory.map((d, i) => {
                        const x = paddingX + (i * stepX);
                        const visualSla = Math.max(minSla, Math.min(maxSla, d.sla));
                        const y = height - paddingY - (((visualSla - minSla) / (maxSla - minSla)) * usableHeight);
                        return `${x},${y}`;
                    });
                    const areaPoints = [
                        `${paddingX},${height - paddingY}`,
                        ...points,
                        `${width - paddingX},${height - paddingY}`
                    ].join(' ');

                    return <polygon points={areaPoints} fill="url(#slaAreaGradient)" />;
                })()}

                {/* SLA Line Path */}
                {(() => {
                    const points = slaHistory.map((d, i) => {
                        const x = paddingX + (i * stepX);
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
                                filter="url(#glow)"
                            />
                            {slaHistory.map((d, i) => {
                                const x = paddingX + (i * stepX);
                                const visualSla = Math.max(minSla, Math.min(maxSla, d.sla));
                                const y = height - paddingY - (((visualSla - minSla) / (maxSla - minSla)) * usableHeight);
                                const isSelected = selectedSlaMonth === d.key;

                                return (
                                    <g key={i} onClick={() => setSelectedSlaMonth(isSelected ? null : d.key)} className="cursor-pointer group">
                                        {/* Vertical Guide Line on Hover */}
                                        <line
                                            x1={x} y1={paddingY} x2={x} y2={height - paddingY}
                                            stroke="#ffffff" strokeWidth="1" strokeOpacity="0"
                                            className="group-hover:stroke-opacity-10 transition-opacity"
                                        />

                                        {/* Invisible hit area */}
                                        <rect x={x - stepX / 2} y={paddingY} width={stepX} height={usableHeight} fill="transparent" />

                                        {/* Point */}
                                        <circle
                                            cx={x} cy={y} r={isSelected ? 8 : 5}
                                            fill={d.status === 'optimal' ? '#10b981' : d.status === 'warning' ? '#facc15' : '#ef4444'}
                                            stroke="#09090b" strokeWidth="2.5"
                                            className="transition-all duration-300 group-hover:scale-125"
                                        />

                                        {/* Label */}
                                        <text x={x} y={height - 15} textAnchor="middle" className={`text-[11px] font-black tracking-widest transition-colors ${isSelected ? 'fill-white' : 'fill-zinc-400 group-hover:fill-white'}`}>
                                            {d.label}
                                        </text>

                                        {/* Value Label */}
                                        <g className={`transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                            <rect x={x - 25} y={y - 32} width="50" height="20" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                                            <text x={x} y={y - 18} textAnchor="middle" className={`text-[10px] font-black ${d.sla >= 99.5 ? 'fill-emerald-400' : 'fill-red-400'}`}>
                                                {d.sla.toFixed(2)}%
                                            </text>
                                        </g>
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
            <div className="mt-8 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${isBreached ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                            {isBreached ? <AlertOctagon className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h4 className="text-2xl font-black text-white tracking-tighter uppercase">Análisis: {monthData.label}</h4>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isBreached ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                    {isBreached ? 'SLA Incumplido' : 'SLA Cumplido'}
                                </span>
                            </div>
                            <p className="text-zinc-500 text-sm font-medium mt-1">
                                Objetivo Contractual: <span className="text-zinc-300">99.50%</span> | Rendimiento Real: <span className={`font-black ${isBreached ? 'text-red-400' : 'text-emerald-400'}`}>{monthData.sla.toFixed(2)}%</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-2xl text-center min-w-[120px]">
                            <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Eventos</div>
                            <div className="text-xl font-black text-white">{slaBreakdown.totalEvents}</div>
                        </div>
                        <button
                            onClick={() => setSelectedSlaMonth(null)}
                            className="w-12 h-12 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all border border-zinc-700/50"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                    {/* ERROR BUDGET BENTO */}
                    <div className="bg-zinc-950/80 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between group hover:border-zinc-700 transition-colors">
                        <div>
                            <h5 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-blue-500" /> Presupuesto de Error
                            </h5>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-zinc-400 font-bold uppercase">Permitido</span>
                                    <span className="text-lg font-black text-white font-mono">{monthData.allowedDowntime} <span className="text-[10px] text-zinc-600">min</span></span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-zinc-400 font-bold uppercase">Consumido</span>
                                    <span className={`text-lg font-black font-mono ${isBreached ? 'text-red-400' : 'text-emerald-400'}`}>{monthData.downtime} <span className="text-[10px] text-zinc-600">min</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${budgetUsedPercent > 100 ? 'bg-red-600' : budgetUsedPercent > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-3">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">Utilización</span>
                                <span className={`text-[10px] font-black uppercase ${budgetUsedPercent > 100 ? 'text-red-400' : 'text-emerald-400'}`}>{budgetUsedPercent.toFixed(1)}%</span>
                            </div>
                            <p className={`text-[10px] font-bold mt-4 p-3 rounded-xl text-center border ${isBreached ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'}`}>
                                {budgetUsedPercent > 100
                                    ? `Excedido en ${monthData.downtime - monthData.allowedDowntime} min`
                                    : `Disponible: ${monthData.allowedDowntime - monthData.downtime} min`}
                            </p>
                        </div>
                    </div>

                    {/* TOP STORES BENTO */}
                    <div className="bg-zinc-950/80 border border-zinc-800 p-6 rounded-3xl group hover:border-zinc-700 transition-colors">
                        <h5 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                            <Store className="w-4 h-4 text-orange-500" /> Tiendas Críticas
                        </h5>
                        <div className="space-y-3">
                            {topStores.length > 0 ? topStores.map(([name, mins], idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">0{idx + 1}</div>
                                        <span className="text-xs font-bold text-zinc-300 truncate" title={name}>{name}</span>
                                    </div>
                                    <span className="text-xs font-black font-mono text-red-400 shrink-0">{mins}m</span>
                                </div>
                            )) : (
                                <div className="h-40 flex items-center justify-center text-zinc-600 text-xs font-bold italic">Sin afectaciones registradas</div>
                            )}
                        </div>
                    </div>

                    {/* TOP PROVIDERS BENTO */}
                    <div className="bg-zinc-950/80 border border-zinc-800 p-6 rounded-3xl group hover:border-zinc-700 transition-colors">
                        <h5 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                            <Server className="w-4 h-4 text-violet-500" /> Proveedores Críticos
                        </h5>
                        <div className="space-y-3">
                            {topProviders.length > 0 ? topProviders.map(([name, mins], idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">0{idx + 1}</div>
                                        <span className="text-xs font-bold text-zinc-300 truncate" title={name}>{name}</span>
                                    </div>
                                    <span className="text-xs font-black font-mono text-orange-400 shrink-0">{mins}m</span>
                                </div>
                            )) : (
                                <div className="h-40 flex items-center justify-center text-zinc-600 text-xs font-bold italic">Sin afectaciones registradas</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Helper for Trends Detail Modal
    const renderTrendDetailsModal = () => {
        if (!selectedPointData) return null;
        const { provider, dateLabel, failures: pointFailures } = selectedPointData;

        // Aggregations
        const totalIncidents = pointFailures.length;
        const totalDowntime = pointFailures.reduce((acc, f) => acc + (f.total_downtime_minutes || f.wan1_downtime_minutes || 0), 0);
        const avgDowntime = totalIncidents > 0 ? Math.round(totalDowntime / totalIncidents) : 0;

        const uniqueStores = Array.from(new Set(pointFailures.map(f => f.nombre_tienda || f.network_id)));

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">

                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                                <LineChart className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none truncate" title={provider}>{provider}</h3>
                                <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest truncate">
                                    {dateLabel} • {totalIncidents} {totalIncidents === 1 ? 'Incidente' : 'Incidentes'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedPointData(null)}
                            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700/50 ml-4"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* SUMMARY SECTION */}
                    <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-800/50 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Incidencias (Día/Hora)</span>
                            <span className="text-xl font-black text-white">{totalIncidents}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Promedio de Afectación</span>
                            <span className="text-xl font-black text-red-400">{avgDowntime} min</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Tiendas Afectadas ({uniqueStores.length})</span>
                            <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                {uniqueStores.map(st => (
                                    <span key={st} className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 truncate max-w-[150px]" title={st}>
                                        {st}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                        {pointFailures.map((f, idx) => {
                            const start = new Date(f.start_time);
                            const duration = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
                            const end = new Date(start.getTime() + duration * 60000);

                            const hasEmail = f.email_status_w1 === 'OK' || f.email_status_w2 === 'OK' || duration > 5;
                            const hasSlack = Boolean(f.slack_thread_ts) || duration > 5;
                            const hasJira = Boolean(f.wan1_ticket_ref) || Boolean(f.wan2_ticket_ref) || duration > 5;
                            const slackUrl = f.slack_thread_ts
                                ? `https://app.slack.com/client/T28BJ8LUE/C07FZE49ZPW/thread/C07FZE49ZPW-${f.slack_thread_ts}`
                                : '#';

                            return (
                                <div key={f.id || idx} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

                                        {/* Store Info */}
                                        <div className="lg:col-span-4 flex flex-col justify-center border-r border-zinc-800/50 pr-4">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                                                    {f.codigo_tienda || 'N/A'}
                                                </span>
                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{f.pais}</span>
                                                {f.event_type && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${f.event_type === 'Falla Estándar' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        f.event_type === 'Degradación' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                        {f.event_type}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-black text-white leading-tight truncate" title={f.nombre_tienda}>
                                                {f.nombre_tienda || f.network_id}
                                            </h4>
                                            {f.cruce_tienda && (
                                                <div className="flex items-start gap-1 mt-1 text-zinc-500 hover:text-zinc-400 transition-colors">
                                                    <span className="text-[10px] font-bold leading-tight">📍 {f.cruce_tienda}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time Info */}
                                        <div className="lg:col-span-5 grid grid-cols-3 gap-4 border-r border-zinc-800/50 pr-4">
                                            <div>
                                                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Inicio</span>
                                                <span className="text-xs font-bold text-zinc-300 font-mono">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Duración</span>
                                                <span className="text-xs font-bold text-red-400 font-mono">{duration}m</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Fin</span>
                                                <span className="text-xs font-bold text-zinc-300 font-mono">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        {/* Actions & Icons */}
                                        <div className="lg:col-span-3 flex items-center justify-between pl-2">
                                            <div className="flex gap-2">
                                                {/* Email */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${hasEmail ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_-2px_rgba(249,115,22,0.3)]' : 'bg-transparent text-[#262626] border-[#1f1f1f]'}`} title={hasEmail ? "Email Enviado automatizado por N8N (>5m)" : "Sin Email"}>
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                {/* Slack */}
                                                {hasSlack && f.slack_thread_ts ? (
                                                    <a href={slackUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center border bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 shadow-[0_0_10px_-2px_rgba(168,85,247,0.3)] transition-all" title="Ver en Slack">
                                                        <Slack className="w-4 h-4" />
                                                    </a>
                                                ) : hasSlack ? (
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_-2px_rgba(168,85,247,0.3)]" title="Notificado en Slack automatizado por N8N (>5m)">
                                                        <Slack className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-transparent text-[#262626] border-[#1f1f1f]" title="Sin Slack">
                                                        <Slack className="w-4 h-4" />
                                                    </div>
                                                )}
                                                {/* Jira */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${hasJira ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_-2px_rgba(59,130,246,0.3)]' : 'bg-transparent text-[#262626] border-[#1f1f1f]'}`} title={hasJira ? "Ticket Jira Creado automatizado por N8N (>5m)" : "Sin Ticket"}>
                                                    <Trello className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {/* Bitacora */}
                                                <button
                                                    onClick={() => setBitacoraTarget({ id: f.id, networkId: f.network_id, name: f.nombre_tienda || f.network_id, readOnly: true })}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700/50"
                                                    title="Ver Bitácora"
                                                >
                                                    <Notebook className="w-4 h-4" />
                                                </button>
                                                {/* Meraki */}
                                                {f.meraki_url && (
                                                    <a href={f.meraki_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700/50" title="Ir a Meraki">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 text-center">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                            Haga clic fuera o en la X para cerrar • Datos actualizados en tiempo real
                        </p>
                    </div>
                </div>
            </div>
        );
    };
    const renderTrendLines = () => {
        if (!trendsStats) return null;
        const { buckets, datasets, maxValue } = trendsStats;
        const height = 350;
        const width = 1000;
        const paddingLeft = 140;
        const paddingRight = 100;
        const paddingY = 40;
        const usableHeight = height - paddingY * 2;
        const usableWidth = width - paddingLeft - paddingRight;
        const stepX = usableWidth / (buckets.length - 1);
        const safeMax = maxValue > 0 ? maxValue : 1; // Previene error de división por cero "NaN" en coordenadas SVG

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = height - paddingY - (ratio * usableHeight);
                    return (
                        <g key={ratio}>
                            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={paddingLeft - 20} y={y + 4} textAnchor="end" className="text-sm fill-zinc-400 font-mono font-bold">
                                {Math.round(ratio * safeMax)}
                            </text>
                        </g>
                    );
                })}

                {selectedTrendProviders.map((provider, pIdx) => {
                    const data = datasets[provider].data;
                    const color = CHART_COLORS[pIdx % CHART_COLORS.length];

                    const points = data.map((val, idx) => {
                        const x = paddingLeft + (idx * stepX);
                        const y = height - paddingY - ((val / safeMax) * usableHeight);
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
                                const x = paddingLeft + (idx * stepX);
                                const y = height - paddingY - ((val / safeMax) * usableHeight);
                                const bucketKey = buckets[idx];
                                const bucketLabel = trendsStats.bucketMap[bucketKey].label;

                                return (
                                    <circle
                                        key={idx}
                                        cx={x}
                                        cy={y}
                                        r={val === 0 ? "3" : "4"}
                                        fill={val === 0 ? "transparent" : color}
                                        stroke={val === 0 ? "transparent" : "#09090b"}
                                        strokeWidth="2"
                                        className={`cursor-pointer transition-all duration-200 ${val === 0 ? 'hover:fill-zinc-700/50 hover:r-4' : 'hover:r-6'}`}
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

                    const x = paddingLeft + (idx * stepX);
                    return (
                        <text key={b} x={x} y={height - 2} textAnchor="middle" className="text-xs fill-zinc-400 font-mono font-black drop-shadow-md">
                            {trendsStats.bucketMap[b].label}
                        </text>
                    );
                })}
            </svg>
        );
    };

    // Helper for Weekday Line Chart
    const renderWeekdayLineChart = () => {
        const height = 350;
        const width = 1000;
        const paddingLeft = 140;
        const paddingRight = 100;
        const paddingY = 40;

        const usableHeight = height - paddingY * 2;
        const usableWidth = width - paddingLeft - paddingRight;

        const maxValue = Math.max(...weekdayStats.map(d => d.count)) || 1;
        const stepX = usableWidth / (weekdayStats.length - 1);

        // Generate Points
        const points = weekdayStats.map((d, i) => {
            const x = paddingLeft + (i * stepX);
            const y = height - paddingY - ((d.count / maxValue) * usableHeight);
            return `${x},${y}`;
        }).join(' ');

        // Generate Area Path (Close the loop to the bottom)
        const areaPath = `
          ${paddingLeft},${height - paddingY} 
          ${points} 
          ${paddingLeft + (weekdayStats.length - 1) * stepX},${height - paddingY}
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
                            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={paddingLeft - 20} y={y + 4} textAnchor="end" className="text-sm fill-zinc-400 font-mono font-bold">
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
                    const x = paddingLeft + (i * stepX);
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
                                className={`text-xs font-black ${isHovered || isSelected ? 'fill-white' : 'fill-zinc-400'} transition-colors uppercase drop-shadow-md`}
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
                                                {new Date(f.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div className="bg-transparent border border-zinc-900/50 rounded-lg p-4 mb-6 animate-in fade-in slide-in-from-top-2 relative">
                <button
                    onClick={() => setShowHelp(false)}
                    className="absolute top-2 right-2 text-zinc-600 hover:text-blue-500"
                >
                    <X className="w-4 h-4" />
                </button>
                <h4 className="text-blue-500 font-bold mb-3 flex items-center gap-2 text-sm tracking-wide">
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

    const renderHeatmapDetailModal = () => {
        if (!selectedHeatmapCell) return null;

        const { provider, dateLabel, failures: cellFailures } = selectedHeatmapCell;

        return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                <Store className="w-6 h-6 text-blue-500" />
                                DETALLE DE AFECTACIONES
                            </h3>
                            <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">
                                {provider} • {dateLabel}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedHeatmapCell(null)}
                            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {cellFailures.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-bold">Sin incidentes registrados este día</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {cellFailures.map((f) => {
                                    const startTime = new Date(f.start_time);
                                    const duration = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
                                    const endTime = new Date(startTime.getTime() + duration * 60000);

                                    // Check for associated stores (same impact type in this cell)
                                    const associatedCount = cellFailures.filter(other =>
                                        other.id !== f.id && other.site_impact === f.site_impact
                                    ).length;

                                    return (
                                        <div key={f.id} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl hover:border-zinc-700 transition-all group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${f.site_impact === 'TOTAL' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                        {f.site_impact === 'TOTAL' ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-lg font-black text-white tracking-tight">{f.nombre_tienda || 'Tienda Desconocida'}</h4>
                                                            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md uppercase tracking-tighter">{f.codigo_tienda}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${f.site_impact === 'TOTAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-black'}`}>
                                                                {f.site_impact}
                                                            </span>
                                                            {associatedCount > 0 && (
                                                                <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                                                                    <Activity className="w-3 h-3" />
                                                                    {associatedCount} tiendas asociadas
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Inicio
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-zinc-300">
                                                            {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <Timer className="w-3 h-3" /> Duración
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-red-400">
                                                            {duration} min
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Restablecido
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-emerald-400">
                                                            {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex justify-end">
                        <button
                            onClick={() => setSelectedHeatmapCell(null)}
                            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-sm"
                        >
                            Cerrar Detalle
                        </button>
                    </div>
                </div>
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
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${timeRange === range
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
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full border backdrop-blur-sm font-bold text-[10px] ${comparativeStats.trend === 'positive'
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
                            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide m-0">
                                        <Server className="w-5 h-5 text-purple-400" />
                                        Volumen de Fallas por ISP (Top {topRankingLimit})
                                    </h3>
                                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0">
                                        {[5, 10, 20].map(limit => (
                                            <button
                                                key={limit}
                                                onClick={() => setTopRankingLimit(limit)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${topRankingLimit === limit ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                            >
                                                {limit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
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
                                                                                        <div className="flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> Inicio</div>
                                                                                        <div className="flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fin</div>
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
                                                                                                <div className="text-center"><span className="block text-zinc-300 font-medium font-mono">{start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}, {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                                                <div className="text-center"><span className="block text-zinc-400 font-mono">{end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}, {end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                                                <div className="text-center font-mono font-bold text-zinc-300">{duration} <span className="text-zinc-600 text-[9px] font-sans font-normal">min</span></div>
                                                                                                <div className="text-center text-zinc-400 font-mono text-[9px] truncate" title={fail.wan1_ticket_ref || ''}>{fail.wan1_ticket_ref || '-'}</div>
                                                                                                <div className="text-center"><span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold border ${isTotal ? 'text-red-400 bg-red-900/10 border-red-900/20' : 'text-yellow-400 bg-yellow-900/10 border-yellow-900/20'}`}>{fail.site_impact}</span></div>
                                                                                                <div className="flex justify-center"><button onClick={(e) => { e.stopPropagation(); setBitacoraTarget({ id: fail.id, networkId: fail.network_id, name: fail.nombre_tienda || fail.network_id, readOnly: true }); }} className="p-1.5 hover:bg-yellow-500/20 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Ver Bitácora (Histórico)"><Notebook className="w-3.5 h-3.5" /></button></div>
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
                            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide m-0">
                                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                                        Top {topRankingLimit} Sitios con Fallas
                                    </h3>
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
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
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[120px] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[120px] pointer-events-none"></div>

                        <div className="flex flex-col mb-8 relative z-10">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                                        <Flame className="w-8 h-8 text-orange-500 animate-bounce-subtle" />
                                        MAPA DE CALOR <span className="text-zinc-500 font-light">2026</span>
                                    </h3>
                                    <p className="text-zinc-500 text-sm mt-1">Análisis de degradación por proveedor y línea de tiempo (Últimos 30 días)</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex gap-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
                                        <span>Intensidad de Falla</span>
                                    </div>
                                    <div className="flex gap-2 bg-zinc-900/80 backdrop-blur-md p-2 rounded-xl border border-zinc-800 shadow-inner">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 bg-zinc-900/40 border border-zinc-800 rounded-lg"></div>
                                            <span className="text-[8px] text-zinc-500">0m</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg"></div>
                                            <span className="text-[8px] text-zinc-500">&lt;30m</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 bg-red-500/60 border border-red-400/50 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.2)]"></div>
                                            <span className="text-[8px] text-zinc-500">30-120m</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 bg-red-600 border border-red-500 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]"></div>
                                            <span className="text-[8px] text-zinc-500">2-8h</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 border border-orange-400 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)]"></div>
                                            <span className="text-[8px] text-orange-400 font-bold">&gt;8h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* High Management Summary Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Pico de Afectación</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-white">
                                            {Math.max(...(Object.values(heatmapStats.dailyTotals) as number[]), 0)}
                                        </span>
                                        <span className="text-xs text-zinc-500 mb-1 font-bold">min/día</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Días Críticos</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-red-500">
                                            {(Object.values(heatmapStats.dailyTotals) as number[]).filter(v => v > 500).length}
                                        </span>
                                        <span className="text-xs text-zinc-500 mb-1 font-bold">de 30</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Proveedor más Inestable</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-lg font-black text-orange-400 truncate max-w-[120px]">
                                            {heatmapStats.providers[0] || 'N/A'}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 mb-1 font-bold">Top 1</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl backdrop-blur-sm">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Salud de Red (Vivo)</div>
                                    <div className="flex items-end gap-2">
                                        <span className={`text-2xl font-black ${Number(healthMetric) < 95 ? 'text-red-500' : 'text-emerald-400'}`}>{healthMetric}%</span>
                                        <span className="text-[10px] text-zinc-500 mb-1 font-mono">({activeIncidentsCount}/{totalDevices})</span>
                                        <span className="text-xs text-zinc-500 mb-1 font-bold">Global</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loading ? (<div className="h-80 bg-zinc-900/30 animate-pulse rounded-2xl border border-zinc-800/50"></div>) : (
                            <div className="overflow-x-auto pb-6 custom-scrollbar">
                                <div className="min-w-max p-2">
                                    {/* Dates Header */}
                                    <div className="flex items-end mb-6 h-28 gap-2">
                                        <div className="w-48 shrink-0"></div>
                                        {heatmapStats.dates.map((d, i) => {
                                            const isToday = d.iso === new Date().toISOString().split('T')[0];
                                            const dailyTotal = heatmapStats.dailyTotals[d.iso] || 0;
                                            return (
                                                <div key={i} className="w-12 flex flex-col items-center group/header">
                                                    <div className={`h-12 w-1 bg-zinc-800 rounded-full mb-2 transition-all duration-500 ${dailyTotal > 500 ? 'bg-red-500 h-16' : dailyTotal > 100 ? 'bg-orange-500 h-14' : ''}`}></div>
                                                    <div className={`text-[10px] font-black font-mono -rotate-45 origin-bottom-left translate-x-6 whitespace-nowrap transition-colors ${isToday ? 'text-blue-400 underline underline-offset-4' : 'text-zinc-500 group-hover/header:text-zinc-300'}`}>
                                                        {d.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="w-24"></div>
                                    </div>

                                    {/* Grid Rows */}
                                    <div className="space-y-3">
                                        {heatmapStats.providers.map((provider) => (
                                            <div key={provider} className="flex items-center group hover:bg-zinc-900/30 rounded-2xl transition-all duration-300 p-2 -mx-2 border border-transparent hover:border-zinc-800/50">
                                                <div className="w-48 shrink-0 flex flex-col items-end pr-6">
                                                    <div className="text-sm font-black text-zinc-400 truncate w-full text-right group-hover:text-white transition-colors tracking-tight" title={provider}>{provider}</div>
                                                    <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">ISP Partner</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {heatmapStats.dates.map((d) => {
                                                        const minutes = heatmapStats.matrix[provider][d.iso] || 0;
                                                        const cellFailures = heatmapStats.failuresMap[provider][d.iso] || [];
                                                        return (
                                                            <div
                                                                key={`${provider}-${d.iso}`}
                                                                onClick={() => {
                                                                    if (cellFailures.length > 0) {
                                                                        setSelectedHeatmapCell({
                                                                            provider,
                                                                            dateLabel: d.label,
                                                                            isoDate: d.iso,
                                                                            failures: cellFailures
                                                                        });
                                                                    }
                                                                }}
                                                                className={`w-12 h-12 rounded-xl transition-all duration-500 relative group/cell cursor-pointer flex items-center justify-center border-2 ${getHeatmapColor(minutes)} hover:scale-110 hover:z-10`}
                                                            >
                                                                {minutes > 0 && (<span className="text-[10px] font-black leading-none pointer-events-none drop-shadow-lg">{minutes}</span>)}

                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover/cell:block z-[100] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                                    <div className="bg-zinc-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] whitespace-nowrap border border-zinc-700/50 flex flex-col items-start min-w-[160px]">
                                                                        <div className="flex justify-between w-full items-center mb-2">
                                                                            <span className="font-black text-zinc-500 uppercase text-[9px] tracking-widest">{d.label}</span>
                                                                            <div className={`w-2 h-2 rounded-full ${minutes > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                                        </div>
                                                                        <div className="text-xs font-bold text-zinc-400 mb-1">{provider}</div>
                                                                        <div className="flex items-baseline gap-1">
                                                                            <span className="font-black text-2xl tracking-tighter">{minutes}</span>
                                                                            <span className="text-[10px] font-bold text-zinc-500">minutos de caída</span>
                                                                        </div>
                                                                        {minutes > 0 && (
                                                                            <div className="mt-2 pt-2 border-t border-zinc-800 w-full flex items-center gap-2">
                                                                                <MousePointerClick className="w-3 h-3 text-blue-400" />
                                                                                <span className="text-[9px] font-bold text-blue-400 uppercase">Click para ver detalles</span>
                                                                            </div>
                                                                        )}
                                                                        {minutes > 500 && (
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                                                                <span className="text-[9px] font-bold text-orange-400 uppercase">Impacto Crítico</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="w-3 h-3 bg-zinc-900/95 border-r border-b border-zinc-700/50 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Row Totals with Visual Bar */}
                                                <div className="ml-6 flex items-center gap-4">
                                                    <div className="h-10 w-px bg-zinc-800/50"></div>
                                                    <div className="flex flex-col min-w-[80px]">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Total</span>
                                                            <span className={`text-xs font-black font-mono ${heatmapStats.rowTotals[provider] > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                                                {heatmapStats.rowTotals[provider]}m
                                                            </span>
                                                        </div>
                                                        <div className="w-20 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${heatmapStats.rowTotals[provider] > 1000 ? 'bg-red-500' : heatmapStats.rowTotals[provider] > 200 ? 'bg-orange-500' : 'bg-zinc-700'}`}
                                                                style={{ width: `${Math.min(100, (heatmapStats.rowTotals[provider] / 5000) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
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
                    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

                        <div className="flex flex-col mb-10 relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                                <div>
                                    <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
                                        <TrendingUp className="w-10 h-10 text-emerald-500" />
                                        SLA HISTÓRICO
                                    </h3>
                                    <div className="mt-2 text-zinc-500 text-sm font-medium flex items-center gap-4">
                                        <span>Disponibilidad contractual agregada de la red global</span>
                                        <div className="h-4 w-px bg-zinc-800"></div>
                                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                                            {[
                                                { val: 3, label: '3 MESES' },
                                                { val: 6, label: '6 MESES' },
                                                { val: 12, label: '12 MESES' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => setSlaTimeframe(opt.val as 3 | 6 | 12)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${slaTimeframe === opt.val
                                                        ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                                                        : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 bg-zinc-900/50 backdrop-blur-md p-2 rounded-2xl border border-zinc-800 shadow-inner">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">99.5%+</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors">
                                        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">98-99.5%</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors">
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">&lt;98%</span>
                                    </div>
                                </div>
                            </div>

                            {/* SLA Summary Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-all">
                                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">SLA Promedio</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-white tracking-tighter">
                                            {(slaHistory.reduce((acc, s) => acc + s.sla, 0) / slaHistory.length).toFixed(2)}%
                                        </span>
                                        <TrendingUp className="w-5 h-5 text-emerald-500 mb-1.5" />
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-red-500/30 transition-all">
                                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Mes más Crítico</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-red-500 tracking-tighter">
                                            {slaHistory.reduce((min, s) => s.sla < min.sla ? s : min, slaHistory[0]).label}
                                        </span>
                                        <AlertTriangle className="w-5 h-5 text-red-500 mb-1.5" />
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-blue-500/30 transition-all">
                                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Total Caída</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-white tracking-tighter">
                                            {slaHistory.reduce((acc, s) => acc + s.downtime, 0).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-zinc-500 mb-1.5 font-bold">min</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-amber-500/30 transition-all">
                                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Budget Restante</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-amber-500 tracking-tighter">
                                            {(slaHistory[slaHistory.length - 1].allowedDowntime - slaHistory[slaHistory.length - 1].downtime).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-zinc-500 mb-1.5 font-bold">min</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 h-[400px] relative">
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                    </div>
                                ) : renderSlaChart()}

                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                    <MousePointerClick className="w-3 h-3" /> Haz clic en un punto para análisis de causa raíz
                                </div>
                            </div>
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
                        <div className="h-96 w-full bg-zinc-900/20 rounded-xl border border-zinc-800/50 p-6 relative overflow-visible">
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
                    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl relative min-h-[600px] flex flex-col">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 blur-[120px] pointer-events-none rounded-tr-3xl"></div>

                        {/* Header and Controls */}
                        <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-8 mb-10 relative z-50">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
                                    <LineChart className="w-10 h-10 text-purple-500" />
                                    TENDENCIAS ISP <span className="text-zinc-600 font-light">MULTILÍNEA</span>
                                </h3>
                                <p className="text-zinc-500 text-sm font-medium">
                                    Análisis comparativo de estabilidad y volumen de fallas por proveedor y región.
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">

                                {/* MULTI-SELECT DROPDOWN */}
                                <div className="relative w-full md:w-80" ref={providerSelectorRef}>
                                    <button
                                        onClick={() => setShowProviderSelector(!showProviderSelector)}
                                        className={`w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 backdrop-blur-md border rounded-2xl transition-all text-xs font-bold uppercase tracking-widest focus:outline-none ${showProviderSelector ? 'border-purple-500 ring-4 ring-purple-500/10 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        <span className="truncate">
                                            {selectedTrendProviders.length === 0
                                                ? 'Seleccionar proveedores...'
                                                : `${selectedTrendProviders.length} Seleccionados`}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showProviderSelector ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* DROPDOWN PANEL */}
                                    {showProviderSelector && (
                                        <div
                                            className="absolute top-14 left-0 w-[350px] sm:w-[400px] z-[999] bg-zinc-950/95 backdrop-blur-3xl border border-zinc-700/80 rounded-3xl shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)] flex flex-col max-h-[500px]"
                                        >

                                            {/* INTERNAL SEARCH & COUNTRY FILTER */}
                                            <div className="border-b border-zinc-800 bg-zinc-900/40 sticky top-0 z-10 flex flex-col rounded-t-3xl">

                                                {/* Country Tabs */}
                                                <div className="p-3 pb-0 overflow-x-auto no-scrollbar flex gap-2 border-b border-zinc-800/50">
                                                    {availableTrendCountries.map(country => (
                                                        <button
                                                            key={country}
                                                            onClick={() => setTrendCountryFilter(country)}
                                                            className={`px-3 py-2 rounded-t-xl text-[10px] font-black uppercase whitespace-nowrap transition-all border-t border-x border-b-0 ${trendCountryFilter === country
                                                                ? 'bg-zinc-800 text-white border-zinc-700'
                                                                : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-400'
                                                                }`}
                                                        >
                                                            {country === 'TODOS' ? <Globe className="w-3 h-3 inline mr-1.5" /> : null}
                                                            {country}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Search & Select All */}
                                                <div className="p-3 flex gap-2">
                                                    <div className="flex-1 flex items-center gap-3 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800 focus-within:border-purple-500/50 transition-colors">
                                                        <Search className="w-4 h-4 text-zinc-500" />
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar proveedor..."
                                                            value={providerSearchTerm}
                                                            onChange={(e) => setProviderSearchTerm(e.target.value)}
                                                            className="bg-transparent border-none text-xs text-white placeholder:text-zinc-700 focus:outline-none w-full p-0 font-bold"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={selectAllFilteredProviders}
                                                        className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                                                    >
                                                        {filteredProviderOptions.every(p => selectedTrendProviders.includes(p)) ? 'Deseleccionar' : 'Todo'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SCROLLABLE LIST */}
                                            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800">
                                                {filteredProviderOptions.length > 0 ? (
                                                    filteredProviderOptions.map((prov) => {
                                                        const isSelected = selectedTrendProviders.includes(prov);
                                                        const parts = prov.match(/(.*)\s\((.*)\)$/);
                                                        const name = parts ? parts[1] : prov;
                                                        const country = parts ? parts[2] : '';

                                                        return (
                                                            <div
                                                                key={prov}
                                                                onClick={() => toggleTrendProvider(prov)}
                                                                className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-2xl text-xs transition-all mb-1 group ${isSelected ? 'bg-purple-600/30 text-white font-black border border-purple-500/20 shadow-inner' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white border border-transparent'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3 truncate pr-2">
                                                                    {/* Real Checkbox Look */}
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-950 border-zinc-700 text-transparent'}`}>
                                                                        <Check className="w-3 h-3" strokeWidth={4} />
                                                                    </div>
                                                                    <span>{name}</span>
                                                                    {country && (
                                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${isSelected ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-zinc-950 border-zinc-800 text-zinc-600 group-hover:text-zinc-500'}`}>
                                                                            {country}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-8 text-center text-xs text-zinc-700 font-bold uppercase tracking-widest italic">No se encontraron resultados</div>
                                                )}
                                            </div>

                                            {/* FOOTER */}
                                            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 text-[10px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center rounded-b-3xl">
                                                <span>{filteredProviderOptions.length} Proveedores</span>
                                                {selectedTrendProviders.length > 0 && (
                                                    <button onClick={() => setSelectedTrendProviders([])} className="text-purple-400 hover:text-purple-300 transition-colors">
                                                        Limpiar ({selectedTrendProviders.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Time Range Selector */}
                                <div className="flex bg-zinc-900/50 backdrop-blur-md rounded-2xl p-1.5 border border-zinc-800 shrink-0">
                                    {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div className="flex-1 bg-zinc-900/20 border border-zinc-800/50 rounded-[40px] p-8 relative overflow-hidden group/chart">
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity duration-1000"></div>

                            {selectedTrendProviders.length > 0 ? (
                                <div className="w-full h-full relative z-10">
                                    {renderTrendLines()}
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 relative z-10">
                                    <div className="w-24 h-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 border border-zinc-800/50">
                                        <LineChart className="w-10 h-10 opacity-20" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Seleccione proveedores para visualizar tendencias</p>
                                </div>
                            )}

                            {/* Legend Overlay */}
                            {selectedTrendProviders.length > 0 && (
                                <div className="absolute bottom-8 right-8 flex flex-wrap justify-end gap-3 max-w-[70%] max-h-[80px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 pointer-events-auto pr-2 pb-2">
                                    {selectedTrendProviders.map((p, idx) => (
                                        <div key={p} className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 shadow-xl shrink-0">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-[120px] pb-0.5">{p}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] relative z-10">
                            <MousePointerClick className="w-4 h-4 animate-bounce-subtle" />
                            <span>Interactúe con los puntos para ver el detalle de las fallas</span>
                        </div>
                    </div>
                )}

            </div>

            {/* Modals */}
            {renderHeatmapDetailModal()}
            {renderTrendDetailsModal()}
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
