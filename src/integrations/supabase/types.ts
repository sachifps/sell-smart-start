export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customer: {
        Row: {
          address: string | null
          custname: string | null
          custno: string
          payterm: string | null
        }
        Insert: {
          address?: string | null
          custname?: string | null
          custno: string
          payterm?: string | null
        }
        Update: {
          address?: string | null
          custname?: string | null
          custno?: string
          payterm?: string | null
        }
        Relationships: []
      }
      department: {
        Row: {
          deptcode: string
          deptname: string | null
        }
        Insert: {
          deptcode: string
          deptname?: string | null
        }
        Update: {
          deptcode?: string
          deptname?: string | null
        }
        Relationships: []
      }
      employee: {
        Row: {
          birthdate: string | null
          empno: string
          firstname: string | null
          gender: string | null
          hiredate: string | null
          lastname: string | null
          sepdate: string | null
        }
        Insert: {
          birthdate?: string | null
          empno: string
          firstname?: string | null
          gender?: string | null
          hiredate?: string | null
          lastname?: string | null
          sepdate?: string | null
        }
        Update: {
          birthdate?: string | null
          empno?: string
          firstname?: string | null
          gender?: string | null
          hiredate?: string | null
          lastname?: string | null
          sepdate?: string | null
        }
        Relationships: []
      }
      job: {
        Row: {
          jobcode: string
          jobdesc: string | null
        }
        Insert: {
          jobcode: string
          jobdesc?: string | null
        }
        Update: {
          jobcode?: string
          jobdesc?: string | null
        }
        Relationships: []
      }
      jobhistory: {
        Row: {
          deptcode: string | null
          effdate: string
          empno: string
          jobcode: string
          salary: number | null
        }
        Insert: {
          deptcode?: string | null
          effdate: string
          empno: string
          jobcode: string
          salary?: number | null
        }
        Update: {
          deptcode?: string | null
          effdate?: string
          empno?: string
          jobcode?: string
          salary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobhistory_deptcode_fkey"
            columns: ["deptcode"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["deptcode"]
          },
          {
            foreignKeyName: "jobhistory_empno_fkey"
            columns: ["empno"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["empno"]
          },
          {
            foreignKeyName: "jobhistory_jobcode_fkey"
            columns: ["jobcode"]
            isOneToOne: false
            referencedRelation: "job"
            referencedColumns: ["jobcode"]
          },
        ]
      }
      payment: {
        Row: {
          amount: number | null
          orno: string
          paydate: string | null
          transno: string | null
        }
        Insert: {
          amount?: number | null
          orno: string
          paydate?: string | null
          transno?: string | null
        }
        Update: {
          amount?: number | null
          orno?: string
          paydate?: string | null
          transno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transno_fkey"
            columns: ["transno"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["transno"]
          },
        ]
      }
      pricehist: {
        Row: {
          effdate: string
          prodcode: string
          unitprice: number | null
        }
        Insert: {
          effdate: string
          prodcode: string
          unitprice?: number | null
        }
        Update: {
          effdate?: string
          prodcode?: string
          unitprice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricehist_prodcode_fkey"
            columns: ["prodcode"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["prodcode"]
          },
        ]
      }
      product: {
        Row: {
          description: string | null
          prodcode: string
          unit: string | null
        }
        Insert: {
          description?: string | null
          prodcode: string
          unit?: string | null
        }
        Update: {
          description?: string | null
          prodcode?: string
          unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          custno: string | null
          empno: string | null
          salesdate: string | null
          transno: string
        }
        Insert: {
          custno?: string | null
          empno?: string | null
          salesdate?: string | null
          transno: string
        }
        Update: {
          custno?: string | null
          empno?: string | null
          salesdate?: string | null
          transno?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_custno_fkey"
            columns: ["custno"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["custno"]
          },
          {
            foreignKeyName: "sales_empno_fkey"
            columns: ["empno"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["empno"]
          },
        ]
      }
      salesdetail: {
        Row: {
          prodcode: string
          quantity: number | null
          transno: string
        }
        Insert: {
          prodcode: string
          quantity?: number | null
          transno: string
        }
        Update: {
          prodcode?: string
          quantity?: number | null
          transno?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesdetail_prodcode_fkey"
            columns: ["prodcode"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["prodcode"]
          },
          {
            foreignKeyName: "salesdetail_transno_fkey"
            columns: ["transno"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["transno"]
          },
        ]
      }
      transaction_history: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          id: string
          price: number
          product_code: string
          product_name: string
          quantity: number
          transaction_id: string | null
          unit: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          id?: string
          price: number
          product_code: string
          product_name: string
          quantity: number
          transaction_id?: string | null
          unit: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          id?: string
          price?: number
          product_code?: string
          product_name?: string
          quantity?: number
          transaction_id?: string | null
          unit?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          price: number
          product_code: string
          product_name: string
          quantity: number
          unit: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          price: number
          product_code: string
          product_name: string
          quantity: number
          unit: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          price?: number
          product_code?: string
          product_name?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_add_sales: boolean
          can_add_sales_detail: boolean
          can_delete_sales: boolean
          can_delete_sales_detail: boolean
          can_edit_sales: boolean
          can_edit_sales_detail: boolean
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_add_sales?: boolean
          can_add_sales_detail?: boolean
          can_delete_sales?: boolean
          can_delete_sales_detail?: boolean
          can_edit_sales?: boolean
          can_edit_sales_detail?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_add_sales?: boolean
          can_add_sales_detail?: boolean
          can_delete_sales?: boolean
          can_delete_sales_detail?: boolean
          can_edit_sales?: boolean
          can_edit_sales_detail?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
