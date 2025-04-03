import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, PieChart, DollarSign, TrendingUp, Users, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SalesWithDetails = {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  productDetails: {
    prodcode: string;
    quantity: number | null;
  }[];
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState<SalesWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*');
        
        if (salesError) throw salesError;
        
        if (!salesData || salesData.length === 0) {
          setSalesData([]);
          setIsLoading(false);
          return;
        }
        
        // For each sales record, fetch its product details
        const salesWithDetails = await Promise.all(
          salesData.map(async (sale) => {
            const { data: detailsData, error: detailsError } = await supabase
              .from('salesdetail')
              .select('prodcode, quantity')
              .eq('transno', sale.transno);
            
            if (detailsError) throw detailsError;
            
            return {
              ...sale,
              productDetails: detailsData || []
            };
          })
        );
        
        setSalesData(salesWithDetails);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSalesData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-sales-800">SellSmart</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.name || user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-sales-500">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">$12,345</p>
              </div>
              <div className="h-12 w-12 bg-sales-100 rounded-full flex items-center justify-center text-sales-500">
                <DollarSign size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold">+12.5%</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-500">
                <TrendingUp size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold">148</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-500">
                <Users size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">56</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-500">
                <Package size={24} />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Sales Data</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sales-600"></div>
              </div>
            ) : salesData.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                No sales data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer #</TableHead>
                      <TableHead>Employee #</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.flatMap((sale) => 
                      sale.productDetails.length > 0 
                        ? sale.productDetails.map((detail, index) => (
                            <TableRow key={`${sale.transno}-${detail.prodcode}-${index}`}>
                              <TableCell>{sale.transno}</TableCell>
                              <TableCell>{formatDate(sale.salesdate)}</TableCell>
                              <TableCell>{sale.custno || 'N/A'}</TableCell>
                              <TableCell>{sale.empno || 'N/A'}</TableCell>
                              <TableCell>{detail.prodcode}</TableCell>
                              <TableCell>{detail.quantity || 0}</TableCell>
                            </TableRow>
                          ))
                        : (
                            <TableRow key={sale.transno}>
                              <TableCell>{sale.transno}</TableCell>
                              <TableCell>{formatDate(sale.salesdate)}</TableCell>
                              <TableCell>{sale.custno || 'N/A'}</TableCell>
                              <TableCell>{sale.empno || 'N/A'}</TableCell>
                              <TableCell>No product data</TableCell>
                              <TableCell>N/A</TableCell>
                            </TableRow>
                          )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
                <LineChart className="h-16 w-16 text-muted-foreground/70" />
                <span className="ml-2 text-muted-foreground">Sales chart will display here</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
                <PieChart className="h-16 w-16 text-muted-foreground/70" />
                <span className="ml-2 text-muted-foreground">Category chart will display here</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
              <BarChart className="h-16 w-16 text-muted-foreground/70" />
              <span className="ml-2 text-muted-foreground">Recent sales will display here</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
