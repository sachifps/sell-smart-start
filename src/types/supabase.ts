
export interface Transaction {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistory {
  id: string;
  transaction_id: string | null;
  product_code: string;
  product_name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  action: 'create' | 'update' | 'delete';
  created_at: string;
  user_id: string | null;
  user_email: string | null;
}

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export type UserRole = 'admin' | 'user';

export interface UserRoles {
  id: string;
  user_id: string;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}
