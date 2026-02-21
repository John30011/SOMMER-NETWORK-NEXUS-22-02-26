
// ... existing imports ...
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { getFriendlyErrorMessage, isNetworkError } from '../utils/errorHandling';
import { NetworkFailure, MassiveIncident, AppNotification, ScheduledTask } from '../types';
import { MOCK_FAILURES, MOCK_MASSIVE } from '../constants';
import FailureCard from './FailureCard';
import MassiveIncidentCard from './MassiveIncidentCard';
import { WifiOff, Activity, Search, Bell, RotateCw, Filter, ShieldCheck, TrendingUp, AlertTriangle, Database, X, SearchX, CheckCircle2, ShieldAlert, Clock, Trash2, Zap, Wifi, RefreshCcw, SignalLow, Layers, Archive, Lock, LayoutGrid, Globe, ServerCrash, QrCode, Smartphone, X as CloseIcon, Cable, CalendarClock, Hammer, Volume2, StopCircle, Mic, MicOff } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface DashboardProps {
  onNavigateToInventory?: (networkId: string) => void;
  onNavigateToLogin?: () => void;
}

// Simple Base64 Sound for "Attention" beep
const ALERT_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder short beep (browser might need real file, seeing simple approach)

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToInventory, onNavigateToLogin }) => {
  const [failures, setFailures] = useState<NetworkFailure[]>([]);
  const [massiveIncidents, setMassiveIncidents] = useState<MassiveIncident[]>([]);
  const [totalDevices, setTotalDevices] = useState<number>(0); 
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Tab State - Added 'all'
  const [incidentTab, setIncidentTab] = useState<'all' | 'active' | 'pending' | 'resolved'>('active');

  // Real-time & Sync State
  const [syncStatus, setSyncStatus] = useState<'CONNECTING' | 'LIVE' | 'SYNCING' | 'OFFLINE'>('CONNECTING');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date()); 
  
  // Notification System State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // QR System State
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- IDLE / AUTO-FLIP STATE ---
  const [autoFlipIndex, setAutoFlipIndex] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // --- PROVIDER HEALTH / TP STATE ---
  const [providerTasks, setProviderTasks] = useState<ScheduledTask[]>([]);
  const [tpStatus, setTpStatus] = useState<'blue' | 'yellow' | 'red'>('blue');
  const [activeTp, setActiveTp] = useState<ScheduledTask | null>(null);
  const [isHealthFlipped, setIsHealthFlipped] = useState(false);

  // --- TTS HOOK & AUTO-VOICE STATE ---
  const { speak, stop, isPlaying } = useTextToSpeech();
  // CHANGED: Default is now FALSE to prevent token usage on reload
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false); 
  
  // Refs for Tracking State Changes (Failures & Recoveries)
  const notifiedIds = useRef<Set<string | number>>(new Set());
  const previousFailuresRef = useRef<Map<string | number, NetworkFailure>>(new Map()); // To track recoveries
  const isFirstLoad = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setQrUrl(window.location.href);
    return () => clearInterval(timer);
  }, []);

  // --- SOUND EFFECT HELPER ---
  const playAlertSound = () => {
      // Simple Oscillator beep to avoid loading external files
      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.value = 880; // A5
          osc.type = 'sine';
          
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
          console.error("Audio beep failed", e);
      }
  };

  // --- ADVANCED AUTO VOICE LOGIC (FAILURES + RECOVERIES) ---
  useEffect(() => {
      if (loading) return;

      // Current Set of Active Failure IDs
      const currentActiveIds = new Set<string | number>();
      
      // 1. DETECT NEW FAILURES
      const newFailures: NetworkFailure[] = [];
      
      failures.forEach(f => {
          // Track ID for recovery check later
          currentActiveIds.add(f.id);

          // Only care about active stages
          const isActive = ['Activa', 'En gestión'].includes(f.lifecycle_stage);
          
          if (isActive && !notifiedIds.current.has(f.id)) {
              newFailures.push(f);
              notifiedIds.current.add(f.id); // Mark as notified
          }
          
          // Update the map for recovery tracking
          previousFailuresRef.current.set(f.id, f);
      });

      // 2. DETECT MASSIVE INCIDENTS
      const newMassives = massiveIncidents.filter(m => 
          !notifiedIds.current.has(m.id) && m.status === 'Activa'
      );
      newMassives.forEach(m => notifiedIds.current.add(m.id));

      // 3. DETECT RECOVERIES (Items that were in previous map, but NOT in current failures list)
      const recoveredStores: string[] = [];
      previousFailuresRef.current.forEach((fail, id) => {
          // If it was active before, but now is not in the current failures list 
          // OR it is in the list but status changed to 'Resuelta'
          const currentVersion = failures.find(f => f.id === id);
          const isGone = !currentVersion;
          const isResolved = currentVersion && currentVersion.lifecycle_stage === 'Resuelta';

          if (isGone || isResolved) {
              // It's a recovery!
              // Only announce if we actually notified about its failure previously (reduce noise)
              if (notifiedIds.current.has(id)) {
                  let storeName = fail.nombre_tienda || fail.network_id;
                  storeName = storeName.replace(/\(.*?\)/g, "").trim();
                  recoveredStores.push(storeName);
                  
                  // Cleanup tracking
                  notifiedIds.current.delete(id);
                  previousFailuresRef.current.delete(id);
              }
          }
      });

      // 4. CONSTRUCT SPEECH
      if (isFirstLoad.current) {
          // Initial Load: Just arm the system, don't speak old news
          // Use a timeout to ensure we don't miss "immediate" updates post-load
          setTimeout(() => { 
              isFirstLoad.current = false; 
              console.log("🔊 Voz Nexus: Sistema Armado (Silenciado por defecto).");
          }, 1500);
      } else if (autoVoiceEnabled) {
          let message = "";
          let hasUrgent = false;

          // A. Massive Incidents (Priority 1)
          if (newMassives.length > 0) {
              hasUrgent = true;
              message += `Atención. Alerta de Incidente Masivo. `;
              newMassives.forEach(m => {
                  message += `Proveedor ${m.provider_name} reporta fallas en ${m.country}. `;
              });
          }

          // B. New Failures (Priority 2)
          if (newFailures.length > 0) {
              hasUrgent = true;
              if (newFailures.length > 3) {
                  message += `Alerta. Se detectan ${newFailures.length} nuevas caídas de red. Verifique el tablero. `;
              } else {
                  newFailures.forEach(f => {
                      const impact = f.site_impact === 'TOTAL' ? 'Total' : 'Parcial';
                      let name = f.nombre_tienda || f.network_id;
                      name = name.replace(/\(.*?\)/g, "").trim(); // Remove (Demo) text
                      message += `Falla ${impact} en ${name}. `;
                  });
              }
          }

          // C. Recoveries (Positive Reinforcement)
          if (recoveredStores.length > 0) {
              if (recoveredStores.length > 3) {
                  message += `Actualización. ${recoveredStores.length} tiendas han recuperado conexión. `;
              } else {
                  recoveredStores.forEach(name => {
                      message += `La tienda ${name} está nuevamente en línea. `;
                  });
              }
          }

          // D. EXECUTE
          if (message) {
              console.log("🔊 Anunciando:", message);
              if (hasUrgent) playAlertSound(); // Ding only for bad news
              speak(message);
          }
      }

  }, [failures, massiveIncidents, loading, autoVoiceEnabled, speak]); // Dependencies

  // --- TP AUTO ROTATION LOGIC (2 Minutes) ---
  useEffect(() => {
      if (tpStatus === 'red') {
          const rotationInterval = setInterval(() => {
              setIsHealthFlipped(prev => !prev);
          }, 120000); 
          return () => clearInterval(rotationInterval);
      } else {
          setIsHealthFlipped(false);
      }
  }, [tpStatus]);

  // --- IDLE TIMER LOGIC ---
  useEffect(() => {
    const IDLE_THRESHOLD = 2 * 60 * 1000; 
    const GAP_BETWEEN_ROUNDS = 2 * 60 * 1000; 
    const READ_TIME = 6000; 
    const TRANSITION_BUFFER = 1000; 
    const TIME_PER_CARD = READ_TIME + TRANSITION_BUFFER;

    const checkIdle = () => {
        const now = Date.now();
        const diff = now - lastActivityRef.current;

        if (diff > IDLE_THRESHOLD && massiveIncidents.length > 0) {
            const timeSinceIdleStart = diff - IDLE_THRESHOLD;
            const totalSequenceTime = massiveIncidents.length * TIME_PER_CARD;
            const totalLoopDuration = totalSequenceTime + GAP_BETWEEN_ROUNDS;
            const loopPosition = timeSinceIdleStart % totalLoopDuration;

            if (loopPosition < totalSequenceTime) {
                const cardIndex = Math.floor(loopPosition / TIME_PER_CARD);
                const timeInCurrentCard = loopPosition % TIME_PER_CARD;
                if (timeInCurrentCard < READ_TIME) {
                    setAutoFlipIndex(cardIndex);
                } else {
                    setAutoFlipIndex(null); 
                }
            } else {
                setAutoFlipIndex(null);
            }
        } else {
            setAutoFlipIndex(null);
        }
    };

    const idleTimer = setInterval(checkIdle, 200);
    const resetActivity = () => {
        lastActivityRef.current = Date.now();
        setAutoFlipIndex(null); 
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('scroll', resetActivity);

    return () => {
        clearInterval(idleTimer);
        window.removeEventListener('mousemove', resetActivity);
        window.removeEventListener('click', resetActivity);
        window.removeEventListener('keydown', resetActivity);
        window.removeEventListener('scroll', resetActivity);
    };
  }, [massiveIncidents.length]);

  // ... (rest of helper functions: sortFailures, getFriendlyErrorMessage, getCountryInitials, loadMockData, calculateTpStatus, fetchData, generateNotifications, markAllAsRead, clearNotifications, clickOutside, syncInterval, filteredFailures, displayedFailures logic, activeIncidentsCount, healthMetric, getHealthStyles, getStatusBadge, getCurrentViewName, qrCodeUrl)

  const sortFailures = (list: NetworkFailure[]) => {
      const stagePriority: Record<string, number> = {
          'Activa': 1,
          'Intermitencia': 2,
          'En gestión': 3,
          'En observación': 4,
          'Pendiente por cierre': 5,
          'Resuelta': 99,
          'Falso Positivo': 99
      };

      return list.sort((a, b) => {
          const pA = stagePriority[a.lifecycle_stage] || 50;
          const pB = stagePriority[b.lifecycle_stage] || 50;
          if (pA !== pB) return pA - pB;
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });
  };

  const getCountryInitials = (pais: string | undefined) => {
      if (!pais) return '';
      const p = pais.toUpperCase();
      const map: Record<string, string> = {
          'VENEZUELA': 'VE', 'COLOMBIA': 'CO', 'MEXICO': 'MX', 'CHILE': 'CL',
          'PERU': 'PE', 'PANAMA': 'PA', 'ECUADOR': 'EC', 'ARGENTINA': 'AR', 'ESTADOS UNIDOS': 'US'
      };
      return map[p] || p.substring(0, 2);
  };

  const loadMockData = () => {
      const sortedFailures = sortFailures([...MOCK_FAILURES]);
      const sortedMassive = [...MOCK_MASSIVE].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      
      setFailures(sortedFailures);
      setMassiveIncidents(sortedMassive);
      setTotalDevices(1500); 
      generateNotifications(sortedFailures, sortedMassive, null);
      
      setProviderTasks([]); 
      setTpStatus('blue');

      setLoading(false);
      setSyncStatus('OFFLINE'); 
      setLastUpdated(new Date());
  };

  const calculateTpStatus = (tasks: ScheduledTask[]) => {
      const now = new Date();
      const active = tasks.find(t => {
          const start = new Date(t.tp_start_time);
          const end = new Date(t.tp_end_time);
          return now >= start && now <= end;
      });

      if (active) {
          setActiveTp(active);
          setTpStatus('red');
          return;
      }

      const today = tasks.find(t => {
          const start = new Date(t.tp_start_time);
          return start.getDate() === now.getDate() && 
                 start.getMonth() === now.getMonth() && 
                 start.getFullYear() === now.getFullYear() &&
                 start > now;
      });

      if (today) {
          setActiveTp(today);
          setTpStatus('yellow');
          return;
      }

      setActiveTp(null);
      setTpStatus('blue');
  };

  const fetchData = async (isBackgroundSync = false) => {
    if (!isBackgroundSync) setErrorMsg(null);
    if (isBackgroundSync) setSyncStatus('SYNCING');

    if (isDemoMode) {
      loadMockData();
      setSyncStatus('LIVE'); 
      return;
    }

    try {
      if (!isBackgroundSync) setLoading(true);
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Parallelize independent initial fetches
      const [failRes, massRes, countRes, taskRes] = await Promise.all([
        supabase
          .from('network_failures_jj')
          .select('*')
          // Optimization: Only fetch active/pending OR those resolved in the last 24h
          .or(`lifecycle_stage.not.in.("Resuelta","Falso Positivo"),start_time.gte.${oneDayAgo}`),
        supabase
          .from('massive_incidents_jj')
          .select('*')
          .eq('status', 'Activa')
          .order('start_time', { ascending: false }),
        supabase
          .from('devices_inventory_jj')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('provider_tasks_jj')
          .select('*, provider:isp_providers_jj(name)')
          .gte('tp_end_time', todayStart.toISOString())
      ]);

      if (failRes.error) throw failRes.error;
      if (massRes.error) throw massRes.error;

      const failData = failRes.data;
      const massData = massRes.data;
      const deviceCount = countRes.count;
      const taskData = taskRes.data;

      let fetchedFailures: NetworkFailure[] = [];
      let fetchedMassive: MassiveIncident[] = massData as MassiveIncident[] || [];

      // 2. Secondary fetch for inventory details (depends on failData)
      if (failData && failData.length > 0) {
          const networkIds = [...new Set(failData.map((f: any) => f.network_id))];
          const { data: invData } = await supabase
              .from('devices_inventory_jj')
              .select(`network_id, nombre_tienda, codigo_tienda, meraki_url, pais, wan1_provider:isp_providers_jj!wan1_provider_id(name), wan2_provider:isp_providers_jj!wan2_provider_id(name)`)
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
      
      const sortedFailures = sortFailures(fetchedFailures);
      setFailures(sortedFailures);
      setMassiveIncidents(fetchedMassive);

      if (deviceCount !== null) setTotalDevices(deviceCount);

      if (taskData) {
          const mappedTasks = taskData.map((t: any) => ({ ...t, provider_name: t.provider?.name }));
          setProviderTasks(mappedTasks);
          calculateTpStatus(mappedTasks);
      }

      generateNotifications(sortedFailures, fetchedMassive, null);
      setLastUpdated(new Date());
      setTimeout(() => setSyncStatus('LIVE'), 500);

    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      console.warn('Dashboard Sync:', msg); 
      
      if (msg.includes('caducado') || msg.includes('JWT') || msg.includes('token')) {
          console.log("Detectado error de sesión. Intentando refrescar...");
          // Attempt to refresh session
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession) {
              console.log("Sesión refrescada exitosamente. Reintentando sincronización...");
              fetchData(true); // Retry once
              return;
          }
      }
      
      if (isNetworkError(err)) {
          if(failures.length === 0) loadMockData();
          setErrorMsg("Modo de demostración activo (Sin conexión a base de datos).");
          setSyncStatus('OFFLINE');
      } else {
          setErrorMsg(msg);
          setSyncStatus('OFFLINE');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = (fails: NetworkFailure[], massives: MassiveIncident[], systemError: string | null) => {
      const newNotifs: AppNotification[] = [];
      if (systemError) {
          newNotifs.push({
              id: 'sys-error-' + Date.now(),
              type: 'info',
              title: 'Sistema Desconectado',
              message: systemError,
              timestamp: new Date().toISOString(),
              read: false
          });
      }
      massives.forEach(m => {
          newNotifs.push({
              id: `mass-${m.id}`,
              type: 'massive',
              title: 'Incidente Masivo Detectado',
              message: `${m.provider_name} reporta fallas en ${m.country} afectando ${m.current_active_count} sitios.`,
              timestamp: m.start_time,
              read: false
          });
      });
      fails.slice(0, 5).forEach(f => {
          newNotifs.push({
              id: `fail-${f.id}`,
              type: 'critical',
              subtype: f.site_impact,
              title: 'Falla de Conectividad',
              message: `${f.nombre_tienda || f.network_id} tiene IMPACTO ${f.site_impact}.`,
              timestamp: f.start_time,
              read: false
          });
      });
      newNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(prev => {
          const merged = newNotifs.map(n => {
              const existing = prev.find(p => p.id === n.id);
              return existing ? { ...n, read: existing.read } : n;
          });
          return merged;
      });
  };

  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearNotifications = () => { setNotifications([]); setShowNotifications(false); };

  // Click Outside Listener
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
              setShowNotifications(false);
          }
          if (qrRef.current && !qrRef.current.contains(event.target as Node)) {
              setShowQR(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Interval & Realtime
  useEffect(() => {
    fetchData(); 
    const intervalId = setInterval(() => fetchData(true), 60000);
    if (isDemoMode) return () => clearInterval(intervalId);

    const channel = supabase
      .channel('noc-realtime-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'network_failures_jj' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'massive_incidents_jj' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_tasks_jj' }, () => fetchData(true))
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') setSyncStatus('LIVE');
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncStatus('OFFLINE');
      });

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredFailures = useMemo(() => {
    let result = failures;
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        result = result.filter(failure => {
            const searchableText = `${failure.network_id} ${failure.codigo_tienda || ''} ${failure.nombre_tienda || ''} ${failure.lifecycle_stage} ${failure.analyst_notes || ''} ${failure.site_impact}`.toLowerCase();
            return searchableText.includes(term);
        });
    }
    return result;
  }, [failures, searchTerm]);

  const { displayedFailures, counts } = useMemo(() => {
      const activeStages = ['Activa', 'En gestión', 'En observación', 'Intermitencia'];
      const pendingStages = ['Pendiente por cierre'];
      const resolvedStages = ['Resuelta', 'Falso Positivo'];

      const activeGroup = filteredFailures.filter(f => activeStages.includes(f.lifecycle_stage) && !f.es_falla_masiva);
      const pendingGroup = filteredFailures.filter(f => pendingStages.includes(f.lifecycle_stage));
      const now = new Date().getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const resolvedGroup = filteredFailures.filter(f => {
          if (!resolvedStages.includes(f.lifecycle_stage)) return false;
          const start = new Date(f.start_time).getTime();
          const durationMinutes = f.total_downtime_minutes || f.wan1_downtime_minutes || 0;
          const endTimestamp = start + (durationMinutes * 60 * 1000);
          return (now - endTimestamp) <= ONE_DAY_MS;
      });

      let displayed = activeGroup;
      if (incidentTab === 'all') displayed = filteredFailures;
      else if (incidentTab === 'pending') displayed = pendingGroup;
      else if (incidentTab === 'resolved') displayed = resolvedGroup;

      return {
          displayedFailures: displayed,
          counts: {
              all: filteredFailures.length,
              active: activeGroup.length,
              pending: pendingGroup.length,
              resolved: resolvedGroup.length
          }
      };
  }, [filteredFailures, incidentTab]);

  const activeIncidentsCount = useMemo(() => {
    const activeMassiveIds = new Set(massiveIncidents.map(m => String(m.id)));
    return failures.filter(f => {
        const isActiveStage = ['Activa', 'En gestión', 'En observación', 'Intermitencia'].includes(f.lifecycle_stage);
        if (!isActiveStage) return false;
        if (f.es_falla_masiva) {
            const p1 = f.wan1_massive_incident_id ? String(f.wan1_massive_incident_id) : null;
            const p2 = f.wan2_massive_incident_id ? String(f.wan2_massive_incident_id) : null;
            const parentIsActive = (p1 && activeMassiveIds.has(p1)) || (p2 && activeMassiveIds.has(p2));
            if ((p1 || p2) && !parentIsActive) return false;
        }
        return true;
    }).length;
  }, [failures, massiveIncidents]);

  const healthMetric = useMemo(() => {
    if (totalDevices === 0) return 100; 
    const percent = ((totalDevices - activeIncidentsCount) / totalDevices) * 100;
    return Math.max(0, Math.min(100, percent)).toFixed(2);
  }, [totalDevices, activeIncidentsCount]);

  const getHealthStyles = (value: number) => {
    if (value > 90) return { text: 'text-green-400', bg: 'bg-green-500/10', icon: 'text-green-500' };
    else if (value > 75) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: 'text-yellow-500' };
    else return { text: 'text-red-500', bg: 'bg-red-500/10', icon: 'text-red-500' };
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const healthStyles = getHealthStyles(Number(healthMetric));

  const getStatusBadge = () => {
      switch(syncStatus) {
          case 'LIVE': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wide flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>EN LÍNEA</span>;
          case 'SYNCING': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide flex items-center gap-1.5"><RotateCw className="w-3 h-3 animate-spin" />ACTUALIZANDO</span>;
          default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide flex items-center gap-1.5"><WifiOff className="w-3 h-3" />OFFLINE</span>;
      }
  }

  const getCurrentViewName = () => {
      switch(incidentTab) {
          case 'all': return 'Todos';
          case 'active': return 'En Curso';
          case 'pending': return 'Pendientes';
          case 'resolved': return 'Resueltas (< 24h)';
      }
  };

  const isLocalOrBlob = qrUrl.includes('localhost') || qrUrl.startsWith('blob:') || qrUrl.includes('127.0.0.1');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=000000&margin=2`;

  // --- TTS LOGIC (MANUAL) ---
  const handleVoiceReport = () => {
      if (isPlaying) {
          stop();
          return;
      }

      playAlertSound(); // Ding before manual report too

      let text = `Reporte de estado de Sommer Network Nexus. La salud de la red es del ${healthMetric} por ciento. `;
      
      if (massiveIncidents.length > 0) {
          text += `Atención. Se detectan ${massiveIncidents.length} incidentes masivos activos. `;
          massiveIncidents.forEach(m => {
              text += `Incidente en ${m.provider_name}, región ${m.country}, afectando a ${m.current_active_count} sitios. `;
          });
      } else {
          text += "No hay incidentes masivos reportados. ";
      }

      if (activeIncidentsCount > 0) {
          text += `Actualmente hay ${activeIncidentsCount} fallas individuales activas.`;
      } else {
          text += "Todas las tiendas operan con normalidad.";
      }

      speak(text);
  };

  return (
    <div className="flex flex-col min-h-screen">
        <header className="h-auto md:h-16 border-b border-zinc-900 bg-black flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 sticky top-0 z-40 gap-3 md:gap-0">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0 overflow-hidden">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 12L19 5" />
                            <path d="M12 12L5 5" />
                            <path d="M12 12L5 19" />
                            <path d="M12 12L19 19" />
                            <circle cx="5" cy="5" r="2" />
                            <circle cx="19" cy="5" r="2" />
                            <circle cx="5" cy="19" r="2" />
                            <circle cx="19" cy="19" r="2" />
                        </svg>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-none">SOMMER <span className="text-zinc-400 font-normal">NEXUS</span></h1>
                            <div className="hidden md:block">{getStatusBadge()}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono font-medium leading-none mt-1 uppercase">
                            <RefreshCcw className="w-3 h-3 text-zinc-600" />
                            <span>{lastUpdated.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span className="text-zinc-700">|</span>
                            <span>{lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                <div className="md:hidden">{getStatusBadge()}</div>
            </div>

            {/* --- FLIP CARD: SALUD DE RED + GESTION PROVEEDORES --- */}
            {/* ... (Keep Flip Card Logic) ... */}
            <div 
                className="hidden lg:block w-[240px] h-[50px] mx-auto perspective-1000 group cursor-pointer"
                onClick={() => setIsHealthFlipped(!isHealthFlipped)}
            >
                <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isHealthFlipped ? 'rotate-y-180' : ''}`}>
                    {/* FRONT: NETWORK HEALTH */}
                    <div className="absolute inset-0 backface-hidden bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 hover:border-zinc-700 transition-colors flex items-center justify-between gap-3">
                        <div className={`p-1.5 rounded-md ${healthStyles.bg}`}><Activity className={`w-4 h-4 ${healthStyles.icon}`} /></div>
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-0.5 text-center">Salud de Red</span>
                            <span className={`text-lg font-mono font-bold leading-none ${healthStyles.text} text-center`}>{healthMetric}%</span>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                             <span className="text-[9px] text-zinc-600 font-medium font-mono block">
                                <span className={activeIncidentsCount > 0 ? "text-red-400 font-bold" : "text-zinc-500"}>{activeIncidentsCount}</span>
                            </span>
                            <span className="text-[8px] text-zinc-700 font-mono">ACTIVOS</span>
                        </div>
                    </div>

                    {/* BACK: PROVIDER NOTIFICATION */}
                    <div 
                        className={`absolute inset-0 backface-hidden rotate-y-180 rounded-lg px-3 py-1.5 border flex items-center justify-between gap-3 shadow-lg ${
                            tpStatus === 'red' 
                            ? 'bg-red-600 border-red-500 shadow-red-900/50' 
                            : tpStatus === 'yellow' 
                            ? 'bg-yellow-600 border-yellow-500 shadow-yellow-900/50' 
                            : 'bg-blue-600 border-blue-500 shadow-blue-900/50'
                        }`}
                    >
                        <div className="p-1.5 rounded-md bg-black/20">
                            {tpStatus === 'red' ? <Hammer className="w-4 h-4 text-white animate-pulse" /> : 
                             tpStatus === 'yellow' ? <CalendarClock className="w-4 h-4 text-white" /> : 
                             <Cable className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0 justify-center">
                            <div className="flex items-center gap-1.5 w-full mb-0.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/70 truncate">
                                    {tpStatus === 'red' ? 'MANTENIMIENTO ACTIVO' : 
                                     tpStatus === 'yellow' ? 'PROGRAMADO HOY' : 
                                     'GESTIÓN PROVEEDORES'}
                                </span>
                                {activeTp && (tpStatus === 'red' || tpStatus === 'yellow') && (
                                    <span className="text-[8px] font-bold bg-white/20 text-white px-1 rounded tracking-wide leading-none">
                                        {getCountryInitials(activeTp.tp_country)}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-bold text-white leading-none truncate w-full" title={activeTp?.provider_name || 'Sin novedades'}>
                                {activeTp ? activeTp.provider_name : 'Operación Normal'}
                            </span>
                        </div>
                        {tpStatus === 'red' && (
                            <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
                
                {/* AUTO VOICE TOGGLE */}
                <button 
                    onClick={() => setAutoVoiceEnabled(!autoVoiceEnabled)}
                    className={`flex items-center justify-center p-1.5 rounded-full border transition-all ${
                        autoVoiceEnabled 
                        ? 'bg-purple-500/10 border-purple-500 text-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                    }`}
                    title={autoVoiceEnabled ? "Alerta de Voz Automática: ACTIVADA" : "Alerta de Voz Automática: DESACTIVADA (Default)"}
                >
                    {autoVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                {/* VOICE REPORT BUTTON */}
                <button 
                    onClick={handleVoiceReport}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                        isPlaying 
                        ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                    title="Reporte de Voz Manual"
                >
                    {isPlaying ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase hidden xl:inline">
                        {isPlaying ? 'Detener' : 'Voz'}
                    </span>
                </button>

                <div className="hidden xl:flex items-center gap-4 mr-4 border-r border-zinc-800 pr-6 h-10">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xl font-mono font-bold text-white leading-none tracking-tight tabular-nums">
                        {currentTime.toLocaleTimeString('es-ES', { hour12: false })}
                    </span>
                </div>
                <div className="relative group w-full md:w-auto flex-1 md:flex-none">
                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchTerm ? 'text-blue-500' : 'text-zinc-500'}`} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar..." 
                        className="bg-zinc-900/50 border border-zinc-800 rounded-full py-1.5 pl-9 pr-8 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 w-full md:w-64 transition-all"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-zinc-400 shrink-0">
                    {/* ... QR Code and Notification Buttons (Keep Same) ... */}
                    <div className="relative" ref={qrRef}>
                        <button 
                            className={`hover:text-white transition-colors relative p-1.5 rounded-full ${showQR ? 'bg-zinc-800 text-white' : ''}`}
                            onClick={() => setShowQR(!showQR)}
                            title="Acceso Móvil"
                        >
                            <QrCode className="w-5 h-5" />
                        </button>
                        {showQR && (
                            <div className="absolute right-0 top-full mt-3 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                                {/* ... QR Content ... */}
                                <div className="p-3 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
                                    <h3 className="text-white font-bold text-xs flex items-center gap-2">
                                        <Smartphone className="w-3.5 h-3.5" /> Acceso Móvil
                                    </h3>
                                    <button onClick={() => setShowQR(false)} className="text-zinc-500 hover:text-white"><CloseIcon className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="p-6 flex flex-col items-center justify-center bg-white/5">
                                    <div className="bg-white p-2 rounded-lg shadow-inner mb-3">
                                        <img src={qrCodeUrl} alt="QR Access" className="w-32 h-32 object-contain mix-blend-multiply" />
                                    </div>
                                    <div className="text-center w-full">
                                        <p className="text-[10px] text-zinc-400 text-center leading-tight mb-2">Escanea para acceder</p>
                                        <div className="bg-black/30 p-2 rounded border border-white/5 break-all">
                                            <p className="text-[9px] text-zinc-500 font-mono select-all text-center">{qrUrl}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={notificationRef}>
                        <button 
                            className={`hover:text-white transition-colors relative p-1.5 rounded-full ${showNotifications ? 'bg-zinc-800 text-white' : ''}`}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-bounce flex items-center justify-center"></span>}
                        </button>
                         {showNotifications && (
                            <div className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                                {/* ... Notifications Content ... */}
                                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold text-sm">Notificaciones</h3>
                                        {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{unreadCount}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={markAllAsRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar leídas
                                        </button>
                                        <div className="h-3 w-px bg-zinc-800"></div>
                                        <button onClick={clearNotifications} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
                                            <Trash2 className="w-3.5 h-3.5" /> Limpiar
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                                     {notifications.length === 0 ? (
                                        <div className="p-10 text-center text-zinc-500 flex flex-col items-center">
                                            <Bell className="w-10 h-10 mb-3 opacity-20" />
                                            <p className="text-sm font-medium">Estás al día</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className={`p-4 border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors flex gap-3 group ${!notif.read ? 'bg-blue-500/5' : ''}`}>
                                                <div className="shrink-0 mt-0.5">
                                                    {notif.type === 'massive' && <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500"><ShieldAlert className="w-4 h-4" /></div>}
                                                    {notif.type === 'info' && <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Activity className="w-4 h-4" /></div>}
                                                    {notif.type === 'critical' && (
                                                        <div className={`p-1.5 rounded-lg ${notif.subtype === 'TOTAL' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                            {notif.subtype === 'TOTAL' ? <WifiOff className="w-4 h-4" /> : <SignalLow className="w-4 h-4" />}
                                                        </div>
                                                    )}
                                                    {!notif.type && <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400"><ServerCrash className="w-4 h-4" /></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`text-xs font-bold leading-none ${!notif.read ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                            {notif.title}
                                                        </p>
                                                        <span className="text-[9px] text-zinc-600 whitespace-nowrap ml-2 font-mono">
                                                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs leading-snug break-words ${!notif.read ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        {notif.message}
                                                    </p>
                                                </div>
                                                {!notif.read && (
                                                    <div className="self-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="hover:text-white transition-colors" onClick={() => fetchData()} title="Recargar">
                        <RotateCw className={`w-5 h-5 ${loading || syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </header>

        {/* ... (Rest of Dashboard Content - KEEP SAME) ... */}
        <div className="p-4 md:p-8 flex-1">
            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* ... (Left Column content) ... */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-900 pb-4 gap-4">
                        {/* Tab Container */}
                        <div className="w-full overflow-x-auto pb-1 no-scrollbar md:w-auto">
                            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-max md:w-auto">
                                {[
                                    { id: 'all', label: 'Todo', icon: LayoutGrid, count: counts.all, color: 'bg-zinc-700' },
                                    { id: 'active', label: 'En Curso', icon: Layers, count: counts.active, color: 'bg-red-600' },
                                    { id: 'pending', label: 'Pendiente', icon: Clock, count: counts.pending, color: 'bg-blue-600' },
                                    { id: 'resolved', label: 'Resueltas (< 24h)', icon: CheckCircle2, count: counts.resolved, color: 'bg-green-600' }
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = incidentTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setIncidentTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                                                isActive 
                                                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                                                : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            {tab.label}
                                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                                tab.count > 0 && tab.id !== 'all'
                                                ? `${tab.color} text-white shadow-[0_0_10px_rgba(0,0,0,0.3)]` 
                                                : (isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-800 text-zinc-500')
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 items-center justify-between md:justify-end w-full md:w-auto">
                            {searchTerm && (
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-800 text-blue-400 bg-blue-900/10 hover:bg-blue-900/20 text-xs font-medium transition-colors" onClick={() => setSearchTerm('')}>
                                    <Filter className="w-3.5 h-3.5" />
                                    Limpiar
                                </button>
                            )}
                            <span className="text-zinc-500 text-xs font-mono">
                                Vista: <span className="text-zinc-300 font-bold">{getCurrentViewName()}</span>
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-zinc-900/50 animate-pulse"></div>)}
                        </div>
                    ) : displayedFailures.length === 0 ? (
                        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-12 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                            {searchTerm ? (
                                <>
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4"><SearchX className="w-8 h-8 text-zinc-600" /></div>
                                    <h3 className="text-zinc-300 font-bold text-lg">No hay coincidencias</h3>
                                    <button onClick={() => setSearchTerm('')} className="text-blue-500 hover:text-blue-400 text-sm font-medium mt-2">Limpiar búsqueda</button>
                                </>
                            ) : (
                                <>
                                    {incidentTab === 'active' && <ShieldCheck className="w-16 h-16 text-green-500 mb-6 opacity-50" />}
                                    {incidentTab === 'pending' && <Lock className="w-16 h-16 text-blue-500 mb-6 opacity-50" />}
                                    {incidentTab === 'resolved' && <Archive className="w-16 h-16 text-zinc-600 mb-6 opacity-50" />}
                                    {incidentTab === 'all' && <LayoutGrid className="w-16 h-16 text-zinc-600 mb-6 opacity-50" />}
                                    
                                    <h3 className="text-zinc-300 font-bold text-lg">
                                        {incidentTab === 'active' && 'Todo Operativo'}
                                        {incidentTab === 'pending' && 'Sin Pendientes'}
                                        {incidentTab === 'resolved' && 'Historial Reciente Limpio'}
                                        {incidentTab === 'all' && 'Sin Registros'}
                                    </h3>
                                    {incidentTab === 'resolved' && <p className="text-zinc-500 text-xs mt-2">Para ver casos más antiguos, use el módulo "Resueltos" en el menú lateral.</p>}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in slide-in-from-bottom-2 duration-500">
                            {displayedFailures.map((failure) => (
                                <FailureCard 
                                    key={failure.id} 
                                    failure={failure} 
                                    onViewInventory={onNavigateToInventory}
                                    onNavigateToLogin={onNavigateToLogin}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <div className="mb-4 border-b border-zinc-900 pb-4 md:mt-8">
                             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-purple-500" />
                                Fallas Masivas
                             </h2>
                             <p className="text-zinc-500 text-xs mt-1">Problemas de infraestructura a nivel de proveedor</p>
                        </div>
                        <div className="space-y-4">
                            {massiveIncidents.length > 0 ? (
                                massiveIncidents.map((incident, index) => {
                                    const affected = failures.filter(f => 
                                        f.es_falla_masiva && 
                                        (String(f.wan1_massive_incident_id) === String(incident.id) || String(f.wan2_massive_incident_id) === String(incident.id))
                                    );
                                    
                                    return (
                                        <MassiveIncidentCard 
                                            key={incident.id} 
                                            incident={incident} 
                                            affectedFailures={affected}
                                            isAutoFlipped={index === autoFlipIndex}
                                            onNavigateToLogin={onNavigateToLogin}
                                        />
                                    );
                                })
                            ) : (
                                <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-6 text-center">
                                    <span className="text-zinc-600 text-xs">No hay fallas masivas reportadas.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
