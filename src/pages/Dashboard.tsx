
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, Package, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardStatsType {
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  totalProducts: number;
}

interface Transaction {
  id: string;
  product_name: string;
  amount: number;
  quantity: number;
  created_at: string;
}

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsType>({
    totalSales: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    totalProducts: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      
      try {
        // Fetch transactions for total sales and count
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount');
        
        if (transactionsError) throw transactionsError;
        
        // Calculate total sales
        const totalSales = transactionsData.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        const totalTransactions = transactionsData.length;
        
        // Fetch customer count (distinct custno from sales table)
        const { count: customerCount, error: customerError } = await supabase
          .from('customer')
          .select('custno', { count: 'exact', head: true });
          
        if (customerError) throw customerError;
        
        // Fetch product count
        const { count: productCount, error: productError } = await supabase
          .from('product')
          .select('prodcode', { count: 'exact', head: true });
          
        if (productError) throw productError;
        
        // Fetch recent transactions - updated to fetch 10 transactions instead of 5
        const { data: recentTransactionsData, error: recentTransactionsError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (recentTransactionsError) throw recentTransactionsError;
        
        setStats({
          totalSales,
          totalTransactions,
          totalCustomers: customerCount || 0,
          totalProducts: productCount || 0
        });
        
        setRecentTransactions(recentTransactionsData as Transaction[]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPath={location.pathname} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Sales Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</h3>
                </CardContent>
              </Card>
              
              {/* Transactions Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stats.totalTransactions}</h3>
                </CardContent>
              </Card>
              
              {/* Customers Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Customers</p>
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stats.totalCustomers}</h3>
                </CardContent>
              </Card>
              
              {/* Products Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Products</p>
                    <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Package className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stats.totalProducts}</h3>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Transactions */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-1"
                  onClick={() => navigate('/sales-transactions')}
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="bg-card text-card-foreground rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium">Product</th>
                        <th className="py-3 px-4 text-left font-medium">Quantity</th>
                        <th className="py-3 px-4 text-left font-medium">Amount</th>
                        <th className="py-3 px-4 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.length > 0 ? (
                        recentTransactions.map((transaction) => (
                          <tr key={transaction.id} className="border-t border-border">
                            <td className="py-3 px-4">{transaction.product_name}</td>
                            <td className="py-3 px-4">{transaction.quantity}</td>
                            <td className="py-3 px-4">{formatCurrency(Number(transaction.amount))}</td>
                            <td className="py-3 px-4">{new Date(transaction.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 px-4 text-center text-muted-foreground">
                            No recent transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Welcome Card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Welcome to SellSmart</h2>
                <p className="text-muted-foreground">This is your dashboard. You can view sales data and manage transactions from here.</p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
