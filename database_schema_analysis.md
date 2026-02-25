# Análisis Completo de la Base de Datos (Tablas _jj)

> [!NOTE]
> A continuación se presenta el mapeo de todas las columnas, vistas, triggers y funciones remotas extraídas desde el entorno de producción `xellkrtqohbyrdlcnuux`.

## 1. Esquema de Tablas y Triggers

### Tabla: `areas_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id_area` | bigint | NO | `n/a` |
| `name` | text | NO | `n/a` |
| `description` | text | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `chat_memory_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | integer | NO | `nextval('chat_memory_id_seq'::regclass)` |
| `session_id` | character varying | NO | `n/a` |
| `message` | jsonb | NO | `n/a` |

---

### Tabla: `daily_network_stats_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `report_date` | date | NO | `n/a` |
| `country` | text | NO | `n/a` |
| `provider_name` | text | NO | `n/a` |
| `total_incidents` | integer | YES | `0` |
| `total_downtime_minutes` | integer | YES | `0` |
| `unique_sites_affected` | integer | YES | `0` |
| `daily_availability` | numeric | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |

---

### Tabla: `devices_inventory_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `network_id` | text | NO | `n/a` |
| `meraki_serial` | text | YES | `n/a` |
| `meraki_model` | text | YES | `n/a` |
| `raw_meraki_name` | text | YES | `n/a` |
| `meraki_url` | text | YES | `n/a` |
| `pais` | text | YES | `n/a` |
| `codigo_tienda` | text | YES | `n/a` |
| `nombre_tienda` | text | YES | `n/a` |
| `punto_cardinal` | text | YES | `n/a` |
| `direccion_domicilio` | text | YES | `n/a` |
| `coordenadas_geo` | text | YES | `n/a` |
| `correo_tienda` | text | YES | `n/a` |
| `es_tienda_top` | boolean | YES | `false` |
| `es_24_horas` | boolean | YES | `false` |
| `observaciones` | text | YES | `n/a` |
| `modelo_switch` | text | YES | `n/a` |
| `ip_switch` | text | YES | `n/a` |
| `wan1_provider_id` | bigint | YES | `n/a` |
| `wan1_id_servicio` | text | YES | `n/a` |
| `wan1_tipo_servicio` | text | YES | `n/a` |
| `wan1_tipo_configuracion` | text | YES | `n/a` |
| `wan1_bw` | text | YES | `n/a` |
| `wan1_ip_publica` | text | YES | `n/a` |
| `wan1_ip_wan` | text | YES | `n/a` |
| `wan1_mascara` | text | YES | `n/a` |
| `wan1_gateway` | text | YES | `n/a` |
| `wan1_puerto_router` | text | YES | `n/a` |
| `wan1_contingencia` | boolean | YES | `false` |
| `wan2_provider_id` | bigint | YES | `n/a` |
| `wan2_id_servicio` | text | YES | `n/a` |
| `wan2_tipo_servicio` | text | YES | `n/a` |
| `wan2_tipo_configuracion` | text | YES | `n/a` |
| `wan2_bw` | text | YES | `n/a` |
| `wan2_ip_publica` | text | YES | `n/a` |
| `wan2_ip_wan` | text | YES | `n/a` |
| `wan2_mascara` | text | YES | `n/a` |
| `wan2_gateway` | text | YES | `n/a` |
| `wan2_puerto_router` | text | YES | `n/a` |
| `wan2_contingencia` | boolean | YES | `false` |
| `tipo_enlace_calculado` | text | YES | `'Redundante'::text` |
| `last_seen_api` | timestamp with time zone | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'System'::text` |
| `updated_by` | text | YES | `n/a` |
| `es_monitoreable` | boolean | YES | `true` |

---

### Tabla: `home_content_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id_content` | bigint | NO | `n/a` |
| `card_type` | text | NO | `n/a` |
| `title` | text | NO | `n/a` |
| `description` | text | YES | `n/a` |
| `image_url` | text | NO | `n/a` |
| `is_active` | boolean | YES | `true` |
| `display_order` | integer | YES | `1` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `isp_contacts_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `provider_id` | bigint | YES | `n/a` |
| `level` | text | NO | `n/a` |
| `method` | text | NO | `n/a` |
| `value` | text | NO | `n/a` |
| `contact_name` | text | YES | `n/a` |
| `last_seen_api` | timestamp with time zone | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'System'::text` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `isp_providers_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `name` | text | NO | `n/a` |
| `country` | text | NO | `n/a` |
| `portal_url` | text | YES | `n/a` |
| `observations` | text | YES | `n/a` |
| `last_seen_api` | timestamp with time zone | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'System'::text` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `logs_frontend_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | uuid | NO | `gen_random_uuid()` |
| `action` | text | NO | `n/a` |
| `details` | jsonb | YES | `n/a` |
| `user_email` | text | YES | `n/a` |
| `created_at` | timestamp without time zone | NO | `(now() AT TIME ZONE 'America/Caracas'::t...` |
| `log_seq` | bigint | NO | `n/a` |

---

### Tabla: `massive_incidents_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `provider_name` | text | NO | `n/a` |
| `country` | text | NO | `n/a` |
| `total_provider_inventory` | integer | YES | `n/a` |
| `threshold_used` | integer | YES | `n/a` |
| `total_affected_initial` | integer | YES | `n/a` |
| `current_active_count` | integer | YES | `n/a` |
| `recovery_percentage` | double precision | YES | `0` |
| `status` | text | YES | `'Activa'::text` |
| `recovery_status` | text | YES | `'En Progreso'::text` |
| `classification` | text | YES | `'MASIVA'::text` |
| `root_cause` | text | YES | `'MASIVA DEL PROVEEDOR'::text` |
| `liability` | text | YES | `n/a` |
| `start_time` | timestamp with time zone | YES | `now()` |
| `recovery_start_time` | timestamp with time zone | YES | `n/a` |
| `end_time` | timestamp with time zone | YES | `n/a` |
| `slack_thread_ts` | text | YES | `n/a` |
| `logs` | jsonb | YES | `'[]'::jsonb` |
| `last_seen_api` | timestamp with time zone | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'System'::text` |
| `updated_by` | text | YES | `n/a` |
| `email_status_isp` | text | YES | `n/a` |
| `email_ts_isp` | text | YES | `n/a` |
| `msg_close_sent_at` | timestamp with time zone | YES | `n/a` |
| `closure_note` | text | YES | `n/a` |
| `closed_by_user` | text | YES | `n/a` |
| `closed_at` | timestamp with time zone | YES | `n/a` |

**Triggers Activos:**
- **trg_logic_massive** (`BEFORE INSERT`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`
- **trg_logic_massive** (`BEFORE UPDATE`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`

---

### Tabla: `network_degradations_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `network_id` | text | NO | `n/a` |
| `status` | text | YES | `'Activa'::text` |
| `diagnosis_text` | text | YES | `n/a` |
| `evidence_data` | jsonb | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'Nexus'::text` |
| `updated_by` | text | YES | `n/a` |
| `slack_thread_ts` | text | YES | `n/a` |
| `email_status` | text | YES | `n/a` |
| `email_ts` | text | YES | `n/a` |
| `analyst_notes` | jsonb | YES | `'[]'::jsonb` |
| `related_failure_id` | bigint | YES | `n/a` |
| `root_cause_degradacion` | text | YES | `n/a` |
| `liability_degradacion` | text | YES | `n/a` |
| `recovery_start_time` | timestamp with time zone | YES | `n/a` |
| `msg_recovery_sent_at` | timestamp with time zone | YES | `n/a` |
| `msg_close_sent_at` | timestamp with time zone | YES | `n/a` |
| `related_massive_id` | bigint | YES | `n/a` |
| `assigned_to` | text | YES | `n/a` |
| `system_logs` | jsonb | YES | `'[]'::jsonb` |
| `closure_note` | text | YES | `n/a` |
| `closed_by_user` | text | YES | `n/a` |
| `closed_at` | timestamp with time zone | YES | `n/a` |
| `duration_minutes` | integer | YES | `n/a` |

**Triggers Activos:**
- **trg_logic_degradations** (`BEFORE INSERT`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`
- **trg_logic_degradations** (`BEFORE UPDATE`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`

---

### Tabla: `network_failures_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `network_id` | text | NO | `n/a` |
| `lifecycle_stage` | text | YES | `'Activa'::text` |
| `site_impact` | text | YES | `'PARCIAL'::text` |
| `status` | text | YES | `'Activa'::text` |
| `es_falla_masiva` | boolean | YES | `false` |
| `slack_thread_ts` | text | YES | `n/a` |
| `wan1_status` | text | YES | `'UP'::text` |
| `wan1_massive_incident_id` | bigint | YES | `n/a` |
| `wan1_ticket_ref` | text | YES | `n/a` |
| `wan1_start_time` | timestamp with time zone | YES | `n/a` |
| `wan1_recovery_start_time` | timestamp with time zone | YES | `n/a` |
| `wan2_status` | text | YES | `'UP'::text` |
| `wan2_massive_incident_id` | bigint | YES | `n/a` |
| `wan2_ticket_ref` | text | YES | `n/a` |
| `wan2_start_time` | timestamp with time zone | YES | `n/a` |
| `wan2_recovery_start_time` | timestamp with time zone | YES | `n/a` |
| `root_cause` | text | YES | `n/a` |
| `liability` | text | YES | `n/a` |
| `analyst_notes` | jsonb | YES | `'[]'::jsonb` |
| `analyst_closure_check` | boolean | YES | `false` |
| `closure_classification` | text | YES | `n/a` |
| `closure_note` | text | YES | `n/a` |
| `closed_by_user` | text | YES | `n/a` |
| `closed_at` | timestamp with time zone | YES | `n/a` |
| `start_time` | timestamp with time zone | YES | `now()` |
| `last_detected_at` | timestamp with time zone | YES | `now()` |
| `recovery_time` | timestamp with time zone | YES | `n/a` |
| `recovery_start_time` | timestamp with time zone | YES | `n/a` |
| `duration_minutes` | integer | YES | `n/a` |
| `logs` | jsonb | YES | `'[]'::jsonb` |
| `last_seen_api` | timestamp with time zone | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `'System'::text` |
| `updated_by` | text | YES | `n/a` |
| `show_in_dashboard` | boolean | YES | `n/a` |
| `relapse_count` | integer | YES | `0` |
| `is_flapping` | boolean | YES | `false` |
| `wan1_downtime_minutes` | integer | YES | `0` |
| `wan2_downtime_minutes` | integer | YES | `0` |
| `total_downtime_minutes` | integer | YES | `0` |
| `msg_recovery_sent_at` | timestamp with time zone | YES | `n/a` |
| `msg_close_sent_at` | timestamp with time zone | YES | `n/a` |
| `email_status_w1` | text | YES | `n/a` |
| `email_ts_w1` | text | YES | `n/a` |
| `email_status_w2` | text | YES | `n/a` |
| `email_ts_w2` | text | YES | `n/a` |
| `sentinel_diagnosis_added` | boolean | YES | `false` |

**Triggers Activos:**
- **trg_logic_individual** (`BEFORE INSERT`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`
- **trg_logic_individual** (`BEFORE UPDATE`): Ejecuta `EXECUTE FUNCTION process_incident_logic_jj()`

---

### Tabla: `network_heartbeat_logs_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `network_id` | text | NO | `n/a` |
| `interface` | text | NO | `n/a` |
| `status_meraki` | text | NO | `n/a` |
| `latency_ms` | integer | YES | `n/a` |
| `loss_percent` | integer | YES | `n/a` |
| `public_ip` | text | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |

---

### Tabla: `network_metrics_history_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `network_id` | text | NO | `n/a` |
| `meraki_serial` | text | YES | `n/a` |
| `uplink_interface` | text | YES | `n/a` |
| `destination_ip` | text | YES | `n/a` |
| `loss_pct` | double precision | YES | `n/a` |
| `latency_ms` | double precision | YES | `n/a` |
| `recorded_at` | timestamp with time zone | YES | `now()` |

---

### Tabla: `profiles_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id_profile` | bigint | NO | `n/a` |
| `name` | text | NO | `n/a` |
| `description` | text | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `provider_tasks_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `tp_id` | bigint | NO | `n/a` |
| `tp_country` | text | NO | `n/a` |
| `tp_provider_id` | bigint | YES | `n/a` |
| `tp_start_time` | timestamp with time zone | NO | `n/a` |
| `tp_end_time` | timestamp with time zone | NO | `n/a` |
| `tp_duration_minutes` | integer | YES | `n/a` |
| `tp_title` | text | NO | `n/a` |
| `tp_observation` | text | YES | `n/a` |
| `tp_affected_stores` | ARRAY | YES | `n/a` |
| `created_at` | timestamp with time zone | NO | `timezone('utc'::text, now())` |
| `updated_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |
| `email_isp_task_ts` | text | YES | `n/a` |

---

### Tabla: `roles_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id_role` | bigint | NO | `n/a` |
| `name` | text | NO | `n/a` |
| `permissions` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |

---

### Tabla: `site_branding_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `asset_key` | text | NO | `n/a` |
| `asset_url` | text | NO | `n/a` |
| `description` | text | YES | `n/a` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |

---

### Tabla: `slack_channels_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id` | bigint | NO | `n/a` |
| `name_channel` | text | NO | `n/a` |
| `channel_id` | text | NO | `n/a` |
| `webhook_channel` | text | YES | `n/a` |
| `description_channel` | text | YES | `n/a` |
| `create_by` | text | YES | `n/a` |
| `created_at` | timestamp with time zone | NO | `timezone('utc'::text, now())` |
| `update_by` | text | YES | `n/a` |
| `updated_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |

---

### Tabla: `users_jj`
| Columna | Tipo de Dato | Nulo | Por Defecto |
| :--- | :--- | :--- | :--- |
| `id_user` | uuid | NO | `n/a` |
| `first_name` | text | NO | `n/a` |
| `last_name` | text | NO | `n/a` |
| `email` | text | NO | `n/a` |
| `profile_image_url` | text | YES | `n/a` |
| `password_hash` | text | YES | `n/a` |
| `last_password_update` | timestamp with time zone | YES | `n/a` |
| `id_profile` | bigint | YES | `n/a` |
| `id_area` | bigint | YES | `n/a` |
| `id_role` | bigint | YES | `n/a` |
| `is_active` | boolean | YES | `true` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `created_by` | text | YES | `n/a` |
| `updated_by` | text | YES | `n/a` |

---

## 2. Vistas (Views)

*No se encontraron vistas que terminen en `_jj` en el esquema público.*

## 3. Funciones Relevantes (RPCs)

### `register_ai_degradation_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.register_ai_degradation_jj(p_network_id text, p_massive_id bigint, p_failure_id bigint, p_existing_degrad_id bigint, p_assigned_to text, p_diagnosis text, p_evidence jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_degrad_id bigint := p_existing_degrad_id;
    v_action text := 'NONE';
    v_send_slack boolean := false;
    v_send_email boolean := false;
    v_slack_ts text;
    v_email_status text;
    v_log_msg text;
    v_now text := to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS');
BEGIN
    v_log_msg := '🤖 [DIAGNÓSTICO NEXUS] ' || p_diagnosis;

    -- A. LÓGICA DE REGISTRO / ACTUALIZACIÓN INDIVIDUAL
    IF v_degrad_id IS NULL THEN
        -- NUEVA DEGRADACIÓN: Insertamos el registro maestro vinculando todo
        INSERT INTO public.network_degradations_jj (
            network_id, status, diagnosis_text, evidence_data, assigned_to, related_massive_id, related_failure_id, updated_at, updated_by, system_logs
        ) VALUES (
            p_network_id, 'Activa', p_diagnosis, p_evidence, p_assigned_to, p_massive_id, p_failure_id, NOW(), 'Nexus', 
            jsonb_build_array(jsonb_build_object('log', v_now || ' : ' || v_log_msg))
        ) RETURNING id INTO v_degrad_id;
        
        v_send_slack := true;
        v_send_email := true;
    ELSE
        -- DEGRADACIÓN EXISTENTE: Actualizamos evidencias y añadimos al log de sistema (No sobrescribimos notas humanas)
        SELECT slack_thread_ts, email_status INTO v_slack_ts, v_email_status FROM public.network_degradations_jj WHERE id = v_degrad_id;
        
        UPDATE public.network_degradations_jj
        SET diagnosis_text = p_diagnosis, evidence_data = p_evidence, assigned_to = p_assigned_to, updated_at = NOW(), updated_by = 'Nexus',
            status = CASE WHEN status = 'Pendiente por cierre' THEN 'Activa' ELSE status END,
            system_logs = COALESCE(system_logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', v_now || ' : ' || v_log_msg))
        WHERE id = v_degrad_id;

        -- IDEMPOTENCIA: Si no se han enviado, dar la orden a n8n de enviarlos ahora
        IF v_slack_ts IS NULL THEN v_send_slack := true; END IF;
        IF v_email_status IS NULL THEN v_send_email := true; END IF;
    END IF;

    -- B. LÓGICA DE INYECCIÓN AL PADRE (Falla Masiva)
    IF p_massive_id IS NOT NULL THEN
        -- Si esta degradación pertenece a una masiva, anexamos el reporte de la IA a la bitácora del Padre
        UPDATE public.massive_incidents_jj
        SET logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', v_now || ' : 🤖 [NEXUS - Aporte de Tienda] ' || p_diagnosis))
        WHERE id = p_massive_id
        -- Seguro anti-duplicados para no inundar el log de la masiva con la misma nota
        AND NOT COALESCE(logs::text, '') LIKE '%' || p_diagnosis || '%';
    END IF;

    -- Devolvemos las instrucciones exactas a n8n
    RETURN jsonb_build_object(
        'degrad_id', v_degrad_id,
        'assigned_to', p_assigned_to,
        'trigger_slack', v_send_slack,
        'trigger_email', v_send_email
    );
END;
$function$

```

</details>

### `nexus_master_triage_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.nexus_master_triage_jj(p_devices jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_device jsonb;
    v_net_id text;
    v_status text;
    v_isp_name text;
    v_massive_id bigint;
    v_failure_id bigint;
    v_degrad_id bigint;
    v_requires_ai jsonb := '[]'::jsonb;
    v_recovered_count int := 0;
    v_massive_discard_count int := 0;
BEGIN
    -- 1. SANACIÓN MASIVA: Procesar los que están 'online'
    WITH online_nets AS (
        SELECT value->>'networkId' AS network_id
        FROM jsonb_array_elements(p_devices)
        WHERE value->>'status' = 'online'
    ),
    updated_obs AS (
        UPDATE public.network_degradations_jj nd
        SET status = 'En observación', recovery_start_time = NOW(), updated_at = NOW(), updated_by = 'Nexus'
        FROM online_nets onet
        WHERE nd.network_id = onet.network_id AND nd.status IN ('Activa', 'En gestión')
        RETURNING nd.id
    )
    SELECT count(*) INTO v_recovered_count FROM updated_obs;

    -- Cerrar los que pasaron su cuarentena de 60 min
    UPDATE public.network_degradations_jj
    SET status = 'Pendiente por cierre', updated_at = NOW(), updated_by = 'Nexus'
    WHERE status = 'En observación' AND recovery_start_time <= NOW() - INTERVAL '60 minutes';

    -- 2. SUPRESIÓN Y FILTRADO: Procesar los que están 'alerting'
    FOR v_device IN SELECT * FROM jsonb_array_elements(p_devices)
    LOOP
        v_status := v_device->>'status';
        v_net_id := v_device->>'networkId';

        IF v_status = 'alerting' THEN
            -- A. Saber de qué ISP es esta tienda
            SELECT provider_1_name INTO v_isp_name
            FROM public.devices_inventory_jj WHERE network_id = v_net_id;

            -- B. Buscar si ese ISP tiene un Incidente Masivo Activo
            SELECT id INTO v_massive_id
            FROM public.massive_incidents_jj
            WHERE provider_name = v_isp_name AND status IN ('Activa', 'En gestión', 'En observación')
            LIMIT 1;

            IF v_massive_id IS NOT NULL THEN
                -- C. ESTÁ EN MASIVA: Suprimimos de la IA, pero documentamos el aporte.
                v_massive_discard_count := v_massive_discard_count + 1;

                -- Buscamos el caso individual abierto para relacionarlo
                SELECT id INTO v_failure_id FROM public.network_failures_jj
                WHERE network_id = v_net_id AND lifecycle_stage IN ('Activa', 'En gestión', 'En observación', 'Intermitencia')
                ORDER BY created_at DESC LIMIT 1;

                -- Buscamos si ya tiene tarjeta morada
                SELECT id INTO v_degrad_id FROM public.network_degradations_jj
                WHERE network_id = v_net_id AND status IN ('Activa', 'En gestión', 'En observación')
                ORDER BY created_at DESC LIMIT 1;

                IF v_degrad_id IS NULL THEN
                    INSERT INTO public.network_degradations_jj (network_id, status, diagnosis_text, related_failure_id, updated_at, updated_by)
                    VALUES (v_net_id, 'Activa', '⚠️ [SUPRIMIDO POR NEXUS] Degradación aislada omitida. La tienda se encuentra bajo afectación por Falla Masiva del proveedor ' || COALESCE(v_isp_name, 'ISP') || '.', v_failure_id, NOW(), 'Nexus');
                ELSE
                    UPDATE public.network_degradations_jj
                    SET diagnosis_text = '⚠️ [SUPRIMIDO POR NEXUS] Degradación aislada omitida. La tienda se encuentra bajo afectación por Falla Masiva del proveedor ' || COALESCE(v_isp_name, 'ISP') || '.',
                        related_failure_id = v_failure_id, updated_at = NOW(), updated_by = 'Nexus'
                    WHERE id = v_degrad_id;
                END IF;
            ELSE
                -- D. NO ES MASIVA: Es un problema aislado real. Lo empacamos para la IA.
                v_requires_ai := v_requires_ai || v_device;
            END IF;
        END IF;
    END LOOP;

    -- Devolvemos el reporte a n8n
    RETURN jsonb_build_object(
        'alerting_for_ai', v_requires_ai,
        'massive_discarded', v_massive_discard_count,
        'recovered', v_recovered_count
    );
END;
$function$

```

</details>

### `close_massive_incident_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.close_massive_incident_jj(p_massive_id bigint, p_root_cause text, p_liability text, p_closure_note text, p_closed_by_user text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated_individuals int;
    v_log_msg_massive text;
    v_log_msg_individual text;
    v_now timestamp with time zone := NOW();
    v_formatted_date text := to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS');
BEGIN
    -- 1. CONSTRUCCIÓN DE MENSAJES PARA BITÁCORAS
    v_log_msg_massive := 'Nota de cierre: ' || p_closure_note || '. El caso pasa de "Pendiente por cierre" a "Resuelta". Cerrado por: ' || p_closed_by_user;
    v_log_msg_individual := 'Nota de cierre (Heredada de Falla Masiva ID ' || p_massive_id || '): ' || p_closure_note || '. El caso pasa a "Resuelta". Cerrado por: ' || p_closed_by_user;

    -- 2. CIERRE DE LA FALLA MASIVA (EL PADRE)
    UPDATE public.massive_incidents_jj
    SET 
        status = 'Resuelta',
        root_cause = p_root_cause,
        liability = p_liability,
        closure_note = p_closure_note,
        closed_by_user = p_closed_by_user,
        closed_at = v_now,
        end_time = v_now,
        updated_at = v_now,
        logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object('log', v_formatted_date || ' : ' || v_log_msg_massive)
        )
    WHERE id = p_massive_id;

    -- 3. CIERRE EN CASCADA DE FALLAS INDIVIDUALES (LOS HIJOS)
    WITH updated_rows AS (
        UPDATE public.network_failures_jj
        SET 
            lifecycle_stage = 'Resuelta',
            status = 'Resuelta',
            root_cause = p_root_cause,
            liability = p_liability,
            closure_note = p_closure_note,
            closed_by_user = p_closed_by_user,
            closed_at = v_now,
            analyst_closure_check = true,
            updated_at = v_now,
            analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object('log', v_formatted_date || ' : ' || v_log_msg_individual)
            )
        -- Condición: Que la tienda tenga este ID de Masiva en WAN1 o WAN2, y que no esté cerrada ya.
        WHERE (wan1_massive_incident_id = p_massive_id OR wan2_massive_incident_id = p_massive_id)
          AND lifecycle_stage != 'Resuelta'
        RETURNING id
    )
    SELECT count(*) INTO v_updated_individuals FROM updated_rows;

    -- 4. RESPUESTA AL FRONTEND
    RETURN jsonb_build_object(
        'success', true,
        'massive_id', p_massive_id,
        'individual_cases_closed', v_updated_individuals,
        'message', 'Falla masiva y ' || v_updated_individuals || ' tiendas hijas cerradas exitosamente.'
    );
END;
$function$

```

</details>

### `close_massive_incident_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.close_massive_incident_jj(p_massive_id bigint, p_root_cause text, p_closure_note text, p_closed_by_user text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated_individuals int;
    v_log_msg text;
    v_now timestamp with time zone := NOW();
    v_formatted_date text := to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS');
BEGIN
    -- 1. ACTUALIZAR LA FALLA MASIVA (EL PADRE)
    v_log_msg := 'Nota de cierre: ' || p_closure_note || '. El caso pasa de "Pendiente por cierre" a "Resuelta". Cerrado por: ' || p_closed_by_user;
    
    UPDATE public.massive_incidents_jj
    SET 
        status = 'Resuelta',
        root_cause = p_root_cause,
        closure_note = p_closure_note,
        closed_by_user = p_closed_by_user,
        closed_at = v_now,
        end_time = v_now,
        updated_at = v_now,
        logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object('log', v_formatted_date || ' : ' || v_log_msg)
        )
    WHERE id = p_massive_id;

    -- 2. CIERRE EN CASCADA DE FALLAS INDIVIDUALES (LOS HIJOS)
    v_log_msg := 'Nota de cierre (Heredada de Falla Masiva ID ' || p_massive_id || '): ' || p_closure_note || '. El caso pasa a "Resuelta". Cerrado por: ' || p_closed_by_user;

    WITH updated_rows AS (
        UPDATE public.network_failures_jj
        SET 
            lifecycle_stage = 'Resuelta',
            status = 'Resuelta',
            root_cause = p_root_cause,
            closure_note = p_closure_note,
            closed_by_user = p_closed_by_user,
            closed_at = v_now,
            analyst_closure_check = true,
            updated_at = v_now,
            analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object('log', v_formatted_date || ' : ' || v_log_msg)
            )
        WHERE (wan1_massive_incident_id = p_massive_id OR wan2_massive_incident_id = p_massive_id)
          AND lifecycle_stage != 'Resuelta'
        RETURNING id
    )
    SELECT count(*) INTO v_updated_individuals FROM updated_rows;

    -- 3. RETORNAR RESULTADO
    RETURN jsonb_build_object(
        'success', true,
        'massive_id', p_massive_id,
        'individual_cases_closed', v_updated_individuals,
        'message', 'Falla masiva y ' || v_updated_individuals || ' tiendas hijas cerradas exitosamente.'
    );
END;
$function$

```

</details>

### `process_site_health_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.process_site_health_jj(p_network_id text, p_wan1_status text, p_wan2_status text, p_wan1_log jsonb, p_wan2_log jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$ 
DECLARE
    v_store_name text; v_pais text; v_link_type text;
    v_wan1_prov_id bigint; v_wan2_prov_id bigint;
    v_prov1_name text; v_prov2_name text;
    v_codigo_tienda text; v_meraki_url text;
    v_es_monitoreable boolean;
    v_direccion_domicilio text; v_correo_tienda text;
    v_w1_id_servicio text; v_w1_ip_publica text; v_w1_ip_wan text; v_w1_gateway text; 
    v_w1_email_soporte text; v_w1_tlf text; v_w1_wa text; 
    v_w2_id_servicio text; v_w2_ip_publica text; v_w2_ip_wan text; v_w2_gateway text; 
    v_w2_email_soporte text; v_w2_tlf text; v_w2_wa text; 
    v_w1_contacto_resumen text; v_w2_contacto_resumen text; v_log_contactos_full text; 
    v_w1_down boolean; v_w2_down boolean; v_new_impact text; 
    v_fail_id bigint; v_old_impact text; v_old_stage text; v_old_ts text; v_old_recov_start timestamp; 
    v_es_masiva_tienda boolean; v_ticket_ref text; v_relapse_count int; 
    v_msg_recovery_at timestamp; v_msg_close_at timestamp; v_start_time timestamp;
    v_store_massive_id bigint; v_is_flapping boolean;
    v_out_w1_recov timestamp; v_out_w2_recov timestamp; v_out_w1_min int; v_out_w2_min int;
    v_wan_afectada_texto text; v_wan_recuperada_texto text;
    v_provider_affected_id bigint; v_provider_affected_name text;
    v_total_provider_devices int; v_total_provider_failures int;
    v_massive_threshold float; v_massive_id bigint; v_massive_ts text; v_massive_start timestamp;
    v_recovery_pct float; v_last_recovery_pct float; v_massive_status text;
    v_massive_msg_close_at timestamp;
    v_massive_logs jsonb; 
    v_provider_support_email text; v_affected_stores_json jsonb; v_count_total_impact int; v_count_partial_impact int; v_stores_text_list text; v_massive_log_text text;
    v_massive_initial int; v_massive_remaining int; v_relative_recov_pct float;
    v_is_massive_context boolean := false;
    v_target_channel text; c_channel_incidencias text := 'C07FZE49ZPW'; c_channel_interno text := 'C07FZE49ZPW'; v_log_msg text;
BEGIN
    -- 1. CARGA DE DATOS BÁSICA
    SELECT i.nombre_tienda, i.pais, i.codigo_tienda, i.meraki_url, i.es_monitoreable, i.tipo_enlace_calculado, i.wan1_provider_id, i.wan2_provider_id, p1.name, p2.name, i.direccion_domicilio, i.correo_tienda, i.wan1_id_servicio, i.wan1_ip_publica, i.wan1_ip_wan, i.wan1_gateway, i.wan2_id_servicio, i.wan2_ip_publica, i.wan2_ip_wan, i.wan2_gateway,
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan1_provider_id AND c.level = 'Nivel 1' AND c.method = 'Correo' AND value IS NOT NULL LIMIT 1),
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan1_provider_id AND c.level = 'Nivel 1' AND c.method = 'Llamada' LIMIT 1),
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan1_provider_id AND c.level = 'Nivel 1' AND c.method = 'Whatsapp' LIMIT 1),
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan2_provider_id AND c.level = 'Nivel 1' AND c.method = 'Correo' AND value IS NOT NULL LIMIT 1),
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan2_provider_id AND c.level = 'Nivel 1' AND c.method = 'Llamada' LIMIT 1),
           (SELECT value FROM public.isp_contacts_jj c WHERE c.provider_id = i.wan2_provider_id AND c.level = 'Nivel 1' AND c.method = 'Whatsapp' LIMIT 1)
    INTO v_store_name, v_pais, v_codigo_tienda, v_meraki_url, v_es_monitoreable, v_link_type, v_wan1_prov_id, v_wan2_prov_id, v_prov1_name, v_prov2_name, v_direccion_domicilio, v_correo_tienda, v_w1_id_servicio, v_w1_ip_publica, v_w1_ip_wan, v_w1_gateway, v_w2_id_servicio, v_w2_ip_publica, v_w2_ip_wan, v_w2_gateway, v_w1_email_soporte, v_w1_tlf, v_w1_wa, v_w2_email_soporte, v_w2_tlf, v_w2_wa
    FROM public.devices_inventory_jj i LEFT JOIN public.isp_providers_jj p1 ON i.wan1_provider_id = p1.id LEFT JOIN public.isp_providers_jj p2 ON i.wan2_provider_id = p2.id WHERE i.network_id = p_network_id;

    IF v_store_name IS NULL THEN RETURN jsonb_build_object('action', 'SKIP', 'msg', 'No inventory'); END IF;
    IF v_es_monitoreable IS FALSE THEN RETURN jsonb_build_object('action', 'NONE', 'msg', 'Sitio excluido de monitoreo'); END IF;

    v_w1_contacto_resumen := COALESCE('🔹 WAN1 [' || v_prov1_name || '] - Nivel 1: ✉️ ' || v_w1_email_soporte || ' | 📞 ' || v_w1_tlf || ' | 📱 ' || v_w1_wa, '🔹 WAN1: No configurada');
    v_w2_contacto_resumen := COALESCE('🔹 WAN2 [' || v_prov2_name || '] - Nivel 1: ✉️ ' || v_w2_email_soporte || ' | 📞 ' || v_w2_tlf || ' | 📱 ' || v_w2_wa, '🔹 WAN2: No configurada');
    v_log_contactos_full := E'[INFO CONTACTO PROVEEDORES]\n' || v_w1_contacto_resumen || E'\n' || v_w2_contacto_resumen || ' - Nexus';

    INSERT INTO public.network_heartbeat_logs_jj (network_id, interface, status_meraki, created_at) VALUES (p_network_id, 'wan1', p_wan1_status, NOW()), (p_network_id, 'wan2', p_wan2_status, NOW());

    v_w1_down := (p_wan1_status IN ('failed', 'not connected') AND v_wan1_prov_id IS NOT NULL);
    v_w2_down := (p_wan2_status IN ('failed', 'not connected') AND v_wan2_prov_id IS NOT NULL);

    IF v_w1_down AND v_w2_down THEN v_new_impact := 'TOTAL'; ELSIF (v_w1_down OR v_w2_down) AND v_link_type = 'Monoenlace' THEN v_new_impact := 'TOTAL'; ELSIF (v_w1_down OR v_w2_down) THEN v_new_impact := 'PARCIAL'; ELSE v_new_impact := 'OK'; END IF;
    IF v_new_impact = 'TOTAL' THEN v_target_channel := c_channel_incidencias; ELSE v_target_channel := c_channel_interno; END IF;

    SELECT id, site_impact, lifecycle_stage, slack_thread_ts, recovery_start_time, es_falla_masiva, COALESCE(wan1_ticket_ref, wan2_ticket_ref), relapse_count, msg_recovery_sent_at, msg_close_sent_at, start_time, COALESCE(wan1_massive_incident_id, wan2_massive_incident_id), is_flapping
    INTO v_fail_id, v_old_impact, v_old_stage, v_old_ts, v_old_recov_start, v_es_masiva_tienda, v_ticket_ref, v_relapse_count, v_msg_recovery_at, v_msg_close_at, v_start_time, v_store_massive_id, v_is_flapping
    FROM public.network_failures_jj WHERE network_id = p_network_id AND lifecycle_stage NOT IN ('Resuelta', 'Falso Positivo') LIMIT 1;

    IF v_w1_down AND v_w2_down THEN v_wan_afectada_texto := 'WAN1 - ' || COALESCE(v_prov1_name, 'N/A') || ' / WAN2 - ' || COALESCE(v_prov2_name, 'N/A');
    ELSIF v_w1_down THEN v_wan_afectada_texto := 'WAN1 - ' || COALESCE(v_prov1_name, 'N/A');
    ELSIF v_w2_down THEN v_wan_afectada_texto := 'WAN2 - ' || COALESCE(v_prov2_name, 'N/A'); END IF;

    IF NOT v_w1_down AND NOT v_w2_down THEN v_wan_recuperada_texto := 'Ambas WAN';
    ELSIF NOT v_w1_down AND v_old_impact = 'TOTAL' THEN v_wan_recuperada_texto := 'WAN1 - ' || COALESCE(v_prov1_name, 'N/A');
    ELSIF NOT v_w2_down AND v_old_impact = 'TOTAL' THEN v_wan_recuperada_texto := 'WAN2 - ' || COALESCE(v_prov2_name, 'N/A');
    ELSE v_wan_recuperada_texto := 'WAN'; END IF; 

    -- ==============================================================================
    -- 2. CÁLCULO DE FALLA MASIVA
    -- ==============================================================================
    v_provider_affected_id := NULL;
    IF v_w1_down THEN v_provider_affected_id := v_wan1_prov_id; ELSIF v_w2_down THEN v_provider_affected_id := v_wan2_prov_id; END IF;
    IF v_new_impact = 'OK' AND v_store_massive_id IS NOT NULL THEN SELECT p.id INTO v_provider_affected_id FROM public.massive_incidents_jj m JOIN public.isp_providers_jj p ON m.provider_name = p.name WHERE m.id = v_store_massive_id LIMIT 1; END IF;

    IF v_provider_affected_id IS NOT NULL THEN
        SELECT name INTO v_provider_affected_name FROM public.isp_providers_jj WHERE id = v_provider_affected_id;
        
        SELECT id, slack_thread_ts, recovery_percentage, start_time, status, msg_close_sent_at, logs 
        INTO v_massive_id, v_massive_ts, v_last_recovery_pct, v_massive_start, v_massive_status, v_massive_msg_close_at, v_massive_logs
        FROM public.massive_incidents_jj WHERE provider_name = v_provider_affected_name AND country = v_pais AND status != 'Resuelta' LIMIT 1;
        
        SELECT count(*) INTO v_total_provider_devices FROM public.devices_inventory_jj WHERE (wan1_provider_id = v_provider_affected_id OR wan2_provider_id = v_provider_affected_id) AND pais = v_pais;
        SELECT count(*) INTO v_total_provider_failures FROM public.network_failures_jj f JOIN public.devices_inventory_jj i ON f.network_id = i.network_id WHERE f.lifecycle_stage IN ('Activa', 'En gestión', 'Intermitencia') AND i.pais = v_pais AND ((f.wan1_status = 'DOWN' AND i.wan1_provider_id = v_provider_affected_id) OR (f.wan2_status = 'DOWN' AND i.wan2_provider_id = v_provider_affected_id));
        
        IF v_new_impact != 'OK' AND v_fail_id IS NULL THEN v_total_provider_failures := v_total_provider_failures + 1; END IF; 
        IF v_new_impact = 'OK' AND v_old_stage IN ('Activa', 'En gestión', 'Intermitencia') THEN v_total_provider_failures := GREATEST(0, v_total_provider_failures - 1); END IF; 
        IF v_total_provider_devices > 0 THEN v_massive_threshold := (v_total_provider_failures::float / v_total_provider_devices::float); v_recovery_pct := 100.0 - (v_massive_threshold * 100.0); ELSE v_massive_threshold := 0; v_recovery_pct := 100; END IF;
        
        IF v_massive_threshold >= 0.15 OR v_es_masiva_tienda = true THEN
            v_is_massive_context := true; 
            IF v_massive_threshold >= 0.15 THEN
                IF v_massive_id IS NULL THEN
                    INSERT INTO public.massive_incidents_jj (provider_name, country, total_provider_inventory, total_affected_initial, current_active_count, recovery_percentage, status, start_time) VALUES (v_provider_affected_name, v_pais, v_total_provider_devices, v_total_provider_failures, v_total_provider_failures, 0, 'Activa', NOW()) RETURNING id, start_time INTO v_massive_id, v_massive_start; v_massive_ts := NULL; v_massive_status := 'Activa'; v_massive_logs := '[]'::jsonb;
                ELSE 
                    IF v_total_provider_failures > 0 THEN UPDATE public.massive_incidents_jj SET current_active_count = v_total_provider_failures, total_affected_initial = GREATEST(total_affected_initial, v_total_provider_failures), recovery_percentage = v_recovery_pct, status = 'Activa', updated_at = NOW(), msg_close_sent_at = NULL WHERE id = v_massive_id; v_massive_status := 'Activa'; END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    -- ==============================================================================
    -- 3. ACTUALIZACIÓN INDIVIDUAL
    -- ==============================================================================
    IF v_fail_id IS NULL THEN
        IF v_new_impact != 'OK' THEN
            INSERT INTO public.network_failures_jj (network_id, lifecycle_stage, site_impact, wan1_status, wan2_status, start_time, logs, analyst_notes, relapse_count, wan1_downtime_minutes, wan2_downtime_minutes, total_downtime_minutes, wan1_start_time, wan2_start_time, es_falla_masiva, wan1_massive_incident_id, wan2_massive_incident_id) 
            VALUES (p_network_id, 'Activa', v_new_impact, CASE WHEN v_w1_down THEN 'DOWN' ELSE 'UP' END, CASE WHEN v_w2_down THEN 'DOWN' ELSE 'UP' END, NOW(), p_wan1_log || p_wan2_log, '[]'::jsonb, 0, CASE WHEN v_w1_down THEN 1 ELSE 0 END, CASE WHEN v_w2_down THEN 1 ELSE 0 END, CASE WHEN v_new_impact='TOTAL' THEN 1 ELSE 0 END, CASE WHEN v_w1_down THEN NOW() ELSE NULL END, CASE WHEN v_w2_down THEN NOW() ELSE NULL END, v_is_massive_context, 
            CASE WHEN v_w1_down AND v_is_massive_context AND v_wan1_prov_id = v_provider_affected_id THEN v_massive_id ELSE NULL END, 
            CASE WHEN v_w2_down AND v_is_massive_context AND v_wan2_prov_id = v_provider_affected_id THEN v_massive_id ELSE NULL END) 
            RETURNING id INTO v_fail_id;
        END IF;
    ELSE 
        UPDATE public.network_failures_jj 
        SET last_detected_at = NOW(), site_impact = CASE WHEN v_new_impact != 'OK' THEN v_new_impact ELSE site_impact END, wan1_status = CASE WHEN v_w1_down THEN 'DOWN' ELSE 'UP' END, wan2_status = CASE WHEN v_w2_down THEN 'DOWN' ELSE 'UP' END, wan1_downtime_minutes = wan1_downtime_minutes + CASE WHEN v_w1_down THEN 1 ELSE 0 END, wan2_downtime_minutes = wan2_downtime_minutes + CASE WHEN v_w2_down THEN 1 ELSE 0 END, total_downtime_minutes = total_downtime_minutes + CASE WHEN v_new_impact = 'TOTAL' THEN 1 ELSE 0 END, wan1_start_time = CASE WHEN v_w1_down AND wan1_status = 'UP' THEN NOW() WHEN v_w1_down AND wan1_start_time IS NULL THEN NOW() ELSE wan1_start_time END, wan1_recovery_start_time = CASE WHEN NOT v_w1_down AND wan1_status = 'DOWN' THEN NOW() WHEN v_w1_down THEN NULL ELSE wan1_recovery_start_time END, wan2_start_time = CASE WHEN v_w2_down AND wan2_status = 'UP' THEN NOW() WHEN v_w2_down AND wan2_start_time IS NULL THEN NOW() ELSE wan2_start_time END, wan2_recovery_start_time = CASE WHEN NOT v_w2_down AND wan2_status = 'DOWN' THEN NOW() WHEN v_w2_down THEN NULL ELSE wan2_recovery_start_time END, es_falla_masiva = CASE WHEN v_is_massive_context THEN true ELSE es_falla_masiva END, 
        wan1_massive_incident_id = CASE WHEN v_w1_down AND v_is_massive_context AND v_wan1_prov_id = v_provider_affected_id THEN v_massive_id ELSE wan1_massive_incident_id END, 
        wan2_massive_incident_id = CASE WHEN v_w2_down AND v_is_massive_context AND v_wan2_prov_id = v_provider_affected_id THEN v_massive_id ELSE wan2_massive_incident_id END 
        WHERE id = v_fail_id;
    END IF;

    -- ==============================================================================
    -- 4. LÓGICA MASIVA (IDEMPOTENCIA Y CASCADA SILENCIOSA)
    -- ==============================================================================
    IF v_is_massive_context = true THEN
        IF v_new_impact = 'OK' THEN
            IF v_old_stage = 'Activa' THEN
                UPDATE public.network_failures_jj SET lifecycle_stage = 'Falso Positivo', status = 'Falso Positivo', closed_at = NOW() WHERE id = v_fail_id;
            ELSIF v_old_stage IN ('En gestión', 'Intermitencia') THEN
                v_log_msg := 'Enlace en la ' || v_wan_recuperada_texto || ' restablecido, el caso pasa a "En observación" por 60 minutos.';
                UPDATE public.network_failures_jj SET lifecycle_stage = 'En observación', recovery_start_time = NOW(), analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id;
                
                SELECT total_affected_initial INTO v_massive_initial FROM public.massive_incidents_jj WHERE id = COALESCE(v_massive_id, v_store_massive_id);
                IF v_massive_initial > 0 THEN v_relative_recov_pct := ((v_massive_initial - v_total_provider_failures)::float / v_massive_initial::float) * 100.0; ELSE v_relative_recov_pct := 100.0; END IF;
                
                v_log_msg := '✅ ' || v_store_name || ' recuperada. Progreso de la crisis: ' || round(v_relative_recov_pct::numeric, 0) || '% (' || (v_massive_initial - v_total_provider_failures) || '/' || v_massive_initial || ' tiendas).';
                
                IF NOT v_massive_logs @> jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) THEN
                    UPDATE public.massive_incidents_jj SET logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = COALESCE(v_massive_id, v_store_massive_id);
                END IF;
            ELSIF v_old_stage = 'En observación' AND (NOW() - v_old_recov_start) > INTERVAL '60 minutes' THEN
                v_log_msg := 'Recuperación confirmada, estable por > 60 min. Pasa a "Pendiente por cierre".';
                UPDATE public.network_failures_jj SET lifecycle_stage = 'Pendiente por cierre' WHERE id = v_fail_id;
            END IF;
        END IF;

        IF v_massive_status = 'Activa' AND v_massive_threshold >= 0.15 AND v_massive_ts IS NULL AND (NOW() - v_massive_start) > INTERVAL '5 minutes' THEN 
             SELECT value INTO v_provider_support_email FROM public.isp_contacts_jj WHERE provider_id = v_provider_affected_id AND level = 'Nivel 1' AND method = 'Correo' AND value IS NOT NULL LIMIT 1;
             SELECT jsonb_agg(jsonb_build_object('tienda', i.nombre_tienda, 'circuito', CASE WHEN i.wan1_provider_id = v_provider_affected_id THEN i.wan1_id_servicio ELSE i.wan2_id_servicio END, 'ip_pub', CASE WHEN i.wan1_provider_id = v_provider_affected_id THEN i.wan1_ip_publica ELSE i.wan2_ip_publica END, 'ip_wan', CASE WHEN i.wan1_provider_id = v_provider_affected_id THEN i.wan1_ip_wan ELSE i.wan2_ip_wan END, 'gateway', CASE WHEN i.wan1_provider_id = v_provider_affected_id THEN i.wan1_gateway ELSE i.wan2_gateway END, 'direccion', i.direccion_domicilio)), COUNT(*) FILTER (WHERE f.site_impact = 'TOTAL'), COUNT(*) FILTER (WHERE f.site_impact = 'PARCIAL'), string_agg('• ' || i.nombre_tienda || ' | WAN1 [' || COALESCE(p1.name, 'N/A') || '] - ' || f.wan1_status || ' | WAN2 [' || COALESCE(p2.name, 'N/A') || '] - ' || f.wan2_status, E'\n') INTO v_affected_stores_json, v_count_total_impact, v_count_partial_impact, v_stores_text_list FROM public.network_failures_jj f JOIN public.devices_inventory_jj i ON f.network_id = i.network_id LEFT JOIN public.isp_providers_jj p1 ON i.wan1_provider_id = p1.id LEFT JOIN public.isp_providers_jj p2 ON i.wan2_provider_id = p2.id WHERE f.lifecycle_stage IN ('Activa', 'En gestión') AND i.pais = v_pais AND ((f.wan1_status = 'DOWN' AND i.wan1_provider_id = v_provider_affected_id) OR (f.wan2_status = 'DOWN' AND i.wan2_provider_id = v_provider_affected_id));
             v_massive_log_text := '📋 CHECKLIST DE AFECTACIÓN MASIVA' || E'\n===================================\n• Proveedor Afectado: ' || v_provider_affected_name || E'\n• Inventario Total: ' || v_total_provider_devices || E'\n• Tiendas Caídas: ' || v_total_provider_failures || E'\n• Porcentaje: ' || round((v_massive_threshold * 100)::numeric, 2) || '%' || E'\n• Totales: ' || COALESCE(v_count_total_impact, 0) || E'\n• Parciales: ' || COALESCE(v_count_partial_impact, 0) || E'\n\n🏢 ESTADOS:\n' || COALESCE(v_stores_text_list, 'Sin tiendas');
             
             IF NOT v_massive_logs::text LIKE '%' || 'CHECKLIST DE AFECTACIÓN MASIVA' || '%' THEN
                 UPDATE public.massive_incidents_jj SET logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || E'\n' || v_massive_log_text)) WHERE id = v_massive_id;
             END IF;

             RETURN jsonb_build_object('action', 'TRIGGER_MASSIVE_PROTOCOL', 'channel', c_channel_incidencias, 'pais', v_pais, 'proveedor', v_provider_affected_name, 'massive_id', v_massive_id, 'email_soporte', COALESCE(v_provider_support_email, 'N/A'), 'email_bmc', COALESCE(v_correo_tienda, 'cemo@farmatodo.com'), 'tiendas_data', COALESCE(v_affected_stores_json, '[]'::jsonb), 'total_afectadas', v_total_provider_failures, 'porcentaje', round((v_massive_threshold * 100)::numeric, 2)); 
        END IF;

        IF v_massive_status = 'Activa' AND v_massive_threshold >= 0.15 AND v_massive_ts IS NOT NULL THEN
             IF (v_last_recovery_pct < 25 AND v_recovery_pct >= 25) OR (v_last_recovery_pct < 50 AND v_recovery_pct >= 50) OR (v_last_recovery_pct < 75 AND v_recovery_pct >= 75) THEN 
                  RETURN jsonb_build_object('action', 'TRIGGER_MASSIVE_UPDATE', 'channel', c_channel_incidencias, 'slack_ts', v_massive_ts, 'proveedor', v_provider_affected_name, 'recovery_pct', round(v_recovery_pct::numeric, 0), 'tiendas_restantes', v_total_provider_failures); 
             END IF; 
        END IF;

        IF v_massive_id IS NOT NULL AND v_massive_threshold < 0.05 AND v_total_provider_failures > 0 THEN
            IF v_massive_status = 'Activa' THEN
                v_massive_log_text := '🟢 Afectación global < 5%. La Masiva pasa a estado "En observación". - Nexus';
                IF NOT v_massive_logs @> jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_massive_log_text)) THEN
                    UPDATE public.massive_incidents_jj SET status = 'En observación', current_active_count = v_total_provider_failures, recovery_percentage = v_recovery_pct, updated_at = NOW(), logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_massive_log_text)) WHERE id = v_massive_id;
                END IF;
                IF v_massive_ts IS NOT NULL THEN RETURN jsonb_build_object('action', 'TRIGGER_MASSIVE_OBSERVATION', 'channel', c_channel_incidencias, 'slack_ts', v_massive_ts, 'proveedor', v_provider_affected_name, 'pais', v_pais, 'tiendas_restantes', v_total_provider_failures); END IF;
            END IF;
        END IF;

        IF v_massive_id IS NOT NULL AND v_total_provider_failures = 0 THEN
            IF v_massive_status IN ('Activa', 'En observación') OR (v_massive_status = 'Pendiente por cierre' AND v_massive_msg_close_at IS NULL) THEN
                
                IF v_massive_status IN ('Activa', 'En observación') THEN
                    v_massive_log_text := '✅ 100% de tiendas restablecidas. La Masiva pasa a "Pendiente por cierre". - Nexus';
                    IF NOT v_massive_logs @> jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_massive_log_text)) THEN
                        -- Actualizamos la masiva
                        UPDATE public.massive_incidents_jj SET status = 'Pendiente por cierre', current_active_count = 0, recovery_percentage = 100, recovery_status = 'Recuperada', recovery_start_time = NOW(), updated_at = NOW(), logs = COALESCE(logs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_massive_log_text)) WHERE id = v_massive_id;
                        
                        -- CASCADA DE CIERRE (Mueve Hijos a Pendiente por Cierre y los silencia)
                        UPDATE public.network_failures_jj 
                        SET lifecycle_stage = 'Pendiente por cierre',
                            is_flapping = false,
                            msg_close_sent_at = NOW() -- 🛡️ SILENCIADOR: Evita que n8n inunde Slack con mensajes individuales
                        WHERE (wan1_massive_incident_id = v_massive_id OR wan2_massive_incident_id = v_massive_id) 
                        AND lifecycle_stage NOT IN ('Pendiente por cierre', 'Resuelta', 'Falso Positivo');

                        -- 🛡️ NUEVO: CASCADA DE CIERRE A DEGRADACIONES HIJAS
                        UPDATE public.network_degradations_jj 
                        SET status = 'Pendiente por cierre', msg_close_sent_at = NOW() 
                        WHERE related_massive_id = v_massive_id 
                        AND status NOT IN ('Pendiente por cierre', 'Resuelta', 'Falso Positivo');
                    END IF;
                END IF;

                IF v_massive_ts IS NOT NULL THEN 
                    RETURN jsonb_build_object('action', 'TRIGGER_MASSIVE_PENDING_CLOSE', 'channel', c_channel_incidencias, 'slack_ts', v_massive_ts, 'proveedor', v_provider_affected_name, 'pais', v_pais, 'massive_id', v_massive_id); 
                END IF;
            END IF;
        END IF;
        RETURN jsonb_build_object('action', 'NONE', 'msg', 'Silenced by Massive Incident');
    END IF;

    -- ==============================================================================
    -- 5. LÓGICA INDIVIDUAL
    -- ==============================================================================
    IF v_new_impact = 'OK' AND v_old_stage = 'Activa' THEN 
        v_log_msg := 'Falla revertida antes de 5 minutos. Caso cerrado como Falso Positivo. - Nexus';
        UPDATE public.network_failures_jj SET lifecycle_stage = 'Falso Positivo', status = 'Falso Positivo', closed_at = NOW(), analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id; 
        RETURN jsonb_build_object('action', 'NONE'); 
    END IF;

    IF v_old_stage = 'Intermitencia' OR (v_old_stage = 'Pendiente por cierre' AND v_is_flapping = true) THEN
        IF v_new_impact != 'OK' THEN 
            IF v_old_recov_start IS NOT NULL THEN UPDATE public.network_failures_jj SET recovery_start_time = NULL WHERE id = v_fail_id; END IF;
            RETURN jsonb_build_object('action', 'NONE', 'msg', 'Still Flapping');
        ELSE 
            IF v_old_recov_start IS NULL THEN
                UPDATE public.network_failures_jj SET recovery_start_time = NOW() WHERE id = v_fail_id;
                RETURN jsonb_build_object('action', 'NONE', 'msg', 'Flapping stopped');
            ELSE
                IF ((NOW() - v_old_recov_start) > INTERVAL '60 minutes') AND v_msg_close_at IS NULL THEN 
                    v_log_msg := 'El enlace en la ' || v_wan_recuperada_texto || ' superó la inestabilidad por 60 min. Pasa a "Pendiente por cierre". - Nexus';
                    UPDATE public.network_failures_jj SET lifecycle_stage = 'Pendiente por cierre', analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id AND lifecycle_stage != 'Pendiente por cierre'; 
                    RETURN jsonb_build_object('action', 'SEND_FLAPPING_RECOVERY', 'slack_ts', v_old_ts, 'channel', c_channel_incidencias, 'store_name', v_store_name, 'fail_ids', jsonb_build_array(v_fail_id)); 
                END IF;
            END IF;
            RETURN jsonb_build_object('action', 'NONE');
        END IF;
    END IF;

    IF v_new_impact = 'OK' THEN 
        IF v_old_stage = 'En gestión' OR (v_old_stage = 'En observación' AND v_msg_recovery_at IS NULL AND v_is_flapping = false) THEN 
            v_log_msg := 'Enlace en la ' || v_wan_recuperada_texto || ' restablecido, pasa a "En observación" por 60 min. - Nexus';
            IF v_old_stage = 'En gestión' THEN UPDATE public.network_failures_jj SET lifecycle_stage = 'En observación', recovery_start_time = NOW(), analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id; END IF;
            SELECT wan1_recovery_start_time, wan2_recovery_start_time, wan1_downtime_minutes, wan2_downtime_minutes INTO v_out_w1_recov, v_out_w2_recov, v_out_w1_min, v_out_w2_min FROM public.network_failures_jj WHERE id = v_fail_id;
            RETURN jsonb_build_object('action', 'SEND_RECOVERY', 'slack_ts', v_old_ts, 'channel', v_target_channel, 'store_name', v_store_name, 'prov1_name', v_prov1_name, 'prov2_name', v_prov2_name, 'fail_ids', jsonb_build_array(v_fail_id), 'w1_recov_time', v_out_w1_recov, 'w1_dur', v_out_w1_min, 'w2_recov_time', v_out_w2_recov, 'w2_dur', v_out_w2_min);
        END IF;

        IF v_old_recov_start IS NOT NULL THEN
            IF ((NOW() - v_old_recov_start) > INTERVAL '60 minutes') AND v_msg_close_at IS NULL AND v_is_flapping = false THEN 
                v_log_msg := 'Recuperación confirmada, estable por > 60 min. Pasa a "Pendiente por cierre". - Nexus';
                IF v_old_stage = 'En observación' THEN UPDATE public.network_failures_jj SET lifecycle_stage = 'Pendiente por cierre', analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id; END IF;
                RETURN jsonb_build_object('action', 'SEND_CLOSE', 'slack_ts', v_old_ts, 'channel', v_target_channel, 'store_name', v_store_name, 'fail_ids', jsonb_build_array(v_fail_id)); 
            END IF;
        END IF;
        RETURN jsonb_build_object('action', 'NONE');
    END IF;

    IF v_new_impact != 'OK' AND v_old_stage = 'En observación' THEN
        v_relapse_count := COALESCE(v_relapse_count, 0) + 1;
        IF v_relapse_count >= 3 THEN 
            v_log_msg := 'Se han registrado 3 o mas recaídas consecutivas. Regresa a "Intermitencia". - Nexus';
            UPDATE public.network_failures_jj SET lifecycle_stage = 'Intermitencia', is_flapping = true, relapse_count = v_relapse_count, recovery_start_time = NULL, analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id; 
            RETURN jsonb_build_object('action', 'SEND_FLAPPING', 'slack_ts', v_old_ts, 'channel', c_channel_incidencias, 'store_name', v_store_name, 'fail_ids', jsonb_build_array(v_fail_id));
        ELSE 
            v_log_msg := 'Recaída detectada en la ' || v_wan_afectada_texto || '. Regresa a "En gestión". - Nexus';
            UPDATE public.network_failures_jj SET lifecycle_stage = 'En gestión', relapse_count = v_relapse_count, recovery_start_time = NULL, analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id; 
            RETURN jsonb_build_object('action', 'SEND_RELAPSE', 'slack_ts', v_old_ts, 'channel', v_target_channel, 'store_name', v_store_name, 'fail_ids', jsonb_build_array(v_fail_id), 'prov1_name', v_prov1_name, 'prov2_name', v_prov2_name, 'w1_down', v_w1_down, 'w2_down', v_w2_down); 
        END IF;
    END IF;

    IF v_old_impact = 'PARCIAL' AND v_new_impact = 'TOTAL' AND v_old_stage = 'En gestión' THEN 
        v_log_msg := 'Caída en la otra ' || v_wan_afectada_texto || ' disponible. Falla "Parcial" a "Total". - Nexus';
        UPDATE public.network_failures_jj SET analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg)) WHERE id = v_fail_id;
        RETURN jsonb_build_object('action', 'SEND_ESCALATION', 'slack_ts', v_old_ts, 'channel', c_channel_incidencias, 'store_name', v_store_name, 'fail_ids', jsonb_build_array(v_fail_id)); 
    END IF;

    IF v_new_impact != 'OK' THEN
        IF (v_old_stage = 'Activa' AND (NOW() - v_start_time) > INTERVAL '5 minutes') OR (v_old_stage = 'En gestión' AND v_old_ts IS NULL) THEN
            v_log_msg := 'Falla ' || lower(v_new_impact) || ' confirmada en la ' || v_wan_afectada_texto || '. Pasa a "En gestión". - Nexus';
            IF v_old_stage = 'Activa' THEN UPDATE public.network_failures_jj SET lifecycle_stage = 'En gestión', analyst_notes = COALESCE(analyst_notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_msg), jsonb_build_object('log', to_char(NOW() AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH24:MI:SS') || ' : ' || v_log_contactos_full)) WHERE id = v_fail_id; END IF;
            RETURN jsonb_build_object('action', 'TRIGGER_PROTOCOL', 'store_name', v_store_name, 'store_code', v_codigo_tienda, 'meraki_url', v_meraki_url, 'pais', v_pais, 'impact', v_new_impact, 'channel', v_target_channel, 'fail_ids', jsonb_build_array(v_fail_id), 'prov1_name', v_prov1_name, 'prov2_name', v_prov2_name, 'w1_down', v_w1_down, 'w2_down', v_w2_down, 'store_address', v_direccion_domicilio, 'store_email', v_correo_tienda, 'wan1_circuit_id', v_w1_id_servicio, 'wan1_ip_pub', v_w1_ip_publica, 'wan1_gateway', v_w1_gateway, 'wan1_support_email', v_w1_email_soporte, 'wan1_contact_summary', v_w1_contacto_resumen, 'wan2_circuit_id', v_w2_id_servicio, 'wan2_ip_pub', v_w2_ip_publica, 'wan2_gateway', v_w2_gateway, 'wan2_support_email', v_w2_email_soporte, 'wan2_contact_summary', v_w2_contacto_resumen);
        END IF;
    END IF;

    RETURN jsonb_build_object('action', 'NONE');
END;
$function$

```

</details>

### `process_incident_logic_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.process_incident_logic_jj()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- A. Lógica para Fallas Totales/Parciales
    IF TG_TABLE_NAME = 'network_failures_jj' THEN
        IF NEW.recovery_start_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
             NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.recovery_start_time - NEW.start_time)) / 60;
        END IF;
        IF NEW.closed_at IS NOT NULL THEN
            NEW.lifecycle_stage := 'Resuelta';
            NEW.status := 'Resuelta'; 
        END IF;
        RETURN NEW;

    -- B. Lógica para Fallas Masivas
    ELSIF TG_TABLE_NAME = 'massive_incidents_jj' THEN
        IF NEW.end_time IS NOT NULL THEN
            NEW.status := 'Resuelta';
            NEW.recovery_status := 'Finalizada';
        END IF;
        RETURN NEW;

    -- 🛡️ C. NUEVO: Lógica para Degradaciones (IA)
    ELSIF TG_TABLE_NAME = 'network_degradations_jj' THEN
        -- Calcular la duración exacta de la latencia/pérdida
        IF NEW.recovery_start_time IS NOT NULL AND NEW.created_at IS NOT NULL THEN
             NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.recovery_start_time - NEW.created_at)) / 60;
        END IF;
        -- Forzar el estado si el FrontEnd lo cierra
        IF NEW.closed_at IS NOT NULL THEN
            NEW.status := 'Resuelta';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$function$

```

</details>

### `register_sentinel_diagnosis_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.register_sentinel_diagnosis_jj(p_network_id text, p_diagnosis_text text, p_evidence_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_failure_id bigint;
    v_degrad_id bigint;
    v_current_status text;
    v_action text;
BEGIN
    -- 1. Buscar si hay una Falla Crítica
    SELECT id INTO v_failure_id
    FROM public.network_failures_jj
    WHERE network_id = p_network_id
      AND lifecycle_stage IN ('Activa', 'En gestión', 'En observación', 'Intermitencia')
    ORDER BY created_at DESC LIMIT 1;

    -- 2. Buscar si ya hay una Degradación viva
    SELECT id, status INTO v_degrad_id, v_current_status
    FROM public.network_degradations_jj
    WHERE network_id = p_network_id
      AND status IN ('Activa', 'En gestión', 'En observación')
    ORDER BY created_at DESC LIMIT 1;

    -- 3. Lógica de Decisión
    IF v_failure_id IS NOT NULL THEN
        -- Ya está caída (Roja/Naranja). Guardamos la degradación silenciosamente y vinculamos.
        IF v_degrad_id IS NULL THEN
            INSERT INTO public.network_degradations_jj (network_id, status, diagnosis_text, evidence_data, related_failure_id, updated_at, updated_by)
            VALUES (p_network_id, 'Activa', p_diagnosis_text, p_evidence_data, v_failure_id, NOW(), 'Nexus');
        ELSE
            UPDATE public.network_degradations_jj
            SET diagnosis_text = p_diagnosis_text, evidence_data = p_evidence_data, related_failure_id = v_failure_id, updated_at = NOW(), updated_by = 'Nexus'
            WHERE id = v_degrad_id;
        END IF;

        -- Inyectar nota en la falla principal (Solo 1 vez)
        UPDATE public.network_failures_jj
        SET analyst_notes = analyst_notes || jsonb_build_array(jsonb_build_object('role', 'Nexus', 'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI:SS'), 'message', '🤖 [DIAGNÓSTICO 360° PREVENTIVO] ' || p_diagnosis_text)),
            sentinel_diagnosis_added = true
        WHERE id = v_failure_id AND sentinel_diagnosis_added = false;

        v_action := 'APPEND_TO_FAILURE';

    ELSIF v_degrad_id IS NOT NULL THEN
        -- Ya existía una degradación (Morada). Actualizamos la evidencia sin duplicar.
        UPDATE public.network_degradations_jj
        SET diagnosis_text = p_diagnosis_text, 
            evidence_data = p_evidence_data,
            updated_at = NOW(), 
            updated_by = 'Nexus',
            -- Si estaba en observación y recayó, la devolvemos a Activa
            status = CASE WHEN status = 'En observación' THEN 'Activa' ELSE status END,
            -- Borramos el reloj de recuperación porque recayó
            recovery_start_time = CASE WHEN status = 'En observación' THEN NULL ELSE recovery_start_time END
        WHERE id = v_degrad_id;

        -- Lógica Anti-Spam: Si ya estaba Activa/En gestión, le decimos a n8n que guarde silencio.
        IF v_current_status = 'En observación' THEN
            v_action := 'RELAPSE_DEGRADATION'; -- Recayó, n8n podría avisar en el hilo de Slack
        ELSE
            v_action := 'SILENT_UPDATE'; -- Ya se había avisado, no hacer nada en Slack
        END IF;

    ELSE
        -- Es una degradación totalmente nueva
        INSERT INTO public.network_degradations_jj (network_id, status, diagnosis_text, evidence_data, updated_at, updated_by)
        VALUES (p_network_id, 'Activa', p_diagnosis_text, p_evidence_data, NOW(), 'Nexus');

        v_action := 'REGISTER_DEGRADATION';
    END IF;

    RETURN jsonb_build_object('action', v_action, 'related_failure_id', v_failure_id);
END;
$function$

```

</details>

### `process_degradations_recovery_jj`
<details><summary>Ver Lógica de la Función (SQL)</summary>

```sql
CREATE OR REPLACE FUNCTION public.process_degradations_recovery_jj(p_online_networks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_recovered_count int := 0;
    v_closed_count int := 0;
BEGIN
    -- 1. Pasar a "En observación" (Sanación inicial)
    -- Usamos una subconsulta con el JSON para actualizar masivamente
    WITH online_nets AS (
        SELECT jsonb_array_elements_text(p_online_networks) AS network_id
    ),
    updated_obs AS (
        UPDATE public.network_degradations_jj nd
        SET status = 'En observación',
            recovery_start_time = NOW(),
            updated_at = NOW(),
            updated_by = 'Nexus'
        FROM online_nets onet
        WHERE nd.network_id = onet.network_id
          AND nd.status IN ('Activa', 'En gestión')
        RETURNING nd.id
    )
    SELECT count(*) INTO v_recovered_count FROM updated_obs;

    -- 2. Pasar a "Pendiente por cierre" (Cuarentena superada > 60 min)
    WITH updated_closed AS (
        UPDATE public.network_degradations_jj
        SET status = 'Pendiente por cierre',
            updated_at = NOW(),
            updated_by = 'Nexus'
        WHERE status = 'En observación'
          AND recovery_start_time <= NOW() - INTERVAL '60 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_closed_count FROM updated_closed;

    RETURN jsonb_build_object(
        'recovered_to_observation', v_recovered_count,
        'moved_to_pending_close', v_closed_count
    );
END;
$function$

```

</details>

