
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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
  amount: number;
  quantity: number;
  created_at: string;
}

export interface TransactionsByDay {
  date: string;
  totalAmount: number;
  transactionCount: number;
}

export interface Product {
  prodcode: string;
  description: string;
  unit: string;
  sales: number;
}

export interface CategoryData {
  name: string;
  value: number;
}

/**
 * Fetch all dashboard statistics
 */
export const fetchDashboardStats = async (): Promise<{
  stats: DashboardStats;
  recentTransactions: Transaction[];
  transactionsByDay: TransactionsByDay[];
  topProducts: Product[];
  categoryData: CategoryData[];
}> => {
  try {
    // Fetch transactions from salesdetail and join with product for pricing
    const { data: salesDetailData, error: salesDetailError } = await supabase
      .from('salesdetail')
      .select(`
        transno,
        prodcode,
        quantity,
        product:prodcode(
          description,
          unit
        )
      `);

    if (salesDetailError) throw salesDetailError;

    // Fetch price history to calculate transaction amounts
    const { data: priceHistData, error: priceHistError } = await supabase
      .from('pricehist')
      .select('*');
      
    if (priceHistError) throw priceHistError;
    
    // Get latest price for each product
    const latestPrices: Record<string, number> = {};
    priceHistData.forEach(price => {
      const prodcode = price.prodcode;
      if (!latestPrices[prodcode] || new Date(price.effdate) > new Date(latestPrices[prodcode])) {
        latestPrices[prodcode] = parseFloat(price.unitprice);
      }
    });

    // Fetch sales data to get transaction dates
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select(`
        transno,
        salesdate,
        customer:custno(custname),
        employee:empno(firstname, lastname)
      `);
      
    if (salesError) throw salesError;

    // Create transaction records by combining salesdetail with prices
    const transactions = salesDetailData.map(detail => {
      const sale = salesData.find(s => s.transno === detail.transno);
      const price = latestPrices[detail.prodcode] || 0;
      const amount = parseFloat(detail.quantity) * price;
      
      return {
        id: `${detail.transno}-${detail.prodcode}`,
        transno: detail.transno,
        prodcode: detail.prodcode,
        product_name: detail.product?.description || 'Unknown Product',
        unit: detail.product?.unit || 'Unit',
        quantity: parseFloat(detail.quantity),
        price: price,
        amount: amount,
        created_at: sale?.salesdate || new Date().toISOString(),
      };
    });

    // Calculate total sales from all transactions
    const totalSales = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    // Get accurate total transaction count (unique transaction numbers)
    const uniqueTransactions = new Set(transactions.map(t => t.transno));
    const totalTransactions = uniqueTransactions.size;
    
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
    const transactionsGroupedByDay = transactions.reduce((acc: Record<string, TransactionsByDay>, transaction) => {
      // Ensure we have a date string that we can process
      let dateStr: string;
      if (typeof transaction.created_at === 'string') {
        dateStr = transaction.created_at.split('T')[0]; // For ISO format
      } else {
        const date = new Date(transaction.created_at);
        dateStr = date.toISOString().split('T')[0];
      }
      
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          totalAmount: 0,
          transactionCount: 0
        };
      }
      
      acc[dateStr].totalAmount += transaction.amount;
      acc[dateStr].transactionCount += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const chartData = Object.values(transactionsGroupedByDay)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Show last 7 days
    
    // Calculate top products by sales amount
    const productSales = transactions.reduce((acc: Record<string, Product>, transaction) => {
      const { prodcode, product_name, amount, unit } = transaction;
      
      if (!acc[prodcode]) {
        acc[prodcode] = {
          prodcode: prodcode,
          description: product_name,
          unit: unit,
          sales: 0
        };
      }
      
      acc[prodcode].sales += amount;
      
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
    
    // Sort transactions by date (newest first) for recent transactions list
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Get 10 most recent transactions
    const recentTransactionsData = sortedTransactions.slice(0, 10);
    
    return {
      stats: {
        totalSales,
        totalTransactions,
        totalCustomers: customerCount || 0,
        totalProducts: productCount || 0,
        totalEmployees: employeeCount || 0,
        totalDepartments: departmentCount || 0
      },
      recentTransactions: recentTransactionsData,
      transactionsByDay: chartData,
      topProducts: topProductsData,
      categoryData: categoryDataArray
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    toast({
      title: "Error loading dashboard data",
      description: "There was a problem fetching the data. Please try again later.",
      variant: "destructive"
    });
    
    // Return empty data in case of error
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
};
