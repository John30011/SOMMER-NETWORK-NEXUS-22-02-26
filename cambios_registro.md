# Registro de Cambios - Proyecto SOMMER NETWORK NEXUS

Este documento registra todas las modificaciones importantes realizadas en el proyecto. 
Cada entrada documenta el estado "Antes" y "Después" de una modificación para mantener un control estricto de los cambios.

---

## ESTADO INICIAL (Línea Base Global / Snapshot del Proyecto)
**Fecha del Snapshot:** 24/02/2026, 16:20:00

Se establece esta línea base con la configuración global actual del proyecto para tener un punto de partida exacto:

### 1. Arquitectura Frontend (React + TypeScript + Vite)
El proyecto es una SPA (Single Page Application) construida con Vite, React y TypeScript. Utiliza Tailwind CSS para los estilos con una paleta de colores oscura (zinc/blue).

**Estructura de Directorios Principal:**
- `/components/`: Componentes UI reutilizables y vistas de la aplicación (ej. `Inventory.tsx`, `Providers.tsx`, dashboards, etc.).
- `/hooks/`: Custom hooks de React para lógica de negocio (manejo de estado, peticiones, etc.).
- `/utils/`: Funciones utilitarias y helpers (ej. formateo de datos, cálculos).
- `/n8n_workflows/`: Respaldos JSON de flujos de automatización de n8n para ingesta de datos de Meraki y control de fallas.
- `/public/`: Recursos estáticos (imágenes, logos de branding de tiendas).
- `types.ts`: Definiciones de interfaces globales de TypeScript para todo el modelo de datos.

### 2. Arquitectura de Base de Datos y Backend (Supabase)
El proyecto confía en Supabase (`xellkrtqohbyrdlcnuux.supabase.co`) como backend-as-a-service. Todo el esquema de datos crítico para la nueva versión cuenta con el sufijo `_jj` para separarlo de la versión inicial.

**Lista de Tablas Activas del Esquema Público (`public`):**
*   `areas_jj`: Gestión de áreas/departamentos de la empresa.
*   `chat_memory_jj`: Historial y memoria del asistente o chat.
*   `daily_network_stats_jj`: Estadísticas diarias generadas sobre las fallas de red y disponibilidad.
*   `devices_inventory_jj`: **Tabla Central.** Inventario de equipos activos (routers/firewalls Meraki), metadatos de las tiendas y configuración de proveedores WAN (WAN1/WAN2, BW, contingencia).
*   `home_content_jj`: Contenido dinámico para la página de inicio o dashboard principal.
*   `isp_contacts_jj`: Directorio de contactos (Nivel 1, Nivel 2, Escalamiento) vinculados a los proveedores ISP.
*   `isp_providers_jj`: Catálogo maestro de proveedores de internet y servicios administrados (ISPs), con su país y portal.
*   `logs_frontend_jj`: Registro de auditoría para acciones tomadas en el frontend por los usuarios.
*   `massive_incidents_jj`: Registro de incidentes a nivel masivo o caídas regionales.
*   `network_degradations_jj`: Registro de degradación de servicio (latencias, fugas de paquetes).
*   `network_failures_jj`: Historial de caídas de servicio (Down/En contingencia) registradas por webhook o n8n.
*   `network_heartbeat_logs_jj`: Logs crudos ("latidos") de disponibilidad del enlace, utilizados para calcular SLAs.
*   `network_metrics_history_jj`: Historial de métricas de rendimiento extraídas (ej. consumo mensual).
*   `profiles_jj` / `users_jj` / `roles_jj`: Gestión de identidades, perfiles extendidos y control de acceso (RBAC).
*   `provider_tasks_jj`: Tareas o tickets asignados relacionados con proveedores.
*   `site_branding_jj`: Configuraciones de personalización gráfica para las distintas sedes o vistas.
*   `slack_channels_jj`: Mapeo de canales de Slack para envío de alertas generadas por incidencias.

A partir de este punto, **cualquier modificación al código, lógica o estructura de la base de datos** se registrará en el siguiente formato:

<!-- 
PLANTILLA PARA NUEVOS REGISTROS:

### [Título Breve del Cambio]
**Fecha y Hora:** DD/MM/AAAA, HH:MM
**Archivo modificado / Tabla:** `[Ruta del archivo.tsx o Nombre de la Tabla]`
**Ubicación (Líneas/Función):** [Líneas afectadas o nombre de la función]
**Motivo del cambio:** [Breve descripción de por qué se hace el cambio]

#### ESTADO ANTERIOR (Antes del Cambio)
```typescript
// Código original, estructura de tabla original o configuración anterior
```

#### ESTADO NUEVO (Después del Cambio)
```typescript
// Nuevo código implementado, nueva tabla o configuración resultante
```
---
-->

---

## REGISTROS DE CAMBIOS (A partir de la Línea Base)

### 3. Esqueleto Principal (Frontend & Base de Datos)
El siguiente archivo `types.ts` define de manera estricta todas las interfaces, esquemas de tablas, y relaciones actuales del frontend hacia las diversas entidades maestras de Supabase. Este es el mapa estructural del proyecto en su **Línea Base**, necesario para poder recrearlo si hiciera falta.

```typescript
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
  wan1_provider?: ISPProvider; // Joined data
  wan1_bw?: string; // Bandwidth (e.g., "50 MB")
  wan1_contingencia?: boolean; // Is contingency link?

  // WAN 2
  wan2_provider_id: string | number; // FK
  wan2_id_servicio: string;
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
```

> [!NOTE] 
> Las definiciones estructurales SQL (Triggers, Tablas completas y el volcado de Funciones como `nexus_master_triage_jj`, `register_ai_degradation_jj`) se omiten de este markdown para no comprometer el motor de renderizado del texto debido a su volumen (>90KB), pero están intrínsecamente definidas y mapeadas contra el `types.ts` superior y debidamente respaldas en migraciones Supabase.

<br>

### Añadir Campos Editables al Sidebar de Inventario
**Fecha y Hora:** 24/02/2026, 21:45
**Archivo modificado / Tabla:** `types.ts` y `src/components/Inventory.tsx`
**Ubicación (Líneas/Función):** Interfaces `ISPProvider`, `DeviceInventory` y Función `Inventory` (`handleSaveChanges`, UI Sidebar)
**Motivo del cambio:** Agregar soporte para edición de campos País, ID de Servicio y Tipo de Servicio (WAN1/WAN2), además de filtrar proveedores por país en los selectores.

#### ESTADO ANTERIOR (Antes del Cambio)
```typescript
// types.ts (Fragmentos)
export interface ISPProvider {
  id: number | string;
  name: string;
...
}

export interface DeviceInventory {
  wan1_id_servicio: string;
  wan1_provider?: ISPProvider;
...
}

// Inventory.tsx (Fragmentos)
const editableKeys: (keyof DeviceInventory)[] = [
    'direccion_domicilio', 'correo_tienda', 'es_tienda_top', 'es_24_horas', 'observaciones',
    'wan1_provider_id', 'wan1_bw', 'wan1_contingencia',
    'wan2_provider_id', 'wan2_bw', 'wan2_contingencia', 'es_monitoreable'
];
```

#### ESTADO NUEVO (Después del Cambio)
```typescript
// types.ts (Fragmentos)
export interface ISPProvider {
  id: number | string;
  name: string;
  country?: string; // NEW FIELD
...
}

export interface DeviceInventory {
  wan1_id_servicio: string;
  wan1_tipo_servicio?: string; // NEW FIELD
  wan1_provider?: ISPProvider;
... // (Igual para wan2)
}

// Inventory.tsx (Fragmentos)
const editableKeys: (keyof DeviceInventory)[] = [
    'direccion_domicilio', 'correo_tienda', 'es_tienda_top', 'es_24_horas', 'observaciones',
    'wan1_provider_id', 'wan1_bw', 'wan1_contingencia',
    'wan2_provider_id', 'wan2_bw', 'wan2_contingencia', 'es_monitoreable',
    'pais', 'wan1_id_servicio', 'wan1_tipo_servicio', 'wan2_id_servicio', 'wan2_tipo_servicio'
];
// + UI Actualizada con nuevos inputs y Dropdowns filtrados dinámicamente según 'pais'.
```
### Visualización de Impacto Geográfico en Fallas Masivas
**Fecha y Hora:** 24/02/2026, 23:55
**Archivo modificado / Tabla:** `types.ts`, `src/components/Massive.tsx`, `src/components/MassiveIncidentCard.tsx` y creación de `src/components/IncidentMapModal.tsx`
**Ubicación (Líneas/Función):** Función `Massive` (Fetch Query), Render `MassiveIncidentCard`
**Dependencias Agregadas:** `leaflet`, `react-leaflet`, `@types/leaflet`
**Motivo del cambio:** Integrar un mapa interactivo para visualizar las coordenadas de las tiendas afectadas por un incidente masivo (Opción 1: Acceso rápido desde el frente de la tarjeta).

#### ESTADO ANTERIOR (Antes del Cambio)
```typescript
// types.ts (Fragmento)
export interface NetworkFailure {
  codigo_tienda?: string;
  cruce_tienda?: string;
  meraki_url?: string;
...
}

// Massive.tsx (Fragmento Query)
const { data: invData } = await supabase
    .from('devices_inventory_jj')
    .select('network_id, nombre_tienda, codigo_tienda, wan1_provider:isp_providers_jj!wan1_provider_id(name), wan2_provider:isp_providers_jj!wan2_provider_id(name)')
```

#### ESTADO NUEVO (Después del Cambio)
```typescript
// types.ts (Fragmento)
export interface NetworkFailure {
  codigo_tienda?: string;
  cruce_tienda?: string;
  meraki_url?: string;
  coordenadas_geo?: string; // NEW FIELD for mapping
...
}

// Massive.tsx (Fragmento Query)
const { data: invData } = await supabase
    .from('devices_inventory_jj')
    .select('network_id, nombre_tienda, codigo_tienda, coordenadas_geo, wan1_provider:isp_providers_jj!wan1_provider_id(name), ...') // + coordenadas_geo
```

* **Nuevo Componente:** `IncidentMapModal.tsx` creado para renderizar el mapa de Leaflet usando *CartoDB Dark Matter* como fondo. Los pines incluyen animación CSS (`animate-ping`) para dar sensación de urgencia (rojo brillante). Se autocalculan los límites (`bounds`) según las coordenadas válidas.
* **UI de Tarjeta:** Se agregó un botón `<MapPinned />` ("Mapa") en `MassiveIncidentCard.tsx` debajo de "Tiendas Afectadas", que abre el modal flotante, sin girar la tarjeta principal.

---
