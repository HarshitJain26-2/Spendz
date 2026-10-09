export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          theme_mode: 'light' | 'dark' | 'system';
          has_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme_mode?: 'light' | 'dark' | 'system';
          has_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme_mode?: 'light' | 'dark' | 'system';
          has_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'cash' | 'bank' | 'wallet' | 'card' | 'custom';
          balance: number;
          icon: string;
          color: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          type: 'cash' | 'bank' | 'wallet' | 'card' | 'custom';
          balance?: number;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'cash' | 'bank' | 'wallet' | 'card' | 'custom';
          balance?: number;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string;
          color: string;
          type: 'expense' | 'income';
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          name: string;
          icon: string;
          color: string;
          type: 'expense' | 'income';
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          icon?: string;
          color?: string;
          type?: 'expense' | 'income';
          is_default?: boolean;
          created_at?: string;
        };
      };
      friends: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          avatar_color: string;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          phone?: string | null;
          avatar_color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          avatar_color?: string;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'expense' | 'income' | 'transfer';
          amount: number;
          category_id: string | null;
          account_id: string;
          to_account_id: string | null;
          note: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          type: 'expense' | 'income' | 'transfer';
          amount: number;
          category_id?: string | null;
          account_id: string;
          to_account_id?: string | null;
          note?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'expense' | 'income' | 'transfer';
          amount?: number;
          category_id?: string | null;
          account_id?: string;
          to_account_id?: string | null;
          note?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      split_expenses: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          total_amount: number;
          split_method: 'equal' | 'custom';
          status: 'pending' | 'partial' | 'settled';
          paid_by_type: 'me' | 'friend';
          paid_by_friend_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          transaction_id: string;
          total_amount: number;
          split_method: 'equal' | 'custom';
          status?: 'pending' | 'partial' | 'settled';
          paid_by_type?: 'me' | 'friend';
          paid_by_friend_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          total_amount?: number;
          split_method?: 'equal' | 'custom';
          status?: 'pending' | 'partial' | 'settled';
          paid_by_type?: 'me' | 'friend';
          paid_by_friend_id?: string | null;
          created_at?: string;
        };
      };
      split_participants: {
        Row: {
          id: string;
          user_id: string;
          split_expense_id: string;
          friend_id: string | null;
          name: string;
          amount: number;
          is_paid: boolean;
          settled_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          split_expense_id: string;
          friend_id?: string | null;
          name: string;
          amount: number;
          is_paid?: boolean;
          settled_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          split_expense_id?: string;
          friend_id?: string | null;
          name?: string;
          amount?: number;
          is_paid?: boolean;
          settled_at?: string | null;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          icon: string;
          created_by?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          icon?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          name: string | null;
          avatar_url: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          group_id: string;
          user_id?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
        };
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          code: string;
          created_by: string;
          created_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id: string;
          group_id: string;
          code: string;
          created_by: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          group_id?: string;
          code?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
      };
      group_expenses: {
        Row: {
          id: string;
          group_id: string;
          description: string;
          amount: number;
          paid_by_member_id: string | null;
          paid_by_user_id: string | null;
          date: string;
          split_method: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          group_id: string;
          description: string;
          amount: number;
          paid_by_member_id?: string | null;
          paid_by_user_id?: string | null;
          date: string;
          split_method?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          description?: string;
          amount?: number;
          paid_by_member_id?: string | null;
          paid_by_user_id?: string | null;
          date?: string;
          split_method?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_expense_participants: {
        Row: {
          id: string;
          group_expense_id: string;
          group_id: string;
          member_id: string | null;
          user_id: string | null;
          share_amount: number;
          created_at: string;
        };
        Insert: {
          id: string;
          group_expense_id: string;
          group_id: string;
          member_id?: string | null;
          user_id?: string | null;
          share_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_expense_id?: string;
          group_id?: string;
          member_id?: string | null;
          user_id?: string | null;
          share_amount?: number;
          created_at?: string;
        };
      };
      group_settlements: {
        Row: {
          id: string;
          group_id: string;
          from_member_id: string | null;
          from_user_id: string | null;
          to_member_id: string | null;
          to_user_id: string | null;
          amount: number;
          date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id: string;
          group_id: string;
          from_member_id?: string | null;
          from_user_id?: string | null;
          to_member_id?: string | null;
          to_user_id?: string | null;
          amount: number;
          date: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          from_member_id?: string | null;
          from_user_id?: string | null;
          to_member_id?: string | null;
          to_user_id?: string | null;
          amount?: number;
          date?: string;
          created_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      view_user_monthly_summary: {
        Row: {
          user_id: string;
          month_key: string;
          total_income: number;
          total_expense: number;
          net_saved: number;
          transaction_count: number;
        };
      };
      view_user_category_spending: {
        Row: {
          user_id: string;
          month_key: string;
          category_id: string;
          category_name: string;
          category_icon: string;
          category_color: string;
          total_amount: number;
          transaction_count: number;
        };
      };
    };
    Functions: {
      settle_split_participant: {
        Args: {
          p_split_expense_id: string;
          p_participant_id: string;
        };
        Returns: Json;
      };
    };
  };
}
