import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NetworkFailure, MassiveIncident } from '../types';
import { X, Store, AlertTriangle, Activity } from 'lucide-react';

interface IncidentMapDrawerProps {
    incident: MassiveIncident;
    failures: NetworkFailure[];
    onClose: () => void;
}

// Custom hook to fit bounds based on markers
function ChangeView({ bounds }: { bounds: L.LatLngBounds | null }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            // Padding ensures markers aren't hidden under UI elements
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            // Invalidate size to ensure tiles load correctly in Drawer
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        }
    }, [bounds, map]);
    return null;
}

// Creating a custom HTML icon for the pins (Pulsating Red Dot with Glow)
const createPulsatingIcon = () => {
    return L.divIcon({
        className: 'custom-pulse-marker',
        html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-full h-full bg-red-500 rounded-full opacity-50 animate-ping"></div>
                <div class="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white/80 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const IncidentMapDrawer: React.FC<IncidentMapDrawerProps> = ({ incident, failures, onClose }) => {

    // 1. Filter out failures that don't have valid coordinates
    const geoFailures = useMemo(() => {
        return failures.filter(f => {
            if (!f.coordenadas_geo || typeof f.coordenadas_geo !== 'string') return false;
            // Clean up coordinate string (remove parentheses and spaces)
            const cleanCoords = f.coordenadas_geo.replace(/[()\s]/g, '');
            const parts = cleanCoords.split(',');
            // Must have lat and lng and they must be numbers
            if (parts.length < 2) return false;
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            return !isNaN(lat) && !isNaN(lng);
        }).map(f => {
            const cleanCoords = f.coordenadas_geo!.replace(/[()\s]/g, '');
            const parts = cleanCoords.split(',');
            return {
                ...f,
                lat: parseFloat(parts[0]),
                lng: parseFloat(parts[1])
            };
        });
    }, [failures]);

    // 2. Calculate Map Bounds dynamically based on active valid coordinates
    const mapBounds = useMemo(() => {
        if (geoFailures.length === 0) return null;
        return L.latLngBounds(geoFailures.map(f => [f.lat, f.lng]));
    }, [geoFailures]);

    // 3. Fallback center if no coordinates are found at all, try to center on country roughly
    const defaultCenters: Record<string, [number, number]> = {
        'COLOMBIA': [4.5709, -74.2973],
        'VENEZUELA': [6.4238, -66.5897],
        'ARGENTINA': [-38.4161, -63.6167],
        'BOLIVIA': [-16.2902, -63.5887],
        'ECUADOR': [-1.8312, -78.1834],
        'PERU': [-9.1900, -75.0152]
    };

    // Normalize country to uppercase just in case
    const normalizedCountry = incident.country?.toUpperCase().trim() || '';
    const fallbackCenter = defaultCenters[normalizedCountry] || [0, 0];
    const defaultZoom = geoFailures.length > 0 ? 12 : 5;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Drawer Container */}
            <div className="w-full md:w-[600px] lg:w-[800px] h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                            <Activity className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                Impacto Geográfico
                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded border border-zinc-700">
                                    {incident.provider_name}
                                </span>
                            </h2>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                                Mostrando <strong className="text-white">{geoFailures.length}</strong> tiendas mapeadas en <strong className="text-white">{incident.country}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all"
                        title="Cerrar Mapa"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Information Bar */}
                {geoFailures.length < failures.length && (
                    <div className="bg-yellow-900/20 border-b border-yellow-900/30 px-6 py-2 flex items-center gap-3 shrink-0">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="text-xs text-yellow-200/80 font-medium">
                            {failures.length - geoFailures.length} tiendas afectadas no tienen coordenadas válidas en el inventario y no se muestran en el mapa.
                        </span>
                    </div>
                )}

                {/* Map Body */}
                <div className="flex-1 relative bg-black">
                    <MapContainer
                        center={fallbackCenter}
                        zoom={defaultZoom}
                        className="w-full h-full z-0 font-sans"
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Render Markers */}
                        {geoFailures.map((fail) => (
                            <Marker
                                key={fail.id}
                                position={[fail.lat, fail.lng]}
                                icon={createPulsatingIcon()}
                            >
                                <Popup className="custom-dark-popup">
                                    <div className="p-1 min-w-[160px]">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-700/50">
                                            <Store className="w-4 h-4 text-zinc-400" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                                {fail.nombre_tienda || 'Desconocida'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30 self-start font-mono font-bold uppercase">
                                                ID: {fail.codigo_tienda || fail.network_id}
                                            </span>
                                            {fail.cruce_tienda && (
                                                <span className="text-[10px] text-zinc-400 flex items-start gap-1 leading-tight">
                                                    {fail.cruce_tienda}
                                                </span>
                                            )}
                                            <div className="mt-1 pt-1 border-t border-zinc-800">
                                                <span className="text-[9px] text-red-500 uppercase font-black tracking-widest flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                    Sin Conexión
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Fit bounds if there are markers to show */}
                        {mapBounds && <ChangeView bounds={mapBounds} />}
                    </MapContainer>

                    {/* Placeholder for when 0 coords are valid but we have affected failures */}
                    {failures.length > 0 && geoFailures.length === 0 && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
                            <div className="bg-zinc-950/95 backdrop-blur-md border border-red-900/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.1)] flex flex-col items-center text-center max-w-sm">
                                <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Sin Coordenadas</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    Ninguna de las <strong>{failures.length}</strong> tiendas afectadas tiene el campo de coordenadas geográficas configurado. Contacte con Administración de Inventario.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IncidentMapDrawer;
