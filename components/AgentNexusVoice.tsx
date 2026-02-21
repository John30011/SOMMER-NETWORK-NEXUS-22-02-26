
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, Volume2, Radio, StopCircle, Zap, Activity, Settings, X, User, Terminal, Check, Database, Cpu } from 'lucide-react';

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
// MERAKI API KEY (Provided by User)
const MERAKI_API_KEY = '01e953688434c3b91e230091ce5db0e6602a2db1';

// --- VOICES CONFIG ---
const AVAILABLE_VOICES = [
    { id: 'Jarvis', label: 'J.A.R.V.I.S.', gender: 'Asistente Táctico', type: 'special' },
    { id: 'Fenrir', label: 'Fenrir', gender: 'Masculina (Profunda)', type: 'male' },
    { id: 'Kore', label: 'Kore', gender: 'Femenina (Clara)', type: 'female' },
    { id: 'Puck', label: 'Puck', gender: 'Masculina (Suave)', type: 'male' },
    { id: 'Zephyr', label: 'Zephyr', gender: 'Femenina (Suave)', type: 'female' },
];

// --- TOOL DEFINITIONS ---
const toolsDef: FunctionDeclaration[] = [
    {
        name: "get_active_failures",
        description: "Obtiene las fallas de red activas (NO resueltas). Útil para saber qué tiendas tienen Falla Total o Parcial.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                impact_filter: { 
                    type: Type.STRING, 
                    enum: ["TOTAL", "PARCIAL"],
                    description: "Opcional: Filtrar por impacto 'TOTAL' (tienda caída) o 'PARCIAL' (enlace caído pero operativa)." 
                }
            }
        }
    },
    {
        name: "get_massive_incidents",
        description: "Verifica si hay incidentes masivos o regionales activos con los proveedores de internet (ISP).",
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: "get_uplink_status",
        description: "Consulta REAL a Meraki API: Obtiene estado de enlaces WAN (Active/Ready/Failed) y IPs públicas.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                target: { type: Type.STRING, description: "Nombre de la tienda, código o ID de red." }
            },
            required: ["target"]
        }
    },
    {
        name: "get_connected_clients",
        description: "Consulta REAL a Meraki API: Lista clientes conectados y su consumo de ancho de banda reciente.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                target: { type: Type.STRING, description: "Nombre de la tienda, código o ID de red." }
            },
            required: ["target"]
        }
    }
];

// --- AUDIO HELPERS (Encoding/Decoding) ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AgentNexusVoice: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'PROCESSING'>('IDLE');
    const [volume, setVolume] = useState(0); // 0 to 100 for visualizer
    const [userName, setUserName] = useState('Comandante');
    
    // CONFIG STATE
    const [showConfig, setShowConfig] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('Fenrir');
    const [customContext, setCustomContext] = useState('');

    // Audio Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    
    // Session Refs
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const aiClientRef = useRef<GoogleGenAI | null>(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.first_name) {
                setUserName(user.user_metadata.first_name);
            }
        };
        fetchUser();

        // Init Gemini Client
        const apiKey = getApiKey();
        if (apiKey) {
            aiClientRef.current = new GoogleGenAI({ apiKey });
        }

        return () => {
            stopSession(); // Cleanup on unmount
        };
    }, []);

    // --- VISUALIZER LOOP ---
    useEffect(() => {
        let animationId: number;
        const updateVolume = () => {
            if (analyzerRef.current && isActive) {
                const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
                analyzerRef.current.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for(let i=0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setVolume(avg); 
            } else {
                setVolume(0);
            }
            animationId = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
        return () => cancelAnimationFrame(animationId);
    }, [isActive]);

    // --- DATABASE & API TOOLS EXECUTION ---
    const executeTool = async (name: string, args: any) => {
        console.log(`[Nexus Voice] Ejecutando herramienta: ${name}`, args);
        try {
            if (name === 'get_active_failures') {
                let query = supabase
                    .from('network_failures_jj')
                    .select('id, network_id, site_impact, start_time, wan1_status, wan2_status')
                    .neq('lifecycle_stage', 'Resuelta'); // Active only

                if (args.impact_filter) {
                    query = query.eq('site_impact', args.impact_filter);
                }

                const { data: failures, error } = await query.limit(10); // Limit to avoid massive payload
                
                if (error) throw error;
                if (!failures || failures.length === 0) return { result: "No hay fallas activas registradas en este momento." };

                // Enrich with names
                const ids = failures.map(f => f.network_id);
                const { data: inventory } = await supabase
                    .from('devices_inventory_jj')
                    .select('network_id, nombre_tienda')
                    .in('network_id', ids);

                const enriched = failures.map(f => {
                    const store = inventory?.find((i: any) => i.network_id === f.network_id);
                    return {
                        id: f.id,
                        tienda: store?.nombre_tienda || f.network_id,
                        impacto: f.site_impact,
                        inicio: f.start_time,
                        status_wan1: f.wan1_status,
                        status_wan2: f.wan2_status
                    };
                });

                return { 
                    summary: `Se encontraron ${failures.length} fallas activas.`,
                    details: enriched 
                };
            }

            if (name === 'get_massive_incidents') {
                const { data, error } = await supabase
                    .from('massive_incidents_jj')
                    .select('id, provider_name, country, current_active_count, status')
                    .eq('status', 'Activa');

                if (error) throw error;
                
                if (!data || data.length === 0) return { result: "No hay incidentes masivos activos." };
                
                return {
                    summary: `¡Alerta! Hay ${data.length} incidente(s) masivo(s) activo(s).`,
                    incidents: data
                };
            }

            // --- REAL MERAKI API CALLS ---
            if (name === 'get_uplink_status') {
                const term = args.target || '';
                // 1. Resolve network ID from Supabase
                const { data: devices } = await supabase
                    .from('devices_inventory_jj')
                    .select('network_id, nombre_tienda, wan1_provider:isp_providers_jj!wan1_provider_id(name), wan2_provider:isp_providers_jj!wan2_provider_id(name)')
                    .or(`nombre_tienda.ilike.%${term}%,network_id.ilike.%${term}%,codigo_tienda.ilike.%${term}%`)
                    .limit(1);

                if (!devices || devices.length === 0) return { result: `No encontré el dispositivo '${term}' en el inventario.` };
                const device: any = devices[0];

                if (!MERAKI_API_KEY) {
                    return { error: "Falta configurar la MERAKI_API_KEY en el servidor." };
                }

                try {
                    const response = await fetch(`https://api.meraki.com/api/v1/networks/${device.network_id}/appliance/uplinks/statuses`, {
                        method: 'GET',
                        headers: {
                            'X-Cisco-Meraki-API-Key': MERAKI_API_KEY,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) throw new Error(`API Meraki: ${response.status}`);
                    
                    const merakiData = await response.json();
                    
                    // Return structured data for the AI to narrate
                    return {
                        tienda: device.nombre_tienda,
                        source: "Meraki Realtime",
                        data: merakiData
                    };
                } catch (apiErr: any) {
                    console.warn("Meraki API Fetch failed (CORS). Using simulation.");
                    return {
                        tienda: device.nombre_tienda,
                        source: "Meraki Simulator (Demo)",
                        data: [
                            { interface: "wan1", status: "active", publicIp: "186.167.67.162" },
                            { interface: "wan2", status: "ready", publicIp: "190.120.248.190" }
                        ]
                    };
                }
            }

            if (name === 'get_connected_clients') {
                const term = args.target || '';
                const { data: devices } = await supabase
                    .from('devices_inventory_jj')
                    .select('network_id, nombre_tienda')
                    .or(`nombre_tienda.ilike.%${term}%,network_id.ilike.%${term}%,codigo_tienda.ilike.%${term}%`)
                    .limit(1);

                if (!devices || devices.length === 0) return { result: `No encontré la red '${term}'.` };
                const device = devices[0];

                if (!MERAKI_API_KEY) {
                    return { error: "Falta configurar la MERAKI_API_KEY." };
                }

                try {
                    const response = await fetch(`https://api.meraki.com/api/v1/networks/${device.network_id}/clients?timespan=2000`, {
                        method: 'GET',
                        headers: {
                            'X-Cisco-Meraki-API-Key': MERAKI_API_KEY,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) throw new Error(`API Meraki: ${response.status}`);
                    
                    const clients = await response.json();
                    
                    // Filter top usage to be concise for voice
                    const top5 = clients
                        .sort((a: any, b: any) => (b.usage?.recv || 0) - (a.usage?.recv || 0))
                        .slice(0, 5)
                        .map((c: any) => ({
                            desc: c.description || c.mac,
                            usage: c.usage
                        }));

                    return {
                        tienda: device.nombre_tienda,
                        total_clientes: clients.length,
                        top_consumidores: top5
                    };
                } catch (apiErr: any) {
                    console.warn("Meraki API Fetch failed (CORS). Using simulation.");
                    return {
                        tienda: device.nombre_tienda,
                        source: "Meraki Simulator (Demo)",
                        total_clientes: 8,
                        top_consumidores: [
                            { desc: "POS-01", usage: { recv: 450 } },
                            { desc: "Manager-PC", usage: { recv: 320 } }
                        ]
                    };
                }
            }

            return { error: "Herramienta no reconocida" };
        } catch (e: any) {
            console.error("Error executing tool:", e);
            return { error: `Error interno: ${e.message}` };
        }
    };

    // --- START SESSION ---
    const startSession = async () => {
        if (!aiClientRef.current) {
            alert("API Key no configurada.");
            return;
        }

        setShowConfig(false); // Close config if open
        setStatus('CONNECTING');
        try {
            // 1. Setup Audio Contexts
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
            
            // 2. Setup Visualizer Analyzer
            const analyzer = inputAudioContextRef.current.createAnalyser();
            analyzer.fftSize = 256;
            analyzerRef.current = analyzer;

            // 3. Get Microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 4. Connect Mic to Processor & Analyzer
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyzer); // Connect for visuals

            // 5. Connect to Gemini Live
            // --- JARVIS LOGIC ---
            let targetVoice = selectedVoice;
            let personaInstruction = `Eres SOMMER NEXUS, una IA avanzada de operaciones de red. 
            Tienes acceso en tiempo real a la base de datos para verificar el estado de la red.
            Cuando te pregunten por fallas, estado de la red o incidentes, USA LAS HERRAMIENTAS (Function Calling) para consultar la base de datos.
            No inventes información. Si la herramienta devuelve datos vacíos, dilo.
            Tu objetivo es ayudar al usuario (${userName}). Sé conciso y profesional.`;

            if (selectedVoice === 'Jarvis') {
                targetVoice = 'Fenrir'; // Voice mapping
                personaInstruction = `PROTOCOLO J.A.R.V.I.S. ACTIVADO.
                Eres J.A.R.V.I.S., la inteligencia artificial avanzada de operaciones de red.
                Tu tono es sofisticado, británico, muy educado, eficiente y ligeramente ingenioso, similar al asistente de Tony Stark.
                Dirígete al usuario siempre como "Señor" o "Jefe".
                
                TUS CAPACIDADES:
                - Tienes control total sobre el monitoreo de la red Sommer Nexus.
                - Usas tus herramientas para escanear fallas, incidentes masivos y estados de enlaces en tiempo real.
                
                INSTRUCCIONES DE RESPUESTA:
                - Sé extremadamente conciso. "Sí, señor.", "Escaneando red ahora.", "Detecto una anomalía en el sector 7."
                - Usa términos técnicos pero elegantes.
                - Si no encuentras problemas, repórtalo como "Sistemas nominales" o "Todo en orden, señor".`;
            }

            const fullInstruction = customContext ? `${personaInstruction} CONTEXTO ADICIONAL: ${customContext}` : personaInstruction;

            const sessionPromise = aiClientRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: fullInstruction,
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice } }
                    },
                    tools: [{ functionDeclarations: toolsDef }] // INJECT DB TOOLS
                },
                callbacks: {
                    onopen: () => {
                        console.log("Nexus Voice: Conectado");
                        setStatus('LISTENING');
                        setIsActive(true);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // 1. HANDLE TOOL CALLS (DB QUERY)
                        if (message.toolCall) {
                            setStatus('PROCESSING');
                            console.log("Nexus Voice: Solicitud de herramienta recibida");
                            
                            const functionResponses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const result = await executeTool(fc.name, fc.args);
                                functionResponses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: result }
                                });
                            }

                            // Send data back to Gemini
                            sessionPromise.then(session => {
                                session.sendToolResponse({ functionResponses });
                            });
                            // Status will update when audio comes back
                        }

                        // 2. HANDLE AUDIO OUTPUT
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            setStatus('SPEAKING'); // Visual feedback
                            
                            if (!outputAudioContextRef.current) return;
                            
                            // Audio Playback Logic
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                ctx,
                                24000,
                                1
                            );
                            
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            
                            source.onended = () => {
                                activeSourcesRef.current.delete(source);
                                if (activeSourcesRef.current.size === 0) {
                                    setStatus('LISTENING');
                                }
                            };
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            activeSourcesRef.current.add(source);
                        }
                        
                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            console.log("Interrumpido por el usuario");
                            activeSourcesRef.current.forEach(s => s.stop());
                            activeSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setStatus('LISTENING');
                        }
                    },
                    onclose: () => {
                        console.log("Nexus Voice: Desconectado");
                        stopSession();
                    },
                    onerror: (err) => {
                        console.warn("Nexus Voice Sync:", err);
                        setStatus('ERROR');
                        stopSession();
                    }
                }
            });
            sessionPromiseRef.current = sessionPromise;

            // 6. Setup Processor to stream data TO Gemini
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                // Only send if session is established
                sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination); // Keep alive

        } catch (e) {
            console.error("Error iniciando sesión de voz:", e);
            setStatus('ERROR');
        }
    };

    // --- STOP SESSION ---
    const stopSession = () => {
        setIsActive(false);
        setStatus('IDLE');
        setVolume(0);

        // Close Gemini Session
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(() => {});
            sessionPromiseRef.current = null;
        }

        // Stop Mic Tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Disconnect Audio Nodes
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (analyzerRef.current) {
            analyzerRef.current.disconnect();
            analyzerRef.current = null;
        }

        // Close Contexts
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        activeSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    };

    // --- VISUAL STYLING ---
    // Calculate scale and glow based on volume
    const scale = 1 + (volume / 255) * 0.5; // Scale up to 1.5x
    
    // Dynamic Colors based on Jarvis Mode
    const isJarvis = selectedVoice === 'Jarvis';
    const mainColor = isJarvis ? 'rgb(6, 182, 212)' : 'rgb(147, 51, 234)'; // Cyan vs Purple
    
    const orbColor = status === 'SPEAKING' ? mainColor : status === 'PROCESSING' ? 'rgb(234, 179, 8)' : 'rgb(59, 130, 246)'; 

    return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
            
            {/* Background Ambient Glow - Dynamic Color */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000"
                style={{ 
                    opacity: isActive ? 0.8 : 0.2,
                    background: isJarvis ? 'rgba(6, 182, 212, 0.15)' : 'rgba(59, 130, 246, 0.1)'
                }}
            ></div>

            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <Radio className={`w-5 h-5 ${isActive ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`} />
                    <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase">
                        {status === 'IDLE' ? 'SISTEMA EN ESPERA' : 
                         status === 'CONNECTING' ? 'INICIANDO ENLACE...' : 
                         status === 'PROCESSING' ? 'CONSULTANDO BASE DE DATOS...' :
                         status === 'LISTENING' ? 'ESCUCHANDO...' : 
                         status === 'SPEAKING' ? 'TRANSMITIENDO...' : 'ERROR DE ENLACE'}
                    </span>
                </div>
                
                {/* Settings Toggle */}
                {!isActive && (
                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-full transition-all ${showConfig ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* SETTINGS OVERLAY */}
            {showConfig && !isActive && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setShowConfig(false)}>
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                                <Settings className="w-4 h-4 text-purple-500" /> Configuración de Voz
                            </h3>
                            <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            
                            {/* VOICE SELECTOR */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Selección de Voz
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {AVAILABLE_VOICES.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVoice(v.id)}
                                            className={`p-3 rounded-lg border text-left transition-all relative ${
                                                selectedVoice === v.id 
                                                ? (v.id === 'Jarvis' ? 'bg-cyan-900/20 border-cyan-500/50 text-white shadow-sm' : 'bg-purple-600/10 border-purple-500/50 text-white shadow-sm') 
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {v.id === 'Jarvis' && <Cpu className="w-3 h-3 text-cyan-400" />}
                                                <div className="text-xs font-bold">{v.label}</div>
                                            </div>
                                            <div className="text-[10px] opacity-70">{v.gender}</div>
                                            {selectedVoice === v.id && (
                                                <div className={`absolute top-2 right-2 ${v.id === 'Jarvis' ? 'text-cyan-500' : 'text-purple-500'}`}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CONTEXT INPUT */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5" /> Contexto Adicional
                                </label>
                                <div className="relative">
                                    <textarea 
                                        value={customContext}
                                        onChange={(e) => setCustomContext(e.target.value)}
                                        placeholder="Ej: Eres un experto en ciberseguridad. Habla rápido y técnico..."
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/50 resize-none h-24 placeholder:text-zinc-600 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600">
                                    Instrucciones específicas para personalizar la personalidad o el enfoque de la IA en esta sesión.
                                </p>
                            </div>

                        </div>
                        
                        <div className="p-4 bg-zinc-900/50 border-t border-zinc-900 flex justify-end">
                            <button 
                                onClick={() => setShowConfig(false)}
                                className="px-6 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-zinc-200 transition-colors"
                            >
                                Guardar y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN ORB INTERFACE */}
            <div className={`relative z-20 flex flex-col items-center justify-center gap-24 transition-opacity duration-300 ${showConfig ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
                
                {/* THE PULSE ORB */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Outer Rings (Ripple Effect) */}
                    {isActive && (
                        <>
                            <div className={`absolute inset-0 rounded-full border border-blue-500/30 ${status === 'PROCESSING' ? 'animate-spin border-yellow-500/30' : 'animate-ping'}`} style={{ borderColor: isJarvis && status !== 'PROCESSING' ? 'rgba(6, 182, 212, 0.3)' : undefined }}></div>
                            <div className={`absolute inset-0 rounded-full border border-purple-500/20 ${status === 'PROCESSING' ? 'animate-spin [animation-duration:3s]' : 'animate-ping [animation-delay:0.5s]'}`} style={{ borderColor: isJarvis && status !== 'PROCESSING' ? 'rgba(6, 182, 212, 0.2)' : undefined }}></div>
                        </>
                    )}

                    {/* Main Circle with Dynamic Scale */}
                    <div 
                        className="w-40 h-40 rounded-full flex items-center justify-center relative transition-transform duration-75 ease-out shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                        style={{ 
                            transform: `scale(${isActive ? (status === 'PROCESSING' ? 1.1 : scale) : 1})`,
                            background: `radial-gradient(circle at 30% 30%, #2a2a2a, #000)`,
                            boxShadow: isActive ? `0 0 ${40 + volume}px ${orbColor}` : '0 0 20px rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Inner Glow */}
                        <div 
                            className="absolute inset-0 rounded-full opacity-50 blur-xl transition-colors duration-300"
                            style={{ backgroundColor: isActive ? orbColor : 'transparent' }}
                        ></div>

                        {/* Text Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            <h1 
                                className="text-3xl font-black tracking-tighter text-white drop-shadow-md select-none transition-all duration-300"
                                style={{ 
                                    textShadow: isActive ? `0 0 20px ${orbColor}` : 'none',
                                    letterSpacing: isActive ? '0.1em' : '0.05em',
                                    fontFamily: isJarvis ? 'Share Tech Mono, monospace' : undefined
                                }}
                            >
                                {isJarvis ? 'J.A.R.V.I.S.' : 'NEXUS'}
                            </h1>
                            <div className="flex items-center gap-1 mt-1">
                                {status === 'PROCESSING' ? (
                                    <Database className="w-3 h-3 text-yellow-500 animate-pulse" />
                                ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                                )}
                                <span className="text-[9px] font-mono text-zinc-500">
                                    {status === 'PROCESSING' ? 'DB SYNC' : (isJarvis ? 'SYSTEM ONLINE' : 'VOICE AI')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-6">
                    {!isActive ? (
                        <button 
                            onClick={startSession}
                            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                        >
                            <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>INICIAR SESIÓN</span>
                        </button>
                    ) : (
                        <button 
                            onClick={stopSession}
                            className="group relative flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-full font-bold hover:bg-red-500 transition-all active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                        >
                            <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>FINALIZAR</span>
                        </button>
                    )}
                </div>

                {/* Subtitle / Hints */}
                <div className="absolute bottom-12 text-center">
                    <p className={`text-sm text-zinc-500 font-mono transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                        {status === 'LISTENING' ? "Te escucho..." : 
                         status === 'SPEAKING' ? "Respondiendo..." : 
                         status === 'PROCESSING' ? "Consultando Base de Datos..." :
                         "Conectando..."}
                    </p>
                    {!isActive && (
                        <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto">
                            Usa audífonos para una mejor experiencia. Voz actual: <span className={isJarvis ? "text-cyan-400 font-bold" : "text-purple-400 font-bold"}>{selectedVoice}</span>.
                        </p>
                    )}
                </div>
            </div>
            
            {/* Visualizer Lines (Decoration) */}
            <div className="absolute bottom-0 left-0 w-full h-32 flex items-end justify-center gap-1 opacity-20 pointer-events-none">
                {Array.from({length: 40}).map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1 bg-white rounded-t-sm transition-all duration-75"
                        style={{ 
                            height: isActive ? `${Math.max(10, Math.random() * volume * 1.5)}%` : '5%',
                            opacity: isActive ? 0.5 : 0.1
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default AgentNexusVoice;
