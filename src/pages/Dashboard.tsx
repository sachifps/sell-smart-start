
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, Package, TrendingUp, ArrowRight } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

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

interface TransactionsByDay {
  date: string;
  totalAmount: number;
  transactionCount: number;
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
  const [transactionsByDay, setTransactionsByDay] = useState<TransactionsByDay[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      
      try {
        // Fetch transactions for total sales and count
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount, created_at');
        
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
        
        // Process transactions for chart data (group by day)
        const transactionsGroupedByDay = transactionsData.reduce((acc: Record<string, TransactionsByDay>, transaction) => {
          const date = new Date(transaction.created_at).toISOString().split('T')[0];
          
          if (!acc[date]) {
            acc[date] = {
              date,
              totalAmount: 0,
              transactionCount: 0
            };
          }
          
          acc[date].totalAmount += Number(transaction.amount);
          acc[date].transactionCount += 1;
          
          return acc;
        }, {});
        
        // Convert to array and sort by date
        const chartData = Object.values(transactionsGroupedByDay)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-7); // Show last 7 days
        
        // Fetch recent transactions for the small list
        const { data: recentTransactionsData, error: recentTransactionsError } = await supabase
          .from('transactions')
          .select('id, product_name, amount, quantity, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentTransactionsError) throw recentTransactionsError;
        
        setStats({
          totalSales,
          totalTransactions,
          totalCustomers: customerCount || 0,
          totalProducts: productCount || 0
        });
        
        setRecentTransactions(recentTransactionsData as Transaction[]);
        setTransactionsByDay(chartData);
        
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
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
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
            
            {/* Transactions Chart */}
            <div className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Transaction History</h2>
                  
                  <div className="h-80">
                    <ChartContainer 
                      config={{
                        sales: { color: "#3498db" },
                        transactions: { color: "#2ecc71" }
                      }}
                    >
                      <LineChart data={transactionsByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          tick={{fontSize: 12}}
                        />
                        <YAxis yAxisId="left" tickFormatter={(value) => `$${value}`} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="totalAmount" 
                          stroke="#3498db" 
                          name="Sales"
                          strokeWidth={2}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="transactionCount" 
                          stroke="#2ecc71" 
                          name="Transactions"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">Sales Amount</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">Transaction Count</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Transactions Summary */}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <Card key={transaction.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-sm">{transaction.product_name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(Number(transaction.amount))}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Quantity: {transaction.quantity}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-3 py-4 text-center text-muted-foreground">
                    No recent transactions found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-background border border-border rounded-md shadow-md p-3">
      <p className="text-sm font-medium">{new Date(payload[0].payload.date).toLocaleDateString()}</p>
      <p className="text-xs text-blue-500">
        Sales: {new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(payload[0].value)}
      </p>
      <p className="text-xs text-green-500">
        Transactions: {payload[1].value}
      </p>
    </div>
  );
};

export default Dashboard;
