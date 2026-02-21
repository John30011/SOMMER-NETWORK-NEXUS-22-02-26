import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase, isDemoMode } from '../supabaseClient';
import { ISPProvider, ScheduledTask, DeviceInventory } from '../types';
import { Cable, Search, Plus, Trash2, Edit2, Globe, Phone, Mail, Save, X, Loader2, AlertCircle, Building2, ShieldCheck, CalendarClock, LayoutList, MapPin, Store, Timer, ChevronDown, Check, CalendarX, Clock, CheckSquare, Square, ChevronLeft, ChevronRight, Calendar, ChevronUp, BarChart, List } from 'lucide-react';

type TabView = 'list' | 'tasks';
type TaskViewMode = 'list' | 'timeline';

// --- CUSTOM DATE TIME PICKER COMPONENT ---
const CustomDateTimePicker = ({ label, value, onChange }: { label: string, value: string | undefined, onChange: (iso: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Initialize logic
    const current = value ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(current); // For calendar navigation

    // Reset viewDate when opening or value changes
    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
        }
    }, [isOpen, value]);

    // Handle Opening with Positioning Calculation
    const handleToggle = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Width of the popup
            const popupWidth = 480; 
            let left = rect.left;

            // Adjust if it goes off-screen to the right
            if (left + popupWidth > window.innerWidth) {
                left = window.innerWidth - popupWidth - 20;
            }
            // Adjust if it goes off-screen to the left
            if (left < 10) left = 10;

            // Check bottom space
            const spaceBelow = window.innerHeight - rect.bottom;
            let top = rect.bottom + 5;
            
            // Flip to top if not enough space below (approx 350px needed)
            if (spaceBelow < 350 && rect.top > 350) {
                top = rect.top - 340; // Approx height of popup
            }

            setPosition({ top, left });
        }
        setIsOpen(!isOpen);
    };

    // Close on scroll/resize to prevent detached floating
    useEffect(() => {
        const handleScroll = () => { if(isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    // Calendar Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();
    
    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(current);
        newDate.setFullYear(viewDate.getFullYear());
        newDate.setMonth(viewDate.getMonth());
        newDate.setDate(day);
        onChange(newDate.toISOString());
    };

    const incrementTime = (type: 'hour' | 'minute', amount: number) => {
        const newDate = new Date(current);
        if (type === 'hour') newDate.setHours(newDate.getHours() + amount);
        else newDate.setMinutes(newDate.getMinutes() + amount);
        onChange(newDate.toISOString());
    };

    // Render Generation
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDay(year, month);
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="space-y-1.5 relative" ref={containerRef}>
            <label className="text-xs font-bold text-zinc-500 uppercase">{label}</label>
            <button 
                type="button"
                onClick={handleToggle}
                className={`w-full flex items-center justify-between bg-zinc-900 border rounded p-2 pl-3 text-sm focus:outline-none transition-colors ${isOpen ? 'border-purple-500 text-white' : 'border-zinc-800 text-white hover:border-zinc-700'}`}
            >
                <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${value ? 'text-purple-500' : 'text-zinc-500'}`} />
                    <span className="font-medium">
                        {value 
                            ? new Date(value).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) 
                            : 'Seleccionar fecha...'}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* PORTAL FOR DROPDOWN TO ESCAPE OVERFLOW */}
            {isOpen && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={() => setIsOpen(false)} // Backdrop click
                >
                    <div 
                        className="fixed bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-4 flex flex-col md:flex-row gap-4 w-[300px] md:w-[480px] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10"
                        style={{ top: position.top, left: position.left }}
                        onClick={(e) => e.stopPropagation()} // Prevent close on content click
                    >
                        
                        {/* CALENDAR SECTION */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-3">
                                <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-sm font-bold text-white capitalize">{monthNames[month]} {year}</span>
                                <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-7 mb-2 text-center">
                                {['D','L','M','M','J','V','S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-zinc-600">{d}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({length: startDay}).map((_, i) => <div key={`empty-${i}`} />)}
                                {Array.from({length: daysInMonth}).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = current.getDate() === day && current.getMonth() === month && current.getFullYear() === year;
                                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                                    
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleDateClick(day)}
                                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all ${
                                                isSelected ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-900/50' : 
                                                isToday ? 'border border-purple-500/50 text-purple-400' : 
                                                'text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* SEPARATOR */}
                        <div className="hidden md:block w-px bg-zinc-800"></div>

                        {/* TIME SECTION (NEW DESIGN) */}
                        <div className="w-full md:w-40 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-4 flex flex-col">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase mb-4 text-center tracking-wider">Hora (24h)</div>
                            
                            <div className="flex-1 flex flex-col justify-center items-center gap-4">
                                <div className="flex items-center gap-2">
                                    {/* HOURS */}
                                    <div className="flex flex-col items-center gap-1">
                                        <button 
                                            type="button"
                                            onClick={() => incrementTime('hour', 1)}
                                            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        >
                                            <ChevronUp className="w-5 h-5" />
                                        </button>
                                        
                                        <div className="w-12 h-10 md:w-14 md:h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg shadow-inner">
                                            <span className="text-xl md:text-2xl font-mono font-bold text-white">
                                                {String(current.getHours()).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={() => incrementTime('hour', -1)}
                                            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <span className="text-2xl font-bold text-zinc-600 pb-2">:</span>

                                    {/* MINUTES */}
                                    <div className="flex flex-col items-center gap-1">
                                        <button 
                                            type="button"
                                            onClick={() => incrementTime('minute', 1)}
                                            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        >
                                            <ChevronUp className="w-5 h-5" />
                                        </button>
                                        
                                        <div className="w-12 h-10 md:w-14 md:h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg shadow-inner">
                                            <span className="text-xl md:text-2xl font-mono font-bold text-white">
                                                {String(current.getMinutes()).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={() => incrementTime('minute', -1)}
                                            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Quick Presets */}
                                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                                     <button 
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(current);
                                            d.setHours(8, 0, 0, 0);
                                            onChange(d.toISOString());
                                        }}
                                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white py-1.5 rounded transition-colors"
                                     >
                                         08:00
                                     </button>
                                     <button 
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(current);
                                            d.setHours(12, 0, 0, 0);
                                            onChange(d.toISOString());
                                        }}
                                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white py-1.5 rounded transition-colors"
                                     >
                                         12:00
                                     </button>
                                     <button 
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(current);
                                            d.setHours(18, 0, 0, 0);
                                            onChange(d.toISOString());
                                        }}
                                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white py-1.5 rounded transition-colors"
                                     >
                                         18:00
                                     </button>
                                     <button 
                                        type="button"
                                        onClick={() => {
                                            onChange(new Date().toISOString());
                                        }}
                                        className="text-[10px] bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-400 hover:text-purple-300 py-1.5 rounded transition-colors"
                                     >
                                         Ahora
                                     </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const Providers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('list');
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('list'); // New: Switch between List and Timeline
  const [providers, setProviders] = useState<ISPProvider[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [inventory, setInventory] = useState<DeviceInventory[]>([]); // To support store filtering & stats
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // User State for Audit
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('sistema');

  // Provider Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ISPProvider | null>(null);
  const [formData, setFormData] = useState<Partial<ISPProvider>>({});
  
  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<ScheduledTask>>({});

  // Task Modal - Store Search State
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  // Task Modal - Selectors State (Country & Provider)
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const countrySelectorRef = useRef<HTMLDivElement>(null);

  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [providerSearchTerm, setProviderSearchTerm] = useState('');
  const providerSelectorRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State to track if we are in "Missing Table" mode for tasks
  const [isTaskTableMissing, setIsTaskTableMissing] = useState(false);

  useEffect(() => {
    // Get Current User
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            setCurrentUserEmail(user.email);
        } else {
            setCurrentUserEmail('invitado');
        }
    };
    getUser();

    fetchProviders();
    fetchInventory(); // Fetch inventory for the task filtering logic & Stats
    if (activeTab === 'tasks') {
        fetchTasks();
    }
  }, [activeTab]);

  // Click outside listener for Selectors
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (providerSelectorRef.current && !providerSelectorRef.current.contains(event.target as Node)) {
              setIsProviderSelectorOpen(false);
          }
          if (countrySelectorRef.current && !countrySelectorRef.current.contains(event.target as Node)) {
              setIsCountrySelectorOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProviders = async () => {
    if (providers.length === 0) setLoading(true);
    try {
        if (isDemoMode) {
            const mockProviders = [
                { id: 1, name: 'CANTV', contact_email: 'soporte@cantv.com.ve', contact_name: 'Mesa Corporativa', support_phone: '0800-EMPRESA', sla_contract: 98.5 },
                { id: 2, name: 'INTER', contact_email: 'noc@inter.com.ve', contact_name: 'Guardia NOC', support_phone: '0500-INTER-00', sla_contract: 99.0 },
                { id: 3, name: 'MOVISTAR', contact_email: 'empresas@movistar.com', contact_name: 'Gerencia Cuentas', support_phone: '811', sla_contract: 99.8 },
                { id: 4, name: 'NETUNO', contact_email: 'soporte@netuno.net', contact_name: 'Soporte N2', support_phone: '0800-NETUNO', sla_contract: 97.5 },
                { id: 5, name: 'CLARO', contact_email: 'empresas@claro.com.co', contact_name: 'Soporte Corp', support_phone: '018000-CLARO', sla_contract: 99.5 },
                { id: 6, name: 'ETB', contact_email: 'noc@etb.com.co', contact_name: 'NOC Fibra', support_phone: '018000-ETB', sla_contract: 98.0 },
                { id: 22, name: 'AIRTECK', contact_email: 'noc@airteck.net', contact_name: 'Soporte', support_phone: '0800-AIRTECK', sla_contract: 99.0 },
            ];
            setProviders(mockProviders);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('isp_providers_jj').select('*').order('name');
        if (error) throw error;
        setProviders(data || []);
    } catch (err: any) {
        const msg = err.message || String(err);
        console.warn("Providers Sync:", msg);
        if (msg.includes('fetch') || msg.includes('NetworkError')) {
            // Fallback to minimal mock data if fetch fails
            setProviders([
                { id: 1, name: 'CANTV', contact_email: 'soporte@cantv.com.ve', contact_name: 'Mesa Corporativa', support_phone: '0800-EMPRESA', sla_contract: 98.5 },
                { id: 2, name: 'INTER', contact_email: 'noc@inter.com.ve', contact_name: 'Guardia NOC', support_phone: '0500-INTER-00', sla_contract: 99.0 },
                { id: 5, name: 'CLARO', contact_email: 'empresas@claro.com.co', contact_name: 'Soporte Corp', support_phone: '018000-CLARO', sla_contract: 99.5 }
            ]);
        }
    } finally {
        setLoading(false);
    }
  };

  const fetchInventory = async () => {
      try {
          // Fetch minimal columns needed for stats calculation
          // UPDATED: Added 'nombre_tienda' to the select query to display names correctly
          const { data } = await supabase.from('devices_inventory_jj').select('network_id, pais, wan1_provider_id, wan2_provider_id, nombre_tienda');
          if (data) setInventory(data as any[]);
          
          if (isDemoMode && inventory.length === 0) {
               // Add dummy data for Airteck demo
               const dummies = Array.from({length: 61}).map((_, i) => ({
                   network_id: `DEMO-${i}`,
                   nombre_tienda: `Tienda Demo ${i}`,
                   pais: 'VENEZUELA',
                   wan1_provider_id: 22, // Airteck
                   wan2_provider_id: null
               }));
               setInventory(dummies as any[]);
          }
      } catch (err: any) {
          console.warn("Inventory Stats Sync:", err.message || err);
      }
  };

  const fetchTasks = async () => {
      setLoading(true);
      try {
          if (isDemoMode) {
              // Create some mock tasks for the Timeline Demo
              const now = new Date();
              const tasksMock = [
                  { 
                      tp_id: 101, 
                      tp_title: 'Mantenimiento Preventivo Core', 
                      tp_provider_id: 1, 
                      provider_name: 'CANTV', 
                      tp_country: 'VENEZUELA', 
                      tp_start_time: new Date(now.getTime() + 2 * 3600000).toISOString(), 
                      tp_end_time: new Date(now.getTime() + 6 * 3600000).toISOString(),
                      tp_affected_stores: ['T-101', 'T-102']
                  },
                  { 
                      tp_id: 102, 
                      tp_title: 'Cambio de Fibra Regional', 
                      tp_provider_id: 2, 
                      provider_name: 'INTER', 
                      tp_country: 'VENEZUELA', 
                      tp_start_time: new Date(now.getTime() - 24 * 3600000).toISOString(), 
                      tp_end_time: new Date(now.getTime() - 20 * 3600000).toISOString(),
                      tp_affected_stores: ['T-201', 'T-202', 'T-205']
                  },
                  { 
                      tp_id: 103, 
                      tp_title: 'Actualización Firmware', 
                      tp_provider_id: 5, 
                      provider_name: 'CLARO', 
                      tp_country: 'COLOMBIA', 
                      tp_start_time: new Date(now.getTime() + 48 * 3600000).toISOString(), 
                      tp_end_time: new Date(now.getTime() + 52 * 3600000).toISOString(),
                      tp_affected_stores: ['T-301']
                  }
              ];
              
              setTasks(tasksMock as ScheduledTask[]); 
              setLoading(false);
              return;
          }

          const { data, error } = await supabase
              .from('provider_tasks_jj')
              .select(`
                  *,
                  provider:isp_providers_jj(name)
              `)
              .order('tp_start_time', { ascending: true });

          if (error) {
              if (error.code === '42P01' || error.message.includes('not find the table')) {
                  setIsTaskTableMissing(true);
                  setTasks([]);
                  return;
              }
              throw error;
          }

          const formatted = data?.map((t: any) => ({
              ...t,
              provider_name: t.provider?.name || 'Desconocido'
          })) || [];

          setTasks(formatted);

      } catch (err: any) {
          const msg = typeof err.message === 'string' ? err.message : String(err);
          console.warn("Tasks Sync:", msg);
          if (msg.includes('fetch') || msg.includes('NetworkError')) {
              // Fallback to mock tasks
              const now = new Date();
              setTasks([
                  { 
                      tp_id: 101, 
                      tp_title: 'Mantenimiento Preventivo Core', 
                      tp_provider_id: 1, 
                      provider_name: 'CANTV', 
                      tp_country: 'VENEZUELA', 
                      tp_start_time: new Date(now.getTime() + 2 * 3600000).toISOString(), 
                      tp_end_time: new Date(now.getTime() + 6 * 3600000).toISOString(),
                      tp_affected_stores: ['T-101', 'T-102']
                  }
              ] as ScheduledTask[]);
          } else {
              setErrorMsg(msg);
          }
      } finally {
          setLoading(false);
      }
  };

  // --- STATS AGGREGATION LOGIC ---
  const providerStats = useMemo(() => {
      // Map structure: ProviderID -> { CountryName -> Set<NetworkID> }
      // We use Set to ensure unique stores per provider (e.g. if WAN1 and WAN2 are same provider)
      const map: Record<string, Record<string, Set<string>>> = {};

      inventory.forEach(dev => {
          const country = dev.pais || 'SIN PAIS';
          const nid = dev.network_id;

          const addToMap = (pid: string | number) => {
              const idStr = String(pid);
              if (!map[idStr]) map[idStr] = {};
              if (!map[idStr][country]) map[idStr][country] = new Set();
              map[idStr][country].add(nid);
          };

          if (dev.wan1_provider_id) addToMap(dev.wan1_provider_id);
          if (dev.wan2_provider_id) addToMap(dev.wan2_provider_id);
      });

      return map;
  }, [inventory]);

  // Helper: Get ISO Country Code
  const getCountryCode = (pais: string) => {
      if (!pais) return '??';
      const p = pais.toUpperCase();
      if (p === 'VENEZUELA') return 'VE';
      if (p === 'COLOMBIA') return 'CO';
      if (p === 'MEXICO') return 'MX';
      if (p === 'CHILE') return 'CL';
      if (p === 'PERU') return 'PE';
      if (p === 'PANAMA') return 'PA';
      if (p === 'ECUADOR') return 'EC';
      return p.substring(0, 2);
  };

  // --- LOGIC: FILTER STORES FOR SELECTION ---
  const availableStoresForTask = useMemo(() => {
      if (!taskFormData.tp_country || !taskFormData.tp_provider_id) return [];
      
      const pId = Number(taskFormData.tp_provider_id);
      
      return inventory.filter(dev => {
          const matchesCountry = dev.pais === taskFormData.tp_country;
          const matchesProvider = dev.wan1_provider_id === pId || dev.wan2_provider_id === pId;
          return matchesCountry && matchesProvider;
      });
  }, [taskFormData.tp_country, taskFormData.tp_provider_id, inventory]);

  // Filter available stores by search term
  const displayedStoresForTask = useMemo(() => {
      if (!storeSearchTerm) return availableStoresForTask;
      const term = storeSearchTerm.toLowerCase();
      return availableStoresForTask.filter(s => 
          (s.nombre_tienda || '').toLowerCase().includes(term) ||
          (s.network_id || '').toLowerCase().includes(term)
      );
  }, [availableStoresForTask, storeSearchTerm]);

  // --- LOGIC: AVAILABLE PROVIDERS BY COUNTRY ---
  const availableProvidersForCountry = useMemo(() => {
      if (!taskFormData.tp_country) return [];
      const ids = new Set<number>();
      inventory.filter(i => i.pais === taskFormData.tp_country).forEach(i => {
          if(i.wan1_provider_id) ids.add(Number(i.wan1_provider_id));
          if(i.wan2_provider_id) ids.add(Number(i.wan2_provider_id));
      });
      return providers.filter(p => ids.has(Number(p.id)));
  }, [taskFormData.tp_country, inventory, providers]);

  const displayedProviders = useMemo(() => {
      return availableProvidersForCountry.filter(p => 
          p.name.toLowerCase().includes(providerSearchTerm.toLowerCase())
      );
  }, [availableProvidersForCountry, providerSearchTerm]);

  const toggleStoreSelection = (networkId: string) => {
      const current = taskFormData.tp_affected_stores || [];
      if (current.includes(networkId)) {
          setTaskFormData({ ...taskFormData, tp_affected_stores: current.filter(id => id !== networkId) });
      } else {
          setTaskFormData({ ...taskFormData, tp_affected_stores: [...current, networkId] });
      }
  };

  const selectAllStores = () => {
      // Select ALL displayed stores (respects filter)
      const visibleIds = displayedStoresForTask.map(s => s.network_id);
      const current = taskFormData.tp_affected_stores || [];
      // Combine unique
      const combined = Array.from(new Set([...current, ...visibleIds]));
      setTaskFormData({ ...taskFormData, tp_affected_stores: combined });
  };

  const clearStoreSelection = () => {
      setTaskFormData({ ...taskFormData, tp_affected_stores: [] });
  };

  const calculateDuration = (start: string, end: string) => {
      if (!start || !end) return 0;
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      return Math.floor((e - s) / 60000); // minutes
  };

  // --- PROVIDER CRUD ---
  const handleOpenModal = (provider?: ISPProvider) => {
      setEditingProvider(provider || null);
      setFormData(provider || { name: '', sla_contract: 99.0 });
      setErrorMsg(null);
      setIsModalOpen(true);
  };

  const handleSaveProvider = async () => {
      if (!formData.name) {
          setErrorMsg("El nombre del proveedor es obligatorio");
          return;
      }
      setSaving(true);
      setErrorMsg(null);

      try {
          if (isDemoMode) {
              await new Promise(r => setTimeout(r, 800));
              if (editingProvider) {
                  setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, ...formData } as ISPProvider : p));
              } else {
                  const newId = Math.max(...providers.map(p => Number(p.id))) + 1;
                  setProviders([...providers, { id: newId, ...formData } as ISPProvider]);
              }
              setIsModalOpen(false);
              return;
          }

          if (editingProvider) {
              const { error } = await supabase.from('isp_providers_jj').update(formData).eq('id', editingProvider.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('isp_providers_jj').insert([formData]);
              if (error) throw error;
          }

          fetchProviders();
          setIsModalOpen(false);
      } catch (err: any) {
          setErrorMsg(err.message || "Error al guardar el proveedor");
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteProvider = async (id: string | number) => {
      if (!window.confirm("¿Está seguro de eliminar este proveedor?")) return;
      try {
          if (isDemoMode) {
              setProviders(prev => prev.filter(p => p.id !== id));
              return;
          }
          const { error } = await supabase.from('isp_providers_jj').delete().eq('id', id);
          if (error) throw error;
          fetchProviders();
      } catch (err: any) {
          alert("Error al eliminar: " + err.message);
      }
  };

  // --- TASK CRUD ---
  const handleOpenTaskModal = (task?: ScheduledTask) => {
      setEditingTask(task || null);
      setIsProviderSelectorOpen(false); 
      setProviderSearchTerm('');
      
      setIsCountrySelectorOpen(false);
      setCountrySearchTerm('');

      setStoreSearchTerm(''); 
      
      if (task) {
          setTaskFormData(task);
      } else {
          // Defaults for new task
          const now = new Date();
          const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
          setTaskFormData({
              tp_start_time: now.toISOString(),
              tp_end_time: oneHourLater.toISOString(),
              tp_affected_stores: []
          });
      }
      setErrorMsg(null);
      setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
      if (!taskFormData.tp_title || !taskFormData.tp_provider_id || !taskFormData.tp_country || !taskFormData.tp_start_time || !taskFormData.tp_end_time) {
          setErrorMsg("Título, Proveedor, País y Fechas son obligatorios.");
          return;
      }
      
      setSaving(true);
      setErrorMsg(null);

      try {
          const duration = calculateDuration(taskFormData.tp_start_time, taskFormData.tp_end_time);
          if (duration < 0) {
              setErrorMsg("La fecha de fin no puede ser anterior a la de inicio.");
              setSaving(false);
              return;
          }

          if (isDemoMode || isTaskTableMissing) {
              await new Promise(r => setTimeout(r, 800));
              const providerName = providers.find(p => String(p.id) === String(taskFormData.tp_provider_id))?.name;
              
              const mockTask = {
                  ...taskFormData,
                  tp_id: editingTask ? editingTask.tp_id : Math.floor(Math.random() * 10000),
                  provider_name: providerName,
                  tp_duration_minutes: duration,
                  updated_at: new Date().toISOString(),
                  updated_by: currentUserEmail
              } as ScheduledTask;

              if (editingTask) {
                  setTasks(prev => prev.map(t => t.tp_id === editingTask.tp_id ? mockTask : t));
              } else {
                  setTasks(prev => [...prev, mockTask].sort((a,b) => new Date(a.tp_start_time).getTime() - new Date(b.tp_start_time).getTime()));
              }
              setIsTaskModalOpen(false);
              return;
          }

          const payload = {
              tp_title: taskFormData.tp_title,
              tp_country: taskFormData.tp_country,
              tp_provider_id: taskFormData.tp_provider_id,
              tp_start_time: taskFormData.tp_start_time,
              tp_end_time: taskFormData.tp_end_time,
              tp_observation: taskFormData.tp_observation,
              tp_affected_stores: taskFormData.tp_affected_stores,
              updated_at: new Date().toISOString(),
              updated_by: currentUserEmail
          };

          if (editingTask) {
              const { error } = await supabase
                  .from('provider_tasks_jj')
                  .update(payload)
                  .eq('tp_id', editingTask.tp_id);
              if (error) throw error;
          } else {
              const { error } = await supabase
                  .from('provider_tasks_jj')
                  .insert([{ ...payload, created_by: currentUserEmail }]);
              if (error) throw error;
          }

          fetchTasks();
          setIsTaskModalOpen(false);

      } catch (err: any) {
          setErrorMsg(err.message || "Error al guardar la tarea");
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteTask = async (id: number) => {
      if (!window.confirm("¿Eliminar este mantenimiento programado?")) return;
      try {
          if (isDemoMode || isTaskTableMissing) {
              setTasks(prev => prev.filter(t => t.tp_id !== id));
              return;
          }
          const { error } = await supabase.from('provider_tasks_jj').delete().eq('tp_id', id);
          if (error) throw error;
          fetchTasks();
      } catch (err: any) {
          alert("Error: " + err.message);
      }
  };

  const uniqueCountries = useMemo(() => {
      const countries = new Set(inventory.map(i => i.pais));
      return Array.from(countries).filter(Boolean).sort();
  }, [inventory]);

  const displayedCountries = useMemo(() => {
      return uniqueCountries.filter(c => 
          c.toLowerCase().includes(countrySearchTerm.toLowerCase())
      );
  }, [uniqueCountries, countrySearchTerm]);

  const filteredProviders = providers.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = tasks.filter(t => 
      t.tp_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.provider_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- NEW: GANTT CHART VISUALIZATION ---
  const TimelineGantt = () => {
      const days = 7;
      const today = new Date();
      // Start from yesterday to show context
      const startTimeline = new Date(today);
      startTimeline.setDate(today.getDate() - 1);
      startTimeline.setHours(0,0,0,0);
      
      const endTimeline = new Date(startTimeline);
      endTimeline.setDate(startTimeline.getDate() + days);
      
      const totalDuration = endTimeline.getTime() - startTimeline.getTime();

      // Filter tasks within this window
      const visibleTasks = filteredTasks.filter(t => {
          const s = new Date(t.tp_start_time).getTime();
          const e = new Date(t.tp_end_time).getTime();
          return e > startTimeline.getTime() && s < endTimeline.getTime();
      });

      // Group by Provider
      const groupedTasks: Record<string, ScheduledTask[]> = {};
      visibleTasks.forEach(t => {
          const key = t.provider_name || 'Otros';
          if (!groupedTasks[key]) groupedTasks[key] = [];
          groupedTasks[key].push(t);
      });

      // Position helper
      const getPosition = (isoDate: string) => {
          const time = new Date(isoDate).getTime();
          const offset = time - startTimeline.getTime();
          const percent = (offset / totalDuration) * 100;
          return Math.max(0, Math.min(100, percent));
      };

      const getWidth = (startIso: string, endIso: string) => {
          const s = Math.max(new Date(startIso).getTime(), startTimeline.getTime());
          const e = Math.min(new Date(endIso).getTime(), endTimeline.getTime());
          const duration = e - s;
          const percent = (duration / totalDuration) * 100;
          return Math.max(0.5, percent); // Min width for visibility
      };

      // Generate Day Headers
      const dayHeaders = [];
      for(let i=0; i<days; i++) {
          const d = new Date(startTimeline);
          d.setDate(d.getDate() + i);
          const isToday = d.toDateString() === new Date().toDateString();
          dayHeaders.push({ 
              label: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }), 
              isToday,
              left: (i / days) * 100 
          });
      }

      return (
          <div className="flex flex-col h-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-900 shadow-inner">
              {/* Header Timeline */}
              <div className="flex bg-zinc-900 border-b border-zinc-800 h-10 relative">
                  <div className="w-40 shrink-0 border-r border-zinc-800 p-2 text-xs font-bold text-zinc-500 uppercase flex items-center bg-zinc-900 z-10">Proveedor</div>
                  <div className="flex-1 relative overflow-hidden">
                      {dayHeaders.map((dh, i) => (
                          <div 
                            key={i} 
                            className={`absolute top-0 bottom-0 border-l border-zinc-800 flex items-center justify-center text-[10px] uppercase font-bold ${dh.isToday ? 'bg-blue-900/10 text-blue-400' : 'text-zinc-600'}`}
                            style={{ left: `${(i/days)*100}%`, width: `${100/days}%` }}
                          >
                              {dh.label}
                          </div>
                      ))}
                      {/* Current Time Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        style={{ left: `${getPosition(new Date().toISOString())}%` }}
                      ></div>
                  </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {Object.keys(groupedTasks).length === 0 ? (
                      <div className="p-10 text-center text-zinc-600 text-xs">No hay trabajos programados para esta semana.</div>
                  ) : (
                      Object.entries(groupedTasks).map(([provider, pTasks]) => (
                          <div key={provider} className="flex border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors h-14 relative group/row">
                              <div className="w-40 shrink-0 border-r border-zinc-800 p-3 text-xs font-medium text-zinc-300 truncate bg-zinc-950/50 z-10 flex items-center">
                                  {provider}
                              </div>
                              <div className="flex-1 relative">
                                  {/* Grid Lines Background */}
                                  {dayHeaders.map((_, i) => (
                                      <div key={i} className="absolute top-0 bottom-0 border-l border-zinc-800/30" style={{ left: `${(i/days)*100}%` }}></div>
                                  ))}
                                  
                                  {/* Tasks Bars */}
                                  {pTasks.map(t => {
                                      const now = new Date();
                                      const start = new Date(t.tp_start_time);
                                      const end = new Date(t.tp_end_time);
                                      
                                      let statusColor = 'bg-yellow-600 border-yellow-500'; // Pending
                                      if (now > end) statusColor = 'bg-green-600/60 border-green-500/50 opacity-60'; // Done
                                      else if (now >= start && now <= end) statusColor = 'bg-blue-600 border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.5)] animate-pulse'; // Active

                                      return (
                                          <div
                                              key={t.tp_id}
                                              className={`absolute top-2 h-8 rounded border ${statusColor} cursor-pointer hover:brightness-110 hover:scale-y-105 transition-all z-10 group/task`}
                                              style={{ 
                                                  left: `${getPosition(t.tp_start_time)}%`, 
                                                  width: `${getWidth(t.tp_start_time, t.tp_end_time)}%`,
                                                  minWidth: '4px'
                                              }}
                                              onClick={() => handleOpenTaskModal(t)}
                                          >
                                              {/* Tooltip */}
                                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-black border border-zinc-700 rounded p-2 text-[10px] text-white hidden group-hover/task:block z-50 shadow-xl pointer-events-none">
                                                  <div className="font-bold text-purple-400 mb-0.5 truncate">{t.tp_title}</div>
                                                  <div className="text-zinc-400">{start.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</div>
                                                  <div className="text-zinc-500 mt-1">{t.tp_country}</div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="p-4 md:p-8 h-screen flex flex-col bg-black overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <Cable className="text-purple-500" />
                    Gestión de Proveedores
                </h1>
                <p className="text-zinc-500 text-xs md:text-sm mt-1">
                    Administración de ISPs y agenda de mantenimientos (TP).
                </p>
            </div>
            
            {/* TABS SWITCHER */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'list' 
                        ? 'bg-zinc-800 text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <LayoutList className="w-3.5 h-3.5" /> Proveedores
                </button>
                <button 
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'tasks' 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <CalendarClock className="w-3.5 h-3.5" /> Trabajos Programados
                </button>
            </div>
        </div>

        {/* Content Container */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex-1 flex flex-col shadow-2xl relative">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/50 flex flex-col sm:flex-row items-center gap-4 justify-between">
                 
                 {/* Search or View Toggle */}
                 <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                     {activeTab === 'tasks' ? (
                         <div className="flex bg-zinc-900 p-0.5 rounded-md border border-zinc-800 shrink-0">
                             <button 
                                onClick={() => setTaskViewMode('list')}
                                className={`p-1.5 rounded flex items-center justify-center transition-colors ${taskViewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                title="Vista Lista"
                             >
                                 <List className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => setTaskViewMode('timeline')}
                                className={`p-1.5 rounded flex items-center justify-center transition-colors ${taskViewMode === 'timeline' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                title="Vista Timeline"
                             >
                                 <BarChart className="w-4 h-4 rotate-90" />
                             </button>
                         </div>
                     ) : null}

                     <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'list' ? "Buscar proveedor..." : "Buscar TP, proveedor..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 placeholder:text-zinc-600"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => activeTab === 'list' ? handleOpenModal() : handleOpenTaskModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    {activeTab === 'list' ? 'Nuevo Proveedor' : 'Nuevo TP'}
                </button>
            </div>

            {/* --- LIST TAB CONTENT --- */}
            {activeTab === 'list' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black">
                    {/* ... Existing Provider List Code ... */}
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : filteredProviders.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500 flex flex-col items-center">
                            <Cable className="w-12 h-12 mb-4 opacity-20" />
                            <p>No se encontraron proveedores</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filteredProviders.map(provider => {
                                // Get stats for this provider
                                const stats = providerStats[String(provider.id)] || {};
                                const countries = Object.keys(stats);
                                
                                return (
                                <div key={provider.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-all group relative shadow-lg flex flex-col justify-between">
                                    
                                    {/* Header Section */}
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-purple-500/30 transition-colors">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold text-lg leading-none uppercase tracking-tight flex items-center gap-2">
                                                        {provider.name}
                                                        {/* If single country, show code here, else just generic or hidden */}
                                                        {countries.length === 1 && (
                                                            <span className="text-zinc-500 text-sm font-bold">{getCountryCode(countries[0])}</span>
                                                        )}
                                                    </h3>
                                                    <span className="text-[10px] text-zinc-600 font-mono mt-0.5 block">ID: {provider.id}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(provider)} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDeleteProvider(provider.id)} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Country Stats Section */}
                                        <div className="mb-4 space-y-2">
                                            {countries.length > 0 ? (
                                                countries.map(country => {
                                                    const count = stats[country].size; // Set size
                                                    const massiveThreshold = Math.round(count * 0.15); // 15% Calculation
                                                    
                                                    return (
                                                        <div key={country} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Globe className="w-3 h-3 text-zinc-500" /> {country}
                                                                </span>
                                                                {countries.length > 1 && <span className="text-[9px] font-bold text-zinc-500">{getCountryCode(country)}</span>}
                                                            </div>
                                                            <div className="text-sm text-white font-medium mb-0.5">
                                                                Tiendas: <span className="font-bold">{count}</span>
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500">
                                                                Declaración de Masiva: <span className="text-zinc-300 font-bold">{massiveThreshold} tiendas</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/30 text-center">
                                                    <span className="text-xs text-zinc-600 italic">Sin tiendas asociadas</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* SLA Badge */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                                            <span className="text-xs text-zinc-500 font-medium">SLA Contratado</span>
                                            <span className={`ml-auto font-mono font-bold text-xs ${provider.sla_contract && provider.sla_contract >= 99 ? 'text-green-500' : 'text-yellow-500'}`}>
                                                {provider.sla_contract ? `${provider.sla_contract}%` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer Contact Info */}
                                    <div className="pt-3 border-t border-zinc-900 grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase block mb-0.5">SOPORTE</span>
                                            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                                                <Phone className="w-3 h-3" />
                                                <span className="truncate">{provider.support_phone || '-'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase block mb-0.5">CONTACTO</span>
                                            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                                                <Mail className="w-3 h-3" />
                                                <span className="truncate" title={provider.contact_email}>{provider.contact_email || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- TASKS TAB CONTENT --- */}
            {activeTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 bg-black">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-zinc-500">
                            <div className="bg-zinc-900/50 p-4 rounded-full mb-3">
                                <CalendarX className="w-8 h-8 opacity-50" /> 
                            </div>
                            <p className="text-sm font-medium text-zinc-400">No hay trabajos programados.</p>
                            <button onClick={() => handleOpenTaskModal()} className="text-blue-500 hover:text-blue-400 text-sm mt-1 font-bold hover:underline transition-colors">
                                Crear nuevo TP
                            </button>
                        </div>
                    ) : taskViewMode === 'timeline' ? (
                        /* GANTT VIEW */
                        <div className="h-full flex flex-col">
                            <TimelineGantt />
                        </div>
                    ) : (
                        /* LIST VIEW */
                        <div className="space-y-3">
                            {filteredTasks.map(task => {
                                const start = new Date(task.tp_start_time);
                                const end = new Date(task.tp_end_time);
                                const now = new Date();
                                
                                let statusColor = 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
                                let statusText = 'PROGRAMADO';
                                
                                if (now > end) {
                                    statusColor = 'bg-green-500/10 text-green-500 border-green-500/20';
                                    statusText = 'FINALIZADO';
                                } else if (now >= start && now <= end) {
                                    statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse';
                                    statusText = 'EN PROGRESO';
                                } else {
                                    statusColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                                    statusText = 'PENDIENTE';
                                }

                                return (
                                    <div key={task.tp_id} className={`bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-900/60 transition-colors group`}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-w-[60px]">
                                                <span className="text-[10px] font-bold text-red-500 uppercase">{start.toLocaleString('es-ES', { month: 'short' })}</span>
                                                <span className="text-xl font-bold text-white leading-none">{start.getDate()}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-white font-bold text-sm">{task.tp_title}</h3>
                                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-400 mb-2 max-w-xl">{task.tp_observation || 'Sin observaciones.'}</p>
                                                
                                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 font-mono">
                                                    <span className="flex items-center gap-1 text-zinc-300 font-bold bg-zinc-900 px-1.5 rounded">
                                                        <Building2 className="w-3 h-3" /> {task.provider_name}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-zinc-300 font-bold bg-zinc-900 px-1.5 rounded">
                                                        <Globe className="w-3 h-3" /> {task.tp_country}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {start.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-blue-400">
                                                        <Timer className="w-3 h-3" /> {task.tp_duration_minutes || calculateDuration(task.tp_start_time, task.tp_end_time)} min
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <Store className="w-3 h-3" />
                                                    <span>Afectación: <strong>{task.tp_affected_stores?.length || 0}</strong> tiendas</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-zinc-800 pt-3 md:pt-0">
                                            <button 
                                                onClick={() => handleOpenTaskModal(task)}
                                                className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTask(task.tp_id)}
                                                className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* PROVIDER MODAL (UNCHANGED) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-backdrop">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-lg shadow-2xl animate-smooth">
                     <div className="flex justify-between items-center p-4 border-b border-zinc-900">
                        <h2 className="text-white font-bold flex items-center gap-2">
                            {editingProvider ? <Edit2 className="w-4 h-4 text-purple-500" /> : <Plus className="w-4 h-4 text-purple-500" />}
                            {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre *</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Email Contacto</label>
                                <input type="email" value={formData.contact_email || ''} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Teléfono Soporte</label>
                                <input type="text" value={formData.support_phone || ''} onChange={e => setFormData({...formData, support_phone: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Nombre Contacto</label>
                                <input type="text" value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">SLA Contrato (%)</label>
                                <input type="number" step="0.1" value={formData.sla_contract || 99.0} onChange={e => setFormData({...formData, sla_contract: parseFloat(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                        </div>
                        {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
                         <div className="p-4 border-t border-zinc-900 flex justify-end gap-2 bg-zinc-900/30 -mx-6 -mb-6 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded text-zinc-400 hover:text-white text-sm">Cancelar</button>
                            <button onClick={handleSaveProvider} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TASK MODAL (UNCHANGED) */}
        {isTaskModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-backdrop">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-2xl shadow-2xl animate-smooth flex flex-col max-h-[90vh]">
                    {/* ... Existing Task Modal Content (Kept as is) ... */}
                    <div className="flex justify-between items-center p-4 border-b border-zinc-900 shrink-0">
                        <h2 className="text-white font-bold flex items-center gap-2">
                            {editingTask ? <Edit2 className="w-4 h-4 text-purple-500" /> : <Plus className="w-4 h-4 text-purple-500" />}
                            {editingTask ? 'Editar Trabajo Programado (TP)' : 'Nuevo Trabajo Programado (TP)'}
                        </h2>
                        <button onClick={() => setIsTaskModalOpen(false)} className="text-zinc-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Título del TP *</label>
                                <input 
                                    type="text"
                                    value={taskFormData.tp_title || ''}
                                    onChange={e => setTaskFormData({...taskFormData, tp_title: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white focus:border-purple-500 outline-none text-sm"
                                    placeholder="Ej. Mantenimiento Fibra Óptica Regional"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Observación</label>
                                <textarea 
                                    value={taskFormData.tp_observation || ''}
                                    onChange={e => setTaskFormData({...taskFormData, tp_observation: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white focus:border-purple-500 outline-none text-sm resize-none h-16"
                                    placeholder="Detalles técnicos..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             
                             {/* CUSTOM COUNTRY SELECTOR */}
                             <div className="space-y-1.5 relative" ref={countrySelectorRef}>
                                <label className="text-xs font-bold text-zinc-500 uppercase">País *</label>
                                <button 
                                    type="button"
                                    onClick={() => setIsCountrySelectorOpen(!isCountrySelectorOpen)}
                                    className={`w-full flex items-center justify-between bg-zinc-900 border rounded p-2 pl-3 text-sm focus:outline-none transition-colors ${
                                        isCountrySelectorOpen ? 'border-purple-500 text-white' : 'border-zinc-800 text-white hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className={`w-4 h-4 ${!taskFormData.tp_country ? 'text-zinc-700' : 'text-zinc-500'}`} />
                                        <span className="truncate">
                                            {taskFormData.tp_country || "Seleccionar País..."}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isCountrySelectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isCountrySelectorOpen && (
                                    <div 
                                        className="absolute top-full left-0 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-60"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
                                            <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800 focus-within:border-purple-500/50">
                                                <Search className="w-3 h-3 text-zinc-500" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Buscar..." 
                                                    value={countrySearchTerm}
                                                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                                                    className="bg-transparent border-none text-xs text-white placeholder:text-zinc-600 focus:outline-none w-full p-0"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                            {displayedCountries.length > 0 ? (
                                                displayedCountries.map(c => {
                                                    const isSelected = taskFormData.tp_country === c;
                                                    return (
                                                        <div 
                                                            key={c}
                                                            onClick={() => {
                                                                setTaskFormData({ ...taskFormData, tp_country: c, tp_provider_id: undefined });
                                                                setIsCountrySelectorOpen(false);
                                                                setCountrySearchTerm('');
                                                            }}
                                                            className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs transition-colors mb-0.5 ${
                                                                isSelected ? 'bg-purple-600/10 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800'
                                                            }`}
                                                        >
                                                            <span className="truncate">{c}</span>
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 text-center text-[10px] text-zinc-600 italic">
                                                    No se encontraron resultados.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                             {/* CUSTOM PROVIDER SELECTOR */}
                             <div className="space-y-1.5 relative" ref={providerSelectorRef}>
                                <label className="text-xs font-bold text-zinc-500 uppercase">Proveedor *</label>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        if(!taskFormData.tp_country) return;
                                        setIsProviderSelectorOpen(!isProviderSelectorOpen);
                                    }}
                                    className={`w-full flex items-center justify-between bg-zinc-900 border rounded p-2 pl-3 text-sm focus:outline-none transition-colors ${
                                        !taskFormData.tp_country 
                                        ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' 
                                        : (isProviderSelectorOpen ? 'border-purple-500 text-white' : 'border-zinc-800 text-white hover:border-zinc-700')
                                    }`}
                                    disabled={!taskFormData.tp_country}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 className={`w-4 h-4 ${!taskFormData.tp_country ? 'text-zinc-700' : 'text-zinc-500'}`} />
                                        <span className="truncate">
                                            {taskFormData.tp_provider_id 
                                                ? providers.find(p => Number(p.id) === Number(taskFormData.tp_provider_id))?.name || "Seleccionar..." 
                                                : (!taskFormData.tp_country ? "Seleccione País primero" : "Seleccionar Proveedor...")}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isProviderSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isProviderSelectorOpen && taskFormData.tp_country && (
                                    <div 
                                        className="absolute top-full left-0 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-60"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
                                            <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800 focus-within:border-purple-500/50">
                                                <Search className="w-3 h-3 text-zinc-500" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Buscar..." 
                                                    value={providerSearchTerm}
                                                    onChange={(e) => setProviderSearchTerm(e.target.value)}
                                                    className="bg-transparent border-none text-xs text-white placeholder:text-zinc-600 focus:outline-none w-full p-0"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                            {displayedProviders.length > 0 ? (
                                                displayedProviders.map(p => {
                                                    const isSelected = Number(taskFormData.tp_provider_id) === Number(p.id);
                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            onClick={() => {
                                                                setTaskFormData({ ...taskFormData, tp_provider_id: Number(p.id) });
                                                                setIsProviderSelectorOpen(false);
                                                                setProviderSearchTerm('');
                                                            }}
                                                            className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs transition-colors mb-0.5 ${
                                                                isSelected ? 'bg-purple-600/10 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800'
                                                            }`}
                                                        >
                                                            <span className="truncate">{p.name}</span>
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 text-center text-[10px] text-zinc-600 italic">
                                                    {availableProvidersForCountry.length === 0 
                                                        ? "No hay proveedores disponibles para este país." 
                                                        : "No se encontraron resultados."}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             {/* CUSTOM DATE PICKER: START */}
                             <CustomDateTimePicker 
                                label="Inicio *"
                                value={taskFormData.tp_start_time}
                                onChange={(iso) => setTaskFormData({...taskFormData, tp_start_time: iso})}
                             />
                             
                             {/* CUSTOM DATE PICKER: END */}
                             <CustomDateTimePicker 
                                label="Fin *"
                                value={taskFormData.tp_end_time}
                                onChange={(iso) => setTaskFormData({...taskFormData, tp_end_time: iso})}
                             />
                        </div>

                        {taskFormData.tp_start_time && taskFormData.tp_end_time && (
                            <div className="text-right text-xs text-zinc-500 font-mono">
                                Duración estimada: <span className="text-white font-bold">{calculateDuration(taskFormData.tp_start_time, taskFormData.tp_end_time)} min</span>
                            </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-zinc-900">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        <Store className="w-4 h-4" /> Tiendas Afectadas ({taskFormData.tp_affected_stores?.length || 0})
                                    </label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={selectAllStores} 
                                            type="button"
                                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                                            disabled={displayedStoresForTask.length === 0}
                                        >
                                            Seleccionar Todas
                                        </button>
                                        <span className="text-zinc-700">|</span>
                                        <button 
                                            onClick={clearStoreSelection} 
                                            type="button"
                                            className="text-[10px] text-zinc-500 hover:text-white"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>
                                {/* STORE SEARCH INPUT */}
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar tienda por nombre o ID..." 
                                        value={storeSearchTerm}
                                        onChange={(e) => setStoreSearchTerm(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-zinc-600"
                                        disabled={!taskFormData.tp_country || !taskFormData.tp_provider_id}
                                    />
                                </div>
                            </div>

                            {(!taskFormData.tp_country || !taskFormData.tp_provider_id) ? (
                                <div className="p-4 text-center text-xs text-zinc-600 bg-zinc-900/30 rounded border border-zinc-800/50">
                                    Seleccione País y Proveedor para ver las tiendas disponibles.
                                </div>
                            ) : displayedStoresForTask.length === 0 ? (
                                <div className="p-4 text-center text-xs text-zinc-600 bg-zinc-900/30 rounded border border-zinc-800/50">
                                    {storeSearchTerm ? "No se encontraron tiendas con ese nombre." : "No se encontraron tiendas asociadas a este proveedor en este país."}
                                </div>
                            ) : (
                                <div className="border border-zinc-800 rounded-lg max-h-40 overflow-y-auto p-1 grid grid-cols-2 gap-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                    {displayedStoresForTask.map(store => {
                                        const isSelected = (taskFormData.tp_affected_stores || []).includes(store.network_id);
                                        return (
                                            <div 
                                                key={store.network_id}
                                                onClick={() => toggleStoreSelection(store.network_id)}
                                                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-xs transition-colors ${
                                                    isSelected ? 'bg-purple-600/20 text-white border border-purple-500/30' : 'hover:bg-zinc-800 text-zinc-400 border border-transparent'
                                                }`}
                                            >
                                                {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                                                <span className="truncate" title={store.nombre_tienda}>{store.nombre_tienda || store.network_id}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-zinc-900 flex justify-end gap-2 bg-zinc-900/30 -mx-6 -mb-6 rounded-b-xl">
                            <button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 rounded text-zinc-400 hover:text-white text-sm">Cancelar</button>
                            <button onClick={handleSaveTask} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar TP</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Providers;