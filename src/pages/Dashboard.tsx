
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { DollarSign, Users, Package, Receipt, ListCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  fetchDashboardStats,
  DashboardStats,
  Transaction,
  TransactionsByDay,
  Product,
  CategoryData
} from '@/services/dashboardService';
import { formatCurrency } from '@/utils/formatters';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TransactionsChart } from '@/components/dashboard/TransactionsChart';
import { ProductPieChart } from '@/components/dashboard/ProductPieChart';
import { TopProductsTable } from '@/components/dashboard/TopProductsTable';
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
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
    async function loadDashboardData() {
      setLoading(true);
      
      try {
        const data = await fetchDashboardStats();
        
        setStats(data.stats);
        setRecentTransactions(data.recentTransactions);
        setTransactionsByDay(data.transactionsByDay);
        setTopProducts(data.topProducts);
        setCategoryData(data.categoryData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error loading dashboard data",
          description: "There was a problem fetching the data. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
  }, []);
  
  const handleViewAllTransactions = () => {
    navigate('/sales-transactions');
  };
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPath={location.pathname} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatsCard 
                title="Total Sales" 
                value={formatCurrency(stats.totalSales)}
                icon={DollarSign}
                iconColor="text-blue-500"
                iconBgColor="bg-blue-100 dark:bg-blue-900/30"
              />
              
              <StatsCard 
                title="Transactions" 
                value={stats.totalTransactions}
                icon={Receipt}
                iconColor="text-green-500"
                iconBgColor="bg-green-100 dark:bg-green-900/30"
              />
              
              <StatsCard 
                title="Customers" 
                value={stats.totalCustomers}
                icon={Users}
                iconColor="text-purple-500"
                iconBgColor="bg-purple-100 dark:bg-purple-900/30"
              />
              
              <StatsCard 
                title="Products" 
                value={stats.totalProducts}
                icon={Package}
                iconColor="text-yellow-500"
                iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
              />
              
              <StatsCard 
                title="Employees" 
                value={stats.totalEmployees}
                icon={Users}
                iconColor="text-red-500"
                iconBgColor="bg-red-100 dark:bg-red-900/30"
              />
              
              <StatsCard 
                title="Departments" 
                value={stats.totalDepartments}
                icon={ListCheck}
                iconColor="text-indigo-500"
                iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Transactions Chart */}
              <TransactionsChart data={transactionsByDay} />
              
              {/* Product Sales Distribution */}
              <ProductPieChart data={categoryData} />
            </div>
            
            {/* Top Products Table */}
            <TopProductsTable products={topProducts} />
            
            {/* Recent Transactions */}
            <RecentTransactionsTable 
              transactions={recentTransactions}
              onViewAll={handleViewAllTransactions}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
