
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SalesWithDetails = {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  custname: string | null;
  empname: string | null;
  productDetails: {
    prodcode: string;
    quantity: number | null;
    description: string | null;
    unit: string | null;
    unitprice: number | null;
  }[];
  totalPrice: number;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState<SalesWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch sales data with related customer and employee info, sorted by most recent
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            transno,
            salesdate,
            custno,
            empno,
            customer:custno(custname),
            employee:empno(firstname, lastname)
          `)
          .order('transno', { ascending: false }); // Order by newest transactions first
        
        if (salesError) throw salesError;
        
        if (!salesData || salesData.length === 0) {
          setSalesData([]);
          setIsLoading(false);
          return;
        }
        
        // For each sales record, fetch its product details with product info and price
        const salesWithDetails = await Promise.all(
          salesData.map(async (sale) => {
            const { data: detailsData, error: detailsError } = await supabase
              .from('salesdetail')
              .select(`
                prodcode,
                quantity,
                product:prodcode(description, unit)
              `)
              .eq('transno', sale.transno);
            
            if (detailsError) throw detailsError;
            
            // For each product, get the latest price from price history
            const productDetailsWithPrice = await Promise.all(
              (detailsData || []).map(async (detail) => {
                // Get the most recent price before or on the sale date
                const { data: priceData, error: priceError } = await supabase
                  .from('pricehist')
                  .select('unitprice')
                  .eq('prodcode', detail.prodcode)
                  .lte('effdate', sale.salesdate || new Date().toISOString())
                  .order('effdate', { ascending: false })
                  .limit(1);
                
                if (priceError) throw priceError;
                
                const unitprice = priceData && priceData.length > 0 ? priceData[0].unitprice : null;
                
                return {
                  prodcode: detail.prodcode,
                  quantity: detail.quantity,
                  description: detail.product?.description,
                  unit: detail.product?.unit,
                  unitprice
                };
              })
            );
            
            // Calculate total price for all products in this transaction
            const totalPrice = productDetailsWithPrice.reduce((sum, product) => {
              const productTotal = (product.quantity || 0) * (product.unitprice || 0);
              return sum + productTotal;
            }, 0);
            
            return {
              transno: sale.transno,
              salesdate: sale.salesdate,
              custno: sale.custno,
              empno: sale.empno,
              custname: sale.customer?.custname,
              empname: sale.employee ? `${sale.employee.firstname || ''} ${sale.employee.lastname || ''}`.trim() : null,
              productDetails: productDetailsWithPrice,
              totalPrice
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
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const toggleTransaction = (transno: string) => {
    if (expandedTransaction === transno) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(transno);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary">SellSmart</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="font-semibold text-primary">Dashboard</Button>
            <Button variant="ghost" onClick={() => navigate('/sales-transactions')}>Sales</Button>
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
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(salesData.reduce((sum, sale) => sum + sale.totalPrice, 0))}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <DollarSign size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{salesData.length}</p>
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
                <p className="text-2xl font-bold">
                  {new Set(salesData.map(sale => sale.custno)).size}
                </p>
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
                <p className="text-2xl font-bold">
                  {new Set(salesData.flatMap(sale => 
                    sale.productDetails.map(detail => detail.prodcode)
                  )).size}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-500">
                <Package size={24} />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="pb-2 flex justify-between items-center">
            <CardTitle className="text-xl font-medium">Recent Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/sales-transactions')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : salesData.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                No sales data available
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Transaction No</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Show the latest 5 transactions on dashboard */}
                    {salesData.slice(0, 5).map((sale) => (
                      <React.Fragment key={sale.transno}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleTransaction(sale.transno)}
                        >
                          <TableCell className="font-medium">{sale.transno}</TableCell>
                          <TableCell>{formatDate(sale.salesdate)}</TableCell>
                          <TableCell>{sale.custname || 'N/A'}</TableCell>
                          <TableCell>{sale.empname || 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(sale.totalPrice)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTransaction(sale.transno);
                              }}
                            >
                              {expandedTransaction === sale.transno ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {expandedTransaction === sale.transno && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0 border-t">
                              <div className="bg-muted/20 p-4">
                                <h4 className="font-semibold text-sm uppercase mb-2 text-muted-foreground">Transaction Details</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[40%]">Product</TableHead>
                                      <TableHead>Code</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead className="text-right">Qty</TableHead>
                                      <TableHead className="text-right">Price</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.productDetails.map((product, index) => {
                                      const productTotal = (product.quantity || 0) * (product.unitprice || 0);
                                      return (
                                        <TableRow key={`${sale.transno}-${product.prodcode}-${index}`}>
                                          <TableCell>{product.description || 'N/A'}</TableCell>
                                          <TableCell className="font-mono text-xs">{product.prodcode}</TableCell>
                                          <TableCell>{product.unit || 'N/A'}</TableCell>
                                          <TableCell className="text-right">{product.quantity || 0}</TableCell>
                                          <TableCell className="text-right">{product.unitprice ? formatCurrency(product.unitprice) : 'N/A'}</TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(productTotal)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    <TableRow>
                                      <TableCell colSpan={4}></TableCell>
                                      <TableCell className="text-right font-bold">Total:</TableCell>
                                      <TableCell className="text-right font-bold">{formatCurrency(sale.totalPrice)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
