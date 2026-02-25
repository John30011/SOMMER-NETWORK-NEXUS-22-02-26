
export type LifecycleStage = 'Activa' | 'En gestión' | 'En observación' | 'Intermitencia' | 'Pendiente por cierre' | 'Resuelta' | 'Falso Positivo';
export type SiteImpact = 'TOTAL' | 'PARCIAL';
// Updated to include UP/DOWN based on DB schema default 'UP'
export type WanStatus = 'active' | 'failed' | 'degraded' | 'UP' | 'DOWN';

export interface NetworkFailure {
  id: string | number; // Updated to accept bigint/number from DB
  network_id: string;
  nombre_tienda?: string;
  codigo_tienda?: string; // NEW FIELD added for display
  cruce_tienda?: string;  // NEW FIELD for geographical context
  meraki_url?: string; // NEW FIELD for direct link

  // New fields for UI enhancement
  pais?: string;
  wan1_provider_name?: string;
  wan2_provider_name?: string;

  lifecycle_stage: LifecycleStage;
  site_impact: SiteImpact;
  start_time: string; // ISO timestamp

  // Analyst notes (kept for backward compatibility or general notes)
  analyst_notes?: string | any;

  // Slack Integration
  slack_thread_ts?: string | null; // NEW FIELD for Slack Logic

  // WAN 1 Specifics from Schema
  wan1_status: WanStatus | string;
  wan1_ticket_ref?: string | null;
  wan1_downtime_minutes?: number; // NEW
  wan1_recovery_start_time?: string | null; // NEW: Explicit recovery timestamp
  email_status_w1?: string; // NEW: Email status for WAN 1 (e.g. "OK")

  // WAN 2 Specifics from Schema
  wan2_status: WanStatus | string;
  wan2_ticket_ref?: string | null;
  wan2_downtime_minutes?: number; // NEW
  wan2_recovery_start_time?: string | null; // NEW: Explicit recovery timestamp
  email_status_w2?: string; // NEW: Email status for WAN 2 (e.g. "OK")

  // Total Downtime for Massive/Total failures
  total_downtime_minutes?: number; // NEW

  // MASSIVE INCIDENT RELATIONS
  es_falla_masiva?: boolean;
  wan1_massive_incident_id?: string | number | null;
  wan2_massive_incident_id?: string | number | null;

  // Cross-table mapping type
  event_type?: string;

  created_at?: string;
}

export interface NetworkDegradation {
  id: string | number;
  network_id: string; // references devices_inventory_jj
  status: 'Activa' | 'En gestión' | 'En observación' | 'Intermitencia' | 'Cerrada' | string;
  diagnosis_text?: string | null;
  evidence_data?: any;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  slack_thread_ts?: string | null;
  email_status?: string | null;
  email_ts?: string | null;
  analyst_notes?: any;
  related_failure_id?: string | number | null;
  root_cause_degradacion?: string | null;
  liability_degradacion?: string | null;
  recovery_start_time?: string | null;
  msg_recovery_sent_at?: string | null;
  msg_close_sent_at?: string | null;
  related_massive_id?: string | number | null;
  assigned_to?: string | null;
  system_logs?: any;

  // Relations for display
  device_info?: DeviceInventory; // Joined via network_id
}

export interface MassiveIncident {
  id: string | number; // uuid or int
  provider_name: string;
  country: string; // code like 'MX', 'CO', etc.
  status: 'Activa' | 'Resuelta';
  recovery_status?: 'Finalizada' | 'En Monitoreo' | 'En Progreso'; // NEW FIELD
  current_active_count: number;
  recovery_percentage: number; // 0-100
  start_time: string;
  end_time?: string; // Optional end time

  // NEW: Total inventory count for this provider to calculate impact %
  total_provider_inventory?: number;

  // Added for Bitacora support & Icons
  analyst_notes?: string | any; // Deprecated for massive, keeping for types safety
  logs?: string | any; // NEW: Targeted field for Massive Logs

  // Icon Status Fields
  email_status_isp?: string; // "OK" triggers icon
  slack_thread_ts?: string; // Not null triggers icon
}

export interface ISPContact {
  id?: number | string;
  provider_id: number | string;
  level: 'Nivel 1' | 'Nivel 2' | 'Nivel 3' | 'Nivel 4' | 'Nivel 5' | string;
  method: 'Correo' | 'Llamada' | 'Whatsapp' | string;
  value: string;
  contact_name: string;
  last_seen_api?: string;
  created_at?: string;
}

export interface ISPProvider {
  id: number | string;
  name: string;
  country?: string; // NEW FIELD
  // Extended fields for the Providers Module
  contact_name?: string; // (Deprecated flat field)
  contact_email?: string; // (Deprecated flat field)
  support_phone?: string; // (Deprecated flat field)
  sla_contract?: number; // e.g., 99.5
  website_url?: string;
  contacts?: ISPContact[]; // NEW: Related contacts from isp_contacts_jj
}

export interface ScheduledTask {
  tp_id: number;
  tp_provider_id: number;
  provider_name?: string; // Joined field for display
  tp_country: string;
  tp_title: string;
  tp_observation?: string;
  tp_start_time: string; // ISO
  tp_end_time: string; // ISO
  tp_duration_minutes?: number; // Calculated
  tp_affected_stores?: string[]; // Array of network_ids

  // Audit
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DeviceInventory {
  // Primary Grid Columns
  network_id: string;
  pais: string;
  codigo_tienda: string;
  nombre_tienda: string;
  coordenadas_geo?: string; // NEW: Geo coordinates (lat, long)

  // WAN 1
  wan1_provider_id: string | number; // FK
  wan1_id_servicio: string;
  wan1_tipo_servicio?: string; // NEW FIELD
  wan1_provider?: ISPProvider; // Joined data
  wan1_bw?: string; // Bandwidth (e.g., "50 MB")
  wan1_contingencia?: boolean; // Is contingency link?

  // WAN 2
  wan2_provider_id: string | number; // FK
  wan2_id_servicio: string;
  wan2_tipo_servicio?: string; // NEW FIELD
  wan2_provider?: ISPProvider; // Joined data
  wan2_bw?: string; // Bandwidth (e.g., "10 MB")
  wan2_contingencia?: boolean; // Is contingency link?

  // Editable Operational Data
  direccion_domicilio?: string;
  correo_tienda?: string;
  es_tienda_top?: boolean;
  es_24_horas?: boolean;
  es_monitoreable?: boolean; // NEW FIELD
  observaciones?: string;

  // Details / Other Fields
  meraki_serial?: string;
  meraki_model?: string | null;
  meraki_url?: string;
  [key: string]: any; // Allow other dynamic fields for the details view
}

export interface SlackChannel {
  id: number;
  name_channel: string;
  channel_id: string;
  webhook_channel?: string;
  description_channel?: string;
  create_by?: string;
  created_at?: string;
}

// AUTH TYPES
export interface UserProfile {
  id_user: string; // Updated to match DB column 'id_user'
  email: string;
  first_name: string; // Updated from full_name
  last_name: string;  // Added
  role?: string;
  profile_image_url?: string;
  created_at?: string;
}

// NOTIFICATION SYSTEM TYPES
export interface AppNotification {
  id: string;
  type: 'critical' | 'massive' | 'info';
  subtype?: 'TOTAL' | 'PARCIAL'; // NEW: To handle icon differentiation
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// NEW DISCOVERED TABLE TYPES
export interface KnowledgeEntry {
  id: number;
  category: 'SOP' | 'Configuración' | 'Contactos' | 'Troubleshooting';
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
  updated_by: string;
}

export interface AuditLog {
  id: number;
  action: string;
  table_name: string;
  record_id: string;
  user_email: string;
  timestamp: string;
  old_data?: any;
  new_data?: any;
}
