
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Slack, MessageCircle, Send, Search, User, 
    MoreVertical, Phone, Paperclip, Check, CheckCheck, 
    Clock, RefreshCw, Zap, AlertTriangle, Hash,
    ArrowLeft, Filter, Loader2, Link as LinkIcon, Mail,
    Copy, Archive, FileText, ExternalLink
} from 'lucide-react';

// Unified Conversation Type
interface Conversation {
    uniqueId: string; // "fail-123"
    dbId: string | number;
    type: 'failure' | 'massive';
    title: string;
    subtitle: string;
    timestamp: Date;
    hasSlack: boolean;
    hasEmail: boolean; // NEW: Email Detection
    slackThreadTs?: string;
    notes: LogEntry[];
    status: string; // e.g. "Activa", "Resuelta"
    networkId?: string; // Only for failures
}

interface LogEntry {
    log: string;
    parsedDate?: Date;
    parsedMessage: string; // Enforced string
    parsedUser?: string;
}

const Message: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'slack' | 'email'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Chat Input State
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    
    // Options Menu State
    const [showOptions, setShowOptions] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);
    
    // Refs for auto-scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
        
        // Realtime Subscription for updates
        const channel = supabase
            .channel('messages-module')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'network_failures_jj' }, () => fetchConversations(true))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'massive_incidents_jj' }, () => fetchConversations(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Scroll to bottom when selected chat changes or new message sent
    useEffect(() => {
        if (selectedId) {
            scrollToBottom();
            setShowOptions(false); // Close menu on chat switch
        }
    }, [selectedId, conversations]);

    // Robust Click Outside Listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };

        if (showOptions) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showOptions]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // --- ROBUST PARSING HELPER (FIXES ERROR #31) ---
    const parseLogEntry = (entryInput: any): LogEntry => {
        // 1. Normalize input to a Safe String
        let logString = '';
        
        if (typeof entryInput === 'string') {
            logString = entryInput;
        } else if (entryInput && typeof entryInput === 'object') {
            // Handle objects safely
            if (typeof entryInput.log === 'string') {
                logString = entryInput.log;
            } else {
                // If it's a random object, stringify it so React doesn't crash
                try {
                    logString = JSON.stringify(entryInput);
                } catch {
                    logString = '[Datos ilegibles]';
                }
            }
        } else {
            logString = String(entryInput || '');
        }

        // 2. Default fallback values
        const fallback: LogEntry = { 
            log: logString, 
            parsedMessage: logString || '...', 
            parsedUser: 'Sistema', 
            parsedDate: new Date() 
        };

        if (!logString) return fallback;

        try {
            // Expected Format: "DD/MM/YYYY HH:mm:ss : Message - User"
            const parts = logString.split(' : ');
            if (parts.length < 2) {
                return fallback;
            }

            const datePart = parts[0];
            const contentPart = parts.slice(1).join(' : ');

            // Parse Date
            const [dStr, tStr] = datePart.split(' ');
            if (!dStr || !tStr) return { ...fallback, parsedMessage: contentPart };

            const [day, month, year] = dStr.split('/').map(Number);
            const [hour, min, sec] = tStr.split(':').map(Number);
            const dateObj = new Date(year, month - 1, day, hour, min, sec);

            // Parse User
            const lastDash = contentPart.lastIndexOf(' - ');
            let message = contentPart;
            let user = 'Sistema';
            
            if (lastDash !== -1) {
                message = contentPart.substring(0, lastDash);
                user = contentPart.substring(lastDash + 3);
            }

            return {
                log: logString,
                parsedDate: isNaN(dateObj.getTime()) ? new Date() : dateObj,
                parsedMessage: message || '...', // Ensure string
                parsedUser: user || 'Sistema'
            };
        } catch (e) {
            return fallback;
        }
    };

    const fetchConversations = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setErrorMsg(null);
        try {
            const list: Conversation[] = [];

            // 1. FAILURES - Fetch failures matching criteria
            const { data: failures, error: failError } = await supabase
                .from('network_failures_jj')
                .select('id, network_id, analyst_notes, slack_thread_ts, lifecycle_stage, updated_at')
                .or('slack_thread_ts.neq.null,analyst_notes.neq.null') // Only get if has Slack OR Notes
                .order('updated_at', { ascending: false })
                .limit(100);
            
            if (failError) throw failError;

            // ENRICHMENT: Fetch Store Names from Inventory separately
            let inventoryMap: Record<string, string> = {};
            if (failures && failures.length > 0) {
                const networkIds = Array.from(new Set(failures.map((f: any) => f.network_id)));
                
                // Only query if we have IDs
                if (networkIds.length > 0) {
                    const { data: invData } = await supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda')
                        .in('network_id', networkIds);
                    
                    if (invData) {
                        invData.forEach((item: any) => {
                            inventoryMap[item.network_id] = item.nombre_tienda;
                        });
                    }
                }
            }

            if (failures) {
                failures.forEach((f: any) => {
                    let rawNotes: any[] = [];
                    if (f.analyst_notes) {
                        if (typeof f.analyst_notes === 'string') {
                            try { 
                                // Handle potential double encoding or simple strings
                                if (f.analyst_notes.startsWith('[') || f.analyst_notes.startsWith('{')) {
                                    rawNotes = JSON.parse(f.analyst_notes);
                                } else {
                                    rawNotes = [{ log: f.analyst_notes }];
                                }
                            } catch(e) { 
                                rawNotes = [{ log: f.analyst_notes }]; 
                            }
                        } else if (Array.isArray(f.analyst_notes)) {
                            rawNotes = f.analyst_notes;
                        } else if (typeof f.analyst_notes === 'object') {
                            rawNotes = [f.analyst_notes];
                        }
                    }

                    // Process notes safely
                    const parsedNotes = Array.isArray(rawNotes) 
                        ? rawNotes.map((n: any) => parseLogEntry(n))
                        : [];
                        
                    // Sort by date ascending for chat view
                    parsedNotes.sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));

                    const lastMsg = parsedNotes.length > 0 ? parsedNotes[parsedNotes.length - 1] : null;
                    const hasSlack = Boolean(f.slack_thread_ts && f.slack_thread_ts.trim() !== '');
                    
                    // Email Detection logic
                    const notesStr = JSON.stringify(rawNotes).toLowerCase();
                    const hasEmail = notesStr.includes('email') || notesStr.includes('correo') || notesStr.includes('gmail') || notesStr.includes('outlook');

                    // Resolve Title from map or fallback to ID
                    const storeName = inventoryMap[f.network_id] || f.network_id;

                    list.push({
                        uniqueId: `fail-${f.id}`,
                        dbId: f.id,
                        type: 'failure',
                        title: storeName || 'Desconocido',
                        subtitle: String(lastMsg?.parsedMessage || (hasSlack ? 'Hilo de Slack activo' : (hasEmail ? 'Comunicación por correo' : 'Sin mensajes previos'))),
                        timestamp: new Date(f.updated_at),
                        hasSlack: hasSlack,
                        hasEmail: hasEmail,
                        slackThreadTs: f.slack_thread_ts,
                        notes: parsedNotes,
                        status: f.lifecycle_stage,
                        networkId: f.network_id
                    });
                });
            }

            // 2. MASSIVE INCIDENTS - Fetch massive incidents matching criteria (Limit 20)
            const { data: massives, error: massError } = await supabase
                .from('massive_incidents_jj')
                .select('id, provider_name, country, slack_thread_ts, status, updated_at')
                .neq('slack_thread_ts', null) // Only get if has Slack
                .order('updated_at', { ascending: false })
                .limit(20);

            if (massError) throw massError;

            if (massives) {
                massives.forEach((m: any) => {
                    // Massive incidents don't have analyst_notes column currently
                    let rawNotes: any[] = [];
                    const parsedNotes = rawNotes.map((n: any) => parseLogEntry(n));
                    
                    const hasSlack = Boolean(m.slack_thread_ts && m.slack_thread_ts.trim() !== '');
                    const hasEmail = false;

                    list.push({
                        uniqueId: `mass-${m.id}`,
                        dbId: m.id,
                        type: 'massive',
                        title: `${m.provider_name} (${m.country})`,
                        subtitle: hasSlack ? 'Hilo de Slack activo' : 'Incidente Masivo',
                        timestamp: new Date(m.updated_at),
                        hasSlack: hasSlack,
                        hasEmail: hasEmail,
                        slackThreadTs: m.slack_thread_ts,
                        notes: parsedNotes,
                        status: m.status
                    });
                });
            }

            // Global Sort by recent activity
            list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setConversations(list);

        } catch (err: any) {
            console.error("Error loading conversations:", err);
            // Show friendly error instead of breaking
            if (!isBackground) {
                setErrorMsg("Error de conexión. Verifica tu red.");
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedId || !inputText.trim()) return;
        const currentConv = conversations.find(c => c.uniqueId === selectedId);
        if (!currentConv) return;

        setSending(true);
        try {
            // 1. Prepare new log entry
            const now = new Date();
            const timestampStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            const user = 'Tú'; // Ideally from Auth
            const logStr = `${timestampStr} : ${inputText} - ${user}`;
            
            // 2. Prepare payload to save
            const newEntry = { log: logStr };
            
            const tableName = currentConv.type === 'failure' ? 'network_failures_jj' : 'massive_incidents_jj';
            
            if (currentConv.type === 'massive') {
                console.warn("Saving notes for massive incidents is not supported by DB schema yet.");
                const newParsedEntry = parseLogEntry(logStr);
                const updatedConv = {
                    ...currentConv,
                    notes: [...currentConv.notes, newParsedEntry],
                    timestamp: now,
                    subtitle: inputText
                };
                setConversations(prev => {
                    const others = prev.filter(c => c.uniqueId !== selectedId);
                    return [updatedConv, ...others];
                });
                setInputText('');
                scrollToBottom();
                return;
            }

            const { data: currentData } = await supabase
                .from(tableName)
                .select('analyst_notes')
                .eq('id', currentConv.dbId)
                .single();
            
            let notesArr: any[] = [];
            if (currentData?.analyst_notes) {
                if (typeof currentData.analyst_notes === 'string') {
                    try { notesArr = JSON.parse(currentData.analyst_notes); } catch { notesArr = []; }
                } else if (Array.isArray(currentData.analyst_notes)) {
                    notesArr = currentData.analyst_notes;
                }
            }
            
            const updatedNotes = [newEntry, ...notesArr]; 

            await supabase
                .from(tableName)
                .update({ analyst_notes: updatedNotes, updated_at: now.toISOString() })
                .eq('id', currentConv.dbId);

            const newParsedEntry = parseLogEntry(logStr);
            const updatedConv = {
                ...currentConv,
                notes: [...currentConv.notes, newParsedEntry],
                timestamp: now,
                subtitle: inputText
            };
            
            setConversations(prev => {
                const others = prev.filter(c => c.uniqueId !== selectedId);
                return [updatedConv, ...others];
            });
            
            setInputText('');
            scrollToBottom();

        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setSending(false);
        }
    };

    // --- RENDER HELPERS ---
    const getFilteredConversations = () => {
        return conversations.filter(c => {
            const s = searchTerm.toLowerCase();
            const matchesSearch = !s || 
                                  c.title.toLowerCase().includes(s) || 
                                  (c.networkId?.toLowerCase().includes(s) || false) ||
                                  (c.slackThreadTs?.toLowerCase().includes(s) || false);
                                  
            let matchesFilter = true;
            if (filter === 'slack') matchesFilter = c.hasSlack;
            if (filter === 'email') matchesFilter = c.hasEmail;
            
            return matchesSearch && matchesFilter;
        });
    };

    const selectedConv = conversations.find(c => c.uniqueId === selectedId);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setShowOptions(false);
        // Optional: add toast
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            
            {/* --- LEFT PANEL: CONVERSATION LIST --- */}
            <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-900 bg-zinc-950/50 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-zinc-900 flex flex-col gap-3">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <MessageCircle className="text-blue-500" />
                        Mensajería
                    </h1>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar por ID, Tienda, Thread..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`flex-1 min-w-[60px] py-1.5 text-xs font-bold rounded-md border transition-all ${filter === 'all' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setFilter('slack')}
                            className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-md border transition-all flex items-center justify-center gap-1 ${filter === 'slack' ? 'bg-[#4A154B]/20 text-[#E01E5A] border-[#4A154B]/50' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}
                        >
                            <Slack className="w-3 h-3" /> Slack
                        </button>
                        <button 
                            onClick={() => setFilter('email')}
                            className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-md border transition-all flex items-center justify-center gap-1 ${filter === 'email' ? 'bg-orange-500/20 text-orange-500 border-orange-500/50' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}
                        >
                            <Mail className="w-3 h-3" /> Correo
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    {errorMsg && (
                        <div className="p-4 m-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                            <p className="text-red-400 text-xs mb-2">{errorMsg}</p>
                            <button 
                                onClick={() => fetchConversations()}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30 flex items-center justify-center gap-2 mx-auto transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" /> Reintentar
                            </button>
                        </div>
                    )}

                    {loading && conversations.length === 0 ? (
                        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
                    ) : getFilteredConversations().length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 text-xs">
                            {filter === 'slack' ? 'No hay hilos de Slack.' : 
                             filter === 'email' ? 'No hay actividad de correo.' : 
                             'No se encontraron conversaciones.'}
                        </div>
                    ) : (
                        getFilteredConversations().map(conv => (
                            <div 
                                key={conv.uniqueId}
                                onClick={() => setSelectedId(conv.uniqueId)}
                                className={`p-4 border-b border-zinc-900/50 cursor-pointer hover:bg-zinc-900/80 transition-colors group ${selectedId === conv.uniqueId ? 'bg-zinc-900 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-bold text-sm truncate pr-2 ${selectedId === conv.uniqueId ? 'text-white' : 'text-zinc-300'}`}>
                                        {conv.title}
                                    </h3>
                                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                                        {conv.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                    {conv.type === 'massive' && <Zap className="w-3 h-3 text-red-500" />}
                                    <span className="text-[10px] bg-zinc-950 px-1.5 rounded text-zinc-500 border border-zinc-800">
                                        ID: {conv.dbId}
                                    </span>
                                    {conv.hasSlack && (
                                        <span className="text-[9px] bg-[#4A154B]/20 text-[#E01E5A] px-1.5 rounded border border-[#4A154B]/30 flex items-center gap-0.5" title={conv.slackThreadTs}>
                                            <Slack className="w-2.5 h-2.5" />
                                        </span>
                                    )}
                                    {conv.hasEmail && (
                                        <span className="text-[9px] bg-orange-500/20 text-orange-500 px-1.5 rounded border border-orange-500/30 flex items-center gap-0.5">
                                            <Mail className="w-2.5 h-2.5" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                        {conv.subtitle}
                                    </p>
                                    {conv.hasSlack ? (
                                        <LinkIcon className="w-3.5 h-3.5 text-zinc-600" />
                                    ) : conv.hasEmail ? (
                                        <Mail className="w-3.5 h-3.5 text-zinc-700" />
                                    ) : (
                                        <MessageCircle className="w-3.5 h-3.5 text-zinc-700" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- RIGHT PANEL: CHAT VIEW --- */}
            {selectedConv ? (
                <div className={`flex-1 flex flex-col bg-zinc-950 relative ${selectedId ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Chat Header - INCREASED Z-INDEX to ensure dropdown floats above content */}
                    <div className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-md z-40 relative">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedId(null)}
                                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-900 to-zinc-800 flex items-center justify-center text-white font-bold shadow-lg">
                                {selectedConv.type === 'massive' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <User className="w-5 h-5 text-zinc-400" />}
                            </div>
                            
                            <div>
                                <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                                    {selectedConv.title}
                                    {selectedConv.hasSlack && (
                                        <span className="bg-[#4A154B] text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#6e226f] shadow-[0_0_10px_rgba(74,21,75,0.4)]">
                                            <Slack className="w-3 h-3" /> Hilo Activo
                                        </span>
                                    )}
                                    {selectedConv.hasEmail && (
                                        <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-700 shadow-sm">
                                            <Mail className="w-3 h-3" /> Correo
                                        </span>
                                    )}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span>ID: {selectedConv.dbId}</span>
                                    <span>•</span>
                                    <span>{selectedConv.type === 'massive' ? 'Incidente Masivo' : 'Falla Individual'}</span>
                                    {selectedConv.hasSlack && (
                                        <>
                                            <span>•</span>
                                            <span className="font-mono text-zinc-400 text-[10px] bg-zinc-900 px-1 rounded border border-zinc-800" title="Slack Thread Timestamp">
                                                {selectedConv.slackThreadTs}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* OPTIONS MENU (Dropdown) */}
                        <div className="relative" ref={optionsRef}>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOptions(!showOptions);
                                }}
                                className={`text-zinc-500 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors ${showOptions ? 'bg-zinc-800 text-white' : ''}`}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {/* DROPDOWN CONTENT - Z-Index 100 to ensure visibility */}
                            {showOptions && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="py-1">
                                        <button 
                                            onClick={() => copyToClipboard(String(selectedConv.dbId))}
                                            className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copiar ID de caso
                                        </button>
                                        <button 
                                            className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                                            onClick={() => setShowOptions(false)}
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Ver detalles de red
                                        </button>
                                        {selectedConv.hasSlack && (
                                            <button 
                                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                                                onClick={() => setShowOptions(false)}
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Abrir en Slack
                                            </button>
                                        )}
                                        <div className="my-1 border-t border-zinc-800"></div>
                                        <button 
                                            className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                            onClick={() => setShowOptions(false)}
                                        >
                                            <Archive className="w-3.5 h-3.5" /> Archivar Chat
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
                        {/* Date Divider (Mock) */}
                        <div className="flex justify-center">
                            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full uppercase tracking-wider">
                                {selectedConv.notes[0]?.parsedDate?.toLocaleDateString() || 'Hoy'}
                            </span>
                        </div>

                        {selectedConv.notes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50 pb-20">
                                <MessageCircle className="w-12 h-12 mb-2" />
                                <span className="text-sm">No hay mensajes aún</span>
                                {selectedConv.type === 'massive' ? (
                                    <span className="text-xs text-red-400 mt-1">Los mensajes no están habilitados para incidentes masivos en esta versión.</span>
                                ) : (
                                    <span className="text-xs">Comienza la conversación abajo</span>
                                )}
                            </div>
                        ) : (
                            selectedConv.notes.map((msg, idx) => {
                                // Check if message is from "Sistema" or "Bot" to style differently
                                const isSystem = msg.parsedUser === 'Sistema' || msg.parsedUser === 'Bot';
                                const isMe = msg.parsedUser === 'Tú' || msg.parsedUser?.includes('Analista'); 
                                
                                if (isSystem) {
                                    return (
                                        <div key={idx} className="flex justify-center my-4">
                                            <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs px-4 py-2 rounded-lg text-center max-w-md">
                                                <span className="font-bold block mb-0.5 text-zinc-400">{String(msg.parsedMessage)}</span>
                                                <span className="text-[9px]">{msg.parsedDate?.toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                                            isMe ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                        }`}>
                                            {msg.parsedUser?.charAt(0).toUpperCase()}
                                        </div>
                                        
                                        {/* Bubble */}
                                        <div className={`flex flex-col max-w-[75%] md:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-xs font-bold text-zinc-400">{msg.parsedUser}</span>
                                                <span className="text-[10px] text-zinc-600">{msg.parsedDate?.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words relative group ${
                                                isMe 
                                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                                            }`}>
                                                {String(msg.parsedMessage)}
                                                {/* Status checkmarks for "Me" messages */}
                                                {isMe && (
                                                    <div className="absolute bottom-1 right-2 opacity-50 text-[10px]">
                                                        {selectedConv.hasSlack ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Slack Origin Indicator if applicable */}
                                            {!isMe && selectedConv.hasSlack && (
                                                <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-600 px-1">
                                                    <Slack className="w-2.5 h-2.5 opacity-50" /> Enviado desde Slack
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Composer Area */}
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                        <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                            <button className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <textarea 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={selectedConv.hasSlack ? `Enviar mensaje a #${selectedConv.networkId || 'general'} en Slack...` : "Escribir nota interna..."}
                                className="flex-1 bg-transparent border-none text-zinc-200 placeholder:text-zinc-600 resize-none max-h-32 min-h-[44px] py-3 focus:outline-none text-sm"
                                rows={1}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || sending}
                                className={`p-2 rounded-lg transition-all ${
                                    inputText.trim() && !sending
                                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500' 
                                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                }`}
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-zinc-600">
                                {selectedConv.hasSlack ? 'Este mensaje se sincronizará con el hilo de Slack.' : 'Este mensaje se guardará solo en la bitácora local.'}
                            </span>
                        </div>
                    </div>

                </div>
            ) : (
                /* EMPTY STATE (Right Panel) */
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-zinc-950 text-zinc-500">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-zinc-800">
                        <MessageCircle className="w-10 h-10 opacity-20" />
                    </div>
                    <h2 className="text-lg font-bold text-zinc-300 mb-2">Centro de Mensajería</h2>
                    <p className="text-sm max-w-xs text-center text-zinc-600">
                        Selecciona una conversación del panel izquierdo para ver el historial completo y responder.
                    </p>
                    <div className="mt-8 flex gap-4 text-xs">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded border border-zinc-800">
                            <Slack className="w-3.5 h-3.5 text-[#E01E5A]" /> Sincronizado
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded border border-zinc-800">
                            <Mail className="w-3.5 h-3.5 text-orange-500" /> Correo
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded border border-zinc-800">
                            <MessageCircle className="w-3.5 h-3.5 text-zinc-500" /> Local
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Message;
