export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      usuarios_perfil: {
        Row: {
          id: string
          nombre: string
          apellido: string | null
          email: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre: string
          apellido?: string | null
          email: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string | null
          email?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      refugios: {
        Row: {
          id: string
          nombre: string
          tipo: "uma_registrada" | "laboratorio_academico" | "criadero_privado" | "chinampa_conservacion" | "acuario_publico"
          numero_uma: string | null
          responsable_tecnico: string | null
          rfc: string | null
          ubicacion: string | null
          ciudad: string | null
          estado_republica: string | null
          config_regulatoria: Json
          plan: "pionero" | "estandar" | "academico" | "institucional" | "regulador"
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo: "uma_registrada" | "laboratorio_academico" | "criadero_privado" | "chinampa_conservacion" | "acuario_publico"
          numero_uma?: string | null
          responsable_tecnico?: string | null
          rfc?: string | null
          ubicacion?: string | null
          ciudad?: string | null
          estado_republica?: string | null
          config_regulatoria?: Json
          plan?: "pionero" | "estandar" | "academico" | "institucional" | "regulador"
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo?: "uma_registrada" | "laboratorio_academico" | "criadero_privado" | "chinampa_conservacion" | "acuario_publico"
          numero_uma?: string | null
          responsable_tecnico?: string | null
          rfc?: string | null
          ubicacion?: string | null
          ciudad?: string | null
          estado_republica?: string | null
          config_regulatoria?: Json
          plan?: "pionero" | "estandar" | "academico" | "institucional" | "regulador"
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      refugio_usuarios: {
        Row: {
          id: string
          refugio_id: string
          usuario_id: string
          rol: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          activo: boolean
          invitado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          usuario_id: string
          rol: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          activo?: boolean
          invitado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          usuario_id?: string
          rol?: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          activo?: boolean
          invitado_por?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "refugio_usuarios_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "refugio_usuarios_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }
      estanques: {
        Row: {
          id: string
          refugio_id: string
          nombre: string
          capacidad_litros: number | null
          tipo_sistema: "recirculacion" | "estatico" | "mixto" | null
          ubicacion_fisica: string | null
          activo: boolean
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          nombre: string
          capacidad_litros?: number | null
          tipo_sistema?: "recirculacion" | "estatico" | "mixto" | null
          ubicacion_fisica?: string | null
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          nombre?: string
          capacidad_litros?: number | null
          tipo_sistema?: "recirculacion" | "estatico" | "mixto" | null
          ubicacion_fisica?: string | null
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "estanques_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      ajolotes: {
        Row: {
          id: string
          refugio_id: string
          estanque_id: string | null
          codigo: string
          nombre: string | null
          sexo: "macho" | "hembra" | "indeterminado" | null
          fecha_nacimiento: string | null
          fecha_ingreso: string | null
          origen: "nacido_en_refugio" | "ingreso_externo" | "silvestre_rescatado" | null
          madre_id: string | null
          padre_id: string | null
          estado: "vivo" | "fallecido" | "transferido" | "egresado"
          morfotipo: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          estanque_id?: string | null
          codigo: string
          nombre?: string | null
          sexo?: "macho" | "hembra" | "indeterminado" | null
          fecha_nacimiento?: string | null
          fecha_ingreso?: string | null
          origen?: "nacido_en_refugio" | "ingreso_externo" | "silvestre_rescatado" | null
          madre_id?: string | null
          padre_id?: string | null
          estado?: "vivo" | "fallecido" | "transferido" | "egresado"
          morfotipo?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          estanque_id?: string | null
          codigo?: string
          nombre?: string | null
          sexo?: "macho" | "hembra" | "indeterminado" | null
          fecha_nacimiento?: string | null
          fecha_ingreso?: string | null
          origen?: "nacido_en_refugio" | "ingreso_externo" | "silvestre_rescatado" | null
          madre_id?: string | null
          padre_id?: string | null
          estado?: "vivo" | "fallecido" | "transferido" | "egresado"
          morfotipo?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "ajolotes_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "ajolotes_estanque_id_fkey"; columns: ["estanque_id"]; isOneToOne: false; referencedRelation: "estanques"; referencedColumns: ["id"] },
          { foreignKeyName: "ajolotes_madre_id_fkey"; columns: ["madre_id"]; isOneToOne: false; referencedRelation: "ajolotes"; referencedColumns: ["id"] },
          { foreignKeyName: "ajolotes_padre_id_fkey"; columns: ["padre_id"]; isOneToOne: false; referencedRelation: "ajolotes"; referencedColumns: ["id"] }
        ]
      }
      cruzas: {
        Row: {
          id: string
          refugio_id: string
          hembra_id: string
          macho_id: string
          estanque_id: string | null
          aprobado_por: string | null
          fecha_planeada: string | null
          fecha_inicio: string | null
          fecha_fin: string | null
          estado: "planeada" | "activa" | "exitosa" | "fallida" | "cancelada"
          coeficiente_consanguinidad: number | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          hembra_id: string
          macho_id: string
          estanque_id?: string | null
          aprobado_por?: string | null
          fecha_planeada?: string | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          estado?: "planeada" | "activa" | "exitosa" | "fallida" | "cancelada"
          coeficiente_consanguinidad?: number | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          hembra_id?: string
          macho_id?: string
          estanque_id?: string | null
          aprobado_por?: string | null
          fecha_planeada?: string | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          estado?: "planeada" | "activa" | "exitosa" | "fallida" | "cancelada"
          coeficiente_consanguinidad?: number | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "cruzas_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "cruzas_hembra_id_fkey"; columns: ["hembra_id"]; isOneToOne: false; referencedRelation: "ajolotes"; referencedColumns: ["id"] },
          { foreignKeyName: "cruzas_macho_id_fkey"; columns: ["macho_id"]; isOneToOne: false; referencedRelation: "ajolotes"; referencedColumns: ["id"] }
        ]
      }
      lotes_larvales: {
        Row: {
          id: string
          refugio_id: string
          estanque_id: string | null
          cruza_id: string | null
          codigo: string
          etapa: "huevo" | "larva_temprana" | "larva_avanzada" | "juvenil"
          cantidad_inicial: number
          cantidad_actual: number
          fecha_inicio: string
          activo: boolean
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          estanque_id?: string | null
          cruza_id?: string | null
          codigo: string
          etapa: "huevo" | "larva_temprana" | "larva_avanzada" | "juvenil"
          cantidad_inicial?: number
          cantidad_actual?: number
          fecha_inicio?: string
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          estanque_id?: string | null
          cruza_id?: string | null
          codigo?: string
          etapa?: "huevo" | "larva_temprana" | "larva_avanzada" | "juvenil"
          cantidad_inicial?: number
          cantidad_actual?: number
          fecha_inicio?: string
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "lotes_larvales_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "lotes_larvales_cruza_id_fkey"; columns: ["cruza_id"]; isOneToOne: false; referencedRelation: "cruzas"; referencedColumns: ["id"] }
        ]
      }
      mediciones_agua: {
        Row: {
          id: string
          refugio_id: string
          estanque_id: string
          registrado_por: string
          fecha_hora: string
          temperatura: number | null
          ph: number | null
          amonio: number | null
          nitrito: number | null
          nitrato: number | null
          oxigeno: number | null
          conductividad: number | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          estanque_id: string
          registrado_por: string
          fecha_hora?: string
          temperatura?: number | null
          ph?: number | null
          amonio?: number | null
          nitrito?: number | null
          nitrato?: number | null
          oxigeno?: number | null
          conductividad?: number | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          estanque_id?: string
          registrado_por?: string
          fecha_hora?: string
          temperatura?: number | null
          ph?: number | null
          amonio?: number | null
          nitrito?: number | null
          nitrato?: number | null
          oxigeno?: number | null
          conductividad?: number | null
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "mediciones_agua_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "mediciones_agua_estanque_id_fkey"; columns: ["estanque_id"]; isOneToOne: false; referencedRelation: "estanques"; referencedColumns: ["id"] }
        ]
      }
      observaciones_clinicas: {
        Row: {
          id: string
          refugio_id: string
          sujeto_tipo: "ajolote" | "lote" | "estanque"
          ajolote_id: string | null
          lote_id: string | null
          estanque_id: string | null
          registrado_por: string
          fecha_hora: string
          descripcion: string
          severidad: "leve" | "moderada" | "grave" | "critica" | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          sujeto_tipo: "ajolote" | "lote" | "estanque"
          ajolote_id?: string | null
          lote_id?: string | null
          estanque_id?: string | null
          registrado_por: string
          fecha_hora?: string
          descripcion: string
          severidad?: "leve" | "moderada" | "grave" | "critica" | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          sujeto_tipo?: "ajolote" | "lote" | "estanque"
          ajolote_id?: string | null
          lote_id?: string | null
          estanque_id?: string | null
          registrado_por?: string
          fecha_hora?: string
          descripcion?: string
          severidad?: "leve" | "moderada" | "grave" | "critica" | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "observaciones_clinicas_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      eventos: {
        Row: {
          id: string
          refugio_id: string
          sujeto_tipo: "ajolote" | "lote" | "estanque" | "refugio"
          ajolote_id: string | null
          lote_id: string | null
          estanque_id: string | null
          registrado_por: string
          tipo: "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "promocion_larval" | "otro"
          fecha: string
          detalles: Json
          post_mortem_analisis: string | null
          post_mortem_generado_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          sujeto_tipo: "ajolote" | "lote" | "estanque" | "refugio"
          ajolote_id?: string | null
          lote_id?: string | null
          estanque_id?: string | null
          registrado_por: string
          tipo: "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "promocion_larval" | "otro"
          fecha?: string
          detalles?: Json
          post_mortem_analisis?: string | null
          post_mortem_generado_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          sujeto_tipo?: "ajolote" | "lote" | "estanque" | "refugio"
          ajolote_id?: string | null
          lote_id?: string | null
          estanque_id?: string | null
          registrado_por?: string
          tipo?: "muerte" | "enfermedad" | "tratamiento" | "transferencia_interna" | "transferencia_externa" | "ingreso" | "egreso" | "promocion_larval" | "otro"
          fecha?: string
          detalles?: Json
          post_mortem_analisis?: string | null
          post_mortem_generado_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "eventos_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "eventos_ajolote_id_fkey"; columns: ["ajolote_id"]; isOneToOne: false; referencedRelation: "ajolotes"; referencedColumns: ["id"] }
        ]
      }
      puestas: {
        Row: {
          id: string
          refugio_id: string
          cruza_id: string
          fecha_puesta: string
          cantidad_huevos: number | null
          fecha_eclosion: string | null
          cantidad_eclosionada: number | null
          lote_id: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          cruza_id: string
          fecha_puesta: string
          cantidad_huevos?: number | null
          fecha_eclosion?: string | null
          cantidad_eclosionada?: number | null
          lote_id?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          cruza_id?: string
          fecha_puesta?: string
          cantidad_huevos?: number | null
          fecha_eclosion?: string | null
          cantidad_eclosionada?: number | null
          lote_id?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "puestas_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] },
          { foreignKeyName: "puestas_cruza_id_fkey"; columns: ["cruza_id"]; isOneToOne: false; referencedRelation: "cruzas"; referencedColumns: ["id"] }
        ]
      }
      alertas: {
        Row: {
          id: string
          refugio_id: string
          tipo: "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango" | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo" | "mortalidad_anomala" | "endogamia_riesgo" | "reporte_uma_proximo" | "sin_registro_dias" | "post_mortem_generado" | "otro"
          severidad: "info" | "warning" | "error" | "critical"
          estanque_id: string | null
          ajolote_id: string | null
          cruza_id: string | null
          titulo: string
          mensaje: string
          datos_contexto: Json | null
          generada_at: string
          leida_at: string | null
          resuelta_at: string | null
          resuelta_por: string | null
          email_enviado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          tipo: "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango" | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo" | "mortalidad_anomala" | "endogamia_riesgo" | "reporte_uma_proximo" | "sin_registro_dias" | "post_mortem_generado" | "otro"
          severidad: "info" | "warning" | "error" | "critical"
          estanque_id?: string | null
          ajolote_id?: string | null
          cruza_id?: string | null
          titulo: string
          mensaje: string
          datos_contexto?: Json | null
          generada_at?: string
          leida_at?: string | null
          resuelta_at?: string | null
          resuelta_por?: string | null
          email_enviado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          tipo?: "agua_amonio_elevado" | "agua_nitrito_elevado" | "agua_ph_fuera_rango" | "agua_temperatura_fuera_rango" | "agua_oxigeno_bajo" | "mortalidad_anomala" | "endogamia_riesgo" | "reporte_uma_proximo" | "sin_registro_dias" | "post_mortem_generado" | "otro"
          severidad?: "info" | "warning" | "error" | "critical"
          estanque_id?: string | null
          ajolote_id?: string | null
          cruza_id?: string | null
          titulo?: string
          mensaje?: string
          datos_contexto?: Json | null
          generada_at?: string
          leida_at?: string | null
          resuelta_at?: string | null
          resuelta_por?: string | null
          email_enviado?: boolean
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "alertas_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      reportes_generados: {
        Row: {
          id: string
          refugio_id: string
          tipo: "uma_trimestral" | "inventario" | "salud" | "reproduccion" | "mortalidad"
          periodo_inicio: string
          periodo_fin: string
          generado_por: string
          generado_at: string
          pdf_storage_path: string | null
          pdf_url: string | null
          datos_snapshot: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          tipo: "uma_trimestral" | "inventario" | "salud" | "reproduccion" | "mortalidad"
          periodo_inicio: string
          periodo_fin: string
          generado_por: string
          generado_at?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          datos_snapshot?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          tipo?: "uma_trimestral" | "inventario" | "salud" | "reproduccion" | "mortalidad"
          periodo_inicio?: string
          periodo_fin?: string
          generado_por?: string
          generado_at?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          datos_snapshot?: Json | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "reportes_generados_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      axo_ai_conversaciones: {
        Row: {
          id: string
          refugio_id: string
          usuario_id: string
          titulo: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          usuario_id: string
          titulo?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          usuario_id?: string
          titulo?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "axo_ai_conversaciones_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      axo_ai_mensajes: {
        Row: {
          id: string
          conversacion_id: string
          refugio_id: string
          rol: "user" | "assistant"
          contenido: string
          tool_calls: Json | null
          tool_results: Json | null
          tokens_input: number | null
          tokens_output: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversacion_id: string
          refugio_id: string
          rol: "user" | "assistant"
          contenido: string
          tool_calls?: Json | null
          tool_results?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversacion_id?: string
          refugio_id?: string
          rol?: "user" | "assistant"
          contenido?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "axo_ai_mensajes_conversacion_id_fkey"; columns: ["conversacion_id"]; isOneToOne: false; referencedRelation: "axo_ai_conversaciones"; referencedColumns: ["id"] },
          { foreignKeyName: "axo_ai_mensajes_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      axo_ai_uso_mensual: {
        Row: {
          id: string
          refugio_id: string
          mes: string
          consultas_realizadas: number
          tokens_input_total: number
          tokens_output_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          mes: string
          consultas_realizadas?: number
          tokens_input_total?: number
          tokens_output_total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          mes?: string
          consultas_realizadas?: number
          tokens_input_total?: number
          tokens_output_total?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "axo_ai_uso_mensual_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      invitaciones: {
        Row: {
          id: string
          refugio_id: string
          email: string
          rol: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          token: string
          otp_code: string | null
          otp_intentos: number
          otp_expires_at: string | null
          estado: "pendiente" | "enviada" | "usada" | "expirada"
          invitado_por: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          email: string
          rol: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          token?: string
          otp_code?: string | null
          otp_intentos?: number
          otp_expires_at?: string | null
          estado?: "pendiente" | "enviada" | "usada" | "expirada"
          invitado_por: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          email?: string
          rol?: "admin" | "tecnico" | "investigador" | "estudiante" | "lectura"
          token?: string
          otp_code?: string | null
          otp_intentos?: number
          otp_expires_at?: string | null
          estado?: "pendiente" | "enviada" | "usada" | "expirada"
          invitado_por?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          { foreignKeyName: "invitaciones_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
      codigos_refugio: {
        Row: {
          id: string
          refugio_id: string
          codigo: string
          rol: "tecnico" | "investigador" | "estudiante" | "lectura"
          descripcion: string | null
          activo: boolean
          usos: number
          max_usos: number | null
          generado_por: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          refugio_id: string
          codigo: string
          rol: "tecnico" | "investigador" | "estudiante" | "lectura"
          descripcion?: string | null
          activo?: boolean
          usos?: number
          max_usos?: number | null
          generado_por: string
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          refugio_id?: string
          codigo?: string
          rol?: "tecnico" | "investigador" | "estudiante" | "lectura"
          descripcion?: string | null
          activo?: boolean
          usos?: number
          max_usos?: number | null
          generado_por?: string
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "codigos_refugio_refugio_id_fkey"; columns: ["refugio_id"]; isOneToOne: false; referencedRelation: "refugios"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role_in_refugio: {
        Args: { p_refugio_id: string }
        Returns: string
      }
      user_has_access_to_refugio: {
        Args: { p_refugio_id: string }
        Returns: boolean
      }
      user_can_write_in_refugio: {
        Args: { p_refugio_id: string }
        Returns: boolean
      }
      user_is_admin_of_refugio: {
        Args: { p_refugio_id: string }
        Returns: boolean
      }
      calcular_coeficiente_consanguinidad: {
        Args: { p_individuo_a_id: string; p_individuo_b_id: string; p_max_generaciones?: number }
        Returns: number
      }
      increment_ai_usage: {
        Args: { p_refugio_id: string; p_mes: string; p_tokens_input: number; p_tokens_output: number }
        Returns: undefined
      }
      get_refugio_summary: {
        Args: { p_refugio_id: string; p_inicio: string; p_fin: string }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
