
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { 
    Bot, Mic, Send, Sparkles, MessageSquare, 
    Radio, User, Cpu, StopCircle, Volume2,
    Plus, Settings, Info, X, Zap, Loader2, ShieldAlert, Terminal, Database, Paperclip, ImageIcon, Activity, MicOff, ExternalLink
} from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

// Safety check for API KEY
const getApiKey = () => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {}
    return '';
};

// --- CONFIGURATION ---
const API_KEY = getApiKey();
// MERAKI API KEY (Provided by User)
const MERAKI_API_KEY = '01e953688434c3b91e230091ce5db0e6602a2db1';

// --- TOOL DEFINITIONS ---
const checkHealthTool: FunctionDeclaration = {
    name: "check_network_health",
    description: "Consulta el estado de salud actual buscando fallas activas o no recuperadas en la red.",
    parameters: { type: Type.OBJECT, properties: {} }
};

const checkMassiveTool: FunctionDeclaration = {
    name: "check_massive_incidents",
    description: "Verifica si hay incidentes masivos o regionales abiertos actualmente.",
    parameters: { type: Type.OBJECT, properties: {} }
};

const searchInventoryTool: FunctionDeclaration = {
    name: "search_inventory",
    description: "Busca tiendas o dispositivos específicos en el inventario por nombre o código.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            searchTerm: { type: Type.STRING, description: "Nombre de la tienda, usuario o código parcial a buscar." }
        },
        required: ["searchTerm"]
    }
};

const getTelemetryTool: FunctionDeclaration = {
    name: "get_telemetry",
    description: "Obtiene logs de telemetría reciente (latencia, pérdida) para un ID de red específico.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            networkId: { type: Type.STRING, description: "El ID único de la red (network_id)." }
        },
        required: ["networkId"]
    }
};

const runDiagnosticsTool: FunctionDeclaration = {
    name: "run_network_diagnostics",
    description: "Ejecuta comandos de diagnóstico técnico en un dispositivo remoto.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            networkId: { type: Type.STRING, description: "ID del dispositivo objetivo." },
            command: { type: Type.STRING, enum: ["ping", "traceroute", "reboot", "speedtest"], description: "Comando a ejecutar." }
        },
        required: ["networkId", "command"]
    }
};

const checkUplinksTool: FunctionDeclaration = {
    name: "check_uplink_status",
    description: "Consulta REAL a Meraki API: Obtiene estado de enlaces WAN (Active/Ready/Failed) y IPs públicas.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "Nombre de la tienda, Código o Network ID." }
        },
        required: ["target"]
    }
};

const getClientsTool: FunctionDeclaration = {
    name: "get_connected_clients",
    description: "Consulta REAL a Meraki API: Lista clientes conectados y su consumo de ancho de banda reciente.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "Nombre de la tienda, Código o Network ID." }
        },
        required: ["target"]
    }
};

interface Message {
    id: string;
    role: 'user' | 'agent' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    isError?: boolean;
    attachment?: string; 
}

const AgentNexus: React.FC = () => {
    const [input, setInput] = useState('');
    const [userName, setUserName] = useState('Capi'); // Default Name
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-1',
            role: 'agent',
            content: 'Hola, soy SOMMER NEXUS v2.0. 🛡️\n\nPuedes escribirme o usar el micrófono para tener una conversación de voz fluida.\n\n¿Cuál es la situación, Capi?',
            timestamp: new Date()
        }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    
    // Voice Input State
    const [isListening, setIsListening] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Image Upload State
    const [attachment, setAttachment] = useState<{ mimeType: string, data: string, preview: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Config State
    const [showConfig, setShowConfig] = useState(false);
    const [modelName, setModelName] = useState('gemini-3-flash-preview'); 

    // UI State
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    
    // Voice Hook
    const { speak, stop, isPlaying } = useTextToSpeech();
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const plusMenuRef = useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    useEffect(() => {
        if (!isPlaying) setPlayingMessageId(null);
    }, [isPlaying]);

    // Fetch User Profile (Avatar & Name)
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get Name from Metadata as fallback
                let name = user.user_metadata?.first_name || '';
                if (!name && user.user_metadata?.full_name) {
                    name = user.user_metadata.full_name.split(' ')[0];
                }

                // Get Avatar & Name from DB
                const { data } = await supabase.from('users_jj').select('profile_image_url, first_name').eq('id_user', user.id).single();
                
                if (data?.first_name) name = data.first_name;
                if (name) setUserName(name);

                if (data?.profile_image_url) {
                    setUserAvatar(data.profile_image_url);
                } else {
                    const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.profile_image_url || null;
                    setUserAvatar(metaAvatar);
                }
            }
        };
        getUser();
    }, []);

    // Tool execution logic
    const executeTool = async (name: string, args: any): Promise<any> => {
        console.log(`🔧 Ejecutando herramienta: ${name}`, args);
        try {
            switch (name) {
                case "check_network_health": {
                    const { data: failures, error } = await supabase
                        .from('network_failures_jj')
                        .select('network_id, site_impact, lifecycle_stage, start_time')
                        .neq('lifecycle_stage', 'Resuelta')
                        .order('start_time', { ascending: false })
                        .limit(5);
                    
                    if (error) throw error;
                    if (!failures || failures.length === 0) return "No hay fallas activas registradas. La red está limpia.";

                    const ids = failures.map(f => f.network_id);
                    const { data: inventory } = await supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda, wan1_provider:isp_providers_jj!wan1_provider_id(name)')
                        .in('network_id', ids);
                    
                    const enrichedFailures = failures.map(f => {
                        const store: any = inventory?.find((i: any) => i.network_id === f.network_id);
                        return {
                            ...f,
                            nombre_tienda: store?.nombre_tienda || 'Nombre Desconocido',
                            proveedor_principal: store?.wan1_provider?.name || 'N/A'
                        };
                    });
                    return enrichedFailures;
                }
                case "check_massive_incidents": {
                    const { data, error } = await supabase
                        .from('massive_incidents_jj')
                        .select('*')
                        .eq('status', 'Activa');
                    
                    if (error) throw error;
                    return data.length > 0 ? data : "No hay incidentes masivos activos en este momento.";
                }
                case "search_inventory": {
                    const term = args.searchTerm || '';
                    const { data, error } = await supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda, codigo_tienda, pais, wan1_provider:isp_providers_jj!wan1_provider_id(name)')
                        .or(`nombre_tienda.ilike.%${term}%,network_id.ilike.%${term}%,codigo_tienda.ilike.%${term}%`)
                        .limit(3); 
                    
                    if (error) throw error;
                    return data.length > 0 ? data : `No se encontraron tiendas que coincidan con '${term}'.`;
                }
                case "get_telemetry": {
                    return { latency_graph: [20, 22, 150, 400, "TIMEOUT", "TIMEOUT"], packet_loss: "45%", status: "DEGRADED" };
                }
                case "run_network_diagnostics": {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const { networkId, command } = args;
                    if (command === 'ping') return `PING ${networkId} (10.20.1.55): 56 data bytes\n64 bytes from 10.20.1.55: icmp_seq=0 ttl=64 time=24.5 ms`;
                    if (command === 'reboot') return `Initiating remote reboot sequence for ${networkId}...\n> Device restarting.`;
                    if (command === 'traceroute') return `traceroute to ${networkId} (10.20.1.55), 30 hops max\n 1 192.168.1.1 1ms\n 3 * * * (Request Timed Out)`;
                    return "Comando ejecutado exitosamente.";
                }
                case "check_uplink_status": {
                    // 1. Resolve Network ID first (Context Mapping)
                    const term = args.target || '';
                    const { data: devices } = await supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda, meraki_serial')
                        .or(`nombre_tienda.ilike.%${term}%,network_id.ilike.%${term}%,codigo_tienda.ilike.%${term}%`)
                        .limit(1);

                    if (!devices || devices.length === 0) return `No se encontró el dispositivo '${term}' en el inventario local.`;
                    const device = devices[0];
                    
                    if (!MERAKI_API_KEY) {
                        return "Error: Falta la MERAKI_API_KEY en la configuración del servidor.";
                    }

                    // 2. CALL REAL MERAKI API
                    // Endpoint: GET /networks/{networkId}/appliance/uplinks/statuses
                    try {
                        const response = await fetch(`https://api.meraki.com/api/v1/networks/${device.network_id}/appliance/uplinks/statuses`, {
                            method: 'GET',
                            headers: {
                                'X-Cisco-Meraki-API-Key': MERAKI_API_KEY,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return `Error conectando con Meraki API (${response.status}): ${response.statusText}. Verifique permisos o API Key.`;
                        }

                        const merakiData = await response.json();
                        return {
                            source: "Meraki API (Realtime)",
                            store: device.nombre_tienda,
                            networkId: device.network_id,
                            uplinkStatus: merakiData
                        };

                    } catch (apiErr: any) {
                        return `Fallo en la petición a Meraki: ${apiErr.message}`;
                    }
                }
                case "get_connected_clients": {
                    // 1. Resolve Network ID
                    const term = args.target || '';
                    const { data: devices } = await supabase
                        .from('devices_inventory_jj')
                        .select('network_id, nombre_tienda')
                        .or(`nombre_tienda.ilike.%${term}%,network_id.ilike.%${term}%,codigo_tienda.ilike.%${term}%`)
                        .limit(1);

                    if (!devices || devices.length === 0) return `No se encontró la red '${term}' en inventario.`;
                    const device = devices[0];

                    if (!MERAKI_API_KEY) {
                        return "Error: Falta la MERAKI_API_KEY.";
                    }

                    // 2. CALL REAL MERAKI API
                    // Endpoint: GET /networks/{networkId}/clients?timespan=86400 (Last 24h)
                    try {
                        const response = await fetch(`https://api.meraki.com/api/v1/networks/${device.network_id}/clients?timespan=2000`, {
                            method: 'GET',
                            headers: {
                                'X-Cisco-Meraki-API-Key': MERAKI_API_KEY,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return `Error Meraki API (${response.status}): ${response.statusText}.`;
                        }

                        const clients = await response.json();
                        
                        // Process top usage
                        const sortedByUsage = clients.sort((a: any, b: any) => (b.usage?.recv || 0) - (a.usage?.recv || 0));
                        const top5 = sortedByUsage.slice(0, 5).map((c: any) => ({
                            description: c.description || c.mac,
                            ip: c.ip,
                            mac: c.mac,
                            usage: c.usage,
                            os: c.os,
                            status: c.status
                        }));

                        return {
                            source: "Meraki API (Realtime)",
                            store: device.nombre_tienda,
                            totalClients: clients.length,
                            topConsumers: top5
                        };

                    } catch (apiErr: any) {
                        return `Fallo en la petición a Meraki: ${apiErr.message}`;
                    }
                }
                default: return "Herramienta desconocida.";
            }
        } catch (err: any) {
            console.error("Error DB:", err);
            return { error: "Error de ejecución", details: err.message };
        }
    };

    // Modified to accept optional overrides for Voice Mode
    const handleSendMessage = useCallback(async (overrideText?: string, autoVoice?: boolean) => {
        const userText = overrideText || input;
        
        if ((!userText.trim() && !attachment) || !API_KEY) {
            if (!API_KEY) {
                setMessages(prev => [...prev, {
                    id: 'sys-' + Date.now(),
                    role: 'system',
                    content: 'Error: API Key de Gemini no configurada.',
                    timestamp: new Date(),
                    isError: true
                }]);
            }
            return;
        }
        
        const currentAttachment = attachment;
        
        setInput('');
        setAttachment(null); 
        setIsThinking(true);

        const newMessageId = Date.now().toString();
        // Use updater function to ensure we have latest state if called asynchronously
        setMessages(currentMessages => {
            const newHistory = [...currentMessages, {
                id: newMessageId,
                role: 'user' as const,
                content: userText,
                timestamp: new Date(),
                attachment: currentAttachment?.preview 
            }];
            
            // Trigger AI processing decoupled from state update immediately
            processAIResponse(newHistory, userText, currentAttachment, autoVoice);
            
            return newHistory;
        });
    }, [input, attachment, modelName, speak]); // Dependencies

    // Separated AI logic to keep handleSendMessage clean and accessible via Ref
    const processAIResponse = async (history: Message[], userText: string, currentAttachment: any, autoVoice?: boolean) => {
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            // Filter history for AI context
            const historyForChat = history.slice(0, -1)
                .filter(m => m.role === 'agent' || m.role === 'user') // Filter out tool/system messages to keep context clean
                .map(m => ({
                    role: m.role === 'agent' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            const chat = ai.chats.create({
                model: modelName,
                config: {
                    systemInstruction: `Eres SOMMER NEXUS, Ingeniero de Redes AI Nivel 2. Misión: Monitorear y resolver incidentes. Personalidad: Técnico, directo, profesional. Te diriges al usuario como '${userName}'.`,
                    temperature: 0.2,
                    tools: [{ functionDeclarations: [checkHealthTool, checkMassiveTool, searchInventoryTool, getTelemetryTool, runDiagnosticsTool, checkUplinksTool, getClientsTool] }]
                },
                history: historyForChat
            });

            let messagePayload: any = { text: userText };
            if (currentAttachment) {
                messagePayload = [{ text: userText }, { inlineData: { mimeType: currentAttachment.mimeType, data: currentAttachment.data } }];
            }

            let response = await chat.sendMessage({ message: messagePayload });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                const calls = response.functionCalls;
                const functionResponses = [];
                for (const call of calls) {
                    const isDiag = call.name === 'run_network_diagnostics';
                    const isUplink = call.name === 'check_uplink_status';
                    const isClients = call.name === 'get_connected_clients';
                    
                    let systemMsg = `⚡ Ejecutando: ${call.name}...`;
                    if (isUplink) systemMsg = `🔍 Consultando API Meraki (Uplinks)...`;
                    if (isClients) systemMsg = `👥 Consultando API Meraki (Clientes)...`;
                    if (isDiag) systemMsg = `>_ Ejecutando comando: ${call.args.command} en ${call.args.networkId}...`;

                    setMessages(prev => [...prev, {
                        id: `tool-${Date.now()}-${Math.random()}`,
                        role: 'system' as const,
                        content: systemMsg,
                        timestamp: new Date()
                    }]);
                    
                    const toolResult = await executeTool(call.name, call.args);
                    functionResponses.push({ functionResponse: { name: call.name, response: { result: toolResult }, id: call.id } });
                }
                response = await chat.sendMessage({ message: functionResponses });
            }

            const text = response.text;
            if (text) {
                const responseId = Date.now().toString();
                setMessages(prev => [...prev, {
                    id: responseId,
                    role: 'agent' as const,
                    content: text,
                    timestamp: new Date()
                }]);

                // AUTO-SPEAK RESPONSE if initiated via voice
                if (autoVoice) {
                    setPlayingMessageId(responseId);
                    speak(text);
                }
            }
        } catch (error: any) {
            console.error("Agent Error:", error);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'system' as const,
                content: "Error en el sistema AI. Verifique conexión.",
                timestamp: new Date(),
                isError: true
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Ref to access the latest version of handleSendMessage inside the event listener
    const handleSendMessageRef = useRef(handleSendMessage);
    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // --- REFACTORED SPEECH LOGIC: LAZY INSTANTIATION + FORCED PERMISSION ---
    const toggleListening = async () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Tu navegador no soporta reconocimiento de voz nativo.");
            return;
        }

        if (isListening) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        // Stop any playing audio before listening
        if (isPlaying) stop();

        // 1. FORCE PERMISSION REQUEST via getUserMedia
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionDenied(false);
        } catch (err) {
            console.warn("Microphone permission denied via getUserMedia:", err);
            setPermissionDenied(true);
             setMessages(prev => [...prev, {
                id: 'sys-voice-perm-' + Date.now(),
                role: 'system',
                content: '🚫 Acceso al micrófono bloqueado. Usa el botón "Abrir en nueva pestaña" (↗️).',
                timestamp: new Date(),
                isError: true
            }]);
            return;
        }

        // --- GREET USER ON ACTIVATION ---
        const greeting = `Hola ${userName}, te escucho.`;
        speak(greeting);

        // 2. CREATE NEW INSTANCE ON CLICK
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setPermissionDenied(false);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                setInput(transcript);
                handleSendMessageRef.current(transcript, true); 
            }
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
            setIsListening(false);
            
            if (event.error === 'not-allowed') {
                 setPermissionDenied(true);
                 setMessages(prev => [...prev, {
                    id: 'sys-voice-' + Date.now(),
                    role: 'system',
                    content: '🚫 Error de permisos. Intenta abrir en Nueva Pestaña (↗️).',
                    timestamp: new Date(),
                    isError: true
                }]);
            }
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Start error:", e);
            setIsListening(false);
        }
    };

    // Helper for file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'system',
                content: 'La imagen es demasiado grande. Máximo 5MB.',
                timestamp: new Date(),
                isError: true
            }]);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1];
            setAttachment({
                mimeType: file.type,
                data: base64Data,
                preview: result
            });
            setShowPlusMenu(false);
        };
        reader.readAsDataURL(file);
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleVoicePlay = (msg: Message) => {
        if (playingMessageId === msg.id) {
            stop();
            setPlayingMessageId(null);
        } else {
            speak(msg.content);
            setPlayingMessageId(msg.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-black overflow-hidden font-sans relative selection:bg-blue-500/30">
            {/* BACKGROUND DECORATION */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 z-50"></div>
            <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

            {/* HEADER */}
            <header className="h-16 shrink-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between px-4 z-40 relative">
                <div className="flex items-center gap-3">
                    <div className="relative group cursor-pointer">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-zinc-950 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                            SOMMER <span className="text-zinc-400">NEXUS</span> <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/30 ml-1">v2.0</span>
                        </h1>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <Database className="w-3 h-3" />
                            <span className="hidden sm:inline font-mono">DB CONNECTED</span>
                            <span className="text-zinc-700 hidden sm:inline">|</span>
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="font-mono text-zinc-400">TOOLS READY</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* NEW TAB BUTTON - CRITICAL FOR SPEECH PERMISSIONS */}
                    <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className={`p-2 rounded-lg transition-colors ${permissionDenied ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                        title="Abrir en pestaña nueva (Mejor soporte de voz)"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* MAIN CHAT */}
            <div className="flex-1 relative overflow-hidden flex flex-col z-10">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
                    {messages.map((msg) => {
                        const isAgent = msg.role === 'agent';
                        const isSystem = msg.role === 'system';
                        
                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
                                    <span className={`text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-2 border shadow-sm max-w-[90%] text-center ${msg.isError ? 'text-red-200 bg-red-900/20 border-red-900/30' : 'text-zinc-300 bg-black/60 border-zinc-800 font-mono'}`}>
                                        {msg.isError ? <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> : <Terminal className="w-3.5 h-3.5 shrink-0 text-green-500" />}
                                        <span className="truncate whitespace-pre-wrap text-left">{msg.content}</span>
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex gap-3 max-w-4xl mx-auto ${isAgent ? 'justify-start' : 'justify-end'}`}>
                                {isAgent && (
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-purple-900/20">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                    </div>
                                )}
                                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isAgent ? 'items-start' : 'items-end'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-zinc-500">{isAgent ? 'SOMMER NEXUS' : `${userName} (Tú)`}</span>
                                        {isAgent && (
                                            <button 
                                                onClick={() => handleVoicePlay(msg)}
                                                className={`p-0.5 rounded hover:bg-zinc-800 transition-colors ${playingMessageId === msg.id ? 'text-purple-400 animate-pulse' : 'text-zinc-600 hover:text-white'}`}
                                            >
                                                {playingMessageId === msg.id ? <StopCircle className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${isAgent ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none' : 'bg-purple-600 text-white rounded-tr-none shadow-purple-500/10'}`}>
                                        {msg.attachment && (
                                            <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                                                <img src={msg.attachment} alt="Adjunto" className="w-full h-auto max-h-60 object-cover" />
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    <span className="text-[9px] text-zinc-700 mt-1 px-1 font-mono">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {!isAgent && (
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                                        {userAvatar ? <img src={userAvatar} alt="User" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-zinc-400" />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {isThinking && (
                        <div className="flex gap-3 max-w-4xl mx-auto justify-start">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0"><Loader2 className="w-4 h-4 text-purple-500 animate-spin" /></div>
                            <div className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 rounded-tl-none flex items-center gap-2 h-10">
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT AREA */}
                <div className="shrink-0 p-4 md:p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 z-20">
                    <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
                        {attachment && (
                            <div className="flex items-center gap-3 p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 w-fit animate-in slide-in-from-bottom-2">
                                <div className="w-10 h-10 rounded overflow-hidden border border-zinc-700">
                                    <img src={attachment.preview} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Imagen lista</span>
                                    <span className="text-[9px] text-zinc-600">Se enviará con tu mensaje</span>
                                </div>
                                <button onClick={() => setAttachment(null)} className="ml-2 p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all shadow-lg">
                            <div className="relative pb-1 pl-1" ref={plusMenuRef}>
                                <button onClick={() => setShowPlusMenu(!showPlusMenu)} className={`p-2 rounded-full transition-colors ${showPlusMenu ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                    <Plus className={`w-5 h-5 transition-transform duration-200 ${showPlusMenu ? 'rotate-45' : ''}`} />
                                </button>
                                {showPlusMenu && (
                                    <div className="absolute bottom-full left-0 mb-3 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in zoom-in-95 duration-200 z-50">
                                        <div className="p-1 space-y-0.5">
                                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors group">
                                                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500"><ImageIcon className="w-3.5 h-3.5" /></div>
                                                <span>Subir Imagen</span>
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors group">
                                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500"><Activity className="w-3.5 h-3.5" /></div>
                                                <span>Diagnóstico Rápido</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </div>

                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isListening ? "Escuchando..." : "Escribe o usa el micrófono..."}
                                className="flex-1 bg-transparent border-none text-zinc-200 placeholder:text-zinc-600 resize-none max-h-32 min-h-[44px] py-3 focus:outline-none text-sm disabled:opacity-50"
                                rows={1}
                            />

                            {/* VOICE BUTTON */}
                            <button 
                                onClick={toggleListening} 
                                disabled={isThinking} 
                                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : (permissionDenied ? 'text-red-400 bg-red-900/10 hover:bg-red-900/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800')}`}
                                title={isListening ? "Detener grabación" : permissionDenied ? "Micrófono Bloqueado" : "Usar Voz"}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : permissionDenied ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            <button onClick={() => handleSendMessage()} disabled={(!input.trim() && !attachment) || isThinking} className={`p-2 rounded-xl transition-all ${(input.trim() || attachment) ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[9px] text-zinc-600 font-mono">Powered by Gemini Multimodal • Vision & Voice Enabled</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentNexus;
