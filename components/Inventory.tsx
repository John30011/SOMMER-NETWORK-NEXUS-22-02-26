
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { getFriendlyErrorMessage, isNetworkError } from '../utils/errorHandling';
import { DeviceInventory, ISPProvider } from '../types';
import { Search, Server, RefreshCw, Box, AlertTriangle, X, Database, Globe, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Filter, SearchX, Wifi, Edit3, Save, Loader2, Info, Store, ChevronDown, Check, Square, CheckSquare, Clock, Calculator, Router, Cloud, ArrowLeftRight, Zap } from 'lucide-react';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

interface InventoryProps {
    targetNetworkId?: string | null;
}

// --- VISUAL TOPOLOGY COMPONENT ---
const ConnectivityTopology = ({ device }: { device: DeviceInventory }) => {
    const w1Color = device.wan1_contingencia ? 'border-red-500/50' : 'border-blue-500/50';
    const w2Color = device.wan2_contingencia ? 'border-red-500/50' : 'border-yellow-500/50';

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f615_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                <ArrowLeftRight className="w-4 h-4" /> Topología de Conectividad
            </h3>

            <div className="flex items-center justify-between relative z-10">
                {/* WAN 1 NODE */}
                <div className="flex flex-col items-center gap-3 w-1/3">
                    <div className={`w-14 h-14 rounded-full bg-zinc-950 border-2 ${device.wan1_contingencia ? 'border-red-500' : 'border-blue-500'} flex items-center justify-center shadow-lg relative group`}>
                        <Cloud className={`w-6 h-6 ${device.wan1_contingencia ? 'text-red-500' : 'text-blue-500'}`} />
                        {device.wan1_contingencia && (
                            <div className="absolute -top-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded-full uppercase tracking-wide shadow-sm">Backup</div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-black text-white uppercase tracking-tight">{device.wan1_provider?.name || 'Desconocido'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 bg-zinc-900 px-1.5 rounded">{device.wan1_id_servicio || 'N/A'}</div>
                        <div className="mt-1 text-[10px] font-bold text-blue-400">{device.wan1_bw || '--'}</div>
                    </div>
                </div>

                {/* CENTRAL ROUTER NODE */}
                <div className="flex flex-col items-center gap-2 relative w-1/3">
                    {/* Connection Lines (CSS) */}
                    <div className="absolute top-7 left-0 w-1/2 h-0.5 bg-gradient-to-r from-blue-500/50 to-zinc-700 -z-10"></div>
                    <div className="absolute top-7 right-0 w-1/2 h-0.5 bg-gradient-to-l from-yellow-500/50 to-zinc-700 -z-10"></div>

                    {/* Router Icon */}
                    <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-2xl relative z-10">
                        <Router className="w-8 h-8 text-white" />
                        <div className="absolute -bottom-1.5 flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse delay-75"></div>
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse delay-150"></div>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <div className="text-xs font-bold text-white bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">{device.meraki_model || 'MX Appliance'}</div>
                        <div className="text-[9px] text-zinc-600 mt-1 font-mono">{device.meraki_serial || 'SN: Unknown'}</div>
                    </div>
                </div>

                {/* WAN 2 NODE */}
                <div className="flex flex-col items-center gap-3 w-1/3">
                    <div className={`w-14 h-14 rounded-full bg-zinc-950 border-2 ${device.wan2_contingencia ? 'border-red-500' : 'border-yellow-500'} flex items-center justify-center shadow-lg relative group`}>
                        <Cloud className={`w-6 h-6 ${device.wan2_contingencia ? 'text-red-500' : 'text-yellow-500'}`} />
                        {device.wan2_contingencia && (
                            <div className="absolute -top-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded-full uppercase tracking-wide shadow-sm">Backup</div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-black text-white uppercase tracking-tight">{device.wan2_provider?.name || 'Desconocido'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 bg-zinc-900 px-1.5 rounded">{device.wan2_id_servicio || 'N/A'}</div>
                        <div className="mt-1 text-[10px] font-bold text-yellow-500">{device.wan2_bw || '--'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CUSTOM MULTI-SELECT COMBOBOX COMPONENT ---
interface FilterComboboxProps {
    options: string[];
    selectedValues: string[]; // Changed to array for multi-select
    onChange: (values: string[]) => void;
    placeholder: string;
    highlightUnknown?: boolean;
}

const FilterCombobox: React.FC<FilterComboboxProps> = ({ options, selectedValues, onChange, placeholder, highlightUnknown }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle Selection Toggle
    const handleSelect = (opt: string) => {
        if (opt === '') {
            // "Todos" clicked - Clear selection
            onChange([]);
            setIsOpen(false);
        } else {
            let newSelection = [...selectedValues];
            if (newSelection.includes(opt)) {
                newSelection = newSelection.filter(v => v !== opt);
            } else {
                newSelection.push(opt);
            }
            onChange(newSelection);
            // Keep open for multiple selection
        }
    };

    const getDisplayValue = () => {
        if (!selectedValues || selectedValues.length === 0) return "Todos";
        if (selectedValues.length === 1) return selectedValues[0];
        return `${selectedValues.length} seleccionados`;
    };

    const isAllSelected = !selectedValues || selectedValues.length === 0;

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchTerm(''); // Reset search on open
                }}
                className={`w-full flex items-center justify-between bg-zinc-950 border rounded px-2 py-1.5 text-xs focus:outline-none transition-colors ${isOpen || !isAllSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-zinc-800 hover:border-zinc-700'
                    } ${!isAllSelected ? 'text-white font-medium' : 'text-zinc-400'}`}
            >
                <span className="truncate">{getDisplayValue()}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Input inside Dropdown */}
                    <div className="p-2 border-b border-zinc-800">
                        <div className="flex items-center gap-2 bg-zinc-950 rounded px-2 py-1.5 border border-zinc-800 focus-within:border-blue-500">
                            <Search className="w-3 h-3 text-zinc-500" />
                            <input
                                type="text"
                                className="bg-transparent border-none text-xs text-white placeholder:text-zinc-600 focus:outline-none w-full p-0"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-1">
                        {/* Option: TODOS */}
                        <div
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-zinc-800 rounded-md flex items-center gap-2 transition-colors ${isAllSelected ? 'bg-blue-500/10 text-blue-400 font-bold' : 'text-zinc-400'}`}
                            onClick={() => handleSelect('')}
                        >
                            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isAllSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`}>
                                {isAllSelected && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                            </div>
                            <span>Todos</span>
                        </div>

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isUnknown = highlightUnknown && (opt === 'Desconocido' || opt === 'DESCONOCIDO');
                                const isSelected = selectedValues.includes(opt);

                                return (
                                    <div
                                        key={opt}
                                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-zinc-800 rounded-md flex items-center gap-2 transition-colors
                                ${isSelected ? 'bg-zinc-800/50' : ''}
                            `}
                                        onClick={() => handleSelect(opt)}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                        </div>

                                        <span className={`truncate ${isUnknown ? 'text-yellow-500 font-bold' :
                                            isSelected ? 'text-white font-medium' : 'text-zinc-300'
                                            }`}>
                                            {opt}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-[10px] text-zinc-600 italic">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>

                    {/* Footer Stats */}
                    <div className="px-3 py-2 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                        <span>{selectedValues.length} seleccionados</span>
                        {selectedValues.length > 0 && (
                            <button onClick={() => onChange([])} className="text-blue-400 hover:text-blue-300">
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- CUSTOM DROPDOWN FOR INVENTORY EDITING ---
interface InventoryDropdownProps {
    value: string | number | null;
    options: { label: string, value: string | number }[];
    onChange: (value: any) => void;
    placeholder?: string;
    className?: string; // used for wrapper custom borders/position
    buttonClassName?: string;
    dropdownClassName?: string;
    disabled?: boolean;
}

const InventoryDropdown: React.FC<InventoryDropdownProps> = ({
    value, options, onChange, placeholder = "Seleccionar...",
    className = "", buttonClassName = "", dropdownClassName = "", disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(o => String(o.value) === String(value));

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 bg-zinc-950 border rounded p-1.5 text-xs text-zinc-200 outline-none transition-all justify-between w-full h-full min-h-[30px] ${isOpen ? 'border-green-500 ring-1 ring-green-500/20 z-20 relative' : 'border-zinc-700 hover:border-zinc-600 z-10 relative'
                    } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${buttonClassName}`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className={`absolute z-[9999] top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 fade-in duration-200 ${dropdownClassName || "left-0 w-full"}`}>
                    <div className="p-1 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                        {options.map((opt) => {
                            const isSelected = String(value) === String(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-[10px] rounded-lg transition-colors flex items-center justify-between group ${isSelected
                                        ? 'bg-green-500/10 text-green-400 font-medium border border-green-500/20'
                                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                                        }`}
                                >
                                    <span className="truncate pr-2">{opt.label}</span>
                                    {isSelected && <Check className="w-3 h-3 animate-in zoom-in flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


const Inventory: React.FC<InventoryProps> = ({ targetNetworkId }) => {
    const [devices, setDevices] = useState<DeviceInventory[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [providers, setProviders] = useState<ISPProvider[]>([]); // List of ISPs for dropdown

    // Realtime Status
    const [syncStatus, setSyncStatus] = useState<'LIVE' | 'SYNCING' | 'OFFLINE'>('OFFLINE');

    // Search & Filter States
    const [globalSearch, setGlobalSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Updated: Filter values can be string (text input) or string[] (multi-select)
    const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // Details Drawer State
    const [selectedDevice, setSelectedDevice] = useState<DeviceInventory | null>(null);

    // EDIT MODE STATE
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<DeviceInventory>>({});

    const fetchProviders = async () => {
        try {
            const { data, error } = await supabase.from('isp_providers_jj').select('*').order('name');
            if (data) setProviders(data);
        } catch (e) {
            console.error("Error fetching providers", e);
        }
    };

    const loadMockInventory = () => {
        setDevices([
            {
                network_id: 'L_MOCK_001',
                pais: 'VENEZUELA',
                codigo_tienda: 'T-2155',
                nombre_tienda: 'Tienda VE 2155 Graciela (Demo)',
                coordenadas_geo: '10.4806,-66.9036',
                region: 'Capital',
                ciudad: 'Caracas',
                wan1_provider_id: 1,
                wan1_id_servicio: 'AB-12345',
                wan1_provider: { id: 1, name: 'CANTV' },
                wan1_bw: '200 MB',
                wan1_contingencia: false,
                wan2_provider_id: 2,
                wan2_id_servicio: 'FIBRA-999',
                wan2_provider: { id: 2, name: 'INTER' },
                wan2_bw: '50 MB',
                wan2_contingencia: true,
                meraki_serial: 'Q2FY-XXXX',
                meraki_model: 'MX67',
                meraki_url: 'https://meraki.cisco.com',
                direccion_domicilio: 'Av. Principal de las Mercedes, Caracas',
                correo_tienda: 't2155@sommer.com',
                es_tienda_top: true,
                es_24_horas: false,
                es_monitoreable: true,
                updated_at: new Date().toISOString(),
                observaciones: 'Tienda flagship con alto tráfico.'
            },
            {
                network_id: 'L_MOCK_002',
                pais: 'COLOMBIA',
                codigo_tienda: 'T-5020',
                nombre_tienda: 'Bogotá Andino (Demo)',
                wan1_provider_id: 3,
                wan1_id_servicio: 'CL-9982',
                wan1_provider: { id: 3, name: 'CLARO' },
                wan2_provider_id: 4,
                wan2_id_servicio: 'ETB-111',
                wan2_provider: { id: 4, name: 'ETB' },
                updated_at: new Date().toISOString()
            },
        ]);
        setProviders([{ id: 1, name: 'CANTV' }, { id: 2, name: 'INTER' }, { id: 3, name: 'CLARO' }, { id: 4, name: 'ETB' }]);
        setLoading(false);
        setSyncStatus('OFFLINE');
        setErrorMsg("Modo desconectado: Visualizando datos de demostración.");
    };

    const fetchInventory = async (isBackgroundSync = false) => {
        if (!isBackgroundSync) setLoading(true);
        if (isBackgroundSync) setSyncStatus('SYNCING');
        setErrorMsg(null);
        try {
            // Also fetch providers if not loaded
            if (providers.length === 0 && !isDemoMode) fetchProviders();

            if (isDemoMode) {
                loadMockInventory();
                setSyncStatus('LIVE'); // Demo mode pretends to be live
                return;
            }

            const { data, error } = await supabase
                .from('devices_inventory_jj')
                .select(`
          *,
          wan1_provider:isp_providers_jj!wan1_provider_id(name),
          wan2_provider:isp_providers_jj!wan2_provider_id(name)
        `)
                .limit(500);

            if (error) throw error;
            if (data) setDevices(data as DeviceInventory[]);

            setTimeout(() => setSyncStatus('LIVE'), 500);
        } catch (err: any) {
            const msg = getFriendlyErrorMessage(err);
            console.warn('Inventory Sync:', msg);

            if (isNetworkError(err)) {
                loadMockInventory();
                setSyncStatus('OFFLINE');
            } else {
                setErrorMsg(msg);
                setSyncStatus('OFFLINE');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();

        // 1. AUTO-SYNC POLLING (Every 1 minute)
        const intervalId = setInterval(() => {
            console.log('Inventory Auto-sync triggered (1m interval)');
            fetchInventory(true);
        }, 60000);

        if (isDemoMode) return () => clearInterval(intervalId);

        // 2. Realtime Subscription
        const channel = supabase
            .channel('inventory-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'devices_inventory_jj' }, (payload) => {
                console.log('Inventory change detected:', payload);
                fetchInventory(true); // Trigger background sync
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setSyncStatus('LIVE');
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setSyncStatus('OFFLINE');
            });

        return () => {
            clearInterval(intervalId);
            supabase.removeChannel(channel);
        };
    }, []);

    // Effect to handle external navigation (Target Network ID)
    useEffect(() => {
        if (targetNetworkId && devices.length > 0) {
            // 1. Set global search to ID to filter the table
            setGlobalSearch(targetNetworkId);

            // 2. Find and select the device to open the drawer automatically
            const targetDevice = devices.find(d =>
                String(d.network_id).toLowerCase() === targetNetworkId.toLowerCase()
            );

            if (targetDevice) {
                setSelectedDevice(targetDevice);
            }
        }
    }, [targetNetworkId, devices]);

    // --- SORTING LOGIC ---
    const handleSort = (key: string) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-400" />
            : <ArrowDown className="w-3 h-3 text-blue-400" />;
    };

    // --- FILTERING LOGIC ---
    const handleColumnFilterChange = (key: string, value: any) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }));
    };

    // --- EXTRACT UNIQUE OPTIONS FOR SELECT FILTERS ---
    const uniqueCountries = useMemo(() => {
        const all = devices.map(d => d.pais || 'Desconocido').filter(Boolean);
        return Array.from(new Set(all)).sort();
    }, [devices]);

    const uniqueWan1 = useMemo(() => {
        const all = devices.map(d => d.wan1_provider?.name || 'Desconocido').filter(Boolean);
        return Array.from(new Set(all)).sort();
    }, [devices]);

    const uniqueWan2 = useMemo(() => {
        const all = devices.map(d => d.wan2_provider?.name || 'Desconocido').filter(Boolean);
        return Array.from(new Set(all)).sort();
    }, [devices]);

    // --- PROCESSED DATA (The "R7" Smart Search Engine) ---
    const processedDevices = useMemo(() => {
        let result = [...devices];

        // 1. Global Smart Search
        if (globalSearch.trim()) {
            const searchTerms = globalSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);

            result = result.filter(d => {
                const searchableDNA = [
                    d.network_id,
                    d.nombre_tienda,
                    d.codigo_tienda,
                    d.pais,
                    d.wan1_provider?.name,
                    d.wan2_provider?.name,
                    d.wan1_id_servicio,
                    d.wan2_id_servicio,
                    d.meraki_serial,
                    d.meraki_model
                ].map(val => val ? String(val).toLowerCase() : '').join(' ');

                return searchTerms.every(term => searchableDNA.includes(term));
            });
        }

        // 2. Column Specific Filters (Updated for Arrays)
        Object.keys(columnFilters).forEach(key => {
            const filterValue = columnFilters[key];

            // Skip if empty string or empty array
            if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return;

            result = result.filter(d => {
                // Handle Multi-Select Columns (Arrays)
                if (key === 'wan1' || key === 'wan2' || key === 'pais') {
                    // Values from Row
                    let val = '';
                    if (key === 'wan1') val = d.wan1_provider?.name || 'Desconocido';
                    else if (key === 'wan2') val = d.wan2_provider?.name || 'Desconocido';
                    else if (key === 'pais') val = d.pais || 'Desconocido';

                    // Check if row value is in selected array
                    return filterValue.includes(val);
                }

                // Handle Text Inputs (String)
                const val = d[key];
                return (val ? String(val) : '').toLowerCase().includes(filterValue.toLowerCase());
            });
        });

        // 3. Sorting
        if (sortConfig) {
            result.sort((a: any, b: any) => {
                let aVal = '';
                let bVal = '';

                if (sortConfig.key === 'wan1') {
                    aVal = a.wan1_provider?.name || '';
                    bVal = b.wan1_provider?.name || '';
                } else if (sortConfig.key === 'wan2') {
                    aVal = a.wan2_provider?.name || '';
                    bVal = b.wan2_provider?.name || '';
                } else {
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();

                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [devices, globalSearch, columnFilters, sortConfig]);

    // --- EDIT HANDLERS ---
    const handleEditClick = () => {
        if (!selectedDevice) return;
        setFormData({ ...selectedDevice });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({});
    };

    const handleInputChange = (field: keyof DeviceInventory, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Helper for Bandwidth input (splitting "50 MB" into parts)
    const parseBW = (bwString: string | undefined) => {
        if (!bwString) return { value: '', unit: 'MB' };
        const parts = bwString.split(' ');
        return { value: parts[0] || '', unit: parts[1] || 'MB' };
    };

    const handleBWChange = (field: 'wan1_bw' | 'wan2_bw', type: 'value' | 'unit', newVal: string) => {
        const current = parseBW(formData[field]);
        const updated = type === 'value' ? { ...current, value: newVal } : { ...current, unit: newVal };
        handleInputChange(field, `${updated.value} ${updated.unit}`);
    };

    const handleSaveChanges = async () => {
        if (!selectedDevice) return;
        setIsSaving(true);

        try {
            if (isDemoMode) {
                // Simulate save
                await new Promise(r => setTimeout(r, 1000));
                const updated = { ...selectedDevice, ...formData };
                setDevices(prev => prev.map(d => d.network_id === updated.network_id ? updated as DeviceInventory : d));
                setSelectedDevice(updated as DeviceInventory);
            } else {
                // Extract only editable fields to prevent DB errors
                const editableKeys: (keyof DeviceInventory)[] = [
                    'direccion_domicilio', 'correo_tienda', 'es_tienda_top', 'es_24_horas', 'observaciones',
                    'wan1_provider_id', 'wan1_bw', 'wan1_contingencia',
                    'wan2_provider_id', 'wan2_bw', 'wan2_contingencia', 'es_monitoreable',
                    'pais', 'wan1_id_servicio', 'wan1_tipo_servicio', 'wan2_id_servicio', 'wan2_tipo_servicio'
                ];

                const dataToUpdate: Partial<DeviceInventory> = {};
                editableKeys.forEach(key => {
                    if (formData[key] !== undefined) {
                        (dataToUpdate as any)[key] = formData[key];
                    }
                });

                const { error } = await supabase
                    .from('devices_inventory_jj')
                    .update(dataToUpdate)
                    .eq('network_id', selectedDevice.network_id);

                if (error) throw error;

                // Refresh data locally
                fetchInventory(true);

                // Update selected view with mapped providers for immediate UI reflection
                const w1Prov = providers.find(p => p.id === Number(formData.wan1_provider_id));
                const w2Prov = providers.find(p => p.id === Number(formData.wan2_provider_id));

                setSelectedDevice({
                    ...selectedDevice,
                    ...formData,
                    wan1_provider: w1Prov || selectedDevice.wan1_provider,
                    wan2_provider: w2Prov || selectedDevice.wan2_provider
                } as DeviceInventory);
            }
            setIsEditing(false);
        } catch (err: any) {
            console.error("Error saving:", err);
            alert("Error guardando cambios: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to extract keys that aren't already displayed in specific sections
    const getDynamicFields = (device: DeviceInventory) => {
        const ignoredKeys = new Set([
            'id', 'created_at', 'updated_at', // System fields
            'network_id', 'nombre_tienda', 'codigo_tienda', 'pais', // Header fields
            'meraki_serial', 'meraki_url', 'meraki_model', // Hardware Top section (Updated)
            'wan1_provider_id', 'wan1_id_servicio', 'wan1_provider', 'wan1_bw', 'wan1_contingencia', 'wan1_status', 'wan1_ticket_ref', // WAN 1
            'wan2_provider_id', 'wan2_id_servicio', 'wan2_provider', 'wan2_bw', 'wan2_contingencia', 'wan2_status', 'wan2_ticket_ref', // WAN 2
            'direccion_domicilio', 'correo_tienda', 'es_tienda_top', 'es_24_horas', 'es_monitoreable', 'observaciones' // Editable section
        ]);

        return Object.keys(device).filter(key => !ignoredKeys.has(key) && typeof device[key] !== 'object');
    };


    const columns = [
        { label: 'ID de Red', key: 'network_id' },
        { label: 'País', key: 'pais' },
        { label: 'Cód.', key: 'codigo_tienda' },
        { label: 'Nombre Tienda', key: 'nombre_tienda' },
        { label: 'WAN 1 (Prov / ID)', key: 'wan1' },
        { label: 'WAN 2 (Prov / ID)', key: 'wan2' },
    ];

    return (
        // Updated container height for mobile (h-[calc(100vh-5rem)]) to account for bottom nav
        <div className="p-4 md:p-8 h-[calc(100vh-5rem)] md:h-screen flex flex-col relative overflow-hidden bg-black">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <Box className="text-blue-500" />
                        Inventario
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 text-xs md:text-sm">
                            Gestión de inventario y enlaces WAN
                        </p>
                        {syncStatus === 'LIVE' && (
                            <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-bold">
                                <Wifi className="w-3 h-3" /> AUTO-SYNC
                            </span>
                        )}
                        {syncStatus === 'SYNCING' && (
                            <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                                <RefreshCw className="w-3 h-3 animate-spin" /> ACTUALIZANDO...
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-80">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-20 group-focus-within:opacity-75 transition duration-500`}></div>
                        <div className="relative flex items-center bg-zinc-900 rounded-lg border border-zinc-800 group-focus-within:border-blue-500/50 transition-colors">
                            <Search className="w-4 h-4 text-zinc-500 ml-3 shrink-0 group-focus-within:text-blue-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                className="w-full bg-transparent border-none py-2 md:py-2.5 pl-3 pr-8 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                            />
                            {globalSearch && (
                                <button
                                    onClick={() => setGlobalSearch('')}
                                    className="absolute right-2 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 md:p-2.5 border rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 ${showFilters
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        title="Filtros Avanzados por Columna"
                    >
                        <Filter className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => fetchInventory()}
                        className="p-2 md:p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors shrink-0"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading || syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Table Container */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex-1 flex flex-col shadow-2xl relative z-0">
                <div className="overflow-auto flex-1 h-full relative">
                    <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                        <thead className="bg-zinc-900/90 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 cursor-pointer hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors group select-none truncate"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right w-32">
                                    Meraki
                                </th>
                            </tr>

                            {showFilters && (
                                <tr className="bg-zinc-900 border-b border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <th className="p-2 align-top"><input type="text" placeholder="Filtrar ID..." className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none" onChange={(e) => handleColumnFilterChange('network_id', e.target.value)} /></th>

                                    {/* PAIS COMBOBOX (MULTI-SELECT) */}
                                    <th className="p-2 align-top z-30 relative">
                                        <FilterCombobox
                                            options={uniqueCountries}
                                            selectedValues={columnFilters['pais'] || []}
                                            onChange={(val) => handleColumnFilterChange('pais', val)}
                                            placeholder="Todos"
                                        />
                                    </th>

                                    <th className="p-2 align-top"><input type="text" placeholder="Cód..." className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none" onChange={(e) => handleColumnFilterChange('codigo_tienda', e.target.value)} /></th>
                                    <th className="p-2 align-top"><input type="text" placeholder="Nombre..." className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none" onChange={(e) => handleColumnFilterChange('nombre_tienda', e.target.value)} /></th>

                                    {/* WAN 1 COMBOBOX (MULTI-SELECT) */}
                                    <th className="p-2 align-top z-30 relative">
                                        <FilterCombobox
                                            options={uniqueWan1}
                                            selectedValues={columnFilters['wan1'] || []}
                                            onChange={(val) => handleColumnFilterChange('wan1', val)}
                                            placeholder="Todos"
                                            highlightUnknown={true}
                                        />
                                    </th>

                                    {/* WAN 2 COMBOBOX (MULTI-SELECT) */}
                                    <th className="p-2 align-top z-30 relative">
                                        <FilterCombobox
                                            options={uniqueWan2}
                                            selectedValues={columnFilters['wan2'] || []}
                                            onChange={(val) => handleColumnFilterChange('wan2', val)}
                                            placeholder="Todos"
                                            highlightUnknown={true}
                                        />
                                    </th>
                                    <th className="p-2 align-top"></th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {loading ? (
                                [...Array(10)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4" colSpan={7}><div className="h-6 bg-zinc-900 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : processedDevices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                                <SearchX className="w-6 h-6 text-zinc-600" />
                                            </div>
                                            <p className="text-zinc-400 font-medium">No se encontraron resultados.</p>
                                            <p className="text-sm mt-1">Intenta con otros términos o limpia el filtro.</p>
                                            <button onClick={() => setGlobalSearch('')} className="mt-4 text-blue-400 text-xs hover:underline">
                                                Limpiar búsqueda
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                processedDevices.map((device) => {
                                    const wan1Name = device.wan1_provider?.name || 'Desconocido';
                                    const wan2Name = device.wan2_provider?.name || 'Desconocido';
                                    const isWan1Unknown = wan1Name === 'Desconocido';
                                    const isWan2Unknown = wan2Name === 'Desconocido';

                                    return (
                                        <tr
                                            key={device.network_id}
                                            onClick={() => {
                                                setSelectedDevice(device);
                                                setIsEditing(false); // Reset edit mode on select new
                                            }}
                                            className="hover:bg-blue-600/5 cursor-pointer transition-colors group border-l-2 border-transparent hover:border-blue-500"
                                        >
                                            <td className="p-4 align-middle truncate">
                                                <span className="text-zinc-300 font-mono text-xs font-bold bg-zinc-900/50 px-1.5 py-0.5 rounded">{device.network_id}</span>
                                            </td>
                                            <td className="p-4 align-middle truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${device.pais === 'VENEZUELA' ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]' :
                                                        device.pais === 'COLOMBIA' ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' :
                                                            'bg-zinc-500'
                                                        }`}></span>
                                                    <span className="text-zinc-300 text-xs font-medium truncate">{device.pais || 'Desconocido'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle truncate">
                                                <span className="text-zinc-400 text-xs font-mono">{device.codigo_tienda || 'N/A'}</span>
                                            </td>
                                            <td className="p-4 align-middle truncate">
                                                <span className="text-white font-medium text-sm truncate block" title={device.nombre_tienda}>{device.nombre_tienda}</span>
                                            </td>

                                            <td className="p-4 align-middle truncate">
                                                <div className="flex flex-col truncate">
                                                    <span className={`text-xs font-bold truncate ${isWan1Unknown ? 'text-yellow-400' : 'text-blue-300'}`} title={wan1Name}>
                                                        {wan1Name}
                                                    </span>
                                                    <span className="text-zinc-600 text-[10px] font-mono mt-0.5 truncate group-hover:text-zinc-500">
                                                        {device.wan1_id_servicio || '-'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle truncate">
                                                <div className="flex flex-col truncate">
                                                    <span className={`text-xs font-bold truncate ${isWan2Unknown ? 'text-yellow-400' : 'text-blue-300'}`} title={wan2Name}>
                                                        {wan2Name}
                                                    </span>
                                                    <span className="text-zinc-600 text-[10px] font-mono mt-0.5 truncate group-hover:text-zinc-500">
                                                        {device.wan2_id_servicio || '-'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                                {device.meraki_url && (
                                                    <a
                                                        href={device.meraki_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-zinc-800 text-white hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 border border-blue-500 hover:border-zinc-700"
                                                    >
                                                        Dashboard <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur p-3 border-t border-zinc-900 text-xs text-zinc-500 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span>Mostrando <span className="text-white font-bold">{processedDevices.length}</span> registros</span>

                        {/* Massive Threshold Calculation */}
                        {processedDevices.length > 0 && (
                            <span className="flex items-center gap-1.5 text-blue-500 border-l border-zinc-800 pl-4 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Masiva (15%): <span className="text-blue-400 font-bold">{Math.ceil(processedDevices.length * 0.15)}</span> tiendas</span>
                            </span>
                        )}
                    </div>

                    <span className="flex items-center gap-1 text-blue-400">
                        <Database className="w-3 h-3" />
                        Click en una fila para ver detalles
                    </span>
                </div>
            </div>

            {/* DETAILS DRAWER (Slide-over) with High Z-Index for Mobile */}
            <div
                className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-zinc-950 border-l border-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] flex flex-col ${selectedDevice ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {selectedDevice && (
                    <>
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-zinc-900 flex justify-between items-start bg-zinc-900/50 backdrop-blur-md">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1 leading-tight">{selectedDevice.nombre_tienda}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20 font-bold">
                                        {selectedDevice.codigo_tienda}
                                    </span>
                                    <span className="flex items-center gap-1 text-zinc-400 text-xs font-medium bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                        <Globe className="w-3 h-3" /> {selectedDevice.pais}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleSaveChanges}
                                                disabled={isSaving}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                Guardar
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedDevice(null)}
                                            className="p-1.5 bg-zinc-900 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Updated Last Updated Timestamp Position & Style */}
                                {selectedDevice.updated_at && (() => {
                                    const dateObj = new Date(selectedDevice.updated_at);
                                    const isRecent = (Date.now() - dateObj.getTime()) < (15 * 60 * 1000); // 15 mins threshold

                                    return (
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wide ${isRecent
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                                            }`}>
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                Actualizado: {dateObj.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* NEW: VISUAL TOPOLOGY */}
                            <ConnectivityTopology device={selectedDevice} />

                            {/* Read-Only Hardware Info */}
                            <section className="opacity-70">
                                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Server className="w-4 h-4" /> Hardware (Solo Lectura)
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-900/30 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-0.5">ID Red</span>
                                        <span className="text-zinc-300 text-xs font-mono break-all">{selectedDevice.network_id}</span>
                                    </div>
                                    <div className="bg-zinc-900/30 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-0.5">Serial</span>
                                        <span className="text-zinc-300 text-xs font-mono">{selectedDevice.meraki_serial || 'N/A'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* NEW: DYNAMIC ADDITIONAL DETAILS SECTION */}
                            <section className="bg-zinc-900/10 rounded-xl border border-zinc-800/50 p-4">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Detalles Técnicos Adicionales
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {getDynamicFields(selectedDevice).map((key) => {
                                        const value = selectedDevice[key];
                                        const label = key.replace(/_/g, ' ').replace('meraki', '').trim();

                                        return (
                                            <div key={key} className="bg-zinc-900/30 p-2 rounded border border-zinc-800/30">
                                                <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-0.5 truncate" title={label}>{label}</span>
                                                <div className="text-zinc-300 text-xs font-mono break-all leading-tight">
                                                    {value === true ? <span className="text-green-500">SI</span> :
                                                        value === false ? <span className="text-red-500">NO</span> :
                                                            !value ? <span className="text-zinc-600">-</span> :
                                                                String(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {getDynamicFields(selectedDevice).length === 0 && (
                                        <div className="col-span-2 text-center py-4 text-xs text-zinc-600 italic">
                                            No hay información adicional disponible.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* EDITABLE SECTION: DATOS OPERATIVOS */}
                            <section className="bg-zinc-900/20 p-4 rounded-xl border border-zinc-800 relative">
                                {/* ... [Rest of Editable Section remains exact same] ... */}
                                {!isEditing && (
                                    <button
                                        onClick={handleEditClick}
                                        className="absolute top-4 right-4 text-blue-500 hover:text-blue-400 transition-colors p-2 bg-zinc-900/50 rounded-full hover:bg-zinc-900"
                                        title="Editar Datos"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                )}
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                                    <Store className="w-4 h-4 text-orange-500" />
                                    Datos Operativos & Configuración
                                </h3>

                                <div className="space-y-5">
                                    {/* Flags: Top & 24h & Monitoreable */}
                                    <div className="flex gap-6 flex-wrap">
                                        {/* Switch: Tienda Top */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => isEditing && handleInputChange('es_tienda_top', !formData.es_tienda_top)}
                                                className={`w-10 h-5 rounded-full flex items-center transition-colors p-1 cursor-pointer ${(isEditing ? formData.es_tienda_top : selectedDevice.es_tienda_top) ? 'bg-blue-600' : 'bg-zinc-700'
                                                    } ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}
                                            >
                                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${(isEditing ? formData.es_tienda_top : selectedDevice.es_tienda_top) ? 'translate-x-5' : 'translate-x-0'
                                                    }`}></div>
                                            </div>
                                            <span className="text-xs font-bold text-zinc-300">Tienda TOP</span>
                                        </div>
                                        {/* Switch: 24 Horas */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => isEditing && handleInputChange('es_24_horas', !formData.es_24_horas)}
                                                className={`w-10 h-5 rounded-full flex items-center transition-colors p-1 cursor-pointer ${(isEditing ? formData.es_24_horas : selectedDevice.es_24_horas) ? 'bg-purple-600' : 'bg-zinc-700'
                                                    } ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}
                                            >
                                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${(isEditing ? formData.es_24_horas : selectedDevice.es_24_horas) ? 'translate-x-5' : 'translate-x-0'
                                                    }`}></div>
                                            </div>
                                            <span className="text-xs font-bold text-zinc-300">24 Horas</span>
                                        </div>
                                        {/* Switch: Monitoreable */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => isEditing && handleInputChange('es_monitoreable', !formData.es_monitoreable)}
                                                className={`w-10 h-5 rounded-full flex items-center transition-colors p-1 cursor-pointer ${(isEditing ? formData.es_monitoreable : selectedDevice.es_monitoreable) ? 'bg-green-600' : 'bg-zinc-700'
                                                    } ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}
                                            >
                                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${(isEditing ? formData.es_monitoreable : selectedDevice.es_monitoreable) ? 'translate-x-5' : 'translate-x-0'
                                                    }`}></div>
                                            </div>
                                            <span className="text-xs font-bold text-zinc-300">Monitoreable</span>
                                        </div>
                                    </div>

                                    {/* Location, Address & Email */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">País</label>
                                            {isEditing ? (
                                                <InventoryDropdown
                                                    value={formData.pais || ''}
                                                    onChange={(val) => handleInputChange('pais', val)}
                                                    options={[
                                                        { label: 'Seleccionar...', value: '' },
                                                        { label: 'ARGENTINA', value: 'ARGENTINA' },
                                                        { label: 'COLOMBIA', value: 'COLOMBIA' },
                                                        { label: 'VENEZUELA', value: 'VENEZUELA' }
                                                    ]}
                                                />
                                            ) : (
                                                <p className="text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                                    {selectedDevice.pais || 'No registrado'}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Correo Tienda</label>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={formData.correo_tienda || ''}
                                                    onChange={(e) => handleInputChange('correo_tienda', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white focus:border-blue-500 outline-none placeholder:text-zinc-700"
                                                    placeholder="correo@ejemplo.com"
                                                />
                                            ) : (
                                                <p className="text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                                    {selectedDevice.correo_tienda || 'No registrado'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Dirección Domicilio</label>
                                            {isEditing ? (
                                                <textarea
                                                    value={formData.direccion_domicilio || ''}
                                                    onChange={(e) => handleInputChange('direccion_domicilio', e.target.value.toUpperCase())}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white focus:border-blue-500 outline-none h-20 resize-none placeholder:text-zinc-700"
                                                    placeholder="Ingresa la dirección completa..."
                                                />
                                            ) : (
                                                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/50 p-2 rounded border border-zinc-800/50 min-h-[40px] whitespace-pre-wrap">
                                                    {selectedDevice.direccion_domicilio || 'No registrada'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Observations */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Observaciones</label>
                                        {isEditing ? (
                                            <textarea
                                                value={formData.observaciones || ''}
                                                onChange={(e) => handleInputChange('observaciones', e.target.value.toUpperCase())}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white focus:border-blue-500 outline-none h-24 resize-none placeholder:text-zinc-700"
                                                placeholder="Notas operativas adicionales..."
                                            />
                                        ) : (
                                            <p className="text-xs text-zinc-400 italic bg-zinc-950/50 p-2 rounded border border-zinc-800/50 min-h-[40px] whitespace-pre-wrap">
                                                {selectedDevice.observaciones || 'Sin observaciones'}
                                            </p>
                                        )}
                                    </div>

                                    {/* WAN CONFIGURATION */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                                        {/* WAN 1 */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-blue-400 uppercase">Config WAN 1</h4>
                                                {/* Contingency Switch */}
                                                <div className="flex items-center gap-2" title="Es enlace de contingencia">
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Contingencia</span>
                                                    <div
                                                        onClick={() => isEditing && handleInputChange('wan1_contingencia', !formData.wan1_contingencia)}
                                                        className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${(isEditing ? formData.wan1_contingencia : selectedDevice.wan1_contingencia) ? 'bg-red-500' : 'bg-zinc-700'
                                                            } ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}
                                                    >
                                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${(isEditing ? formData.wan1_contingencia : selectedDevice.wan1_contingencia) ? 'translate-x-4' : 'translate-x-0'
                                                            }`}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Provider Select */}
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Proveedor</label>
                                                {isEditing ? (
                                                    <InventoryDropdown
                                                        value={formData.wan1_provider_id || ''}
                                                        onChange={(val) => handleInputChange('wan1_provider_id', val ? Number(val) : null)}
                                                        options={[
                                                            { label: 'Seleccionar...', value: '' },
                                                            ...providers
                                                                .filter(p => !p.country || p.country.toUpperCase() === ((formData.pais !== undefined ? (formData.pais || '') : (selectedDevice.pais || ''))).toUpperCase())
                                                                .map(p => ({ label: p.country ? `${p.name} (${p.country})` : p.name, value: p.id }))
                                                        ]}
                                                    />
                                                ) : (
                                                    <div className="text-xs font-bold text-white bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
                                                        {selectedDevice.wan1_provider?.name || 'N/A'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* ID Servicio */}
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">ID Servicio</label>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={formData.wan1_id_servicio || ''}
                                                            onChange={(e) => handleInputChange('wan1_id_servicio', e.target.value)}
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-white focus:border-green-500 outline-none focus:ring-1 focus:ring-green-500/50 transition-all hover:border-zinc-600"
                                                            placeholder="Ej. ID-12345"
                                                        />
                                                    ) : (
                                                        <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50 truncate">
                                                            {selectedDevice.wan1_id_servicio || '-'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tipo de Servicio */}
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Tipo Servicio</label>
                                                    {isEditing ? (
                                                        <InventoryDropdown
                                                            value={formData.wan1_tipo_servicio || ''}
                                                            onChange={(val) => handleInputChange('wan1_tipo_servicio', val)}
                                                            options={[
                                                                { label: 'Seleccionar...', value: '' },
                                                                { label: 'GPON', value: 'GPON' },
                                                                { label: 'ID', value: 'ID' },
                                                                { label: 'FIBRA ÓPTICA', value: 'FIBRA ÓPTICA' },
                                                                { label: 'SATELITAL', value: 'SATELITAL' },
                                                                { label: 'MPLS', value: 'MPLS' },
                                                                { label: 'INTERNET', value: 'INTERNET' },
                                                                { label: 'BANDA ANCHA', value: 'BANDA ANCHA' },
                                                                { label: 'EMPRES. NO DEDICADO', value: 'EMPRESARIAL NO DEDICADO' },
                                                                { label: 'RADIO', value: 'RADIO' }
                                                            ]}
                                                        />
                                                    ) : (
                                                        <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50 truncate">
                                                            {selectedDevice.wan1_tipo_servicio || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bandwidth Input Group */}
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Ancho de Banda</label>
                                                {isEditing ? (
                                                    <div className="flex relative items-stretch h-8">
                                                        <input
                                                            type="number"
                                                            value={parseBW(formData.wan1_bw).value}
                                                            onChange={(e) => handleBWChange('wan1_bw', 'value', e.target.value)}
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-l p-1.5 text-xs text-white focus:border-green-500 outline-none focus:ring-1 focus:ring-green-500/50 transition-all hover:border-zinc-600"
                                                            placeholder="0"
                                                        />
                                                        <InventoryDropdown
                                                            value={parseBW(formData.wan1_bw).unit}
                                                            onChange={(val) => handleBWChange('wan1_bw', 'unit', String(val))}
                                                            options={[
                                                                { label: 'MB', value: 'MB' },
                                                                { label: 'GB', value: 'GB' },
                                                                { label: 'TB', value: 'TB' }
                                                            ]}
                                                            className="flex-shrink-0 -ml-px min-w-[70px]"
                                                            buttonClassName="rounded-none rounded-r"
                                                            dropdownClassName="w-[100px] right-0 left-auto"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
                                                        {selectedDevice.wan1_bw || '-'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* WAN 2 */}
                                        <div className="space-y-3 border-l border-zinc-800/50 pl-4 md:border-l-0 md:pl-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-yellow-500 uppercase">Config WAN 2</h4>
                                                <div className="flex items-center gap-2" title="Es enlace de contingencia">
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Contingencia</span>
                                                    <div
                                                        onClick={() => isEditing && handleInputChange('wan2_contingencia', !formData.wan2_contingencia)}
                                                        className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${(isEditing ? formData.wan2_contingencia : selectedDevice.wan2_contingencia) ? 'bg-red-500' : 'bg-zinc-700'
                                                            } ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}
                                                    >
                                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${(isEditing ? formData.wan2_contingencia : selectedDevice.wan2_contingencia) ? 'translate-x-4' : 'translate-x-0'
                                                            }`}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Provider Select */}
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Proveedor</label>
                                                {isEditing ? (
                                                    <InventoryDropdown
                                                        value={formData.wan2_provider_id || ''}
                                                        onChange={(val) => handleInputChange('wan2_provider_id', val ? Number(val) : null)}
                                                        options={[
                                                            { label: 'Seleccionar...', value: '' },
                                                            ...providers
                                                                .filter(p => !p.country || p.country.toUpperCase() === ((formData.pais !== undefined ? (formData.pais || '') : (selectedDevice.pais || ''))).toUpperCase())
                                                                .map(p => ({ label: p.country ? `${p.name} (${p.country})` : p.name, value: p.id }))
                                                        ]}
                                                    />
                                                ) : (
                                                    <div className="text-xs font-bold text-white bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
                                                        {selectedDevice.wan2_provider?.name || 'N/A'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* ID Servicio */}
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">ID Servicio</label>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={formData.wan2_id_servicio || ''}
                                                            onChange={(e) => handleInputChange('wan2_id_servicio', e.target.value)}
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-white focus:border-green-500 outline-none focus:ring-1 focus:ring-green-500/50 transition-all hover:border-zinc-600"
                                                            placeholder="Ej. ID-12345"
                                                        />
                                                    ) : (
                                                        <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50 truncate">
                                                            {selectedDevice.wan2_id_servicio || '-'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tipo de Servicio */}
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Tipo Servicio</label>
                                                    {isEditing ? (
                                                        <InventoryDropdown
                                                            value={formData.wan2_tipo_servicio || ''}
                                                            onChange={(val) => handleInputChange('wan2_tipo_servicio', val)}
                                                            options={[
                                                                { label: 'Seleccionar...', value: '' },
                                                                { label: 'GPON', value: 'GPON' },
                                                                { label: 'ID', value: 'ID' },
                                                                { label: 'FIBRA ÓPTICA', value: 'FIBRA ÓPTICA' },
                                                                { label: 'SATELITAL', value: 'SATELITAL' },
                                                                { label: 'MPLS', value: 'MPLS' },
                                                                { label: 'INTERNET', value: 'INTERNET' },
                                                                { label: 'BANDA ANCHA', value: 'BANDA ANCHA' },
                                                                { label: 'EMPRES. NO DEDICADO', value: 'EMPRESARIAL NO DEDICADO' },
                                                                { label: 'RADIO', value: 'RADIO' }
                                                            ]}
                                                        />
                                                    ) : (
                                                        <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50 truncate">
                                                            {selectedDevice.wan2_tipo_servicio || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bandwidth Input Group */}
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Ancho de Banda</label>
                                                {isEditing ? (
                                                    <div className="flex relative items-stretch h-8">
                                                        <input
                                                            type="number"
                                                            value={parseBW(formData.wan2_bw).value}
                                                            onChange={(e) => handleBWChange('wan2_bw', 'value', e.target.value)}
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-l p-1.5 text-xs text-white focus:border-green-500 outline-none focus:ring-1 focus:ring-green-500/50 transition-all hover:border-zinc-600"
                                                            placeholder="0"
                                                        />
                                                        <InventoryDropdown
                                                            value={parseBW(formData.wan2_bw).unit}
                                                            onChange={(val) => handleBWChange('wan2_bw', 'unit', String(val))}
                                                            options={[
                                                                { label: 'MB', value: 'MB' },
                                                                { label: 'GB', value: 'GB' },
                                                                { label: 'TB', value: 'TB' }
                                                            ]}
                                                            className="flex-shrink-0 -ml-px min-w-[70px]"
                                                            buttonClassName="rounded-none rounded-r"
                                                            dropdownClassName="w-[100px] right-0 left-auto"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
                                                        {selectedDevice.wan2_bw || '-'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-4 sticky bottom-0 bg-zinc-950 pb-6 border-t border-zinc-900 mt-4">
                                <a href={selectedDevice.meraki_url} target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-center rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                                    ABRIR EN MERAKI DASHBOARD
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Backdrop for Drawer */}
            {selectedDevice && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] transition-opacity duration-300"
                    onClick={() => {
                        if (!isEditing) setSelectedDevice(null);
                    }}
                ></div>
            )}
        </div>
    );
};

export default Inventory;