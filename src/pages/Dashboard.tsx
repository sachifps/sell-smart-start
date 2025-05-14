import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, Package, TrendingUp, ArrowRight, Receipt, CalendarDays, ListCheck } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

interface DashboardStatsType {
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  totalProducts: number;
  totalEmployees: number;
  totalDepartments: number;
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

interface Product {
  prodcode: string;
  description: string;
  unit: string;
  sales: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsType>({
    totalSales: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalEmployees: 0,
    totalDepartments: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionsByDay, setTransactionsByDay] = useState<TransactionsByDay[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      
      try {
        // Fetch ALL transactions for accurate total sales and count
        const { data: allTransactionsData, error: allTransactionsError } = await supabase
          .from('transactions')
          .select('amount, created_at, product_name, product_code')
          .order('created_at', { ascending: false });
        
        if (allTransactionsError) throw allTransactionsError;
        
        // Calculate total sales from all transactions
        const totalSales = allTransactionsData.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        // Get accurate total transaction count
        const totalTransactions = allTransactionsData.length;
        
        // Fetch customer count
        const { count: customerCount, error: customerError } = await supabase
          .from('customer')
          .select('custno', { count: 'exact', head: true });
          
        if (customerError) throw customerError;
        
        // Fetch product count
        const { count: productCount, error: productError } = await supabase
          .from('product')
          .select('prodcode', { count: 'exact', head: true });
          
        if (productError) throw productError;
        
        // Fetch employee count
        const { count: employeeCount, error: employeeError } = await supabase
          .from('employee')
          .select('empno', { count: 'exact', head: true });
          
        if (employeeError) throw employeeError;
        
        // Fetch department count
        const { count: departmentCount, error: departmentError } = await supabase
          .from('department')
          .select('deptcode', { count: 'exact', head: true });
          
        if (departmentError) throw departmentError;
        
        // Process transactions for chart data (group by day)
        const transactionsGroupedByDay = allTransactionsData.reduce((acc: Record<string, TransactionsByDay>, transaction) => {
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
        
        // Calculate top products by sales amount
        const productSales = allTransactionsData.reduce((acc: Record<string, Product>, transaction) => {
          const { product_code, product_name, amount } = transaction;
          
          if (!acc[product_code]) {
            acc[product_code] = {
              prodcode: product_code,
              description: product_name,
              unit: '',
              sales: 0
            };
          }
          
          acc[product_code].sales += Number(amount);
          
          return acc;
        }, {});
        
        // Convert to array and sort by sales
        const topProductsData = Object.values(productSales)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
          
        // Create category data for pie chart
        const categoryDataArray = topProductsData.map(product => ({
          name: product.description,
          value: product.sales
        }));
        
        // Fetch recent transactions for the small list (show 10 most recent)
        const { data: recentTransactionsData, error: recentTransactionsError } = await supabase
          .from('transactions')
          .select('id, product_name, amount, quantity, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (recentTransactionsError) throw recentTransactionsError;
        
        setStats({
          totalSales,
          totalTransactions,
          totalCustomers: customerCount || 0,
          totalProducts: productCount || 0,
          totalEmployees: employeeCount || 0,
          totalDepartments: departmentCount || 0
        });
        
        setRecentTransactions(recentTransactionsData as Transaction[]);
        setTransactionsByDay(chartData);
        setTopProducts(topProductsData);
        setCategoryData(categoryDataArray);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading dashboard data",
          description: "There was a problem fetching the data. Please try again later.",
          variant: "destructive"
        });
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                      <Receipt className="h-4 w-4 text-green-500" />
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
              
              {/* Employees Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Employees</p>
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stats.totalEmployees}</h3>
                </CardContent>
              </Card>
              
              {/* Departments Card */}
              <Card>
                <CardContent className="flex flex-col p-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Departments</p>
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <ListCheck className="h-4 w-4 text-indigo-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stats.totalDepartments}</h3>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Transactions Chart - Takes 2/3 of the width */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Transaction History (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
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
              
              {/* Product Sales Distribution - Takes 1/3 of the width */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex justify-center items-center">
                    <PieChart width={250} height={250}>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </div>
                  <div className="mt-2">
                    {categoryData.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between mb-1 text-xs">
                        <div className="flex items-center">
                          <span 
                            className="w-3 h-3 mr-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></span>
                          <span className="truncate max-w-[150px]">{entry.name}</span>
                        </div>
                        <span>{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top Products Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product) => (
                      <TableRow key={product.prodcode}>
                        <TableCell className="font-medium">{product.prodcode}</TableCell>
                        <TableCell>{product.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
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
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.product_name}</TableCell>
                          <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{transaction.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(transaction.amount))}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No recent transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// Helper function for rendering PieChart labels
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
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
