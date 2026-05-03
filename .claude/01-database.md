# Axo — Base de datos completa

> Ejecutar en Supabase SQL Editor en el orden exacto en que aparece.
> Proyecto: gszgkqvtrsvmjtqiaslc

---

## PASO 1 — Extensiones

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## PASO 2 — Tablas (en orden de dependencias)

### usuarios_perfil
```sql
CREATE TABLE usuarios_perfil (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  apellido   TEXT,
  email      TEXT        NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### refugios
```sql
CREATE TABLE refugios (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               TEXT        NOT NULL,
  tipo                 TEXT        NOT NULL CHECK (tipo IN (
                         'uma_registrada','laboratorio_academico',
                         'criadero_privado','chinampa_conservacion','acuario_publico')),
  numero_uma           TEXT,
  responsable_tecnico  TEXT,
  rfc                  TEXT,
  ubicacion            TEXT,
  ciudad               TEXT,
  estado_republica     TEXT,
  config_regulatoria   JSONB       NOT NULL DEFAULT '{"uma_semarnat":false,"cites":false,"reporte_trimestral":false}',
  plan                 TEXT        NOT NULL DEFAULT 'pionero' CHECK (plan IN (
                         'pionero','estandar','academico','institucional','regulador')),
  activo               BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### refugio_usuarios
```sql
CREATE TABLE refugio_usuarios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id   UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  usuario_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol          TEXT        NOT NULL CHECK (rol IN ('admin','tecnico','investigador','estudiante','lectura')),
  activo       BOOLEAN     NOT NULL DEFAULT true,
  invitado_por UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(refugio_id, usuario_id)
);
CREATE INDEX idx_ru_refugio  ON refugio_usuarios(refugio_id);
CREATE INDEX idx_ru_usuario  ON refugio_usuarios(usuario_id);
```

### estanques
```sql
CREATE TABLE estanques (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id       UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  nombre           TEXT        NOT NULL,
  capacidad_litros NUMERIC(10,2),
  tipo_sistema     TEXT        CHECK (tipo_sistema IN ('recirculacion','estatico','mixto')),
  ubicacion_fisica TEXT,
  activo           BOOLEAN     NOT NULL DEFAULT true,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(refugio_id, nombre)
);
CREATE INDEX idx_estanques_refugio ON estanques(refugio_id);
```

### ajolotes
```sql
CREATE TABLE ajolotes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id       UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  estanque_id      UUID        REFERENCES estanques(id) ON DELETE SET NULL,
  codigo           TEXT        NOT NULL,
  nombre           TEXT,
  sexo             TEXT        CHECK (sexo IN ('macho','hembra','indeterminado')),
  fecha_nacimiento DATE,
  fecha_ingreso    DATE,
  origen           TEXT        CHECK (origen IN ('nacido_en_refugio','ingreso_externo','silvestre_rescatado')),
  madre_id         UUID        REFERENCES ajolotes(id) ON DELETE SET NULL,
  padre_id         UUID        REFERENCES ajolotes(id) ON DELETE SET NULL,
  estado           TEXT        NOT NULL DEFAULT 'vivo' CHECK (estado IN ('vivo','fallecido','transferido','egresado')),
  morfotipo        TEXT,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(refugio_id, codigo)
);
CREATE INDEX idx_ajolotes_refugio  ON ajolotes(refugio_id);
CREATE INDEX idx_ajolotes_estanque ON ajolotes(estanque_id);
CREATE INDEX idx_ajolotes_madre    ON ajolotes(madre_id);
CREATE INDEX idx_ajolotes_padre    ON ajolotes(padre_id);
CREATE INDEX idx_ajolotes_estado   ON ajolotes(estado);
```

### cruzas (antes de lotes — lotes referencia cruzas)
```sql
CREATE TABLE cruzas (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id                 UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  hembra_id                  UUID        NOT NULL REFERENCES ajolotes(id) ON DELETE RESTRICT,
  macho_id                   UUID        NOT NULL REFERENCES ajolotes(id) ON DELETE RESTRICT,
  estanque_id                UUID        REFERENCES estanques(id) ON DELETE SET NULL,
  aprobado_por               UUID        REFERENCES auth.users(id),
  fecha_planeada             DATE,
  fecha_inicio               DATE,
  fecha_fin                  DATE,
  estado                     TEXT        NOT NULL DEFAULT 'planeada' CHECK (estado IN ('planeada','activa','exitosa','fallida','cancelada')),
  coeficiente_consanguinidad NUMERIC(6,4),
  notas                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cruzas_refugio ON cruzas(refugio_id);
CREATE INDEX idx_cruzas_hembra  ON cruzas(hembra_id);
CREATE INDEX idx_cruzas_macho   ON cruzas(macho_id);
```

### lotes_larvales
```sql
CREATE TABLE lotes_larvales (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id       UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  estanque_id      UUID        REFERENCES estanques(id) ON DELETE SET NULL,
  cruza_id         UUID        REFERENCES cruzas(id) ON DELETE SET NULL,
  codigo           TEXT        NOT NULL,
  etapa            TEXT        NOT NULL CHECK (etapa IN ('huevo','larva_temprana','larva_avanzada','juvenil')),
  cantidad_inicial INTEGER     NOT NULL DEFAULT 0,
  cantidad_actual  INTEGER     NOT NULL DEFAULT 0,
  fecha_inicio     DATE        NOT NULL DEFAULT CURRENT_DATE,
  activo           BOOLEAN     NOT NULL DEFAULT true,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(refugio_id, codigo)
);
CREATE INDEX idx_lotes_refugio ON lotes_larvales(refugio_id);
```

### mediciones_agua
```sql
CREATE TABLE mediciones_agua (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id      UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  estanque_id     UUID        NOT NULL REFERENCES estanques(id) ON DELETE CASCADE,
  registrado_por  UUID        NOT NULL REFERENCES auth.users(id),
  fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperatura     NUMERIC(5,2),
  ph              NUMERIC(4,2),
  amonio          NUMERIC(6,4),
  nitrito         NUMERIC(6,4),
  nitrato         NUMERIC(6,4),
  oxigeno         NUMERIC(5,2),
  conductividad   NUMERIC(8,2),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mediciones_refugio  ON mediciones_agua(refugio_id);
CREATE INDEX idx_mediciones_estanque ON mediciones_agua(estanque_id);
CREATE INDEX idx_mediciones_fecha    ON mediciones_agua(fecha_hora DESC);
```

### observaciones_clinicas
```sql
CREATE TABLE observaciones_clinicas (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id     UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  sujeto_tipo    TEXT        NOT NULL CHECK (sujeto_tipo IN ('ajolote','lote','estanque')),
  ajolote_id     UUID        REFERENCES ajolotes(id) ON DELETE CASCADE,
  lote_id        UUID        REFERENCES lotes_larvales(id) ON DELETE CASCADE,
  estanque_id    UUID        REFERENCES estanques(id) ON DELETE CASCADE,
  registrado_por UUID        NOT NULL REFERENCES auth.users(id),
  fecha_hora     TIMESTAMPTZ NOT NULL DEFAULT now(),
  descripcion    TEXT        NOT NULL,
  severidad      TEXT        CHECK (severidad IN ('leve','moderada','grave','critica')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_obs_clinicas_refugio ON observaciones_clinicas(refugio_id);
```

### eventos
```sql
CREATE TABLE eventos (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id              UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  sujeto_tipo             TEXT        NOT NULL CHECK (sujeto_tipo IN ('ajolote','lote','estanque','refugio')),
  ajolote_id              UUID        REFERENCES ajolotes(id) ON DELETE SET NULL,
  lote_id                 UUID        REFERENCES lotes_larvales(id) ON DELETE SET NULL,
  estanque_id             UUID        REFERENCES estanques(id) ON DELETE SET NULL,
  registrado_por          UUID        NOT NULL REFERENCES auth.users(id),
  tipo                    TEXT        NOT NULL CHECK (tipo IN (
                            'muerte','enfermedad','tratamiento',
                            'transferencia_interna','transferencia_externa',
                            'ingreso','egreso','promocion_larval','otro')),
  fecha                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  detalles                JSONB       NOT NULL DEFAULT '{}',
  post_mortem_analisis    TEXT,
  post_mortem_generado_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventos_refugio ON eventos(refugio_id);
CREATE INDEX idx_eventos_ajolote ON eventos(ajolote_id);
CREATE INDEX idx_eventos_tipo    ON eventos(tipo);
CREATE INDEX idx_eventos_fecha   ON eventos(fecha DESC);
```

### puestas
```sql
CREATE TABLE puestas (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id           UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  cruza_id             UUID        NOT NULL REFERENCES cruzas(id) ON DELETE CASCADE,
  fecha_puesta         DATE        NOT NULL,
  cantidad_huevos      INTEGER,
  fecha_eclosion       DATE,
  cantidad_eclosionada INTEGER,
  lote_id              UUID        REFERENCES lotes_larvales(id) ON DELETE SET NULL,
  notas                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_puestas_cruza   ON puestas(cruza_id);
CREATE INDEX idx_puestas_refugio ON puestas(refugio_id);
```

### alertas
```sql
CREATE TABLE alertas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id      UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL CHECK (tipo IN (
                    'agua_amonio_elevado','agua_nitrito_elevado','agua_ph_fuera_rango',
                    'agua_temperatura_fuera_rango','agua_oxigeno_bajo',
                    'mortalidad_anomala','endogamia_riesgo','reporte_uma_proximo',
                    'sin_registro_dias','post_mortem_generado','otro')),
  severidad       TEXT        NOT NULL CHECK (severidad IN ('info','warning','error','critical')),
  estanque_id     UUID        REFERENCES estanques(id) ON DELETE CASCADE,
  ajolote_id      UUID        REFERENCES ajolotes(id) ON DELETE CASCADE,
  cruza_id        UUID        REFERENCES cruzas(id) ON DELETE CASCADE,
  titulo          TEXT        NOT NULL,
  mensaje         TEXT        NOT NULL,
  datos_contexto  JSONB,
  generada_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  leida_at        TIMESTAMPTZ,
  resuelta_at     TIMESTAMPTZ,
  resuelta_por    UUID        REFERENCES auth.users(id),
  email_enviado   BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alertas_refugio   ON alertas(refugio_id);
CREATE INDEX idx_alertas_no_leidas ON alertas(refugio_id) WHERE leida_at IS NULL;
CREATE INDEX idx_alertas_generada  ON alertas(generada_at DESC);
```

### reportes_generados
```sql
CREATE TABLE reportes_generados (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id       UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  tipo             TEXT        NOT NULL CHECK (tipo IN ('uma_trimestral','inventario','salud','reproduccion','mortalidad')),
  periodo_inicio   DATE        NOT NULL,
  periodo_fin      DATE        NOT NULL,
  generado_por     UUID        NOT NULL REFERENCES auth.users(id),
  generado_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_storage_path TEXT,
  pdf_url          TEXT,
  datos_snapshot   JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reportes_refugio ON reportes_generados(refugio_id);
```

### axo_ai_conversaciones
```sql
CREATE TABLE axo_ai_conversaciones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  usuario_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo     TEXT,
  activa     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_conv_refugio ON axo_ai_conversaciones(refugio_id);
```

### axo_ai_mensajes
```sql
CREATE TABLE axo_ai_mensajes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id  UUID        NOT NULL REFERENCES axo_ai_conversaciones(id) ON DELETE CASCADE,
  refugio_id       UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  rol              TEXT        NOT NULL CHECK (rol IN ('user','assistant')),
  contenido        TEXT        NOT NULL,
  tool_calls       JSONB,
  tool_results     JSONB,
  tokens_input     INTEGER,
  tokens_output    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_msg_conversacion ON axo_ai_mensajes(conversacion_id);
```

### axo_ai_uso_mensual
```sql
CREATE TABLE axo_ai_uso_mensual (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id           UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  mes                  DATE        NOT NULL,
  consultas_realizadas INTEGER     NOT NULL DEFAULT 0,
  tokens_input_total   INTEGER     NOT NULL DEFAULT 0,
  tokens_output_total  INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(refugio_id, mes)
);
CREATE INDEX idx_ai_uso_refugio_mes ON axo_ai_uso_mensual(refugio_id, mes);
```

### invitaciones
```sql
CREATE TABLE invitaciones (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id     UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  email          TEXT        NOT NULL,
  rol            TEXT        NOT NULL CHECK (rol IN ('admin','tecnico','investigador','estudiante','lectura')),
  token          TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  otp_code       TEXT,
  otp_intentos   INTEGER     NOT NULL DEFAULT 0,
  otp_expires_at TIMESTAMPTZ,
  estado         TEXT        NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','usada','expirada')),
  invitado_por   UUID        NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);
CREATE INDEX idx_invitaciones_refugio ON invitaciones(refugio_id);
CREATE INDEX idx_invitaciones_email   ON invitaciones(email);
CREATE INDEX idx_invitaciones_token   ON invitaciones(token);
```

### codigos_refugio
```sql
CREATE TABLE codigos_refugio (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refugio_id    UUID        NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
  codigo        TEXT        NOT NULL UNIQUE,
  rol           TEXT        NOT NULL CHECK (rol IN ('tecnico','investigador','estudiante','lectura')),
  descripcion   TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  usos          INTEGER     NOT NULL DEFAULT 0,
  max_usos      INTEGER,
  generado_por  UUID        NOT NULL REFERENCES auth.users(id),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT codigo_no_admin CHECK (rol != 'admin')
);
CREATE INDEX idx_codigos_refugio ON codigos_refugio(refugio_id);
CREATE INDEX idx_codigos_codigo  ON codigos_refugio(codigo);
```

---

## PASO 3 — Funciones SQL auxiliares

```sql
-- Trigger de updated_at genérico
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Trigger: crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios_perfil (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: obtener rol del usuario en un refugio
CREATE OR REPLACE FUNCTION get_user_role_in_refugio(p_refugio_id UUID)
RETURNS TEXT AS $$
  SELECT rol FROM refugio_usuarios
  WHERE refugio_id = p_refugio_id AND usuario_id = auth.uid() AND activo = true
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: verificar acceso al refugio (cualquier rol)
CREATE OR REPLACE FUNCTION user_has_access_to_refugio(p_refugio_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM refugio_usuarios
    WHERE refugio_id = p_refugio_id AND usuario_id = auth.uid() AND activo = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: verificar permisos de escritura
CREATE OR REPLACE FUNCTION user_can_write_in_refugio(p_refugio_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM refugio_usuarios
    WHERE refugio_id = p_refugio_id AND usuario_id = auth.uid()
      AND activo = true AND rol IN ('admin','tecnico','investigador')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: verificar si es admin
CREATE OR REPLACE FUNCTION user_is_admin_of_refugio(p_refugio_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM refugio_usuarios
    WHERE refugio_id = p_refugio_id AND usuario_id = auth.uid()
      AND activo = true AND rol = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Cálculo de coeficiente de consanguinidad (algoritmo Wright)
CREATE OR REPLACE FUNCTION calcular_coeficiente_consanguinidad(
  p_individuo_a_id UUID, p_individuo_b_id UUID, p_max_generaciones INTEGER DEFAULT 8
)
RETURNS NUMERIC AS $$
DECLARE v_coeficiente NUMERIC := 0;
BEGIN
  WITH RECURSIVE
  ancestros_a AS (
    SELECT id, madre_id, padre_id, 1 AS generacion FROM ajolotes WHERE id = p_individuo_a_id
    UNION ALL
    SELECT a.id, a.madre_id, a.padre_id, anc.generacion + 1
    FROM ajolotes a JOIN ancestros_a anc ON (a.id = anc.madre_id OR a.id = anc.padre_id)
    WHERE anc.generacion < p_max_generaciones
  ),
  ancestros_b AS (
    SELECT id, madre_id, padre_id, 1 AS generacion FROM ajolotes WHERE id = p_individuo_b_id
    UNION ALL
    SELECT a.id, a.madre_id, a.padre_id, anc.generacion + 1
    FROM ajolotes a JOIN ancestros_b anc ON (a.id = anc.madre_id OR a.id = anc.padre_id)
    WHERE anc.generacion < p_max_generaciones
  ),
  ancestros_comunes AS (
    SELECT aa.id, aa.generacion AS gen_a, ab.generacion AS gen_b
    FROM ancestros_a aa JOIN ancestros_b ab ON aa.id = ab.id
    WHERE aa.id != p_individuo_a_id AND aa.id != p_individuo_b_id
  )
  SELECT COALESCE(SUM(POWER(0.5, gen_a + gen_b + 1)), 0)
  INTO v_coeficiente FROM ancestros_comunes;
  RETURN ROUND(v_coeficiente::NUMERIC, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Incremento atómico de uso mensual de Axo AI
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_refugio_id UUID, p_mes DATE, p_tokens_input INTEGER, p_tokens_output INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO axo_ai_uso_mensual (refugio_id, mes, consultas_realizadas, tokens_input_total, tokens_output_total)
  VALUES (p_refugio_id, p_mes, 1, p_tokens_input, p_tokens_output)
  ON CONFLICT (refugio_id, mes) DO UPDATE SET
    consultas_realizadas = axo_ai_uso_mensual.consultas_realizadas + 1,
    tokens_input_total   = axo_ai_uso_mensual.tokens_input_total + p_tokens_input,
    tokens_output_total  = axo_ai_uso_mensual.tokens_output_total + p_tokens_output,
    updated_at           = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resumen de refugio para Axo AI (herramienta get_reporte_periodo)
CREATE OR REPLACE FUNCTION get_refugio_summary(p_refugio_id UUID, p_inicio DATE, p_fin DATE)
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'inventario', (SELECT jsonb_build_object(
      'total_vivos', COUNT(*) FILTER (WHERE estado='vivo'),
      'fallecidos', COUNT(*) FILTER (WHERE estado='fallecido'),
      'machos', COUNT(*) FILTER (WHERE sexo='macho' AND estado='vivo'),
      'hembras', COUNT(*) FILTER (WHERE sexo='hembra' AND estado='vivo')
    ) FROM ajolotes WHERE refugio_id = p_refugio_id),
    'eventos_periodo', (SELECT jsonb_build_object(
      'total', COUNT(*),
      'muertes', COUNT(*) FILTER (WHERE tipo='muerte'),
      'ingresos', COUNT(*) FILTER (WHERE tipo='ingreso'),
      'egresos', COUNT(*) FILTER (WHERE tipo='egreso'),
      'tratamientos', COUNT(*) FILTER (WHERE tipo='tratamiento')
    ) FROM eventos WHERE refugio_id=p_refugio_id AND fecha BETWEEN p_inicio AND p_fin),
    'agua_promedios', (SELECT jsonb_build_object(
      'temperatura_prom', ROUND(AVG(temperatura)::NUMERIC,2),
      'ph_prom', ROUND(AVG(ph)::NUMERIC,2),
      'amonio_prom', ROUND(AVG(amonio)::NUMERIC,4),
      'nitrito_prom', ROUND(AVG(nitrito)::NUMERIC,4),
      'total_mediciones', COUNT(*)
    ) FROM mediciones_agua WHERE refugio_id=p_refugio_id AND fecha_hora BETWEEN p_inicio AND p_fin)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## PASO 4 — Triggers

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER set_updated_at_refugios
  BEFORE UPDATE ON refugios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_estanques
  BEFORE UPDATE ON estanques FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_ajolotes
  BEFORE UPDATE ON ajolotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_lotes
  BEFORE UPDATE ON lotes_larvales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_cruzas
  BEFORE UPDATE ON cruzas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_ai_conv
  BEFORE UPDATE ON axo_ai_conversaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_ai_uso
  BEFORE UPDATE ON axo_ai_uso_mensual FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: actualizar estado de ajolote al registrar evento
CREATE OR REPLACE FUNCTION handle_evento_inventario() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'muerte' AND NEW.ajolote_id IS NOT NULL THEN
    UPDATE ajolotes SET estado='fallecido', updated_at=now() WHERE id=NEW.ajolote_id;
  ELSIF NEW.tipo = 'egreso' AND NEW.ajolote_id IS NOT NULL THEN
    UPDATE ajolotes SET estado='egresado', updated_at=now() WHERE id=NEW.ajolote_id;
  ELSIF NEW.tipo = 'transferencia_externa' AND NEW.ajolote_id IS NOT NULL THEN
    UPDATE ajolotes SET estado='transferido', updated_at=now() WHERE id=NEW.ajolote_id;
  ELSIF NEW.tipo = 'transferencia_interna' AND NEW.ajolote_id IS NOT NULL THEN
    UPDATE ajolotes SET estanque_id=(NEW.detalles->>'estanque_destino_id')::UUID, updated_at=now()
    WHERE id=NEW.ajolote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_evento_created
  AFTER INSERT ON eventos FOR EACH ROW EXECUTE FUNCTION handle_evento_inventario();
```

---

## PASO 5 — Habilitar RLS y políticas

```sql
-- Habilitar en todas las tablas
ALTER TABLE usuarios_perfil        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE estanques              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajolotes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_larvales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones_agua        ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cruzas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE puestas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_generados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE axo_ai_conversaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE axo_ai_mensajes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE axo_ai_uso_mensual     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_refugio        ENABLE ROW LEVEL SECURITY;

-- usuarios_perfil
CREATE POLICY "usuario ve su perfil" ON usuarios_perfil FOR SELECT USING (id=auth.uid());
CREATE POLICY "usuario edita su perfil" ON usuarios_perfil FOR UPDATE USING (id=auth.uid());

-- refugios
CREATE POLICY "usuario ve refugios propios" ON refugios FOR SELECT USING (user_has_access_to_refugio(id));
CREATE POLICY "usuario autenticado crea refugio" ON refugios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin edita refugio" ON refugios FOR UPDATE USING (user_is_admin_of_refugio(id));
CREATE POLICY "admin desactiva refugio" ON refugios FOR DELETE USING (user_is_admin_of_refugio(id));

-- refugio_usuarios
CREATE POLICY "miembro ve usuarios del refugio" ON refugio_usuarios FOR SELECT USING (user_has_access_to_refugio(refugio_id));
CREATE POLICY "admin agrega usuarios" ON refugio_usuarios FOR INSERT WITH CHECK (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin cambia roles" ON refugio_usuarios FOR UPDATE USING (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin remueve usuarios" ON refugio_usuarios FOR DELETE USING (user_is_admin_of_refugio(refugio_id));

-- Patrón estándar — aplicar a: estanques, ajolotes, lotes_larvales,
-- mediciones_agua, observaciones_clinicas, eventos, cruzas, puestas,
-- alertas, reportes_generados

-- ESTANQUES (ejemplo — replicar para las demás)
CREATE POLICY "miembro ve estanques" ON estanques FOR SELECT USING (user_has_access_to_refugio(refugio_id));
CREATE POLICY "escritor crea estanques" ON estanques FOR INSERT WITH CHECK (user_can_write_in_refugio(refugio_id));
CREATE POLICY "escritor edita estanques" ON estanques FOR UPDATE USING (user_can_write_in_refugio(refugio_id));
CREATE POLICY "admin elimina estanques" ON estanques FOR DELETE USING (user_is_admin_of_refugio(refugio_id));

-- [Replicar el mismo bloque de 4 políticas para cada tabla operacional]

-- axo_ai_conversaciones
CREATE POLICY "usuario ve sus conversaciones" ON axo_ai_conversaciones FOR SELECT USING (usuario_id=auth.uid() AND user_has_access_to_refugio(refugio_id));
CREATE POLICY "usuario crea conversacion" ON axo_ai_conversaciones FOR INSERT WITH CHECK (usuario_id=auth.uid() AND user_has_access_to_refugio(refugio_id));

-- axo_ai_mensajes
CREATE POLICY "usuario ve mensajes propios" ON axo_ai_mensajes FOR SELECT USING (refugio_id IN (SELECT refugio_id FROM axo_ai_conversaciones WHERE id=conversacion_id AND usuario_id=auth.uid()));

-- axo_ai_uso_mensual
CREATE POLICY "miembro ve uso ai" ON axo_ai_uso_mensual FOR SELECT USING (user_has_access_to_refugio(refugio_id));

-- invitaciones
CREATE POLICY "admin ve invitaciones" ON invitaciones FOR SELECT USING (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin crea invitaciones" ON invitaciones FOR INSERT WITH CHECK (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin revoca invitaciones" ON invitaciones FOR UPDATE USING (user_is_admin_of_refugio(refugio_id));

-- codigos_refugio
CREATE POLICY "admin ve codigos" ON codigos_refugio FOR SELECT USING (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin crea codigos" ON codigos_refugio FOR INSERT WITH CHECK (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin edita codigos" ON codigos_refugio FOR UPDATE USING (user_is_admin_of_refugio(refugio_id));
CREATE POLICY "admin elimina codigos" ON codigos_refugio FOR DELETE USING (user_is_admin_of_refugio(refugio_id));
```

---

## PASO 6 — Storage buckets

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reportes-pdf', 'reportes-pdf', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatares', 'avatares', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Policy storage reportes
CREATE POLICY "usuarios leen reportes de su refugio" ON storage.objects FOR SELECT
USING (bucket_id='reportes-pdf' AND user_has_access_to_refugio((storage.foldername(name))[1]::UUID));
```
