
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
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95">
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

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 pb-20">
                {loading ? (
                    [1,2,3].map(i => <div key={i} className="h-40 bg-zinc-900/50 rounded-xl animate-pulse border border-zinc-800"></div>)
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
                            className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        entry.category === 'SOP' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                        entry.category === 'Troubleshooting' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                        {entry.category}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors leading-tight">{entry.title}</h3>
                                <p className="text-zinc-500 text-xs line-clamp-3 leading-relaxed">{entry.content}</p>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                <div className="flex gap-1.5 flex-wrap">
                                    {entry.tags.map(tag => (
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
        </div>
    );
};

export default KnowledgeBase;
