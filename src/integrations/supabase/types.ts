export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contatos: {
        Row: {
          criado_em: string
          email: string
          id: string
          lida: boolean
          mensagem: string
          nome: string
          telefone: string | null
        }
        Insert: {
          criado_em?: string
          email: string
          id?: string
          lida?: boolean
          mensagem: string
          nome: string
          telefone?: string | null
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          lida?: boolean
          mensagem?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      devedores: {
        Row: {
          criado_em: string
          id: string
          nome: string
          saldo_devedor: number
          status: string
          telefone: string | null
          user_id: string
          valor_pago: number
          valor_total_devido: number
          venda_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          saldo_devedor: number
          status?: string
          telefone?: string | null
          user_id: string
          valor_pago?: number
          valor_total_devido: number
          venda_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          saldo_devedor?: number
          status?: string
          telefone?: string | null
          user_id?: string
          valor_pago?: number
          valor_total_devido?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devedores_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      devedores_historico: {
        Row: {
          acao: string
          alteracoes: Json | null
          criado_em: string
          devedor_id: string
          editor_email: string | null
          id: string
          user_id: string
        }
        Insert: {
          acao: string
          alteracoes?: Json | null
          criado_em?: string
          devedor_id: string
          editor_email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          acao?: string
          alteracoes?: Json | null
          criado_em?: string
          devedor_id?: string
          editor_email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      logs_atividades: {
        Row: {
          acao: string
          criado_em: string
          descricao: string | null
          detalhes: Json | null
          editor_email: string | null
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          acao: string
          criado_em?: string
          descricao?: string | null
          detalhes?: Json | null
          editor_email?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          acao?: string
          criado_em?: string
          descricao?: string | null
          detalhes?: Json | null
          editor_email?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          data_pagamento: string | null
          data_vencimento: string
          id: string
          juros_aplicado: number | null
          multa_aplicada: number | null
          numero_parcela: number
          status: string
          user_id: string
          valor_parcela: number
          venda_id: string
        }
        Insert: {
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          juros_aplicado?: number | null
          multa_aplicada?: number | null
          numero_parcela: number
          status?: string
          user_id: string
          valor_parcela: number
          venda_id: string
        }
        Update: {
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          juros_aplicado?: number | null
          multa_aplicada?: number | null
          numero_parcela?: number
          status?: string
          user_id?: string
          valor_parcela?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          criado_em: string
          descricao: string | null
          especificacoes: Json | null
          estoque_atual: number
          estoque_inicial: number
          galeria_imagens: string[] | null
          genero: string
          id: string
          imagem_url: string | null
          margem: number
          nome_produto: string
          preco_com_margem: number | null
          preco_credito: number | null
          preco_credito_2x: number | null
          preco_debito: number | null
          preco_fornecedor: number
          taxa_credito: number
          taxa_credito_2x: number
          taxa_debito: number
          user_id: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          especificacoes?: Json | null
          estoque_atual?: number
          estoque_inicial?: number
          galeria_imagens?: string[] | null
          genero?: string
          id?: string
          imagem_url?: string | null
          margem?: number
          nome_produto: string
          preco_com_margem?: number | null
          preco_credito?: number | null
          preco_credito_2x?: number | null
          preco_debito?: number | null
          preco_fornecedor?: number
          taxa_credito?: number
          taxa_credito_2x?: number
          taxa_debito?: number
          user_id: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          especificacoes?: Json | null
          estoque_atual?: number
          estoque_inicial?: number
          galeria_imagens?: string[] | null
          genero?: string
          id?: string
          imagem_url?: string | null
          margem?: number
          nome_produto?: string
          preco_com_margem?: number | null
          preco_credito?: number | null
          preco_credito_2x?: number | null
          preco_debito?: number | null
          preco_fornecedor?: number
          taxa_credito?: number
          taxa_credito_2x?: number
          taxa_debito?: number
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          criado_em: string
          data_vencimento_pagamento: string | null
          id: string
          metodo_pagamento: string
          numero_parcelas: number
          possui_juros: boolean
          preco_unitario: number
          produto_id: string
          quantidade: number
          status_pagamento: string
          taxa_juros_mensal: number | null
          tipo_cartao: string | null
          user_id: string
          valor_bruto: number
          valor_liquido: number
          valor_total_com_juros: number | null
        }
        Insert: {
          criado_em?: string
          data_vencimento_pagamento?: string | null
          id?: string
          metodo_pagamento: string
          numero_parcelas?: number
          possui_juros?: boolean
          preco_unitario: number
          produto_id: string
          quantidade?: number
          status_pagamento?: string
          taxa_juros_mensal?: number | null
          tipo_cartao?: string | null
          user_id: string
          valor_bruto: number
          valor_liquido: number
          valor_total_com_juros?: number | null
        }
        Update: {
          criado_em?: string
          data_vencimento_pagamento?: string | null
          id?: string
          metodo_pagamento?: string
          numero_parcelas?: number
          possui_juros?: boolean
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          status_pagamento?: string
          taxa_juros_mensal?: number | null
          tipo_cartao?: string | null
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
          valor_total_com_juros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          id: string
          user_id: string
          nome: string
          telefone: string | null
          ultimo_produto_id: string | null
          ultima_compra: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          telefone?: string | null
          ultimo_produto_id?: string | null
          ultima_compra?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          telefone?: string | null
          ultimo_produto_id?: string | null
          ultima_compra?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_ultimo_produto_id_fkey"
            columns: ["ultimo_produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          }
        ]
      }
      configuracoes: {
        Row: {
          id: string
          user_id: string
          chave: string
          valor: string
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          chave: string
          valor: string
          criado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          chave?: string
          valor?: string
          criado_em?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
