
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { KnowledgeEntry } from '../types';
import { BookOpen, Search, Filter, Plus, ChevronRight, Hash, Clock, User, ExternalLink, FileText, Zap, ShieldCheck, Loader2, X, AlertCircle } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
    const [isMockData, setIsMockData] = useState(false);

    // States for New Article Modal
    const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);
    const [newArticleData, setNewArticleData] = useState({ title: '', content: '', category: 'SOP', tags: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);

    // PDF Viewer State
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

    const categories = ['All', 'SOP', 'Configuración', 'Contactos', 'Troubleshooting'];

    useEffect(() => {
        fetchKB();
    }, []);

    const loadMockData = () => {
        const mock: KnowledgeEntry[] = [
            { id: 1, category: 'SOP', title: 'Procedimiento de Escalación Masiva', content: '1. Detectar falla > 15% sitios.\n2. Notificar canal #noc-alertas.\n3. Abrir ticket global en BMC.', tags: ['Masiva', 'Escalación'], last_updated: new Date().toISOString(), updated_by: 'Admin' },
            { id: 2, category: 'Troubleshooting', title: 'Reinicio Remoto Meraki MX', content: 'Utilizar el portal Meraki Dashboard. Ir a Help > Reboot Appliance. Tiempo estimado: 5-8 min.', tags: ['Meraki', 'Reboot'], last_updated: new Date().toISOString(), updated_by: 'NOC L2' },
            { id: 3, category: 'Contactos', title: 'Directorio de Proveedores MX', content: 'Telmex Enterprise: 800-123-4567\nTotalplay Corp: 800-999-8888', tags: ['México', 'Telmex'], last_updated: new Date().toISOString(), updated_by: 'Gestión' }
        ];
        setEntries(mock);
        setIsMockData(true);
    };

    const fetchKB = async () => {
        setLoading(true);
        try {
            if (isDemoMode) {
                loadMockData();
            } else {
                const { data, error } = await supabase.from('knowledge_base_jj').select('*').order('title');

                if (error) {
                    // PGRST205: Could not find the table in the schema cache
                    // 42P01: Undefined table
                    if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('Could not find the table')) {
                        console.warn("Knowledge Base table missing in Supabase. Loading mock data for demonstration.");
                        loadMockData();
                        return; // Exit successfully using mock data
                    }
                    throw error;
                }

                setEntries(data || []);
                setIsMockData(false);
            }
        } catch (e) {
            console.error("Error fetching KB", e);
            // Fallback on critical error
            loadMockData();
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNewArticle = async () => {
        if (!newArticleData.title || !newArticleData.content) return;
        setIsSaving(true);
        try {
            const tagsArray = newArticleData.tags.split(',').map(t => t.trim()).filter(t => t !== '');

            const newEntry = {
                title: newArticleData.title,
                content: newArticleData.content,
                category: newArticleData.category,
                tags: tagsArray,
                updated_by: 'Admin (Dev)',
                last_updated: new Date().toISOString()
            };

            if (isDemoMode || isMockData) {
                // local update
                setEntries(prev => [...prev, { id: Date.now(), ...newEntry }]);
            } else {
                // supabase insert
                const { error } = await supabase.from('knowledge_base_jj').insert([newEntry]);
                if (error) throw error;
                fetchKB();
            }

            setIsNewArticleModalOpen(false);
            setNewArticleData({ title: '', content: '', category: 'SOP', tags: '' });
            setAttachedFile(null);
        } catch (e) {
            console.error("Error saving article:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [entries, searchTerm, selectedCategory]);

    return (
        <div className="p-8 h-screen flex flex-col bg-black overflow-hidden relative">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BookOpen className="text-blue-500" />
                        Nexus Knowledge Base
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 text-sm">Procedimientos técnicos y guías de resolución.</p>
                        {isMockData && !loading && (
                            <span className="flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 font-mono">
                                <AlertCircle className="w-3 h-3" /> DATA DEMO
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsNewArticleModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Nuevo Artículo
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por título o etiqueta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 pb-20 space-y-8">
                {/* 1. CARRUSEL DE DESTAQUES / NOVEDADES */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 px-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Novedades & Destacados</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* TARJETA 1: PPTX Arquitectura Híbrida */}
                        <div
                            onClick={() => setIsPdfViewerOpen(true)}
                            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl h-[280px] overflow-hidden hover:border-blue-500 transition-all cursor-pointer group relative flex flex-col shadow-xl"
                        >
                            {/* IMAGEN DE FONDO PLACEHOLDER (Gradients and Icons for now) */}
                            <div className="flex-1 bg-gradient-to-br from-indigo-950 via-[#0B0F19] to-black relative overflow-hidden flex items-center justify-center">
                                {/* Imagen real insertada (se solicita al usuario que la renombre y la ubique en public) */}
                                <img src="/arquitectura.png" alt="Arquitectura Híbrida" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen group-hover:opacity-60 transition-opacity duration-500 z-0" />

                                {/* Decoración de fondo */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-600/20 blur-[60px] rounded-full z-0"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-600/20 blur-[50px] rounded-full z-0"></div>

                                {/* Icono Central Representativo */}
                                <div className="relative z-10 flex flex-col items-center mt-6">
                                    <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transform group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                                        <Zap className="w-12 h-12 text-blue-400 stroke-[1.5]" />
                                    </div>
                                    <span className="mt-4 text-[10px] uppercase font-black tracking-[0.3em] text-white/50 group-hover:text-blue-400 transition-colors bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Sommer Nexus AI</span>
                                </div>
                            </div>

                            {/* TEXTO DE LA TARJETA */}
                            <div className="p-5 bg-zinc-950 border-t border-zinc-800 shrink-0 relative z-20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                        Presentación
                                    </span>
                                    <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-white font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors">
                                    Arquitectura Híbrida Serverless
                                </h3>
                                <p className="text-zinc-500 text-xs mt-1 truncate">
                                    El Cerebro Digital: React 19, N8N, Gemini & Supabase Realtime
                                </p>
                            </div>
                        </div>

                        {/* TARJETA 2: Procedimiento de Escalación Masiva (Card Especial) */}
                        <div
                            onClick={() => {
                                const entry = entries.find(e => e.id === 1);
                                if (entry) setSelectedEntry(entry);
                            }}
                            className="bg-black border border-purple-500/30 rounded-2xl h-[280px] overflow-hidden hover:border-purple-400 transition-all cursor-pointer group relative flex flex-col shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] pointer-events-none rounded-full"></div>

                            <div className="p-6 flex flex-col h-full z-10">
                                <span className="w-max text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 mb-4">
                                    SOP Crítico
                                </span>
                                <h3 className="text-2xl text-white font-black leading-tight mb-3 group-hover:text-purple-400 transition-colors">
                                    Procedimiento de Escalación Masiva
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
                                    Pasos críticos para la detección y notificación de fallas que afecten a más del 15% de las sucursales de la red.
                                </p>

                                <div className="mt-auto flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                        <ShieldCheck className="w-4 h-4" /> Nexus Verified
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-t border-zinc-800/50" />

                {/* 2. GRILLA DE ARTÍCULOS ESTÁNDAR */}
                <div>
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1 mb-4">Explorar Base de Conocimientos ({filteredEntries.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {loading ? (
                            [1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-zinc-900/50 rounded-xl animate-pulse border border-zinc-800"></div>)
                        ) : filteredEntries.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-zinc-600 flex flex-col items-center border-2 border-dashed border-zinc-900 rounded-2xl">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-lg font-bold">No se encontraron artículos</p>
                                <p className="text-sm mt-1">Prueba con otros términos o crea uno nuevo.</p>
                            </div>
                        ) : (
                            filteredEntries.map(entry => (
                                <div
                                    key={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${entry.category === 'SOP' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                entry.category === 'Troubleshooting' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                {entry.category}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                        </div>
                                        <h3 className="text-white font-bold text-base mb-2 group-hover:text-blue-400 transition-colors leading-tight">{entry.title}</h3>
                                        <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{entry.content}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {entry.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-[9px] bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-500 border border-zinc-800 font-mono">#{tag}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                                            <User className="w-3 h-3" /> {entry.updated_by}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ARTÍCULO MODAL */}
                {selectedEntry && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Zap className="w-5 h-5" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedEntry.title}</h2>
                                        <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Nexus-KB-{selectedEntry.id}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEntry(null)} className="p-2 bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-black/40">
                                <div className="prose prose-invert max-w-none">
                                    <div className="flex items-center gap-4 mb-8 text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Actualizado: {new Date(selectedEntry.last_updated).toLocaleDateString()}</div>
                                        <div className="w-px h-3 bg-zinc-800"></div>
                                        <div className="flex items-center gap-1.5"><User className="w-4 h-4" /> Autor: {selectedEntry.updated_by}</div>
                                        <div className="ml-auto flex items-center gap-1.5 text-blue-500"><ShieldCheck className="w-4 h-4" /> Verificado por Nexus AI</div>
                                    </div>
                                    <div className="text-zinc-300 text-lg leading-relaxed whitespace-pre-wrap font-sans">
                                        {selectedEntry.content}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-zinc-900/50 border-t border-zinc-900 flex justify-end gap-3">
                                <button className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-bold transition-colors">Copiar Contenido</button>
                                <button onClick={() => setSelectedEntry(null)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all">Cerrar Guía</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL NUEVO ARTÍCULO */}
                {isNewArticleModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Plus className="w-5 h-5" /></div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Nuevo Artículo a Nexus KB</h2>
                                        <span className="text-xs text-zinc-500">Agrega un documento o adjunto a la base de conocimientos</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsNewArticleModalOpen(false)} className="p-2 bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-black/40 scrollbar-thin scrollbar-thumb-zinc-800">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nombre del Artículo *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Procedimiento de reseteo de AP"
                                        value={newArticleData.title}
                                        onChange={(e) => setNewArticleData({ ...newArticleData, title: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Categoría *</label>
                                        <select
                                            value={newArticleData.category}
                                            onChange={(e) => setNewArticleData({ ...newArticleData, category: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                        >
                                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Etiquetas (separadas por coma)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: AP, WiFi, Troubleshooting"
                                            value={newArticleData.tags}
                                            onChange={(e) => setNewArticleData({ ...newArticleData, tags: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Contenido o Descripción *</label>
                                    <textarea
                                        placeholder="Escribe el contenido en texto o añade una descripción breve si adjuntas un archivo..."
                                        rows={6}
                                        value={newArticleData.content}
                                        onChange={(e) => setNewArticleData({ ...newArticleData, content: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Adjuntar Archivo (Opcional)</label>
                                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-900/50 hover:border-blue-500/50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => setAttachedFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                                            <AlertCircle className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <span className="text-zinc-300 font-bold mb-1">
                                            {attachedFile ? attachedFile.name : 'Haz clic para explorar o arrastra un archivo'}
                                        </span>
                                        <span className="text-xs text-zinc-500 text-center px-4">
                                            {attachedFile ? `Tamaño: ${(attachedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Soporta PDF, DOCX, PPTX, PNG, JPG hasta 50MB'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-900/50 border-t border-zinc-900 flex justify-end gap-3 shrink-0">
                                <button onClick={() => setIsNewArticleModalOpen(false)} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-bold transition-colors">Cancelar</button>
                                <button
                                    onClick={handleSaveNewArticle}
                                    disabled={!newArticleData.title || !newArticleData.content || isSaving}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${!newArticleData.title || !newArticleData.content || isSaving
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                                        }`}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {isSaving ? 'Guardando...' : 'Guardar Artículo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* VISOR PDF INMERSIVO (FULLSCREEN) */}
                {isPdfViewerOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in">
                        <div className="w-full h-full flex flex-col">
                            {/* Topbar del Visor */}
                            <div className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between px-6 shrink-0 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-bold text-lg leading-tight uppercase tracking-wide">Arquitectura Híbrida Serverless</h2>
                                        <p className="text-zinc-500 text-xs tracking-widest uppercase">Presentación AIOps</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => window.open('/Sommer_Nexus_AIOps.pdf', '_blank')}
                                        className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir en Pestaña
                                    </button>
                                    <div className="w-px h-6 bg-zinc-800 mx-2"></div>
                                    <button
                                        onClick={() => setIsPdfViewerOpen(false)}
                                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors border border-transparent hover:border-red-500/30"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Renderizador PDF Inmersivo */}
                            <div className="flex-1 w-full bg-[#1e1e1e] flex items-center justify-center overflow-hidden">
                                <iframe
                                    src="/Sommer_Nexus_AIOps.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                                    className="w-full h-full border-none pointer-events-auto"
                                    title="Visor PDF Sommer Nexus AIOps"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* CIERRE FALTANTE DEL WRAPPER FLEX-1 */}
            </div>
        </div>
    );
};

export default KnowledgeBase;
