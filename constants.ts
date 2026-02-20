
import { AlertCircle, Wrench, Eye, Lock, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { LifecycleStage, NetworkFailure, MassiveIncident } from './types';

// Color Mapping Logic
export const STAGE_CONFIG: Record<LifecycleStage, { color: string; icon: any; border: string; bg: string }> = {
  'Activa': { 
    color: 'text-red-500', 
    border: 'border-red-500', 
    bg: 'bg-red-500/10',
    icon: AlertCircle 
  },
  'En gestión': { 
    color: 'text-orange-500', 
    border: 'border-orange-500', 
    bg: 'bg-orange-500/10',
    icon: Wrench 
  },
  'En observación': { 
    color: 'text-yellow-500', 
    border: 'border-yellow-500', 
    bg: 'bg-yellow-500/10',
    icon: Eye 
  },
  'Intermitencia': { 
    color: 'text-purple-500', 
    border: 'border-purple-500', 
    bg: 'bg-purple-500/10',
    icon: Activity 
  },
  'Pendiente por cierre': { 
    color: 'text-blue-500', 
    border: 'border-blue-500', 
    bg: 'bg-blue-500/10',
    icon: Lock 
  },
  'Resuelta': { 
    color: 'text-green-500', 
    border: 'border-green-500', 
    bg: 'bg-green-500/10',
    icon: CheckCircle2 
  },
  'Falso Positivo': { 
    color: 'text-gray-500', 
    border: 'border-gray-500', 
    bg: 'bg-gray-500/10',
    icon: XCircle 
  },
};

// DEMO DATA (Used if Supabase is not configured)
export const MOCK_FAILURES: NetworkFailure[] = [
  {
    id: '1',
    network_id: 'MX-CDMX-001',
    nombre_tienda: 'Centro Histórico Flagship',
    codigo_tienda: 'T-9901',
    meraki_url: 'https://meraki.cisco.com',
    lifecycle_stage: 'Activa',
    site_impact: 'TOTAL',
    start_time: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    wan1_status: 'DOWN',
    wan1_ticket_ref: 'INC-994202',
    wan2_status: 'DOWN',
    wan2_ticket_ref: 'BMC-11200',
  },
  {
    id: '2',
    network_id: 'CO-BOG-042',
    nombre_tienda: 'Bogotá Norte Shopping',
    codigo_tienda: 'T-2042',
    meraki_url: 'https://meraki.cisco.com',
    lifecycle_stage: 'En gestión',
    site_impact: 'PARCIAL',
    start_time: new Date(Date.now() - 1000 * 60 * 125).toISOString(), // 2h 5m ago
    wan1_status: 'DOWN',
    wan1_ticket_ref: 'INC-993110',
    wan2_status: 'UP',
    wan2_ticket_ref: null,
  },
  {
    id: '3',
    network_id: 'MX-GDL-010',
    nombre_tienda: 'Guadalajara Centro',
    codigo_tienda: 'T-1010',
    lifecycle_stage: 'En observación',
    site_impact: 'TOTAL',
    start_time: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    wan1_status: 'UP',
    wan2_status: 'DOWN',
    wan2_ticket_ref: 'INC-Pending',
  },
  {
    id: '4',
    network_id: 'CL-SAN-005',
    nombre_tienda: 'Santiago Mall Plaza',
    codigo_tienda: 'T-5005',
    lifecycle_stage: 'Pendiente por cierre',
    site_impact: 'PARCIAL',
    start_time: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    wan1_status: 'UP',
    wan2_status: 'UP',
    // Resolved logic usually implies both UP
  },
   {
    id: '5',
    network_id: 'MX-MTY-099',
    nombre_tienda: 'Monterrey Valle',
    codigo_tienda: 'T-3099',
    meraki_url: 'https://meraki.cisco.com',
    lifecycle_stage: 'Activa',
    site_impact: 'TOTAL',
    start_time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    wan1_status: 'DOWN',
    wan1_ticket_ref: 'AUTO-GEN-22',
    wan2_status: 'DOWN',
    wan2_ticket_ref: 'AUTO-GEN-23',
  },
  {
    id: '6',
    network_id: 'PE-LIM-088',
    nombre_tienda: 'Lima Miraflores',
    codigo_tienda: 'T-4088',
    meraki_url: 'https://meraki.cisco.com',
    lifecycle_stage: 'Intermitencia',
    site_impact: 'PARCIAL',
    start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    wan1_status: 'DOWN',
    wan1_ticket_ref: 'FLAP-001',
    wan2_status: 'UP',
    wan2_ticket_ref: null,
  }
];

export const MOCK_MASSIVE: MassiveIncident[] = [
  {
    id: '101',
    provider_name: 'Telmex Enterprise',
    country: 'MX',
    status: 'Activa',
    current_active_count: 142,
    recovery_percentage: 35,
    start_time: new Date().toISOString()
  },
  {
    id: '102',
    provider_name: 'Claro Fibra',
    country: 'CO',
    status: 'Activa',
    current_active_count: 28,
    recovery_percentage: 80,
    start_time: new Date().toISOString()
  }
];
