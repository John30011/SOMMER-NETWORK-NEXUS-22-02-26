
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { X, MessageSquare, Loader2, Send, Clock, AlertCircle, Lock, CheckCircle2, Volume2, StopCircle, Terminal, FileText, ShieldAlert, ChevronDown, Check } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface BitacoraModalProps {
    failureId: string | number;
    networkId: string;
    storeName: string;
    onClose: () => void;
    onNavigateToLogin?: () => void;
    readOnly?: boolean;
    tableName?: string; // To support 'massive_incidents_jj' or 'network_failures_jj'
    onStatusChange?: (newStatus: string) => void;
}

interface LogEntry {
    log: string;
}

const CAUSE_OPTIONS = [
    "Caída del proveedor",
    "Degradación del proveedor",
    "Falla del equipo del proveedor",
    "Mantenimiento del proveedor",
    "Falla del Router",
    "Falla eléctrica en tienda",
    "Corte administrativo",
    "Mantenimiento FTD"
];

const BitacoraModal: React.FC<BitacoraModalProps> = ({
    failureId,
    networkId,
    storeName,
    onClose,
    onNavigateToLogin,
    readOnly = false,
    tableName = 'network_failures_jj',
    onStatusChange
}) => {
    const [notes, setNotes] = useState<LogEntry[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Close Case State
    const [closeCase, setCloseCase] = useState(false);
    const [rootCause, setRootCause] = useState<string>('');

    // Custom Dropdown State
    const [isRootCauseOpen, setIsRootCauseOpen] = useState(false);
    const rootCauseRef = useRef<HTMLDivElement>(null);

    // User State
    const [currentUser, setCurrentUser] = useState<string>('Analista');
    const [isGuest, setIsGuest] = useState(true);

    // Audio State
    const { speak, stop, isPlaying } = useTextToSpeech();
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Determine which column to use based on table
    const textColumn = tableName === 'massive_incidents_jj' ? 'logs' : 'analyst_notes';

    // 1. Fetch User & Notes on Mount
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Check Session
                const { data: { session } } = await supabase.auth.getSession();

                if (session && session.user) {
                    setIsGuest(false);
                    const user = session.user;

                    // Try to get name from metadata or users_jj table
                    let metaName = user.user_metadata?.first_name || '';
                    const lastName = user.user_metadata?.last_name || '';
                    if (lastName) metaName += ` ${lastName}`;

                    if (!metaName) metaName = user.email?.split('@')[0] || 'Analista';

                    setCurrentUser(metaName.trim());
                } else {
                    setIsGuest(true);
                    setCurrentUser('Invitado');
                }

                // Fetch Data
                await fetchNotes();

            } catch (e) {
                console.error("Error initializing modal:", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [failureId]);

    // Stop audio on close
    useEffect(() => {
        return () => stop();
    }, []);

    useEffect(() => {
        if (!isPlaying) setPlayingIndex(null);
    }, [isPlaying]);

    // Click outside handler for custom dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (rootCauseRef.current && !rootCauseRef.current.contains(event.target as Node)) {
                setIsRootCauseOpen(false);
            }
        };
        if (isRootCauseOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isRootCauseOpen]);

    const fetchNotes = async () => {
        try {
            // UPDATED QUERY: Only fetch the text column
            const { data, error } = await supabase
                .from(tableName)
                .select(textColumn)
                .eq('id', failureId)
                .single();

            if (error) throw error;

            if (data && data[textColumn]) {
                let parsedNotes: any[] = [];
                const rawContent = data[textColumn];

                if (typeof rawContent === 'string') {
                    try {
                        const cleaned = rawContent.startsWith('"') && rawContent.endsWith('"')
                            ? JSON.parse(rawContent)
                            : rawContent;

                        parsedNotes = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
                    } catch (e) {
                        parsedNotes = [{ log: String(rawContent) }];
                    }
                } else if (Array.isArray(rawContent)) {
                    parsedNotes = rawContent;
                }

                const validNotes: LogEntry[] = Array.isArray(parsedNotes)
                    ? parsedNotes
                        .filter(item => item && typeof item === 'object' && typeof item.log === 'string')
                        .map(item => ({ log: item.log }))
                    : [];

                setNotes(sortNotesDescending(validNotes));
            } else {
                setNotes([]);
            }
        } catch (err) {
            console.error("Error fetching bitacora:", err);
            setNotes([]);
        }
    };

    const parseLogDate = (logString: string): number => {
        if (!logString || typeof logString !== 'string') return 0;
        try {
            const parts = logString.split(' : ');
            const datePart = parts[0];
            if (!datePart || datePart.length < 18) return 0;

            const [dateStr, timeStr] = datePart.split(' ');
            if (!dateStr || !timeStr) return 0;

            const [day, month, year] = dateStr.split('/');
            const [hour, minute, second] = timeStr.split(':');

            return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            ).getTime();
        } catch (e) {
            return 0;
        }
    };

    const sortNotesDescending = (list: LogEntry[]) => {
        return [...list].sort((a, b) => {
            const dateA = parseLogDate(a.log);
            const dateB = parseLogDate(b.log);
            return dateB - dateA;
        });
    };

    const getLiability = (cause: string): string => {
        const notImputable = [
            'Falla del Router',
            'Falla eléctrica en tienda',
            'Corte administrativo',
            'Mantenimiento FTD'
        ];
        return notImputable.includes(cause) ? 'No Imputable' : 'Imputable';
    };

    const handleSave = async () => {
        if (!newNote.trim() || isGuest || readOnly) return;

        // Validation for closing case
        if (closeCase && !rootCause) {
            alert("Debe seleccionar una Causa Raíz para cerrar el caso.");
            return;
        }

        setSaving(true);

        try {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

            const safeNote = newNote.replace(/\n/g, ' ').trim();

            // Determine Log Message Format
            let formattedLog = '';

            if (closeCase) {
                // Special format for closure
                formattedLog = `${timestamp} : Nota de cierre: ${safeNote}. El caso pasa de "Pendiente por cierre" a "Resuelta". - ${currentUser}`;
            } else {
                // Standard format
                formattedLog = `${timestamp} : ${safeNote} - ${currentUser}`;
            }

            const newEntry: LogEntry = { log: formattedLog };

            // Fetch current notes to append
            const { data: currentData } = await supabase
                .from(tableName)
                .select(textColumn)
                .eq('id', failureId)
                .single();

            let currentNotes: any[] = [];
            const rawContent = currentData?.[textColumn];

            if (rawContent) {
                if (typeof rawContent === 'string') {
                    try {
                        // Robust parsing for potentially double-stringified JSON
                        const cleaned = rawContent.startsWith('"') && rawContent.endsWith('"')
                            ? JSON.parse(rawContent)
                            : rawContent;
                        const parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
                        currentNotes = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        currentNotes = [];
                    }
                } else if (Array.isArray(rawContent)) {
                    currentNotes = rawContent;
                }
            }

            // Si es un Cierre de Caso Masivo (Lógica explícita del usuario)
            if (closeCase && tableName === 'massive_incidents_jj') {
                const liability = getLiability(rootCause);
                const massiveIdNum = typeof failureId === 'string' ? parseInt(failureId, 10) : failureId;

                const { data, error } = await supabase.rpc('close_massive_incident_jj', {
                    p_massive_id: massiveIdNum,
                    p_root_cause: rootCause,
                    p_liability: liability,
                    p_closure_note: safeNote,
                    p_closed_by_user: currentUser
                });

                if (error) {
                    console.error("Error al ejecutar el cierre en cascada:", error);
                    alert("Error en la BD al cerrar: " + error.message);
                    setSaving(false);
                    return;
                } else {
                    console.log("Cierre exitoso:", data);
                    // Actualizar UI local para reflejar el cierre
                    setNewNote('');

                    // Si tenemos onStatusChange, forzará al padre a llamar fetchData y auto-limpiarse visualmente
                    if (onStatusChange) {
                        onStatusChange('Resuelta');
                    }
                    setTimeout(() => onClose(), 800);
                    setSaving(false);
                    return; // IMPORTANTE: Cortamos la ejecución aquí, porque el RPC ya hizo todos los Updates (Padre + Hijos + Logs)
                }
            }

            // Para Agregar Nota Simple a Masivas o Cerrar/Nota Individual
            const validExistingNotes = currentNotes.filter(item =>
                item && typeof item === 'object' && typeof item.log === 'string'
            );

            const updatedNotes = [newEntry, ...validExistingNotes];
            let updatePayload: any = { [textColumn]: updatedNotes };

            if (closeCase && tableName === 'network_failures_jj') {
                const liability = getLiability(rootCause);
                updatePayload = {
                    ...updatePayload,
                    lifecycle_stage: 'Resuelta',
                    status: 'Resuelta',
                    closed_at: now.toISOString(),
                    closure_note: safeNote,
                    root_cause: rootCause,
                    liability: liability
                };
            }

            const { error: normalUpdateError } = await supabase
                .from(tableName!)
                .update(updatePayload)
                .eq('id', failureId);

            if (normalUpdateError) throw normalUpdateError;

            setNewNote('');
            setNotes(sortNotesDescending(updatedNotes));

            if (onStatusChange && updatePayload.status) {
                onStatusChange(updatePayload.status);
            }

            if (closeCase) {
                setTimeout(() => onClose(), 1000);
            }

        } catch (err) {
            console.error("Error saving note:", err);
            alert("Error al guardar. Intente nuevamente.");
        } finally {
            setSaving(false);
        }
    };

    const playNote = (message: string, index: number) => {
        if (playingIndex === index) {
            stop();
            setPlayingIndex(null);
        } else {
            speak(message);
            setPlayingIndex(index);
        }
    };

    const renderLogContent = (logString: string, index: number) => {
        if (!logString || typeof logString !== 'string') {
            return (
                <div className="flex items-center gap-2 text-red-500 bg-red-900/10 p-2 rounded">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs italic">Formato de registro corrupto (Auto-reparado en siguiente guardado)</span>
                </div>
            );
        }

        // Try parsing standard format
        const parts = logString.split(' : ');
        const datePart = parts[0];

        // Check if it matches our standard date format somewhat (length check)
        const isStandardFormat = parts.length >= 2 && datePart.length >= 18;

        let message = "";
        let user = "";
        let timestampDisplay = "";
        let isSystem = false;

        if (isStandardFormat) {
            const rest = parts.slice(1).join(' : ');
            const lastDashIndex = rest.lastIndexOf(' - ');

            if (lastDashIndex !== -1) {
                message = rest.substring(0, lastDashIndex);
                user = rest.substring(lastDashIndex + 3);
            } else {
                message = rest;
                user = "Sistema";
            }

            // Clean up timestamp
            const [d, t] = datePart.split(' ');
            timestampDisplay = `${d} ${t}`;
        } else {
            // Fallback or "Checklist" format
            message = logString;
            user = "Evento";
            timestampDisplay = "---";
        }

        // Detect "System" or "Checklist"
        isSystem = user.toLowerCase().includes('sistema') || message.includes('CHECKLIST') || user === 'Evento';
        const isChecklist = message.includes('CHECKLIST');

        return (
            <div className="flex gap-4 relative group w-full">
                {/* Timeline Connector */}
                <div className="flex flex-col items-center mr-2">
                    <div className={`w-3 h-3 rounded-full border-2 z-10 shrink-0 ${isSystem ? 'bg-zinc-900 border-zinc-600' : 'bg-blue-600 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`}></div>
                    {index !== notes.length - 1 && <div className="w-px h-full bg-zinc-800 my-1 group-hover:bg-zinc-700"></div>}
                </div>

                {/* Card Content */}
                <div className="flex-1 pb-6 min-w-0">
                    <div className={`rounded-xl border p-3.5 transition-all relative overflow-hidden ${isChecklist
                        ? 'bg-zinc-900/80 border-purple-500/30 shadow-sm'
                        : isSystem
                            ? 'bg-zinc-900/30 border-zinc-800 text-zinc-400'
                            : 'bg-zinc-900/60 border-zinc-700/50 hover:border-zinc-600 shadow-sm'
                        }`}>
                        {/* Decorative gradient for checklist */}
                        {isChecklist && <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>}

                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isSystem ? 'text-zinc-400' : 'text-blue-400'}`}>
                                    {user}
                                </span>
                                {isStandardFormat && (
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono bg-black/20 px-1.5 py-0.5 rounded">
                                        <Clock className="w-3 h-3" /> {timestampDisplay}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => playNote(message, index)}
                                className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${playingIndex === index ? 'text-red-400 animate-pulse' : 'text-zinc-600 hover:text-white'}`}
                                title="Leer en voz alta"
                            >
                                {playingIndex === index ? <StopCircle className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Body */}
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isChecklist ? 'font-mono text-zinc-200 text-xs' : 'text-zinc-200'
                            }`}>
                            {isChecklist && <Terminal className="w-3 h-3 inline mr-2 text-purple-400" />}
                            {message}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 animate-in fade-in duration-200">

            {/* Modal Container */}
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300">

                {/* Header - Professional Look */}
                <div className="h-16 px-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white leading-tight truncate">Bitácora de Seguimiento</h2>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 font-mono">
                                <span className="truncate max-w-[200px]" title={storeName}>{storeName}</span>
                                <span className="text-zinc-700">|</span>
                                <span>ID: {networkId}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 relative scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent" ref={scrollRef}>
                    {/* Background Line Decoration */}
                    <div className="absolute left-[39px] top-0 bottom-0 w-px bg-zinc-800/50 z-0"></div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="text-xs font-mono animate-pulse">Sincronizando registros...</span>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">Bitácora vacía</p>
                            <p className="text-xs mt-1 text-zinc-500">No hay eventos registrados para este incidente.</p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            {notes.map((entry, idx) => (
                                <div key={idx} className="animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                    {renderLogContent(entry.log, idx)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Input - Modern - ELEVATED Z-INDEX */}
                {readOnly ? (
                    <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 shrink-0 flex items-center justify-center gap-3 text-zinc-500 backdrop-blur-sm relative z-50">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            Registro Histórico - Solo Lectura
                        </span>
                    </div>
                ) : isGuest ? (
                    <div className="p-6 bg-zinc-900/80 border-t border-zinc-800 shrink-0 flex items-center justify-center gap-2 text-zinc-500 backdrop-blur-sm relative z-50">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-xs">
                            {onNavigateToLogin ? (
                                <>
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onNavigateToLogin();
                                        }}
                                        className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors"
                                    >
                                        Inicia sesión
                                    </button>
                                    {" "}para agregar notas.
                                </>
                            ) : (
                                "Inicia sesión para agregar notas."
                            )}
                        </span>
                    </div>
                ) : (
                    <div className="p-5 bg-zinc-900/90 border-t border-zinc-800 shrink-0 backdrop-blur-md relative z-50">

                        {/* Tools Row */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                {/* Close Case Toggle */}
                                <button
                                    onClick={() => {
                                        const newVal = !closeCase;
                                        setCloseCase(newVal);
                                        if (!newVal) setRootCause(''); // Reset if toggled off
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${closeCase
                                        ? 'bg-green-900/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {closeCase ? 'Cerrando Caso' : 'Cerrar Caso'}
                                </button>

                                {/* ROOT CAUSE SELECTOR - CUSTOM DROPDOWN */}
                                {closeCase && (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300 relative" ref={rootCauseRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsRootCauseOpen(!isRootCauseOpen)}
                                            className={`flex items-center gap-2 bg-zinc-950 border rounded-md px-3 py-1.5 text-[10px] text-zinc-200 outline-none transition-all w-48 justify-between ${isRootCauseOpen ? 'border-green-500 ring-1 ring-green-500/20' : 'border-zinc-700 hover:border-zinc-600'
                                                }`}
                                        >
                                            <span className="truncate">{rootCause || "Seleccione Causa Raíz..."}</span>
                                            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isRootCauseOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRootCauseOpen && (
                                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 fade-in duration-200">
                                                <div className="p-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                                                    {CAUSE_OPTIONS.map((opt) => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => {
                                                                setRootCause(opt);
                                                                setIsRootCauseOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-[10px] rounded-lg transition-colors flex items-center justify-between group ${rootCause === opt
                                                                ? 'bg-green-500/10 text-green-400 font-medium border border-green-500/20'
                                                                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                                                                }`}
                                                        >
                                                            <span>{opt}</span>
                                                            {rootCause === opt && <Check className="w-3 h-3 animate-in zoom-in" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <span className="text-[10px] text-zinc-600 font-mono">
                                Sesión: <span className="text-zinc-400 font-bold">{currentUser}</span>
                            </span>
                        </div>

                        {/* Input Area */}
                        <div className="relative group">
                            <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-0 transition duration-500 group-focus-within:opacity-30 blur`}></div>
                            <div className="relative flex bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner overflow-hidden transition-colors group-focus-within:border-zinc-700">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder={closeCase ? "Nota de cierre obligatoria..." : "Escribir actualización..."}
                                    className="flex-1 bg-transparent p-4 text-sm text-white placeholder:text-zinc-600 resize-none outline-none min-h-[50px] max-h-[120px] scrollbar-hide"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSave();
                                        }
                                    }}
                                />
                                <div className="pr-3 pb-3 flex items-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || (!newNote.trim())}
                                        className={`p-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center ${(newNote.trim())
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
                                            : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'
                                            }`}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>,
        document.body
    );
};

export default BitacoraModal;
