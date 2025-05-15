
import { supabase } from "@/integrations/supabase/client";

// Define all interfaces required by the Dashboard components
export interface DashboardStats {
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  totalProducts: number;
  totalEmployees: number;
  totalDepartments: number;
}

export interface Transaction {
  id: string;
  product_name: string;
  created_at: string;
  quantity: number;
  amount: number;
}

export interface TransactionsByDay {
  date: string;
  totalAmount: number;
  transactionCount: number;
}

export interface Product {
  prodcode: string;
  description: string;
  sales: number;
}

export interface CategoryData {
  name: string;
  value: number;
}

// Fetch dashboard statistics 
export async function fetchDashboardStats() {
  try {
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
    
    const { data: totalEmployees } = await supabase
      .from('employee')
      .select('*', { count: 'exact' });

    const { data: totalDepartments } = await supabase
      .from('department')
      .select('*', { count: 'exact' });

    const { data: salesData } = await supabase
      .from('transactions')
      .select('amount');

    const totalSales = salesData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    // Recent Transactions
    const { data: recentTransactionsData } = await supabase
      .from('transactions')
      .select('id, product_name, created_at, quantity, amount')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentTransactions = recentTransactionsData || [];

    // Transactions by Day
    const { data: transactionsByDayData } = await supabase
      .from('transactions')
      .select('created_at, amount')
      .order('created_at', { ascending: true });

    const last7Days = getLast7Days();
    const transactionsByDay = transformTransactionsByDay(transactionsByDayData || [], last7Days);

    // Top Products
    const { data: topProductsData } = await supabase
      .from('salesdetail')
      .select(`
        quantity,
        prodcode,
        product:prodcode (
          description
        )
      `)
      .limit(5);

    const topProducts = transformTopProducts(topProductsData || []);

    // Product Categories
    const { data: departmentsData } = await supabase
      .from('department')
      .select('deptcode, deptname');

    const categoryData = (departmentsData || []).map(dept => ({
      name: dept.deptname || dept.deptcode,
      value: Math.floor(Math.random() * 5000) + 1000 // Random value for demonstration
    }));

    // Return all data in the expected structure
    return {
      stats: {
        totalSales,
        totalTransactions: totalTransactions?.length || 0,
        totalCustomers: totalCustomers?.length || 0,
        totalProducts: totalProducts?.length || 0,
        totalEmployees: totalEmployees?.length || 0,
        totalDepartments: totalDepartments?.length || 0
      },
      recentTransactions,
      transactionsByDay,
      topProducts,
      categoryData
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      stats: {
        totalSales: 0,
        totalTransactions: 0,
        totalCustomers: 0,
        totalProducts: 0,
        totalEmployees: 0,
        totalDepartments: 0
      },
      recentTransactions: [],
      transactionsByDay: [],
      topProducts: [],
      categoryData: []
    };
  }
}

// Helper functions
function getLast7Days() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push(date.toISOString().split('T')[0]); // Format: YYYY-MM-DD
  }
  return result;
}

function transformTransactionsByDay(transactions: any[], dateRange: string[]) {
  // Group transactions by date
  const groupedByDate = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        totalAmount: 0,
        transactionCount: 0
      };
    }
    acc[date].totalAmount += Number(transaction.amount) || 0;
    acc[date].transactionCount += 1;
    return acc;
  }, {});

  // Create array with data for each day in the date range
  return dateRange.map(date => ({
    date,
    totalAmount: groupedByDate[date]?.totalAmount || 0,
    transactionCount: groupedByDate[date]?.transactionCount || 0
  }));
}

function transformTopProducts(salesDetails: any[]) {
  // Group by product and calculate totals
  const productMap = new Map();
  
  salesDetails.forEach(item => {
    const productCode = item.prodcode;
    const quantity = parseFloat(item.quantity?.toString() || '0');
    
    if (!productMap.has(productCode)) {
      productMap.set(productCode, {
        prodcode: productCode,
        description: item.product?.description || 'Unknown Product',
        sales: 0
      });
    }
    
    const product = productMap.get(productCode);
    // Estimate sales amount (random for demo purposes)
    product.sales += quantity * (Math.floor(Math.random() * 100) + 50);
  });
  
  // Convert to array and sort by sales
  return Array.from(productMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
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
