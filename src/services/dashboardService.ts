
import { supabase } from "@/integrations/supabase/client";

interface TopProduct {
  product_code: string;
  product_name: string;
  total_quantity: number;
  total_amount: number;
}

interface TransactionData {
  date: string;
  sales: number;
}

interface ProductCategory {
  name: string;
  value: number;
}

export async function fetchDashboardStats() {
  // Stats Overview
  const { data: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' });

  const { data: totalProducts } = await supabase
    .from('product')
    .select('*', { count: 'exact' });

  const { data: totalCustomers } = await supabase
    .from('customer')
    .select('*', { count: 'exact' });

  const { data: salesData } = await supabase
    .from('transactions')
    .select('amount');

  const totalSales = salesData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  return {
    totalSales,
    totalProducts: totalProducts?.length || 0,
    totalTransactions: totalTransactions?.length || 0,
    totalCustomers: totalCustomers?.length || 0,
  };
}

export async function fetchTransactionTrends(): Promise<TransactionData[]> {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const { data } = await supabase
    .from('transactions')
    .select('created_at, amount')
    .gte('created_at', lastMonth.toISOString())
    .order('created_at');
  
  // Group by date
  const groupedData = (data || []).reduce<Record<string, number>>((acc, item) => {
    const date = new Date(item.created_at!).toLocaleDateString();
    acc[date] = (acc[date] || 0) + (item.amount || 0);
    return acc;
  }, {});
  
  // Convert to array format needed by chart
  return Object.entries(groupedData).map(([date, sales]) => ({
    date,
    sales,
  }));
}

export async function fetchTopProducts(limit: number = 5): Promise<TopProduct[]> {
  // Using the product and salesdetail tables for top products
  const { data } = await supabase
    .from('salesdetail')
    .select(`
      quantity,
      prodcode,
      product:prodcode (
        description,
        unit
      )
    `)
    .limit(limit);
  
  // Process the data to get top products
  const productMap = new Map<string, TopProduct>();
  
  (data || []).forEach(item => {
    const productCode = item.prodcode;
    const quantity = parseFloat(item.quantity?.toString() || '0');
    
    if (!productMap.has(productCode)) {
      productMap.set(productCode, {
        product_code: productCode,
        product_name: item.product?.description || 'Unknown Product',
        total_quantity: 0,
        total_amount: 0
      });
    }
    
    const product = productMap.get(productCode)!;
    product.total_quantity += quantity;
    
    // Try to get price from pricehist
    const estimatedAmount = quantity * 100; // placeholder value
    product.total_amount += estimatedAmount;
  });
  
  // Convert map to array and sort by total_amount
  return Array.from(productMap.values())
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit);
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  // Using department table as categories
  const { data: departments } = await supabase
    .from('department')
    .select('deptcode, deptname');
  
  // For demonstration purposes, create sample data based on departments
  return (departments || []).map(dept => ({
    name: dept.deptname || dept.deptcode,
    value: Math.floor(Math.random() * 5000) + 1000 // Random value for demonstration
  }));
}

export async function fetchRecentTransactions(limit: number = 5) {
  // Get recent sales transactions
  const { data } = await supabase
    .from('sales')
    .select(`
      transno,
      salesdate,
      customer:custno (custname),
      employee:empno (firstname, lastname)
    `)
    .order('salesdate', { ascending: false })
    .limit(limit);
  
  return (data || []).map(sale => ({
    id: sale.transno,
    date: sale.salesdate ? new Date(sale.salesdate).toLocaleDateString() : 'Unknown',
    customer: sale.customer?.custname || 'Unknown Customer',
    amount: Math.floor(Math.random() * 5000) + 100, // Placeholder
    status: Math.random() > 0.3 ? 'completed' : 'pending', // Placeholder
    employee: sale.employee ? `${sale.employee.firstname || ''} ${sale.employee.lastname || ''}`.trim() || 'Unknown' : 'Unknown'
  }));
}

// Helper function to check if user is admin
export const isAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();
  
  return !!data;
};

// Get all users with their roles
export const fetchAllUsers = async () => {
  // Get all users from the profiles table
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email');
  
  // Get all user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role');
  
  // Merge data
  return (profiles || []).map(profile => {
    const userRoles = roles?.filter(r => r.user_id === profile.id) || [];
    const isUserAdmin = userRoles.some(r => r.role === 'admin');
    
    return {
      id: profile.id,
      email: profile.email,
      isAdmin: isUserAdmin,
      roles: userRoles.map(r => r.role)
    };
  });
};

// Update user role
export const updateUserRole = async (userId: string, isAdmin: boolean): Promise<void> => {
  if (isAdmin) {
    // Add admin role if it doesn't exist
    await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
  } else {
    // Remove admin role if it exists
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');
  }
};
