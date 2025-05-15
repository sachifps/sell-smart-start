
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";

// Define TypeScript interfaces for the data structures
export interface Product {
  id: number;
  name: string;
  sales: number;
  revenue: number;
}

export interface Transaction {
  id: string;
  date: Date;
  customer: string;
  amount: number;
  status: string;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface TransactionsByDay {
  date: string;
  totalAmount: number;
  transactionCount: number;
}

// Mock data for dashboard
export const fetchDashboardStats = async () => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return mock data
    return {
      totalSales: 125000,
      totalTransactions: 1832,
      avgTicketSize: 68.23,
      topSellingProducts: [
        { id: 1, name: "Premium Coffee Blend", sales: 450, revenue: 8550 },
        { id: 2, name: "Organic Herbal Tea", sales: 380, revenue: 5700 },
        { id: 3, name: "Specialty Cold Brew", sales: 310, revenue: 4650 },
        { id: 4, name: "Gourmet Pastry Selection", sales: 275, revenue: 4125 },
        { id: 5, name: "Breakfast Sandwich Combo", sales: 240, revenue: 3600 }
      ],
      recentTransactions: [
        {
          id: "tx-001",
          date: new Date(2025, 4, 15, 9, 23),
          customer: "Sarah Johnson",
          amount: 128.50,
          status: "completed"
        },
        {
          id: "tx-002",
          date: new Date(2025, 4, 15, 8, 45),
          customer: "Michael Chen",
          amount: 85.75,
          status: "completed"
        },
        {
          id: "tx-003",
          date: new Date(2025, 4, 14, 17, 12),
          customer: "Emma Rodriguez",
          amount: 42.30,
          status: "completed"
        },
        {
          id: "tx-004",
          date: new Date(2025, 4, 14, 14, 57),
          customer: "David Smith",
          amount: 156.20,
          status: "pending"
        },
        {
          id: "tx-005",
          date: new Date(2025, 4, 14, 10, 33),
          customer: "Lisa Wong",
          amount: 64.95,
          status: "completed"
        }
      ],
      salesByMonth: [
        { month: "Jan", sales: 42000 },
        { month: "Feb", sales: 45000 },
        { month: "Mar", sales: 58000 },
        { month: "Apr", sales: 52000 },
        { month: "May", sales: 48000 },
        { month: "Jun", sales: 62000 },
        { month: "Jul", sales: 68000 },
        { month: "Aug", sales: 71000 },
        { month: "Sep", sales: 78000 },
        { month: "Oct", sales: 82000 },
        { month: "Nov", sales: 91000 },
        { month: "Dec", sales: 125000 }
      ],
      salesByCategory: [
        { name: "Beverages", value: 45 },
        { name: "Food", value: 30 },
        { name: "Merchandise", value: 15 },
        { name: "Other", value: 10 }
      ]
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    
    // Fix: Use toast.error instead of direct call
    toast.error("Failed to load dashboard data. Please try again later.");
    
    throw error;
  }
};

export const fetchAdditionalMetrics = async () => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Return mock data
    return {
      customerRetention: 86,
      netPromoterScore: 72,
      averageFulfillmentTime: "14 minutes",
      topPerformingLocation: "Downtown",
      inventoryTurnoverRate: 3.8
    };
  } catch (error) {
    console.error("Error fetching additional metrics:", error);
    
    // Fix: Use toast.error instead of direct call
    toast.error("Failed to load additional metrics. Please try again later.");
    
    throw error;
  }
};
