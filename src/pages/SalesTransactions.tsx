import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Edit, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Customer = {
  custno: string;
  custname: string | null;
};

type Employee = {
  empno: string;
  firstname: string | null;
  lastname: string | null;
  fullname: string;
};

type Product = {
  prodcode: string;
  description: string | null;
  unit: string | null;
  latestPrice: number | null;
};

type SalesDetail = {
  prodcode: string;
  quantity: number | null;
  description: string | null;
  unit: string | null;
  unitprice: number | null;
  customUnit?: string;
};

type SalesTransaction = {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  custname: string | null;
  empname: string | null;
  productDetails: SalesDetail[];
  totalPrice: number;
};

const SalesTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [salesData, setSalesData] = useState<SalesTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  
  // For add/edit dialog
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<SalesTransaction | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // For form inputs
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [transactionProducts, setTransactionProducts] = useState<SalesDetail[]>([]);
  const [nextTransNo, setNextTransNo] = useState('');
  
  // References for dropdown options
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // For adding products to transaction
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  
  // New state for unit editing
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<string>('');

  useEffect(() => {
    fetchSalesData();
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select('custno, custname');
      
      if (customersError) throw customersError;
      setCustomers(customersData || []);
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employee')
        .select('empno, firstname, lastname');
      
      if (employeesError) throw employeesError;
      setEmployees(employeesData.map(emp => ({
        ...emp,
        fullname: `${emp.firstname || ''} ${emp.lastname || ''}`.trim()
      })) || []);
      
      // Fetch products with latest prices
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select('prodcode, description, unit');
      
      if (productsError) throw productsError;
      
      // Get the latest price for each product
      const productsWithPrices = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: priceData, error: priceError } = await supabase
            .from('pricehist')
            .select('unitprice')
            .eq('prodcode', product.prodcode)
            .order('effdate', { ascending: false })
            .limit(1);
          
          if (priceError) throw priceError;
          
          return {
            ...product,
            latestPrice: priceData && priceData.length > 0 ? priceData[0].unitprice : null
          };
        })
      );
      
      setProducts(productsWithPrices);
      
      // Generate next transaction number
      const { data: lastTrans, error: lastTransError } = await supabase
        .from('sales')
        .select('transno')
        .order('transno', { ascending: false })
        .limit(1);
      
      if (lastTransError) throw lastTransError;
      
      let nextNumber = '1001';
      if (lastTrans && lastTrans.length > 0) {
        const lastNumber = parseInt(lastTrans[0].transno);
        nextNumber = (lastNumber + 1).toString();
      }
      
      setNextTransNo(nextNumber);
      
    } catch (error) {
      console.error('Error fetching reference data:', error);
      toast({
        title: "Error",
        description: "Failed to load reference data",
        variant: "destructive"
      });
    }
  };

  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sales data with related customer and employee info
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          transno,
          salesdate,
          custno,
          empno,
          customer:custno(custname),
          employee:empno(firstname, lastname)
        `);
      
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
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = () => {
    setIsEditMode(false);
    setCurrentTransaction(null);
    resetForm();
    setIsTransactionDialogOpen(true);
  };

  const handleEditTransaction = (transaction: SalesTransaction) => {
    setIsEditMode(true);
    setCurrentTransaction(transaction);
    
    // Populate form with transaction data
    setTransactionDate(transaction.salesdate || '');
    setSelectedCustomer(transaction.custno || '');
    setSelectedEmployee(transaction.empno || '');
    setTransactionProducts([...transaction.productDetails]);
    
    setIsTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = (transaction: SalesTransaction) => {
    setCurrentTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setSelectedCustomer('');
    setSelectedEmployee('');
    setTransactionProducts([]);
    setShowAddProduct(false);
    setSelectedProduct('');
    setProductQuantity(1);
    setEditingProductIndex(null);
    setEditingUnit('');
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    const product = products.find(p => p.prodcode === selectedProduct);
    if (!product) return;

    // Check if product already exists in the transaction
    const existingProductIndex = transactionProducts.findIndex(p => p.prodcode === selectedProduct);

    if (existingProductIndex >= 0) {
      // Update quantity if product already exists
      const updatedProducts = [...transactionProducts];
      const existingQuantity = updatedProducts[existingProductIndex].quantity || 0;
      updatedProducts[existingProductIndex].quantity = existingQuantity + productQuantity;
      setTransactionProducts(updatedProducts);
    } else {
      // Add new product
      setTransactionProducts([
        ...transactionProducts,
        {
          prodcode: product.prodcode,
          description: product.description,
          unit: product.unit,
          quantity: productQuantity,
          unitprice: product.latestPrice
        }
      ]);
    }

    // Reset product selection
    setSelectedProduct('');
    setProductQuantity(1);
    setShowAddProduct(false);
  };

  const handleRemoveProduct = (prodcode: string) => {
    setTransactionProducts(transactionProducts.filter(p => p.prodcode !== prodcode));
  };

  const calculateTotal = () => {
    return transactionProducts.reduce((sum, product) => {
      return sum + ((product.quantity || 0) * (product.unitprice || 0));
    }, 0);
  };

  const startEditingUnit = (index: number, currentUnit: string | null) => {
    setEditingProductIndex(index);
    setEditingUnit(currentUnit || '');
  };

  const saveEditedUnit = () => {
    if (editingProductIndex !== null) {
      const updatedProducts = [...transactionProducts];
      updatedProducts[editingProductIndex].customUnit = editingUnit;
      setTransactionProducts(updatedProducts);
      setEditingProductIndex(null);
      setEditingUnit('');
    }
  };

  const cancelEditingUnit = () => {
    setEditingProductIndex(null);
    setEditingUnit('');
  };

  const handleSaveTransaction = async () => {
    try {
      if (!transactionDate || !selectedCustomer || !selectedEmployee || transactionProducts.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one product",
          variant: "destructive"
        });
        return;
      }

      const transno = isEditMode ? currentTransaction!.transno : nextTransNo;

      // Insert or update sales record
      if (isEditMode) {
        // Update sales record
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            salesdate: transactionDate,
            custno: selectedCustomer,
            empno: selectedEmployee
          })
          .eq('transno', transno);

        if (updateError) throw updateError;

        // Delete existing sales details
        const { error: deleteError } = await supabase
          .from('salesdetail')
          .delete()
          .eq('transno', transno);

        if (deleteError) throw deleteError;
      } else {
        // Insert new sales record
        const { error: insertError } = await supabase
          .from('sales')
          .insert({
            transno,
            salesdate: transactionDate,
            custno: selectedCustomer,
            empno: selectedEmployee
          });

        if (insertError) throw insertError;
      }

      // Insert sales details
      const salesDetailsToInsert = transactionProducts.map(product => ({
        transno,
        prodcode: product.prodcode,
        quantity: product.quantity || 0
      }));

      const { error: detailsError } = await supabase
        .from('salesdetail')
        .insert(salesDetailsToInsert);

      if (detailsError) throw detailsError;

      for (const product of transactionProducts) {
        if (product.customUnit && product.customUnit !== product.unit) {
          const { error: updateProductError } = await supabase
            .from('product')
            .update({ unit: product.customUnit })
            .eq('prodcode', product.prodcode);

          if (updateProductError) {
            console.error('Error updating product unit:', updateProductError);
          }
        }
      }

      toast({
        title: isEditMode ? "Transaction Updated" : "Transaction Created",
        description: isEditMode 
          ? `Transaction #${transno} has been updated successfully` 
          : `Transaction #${transno} has been created successfully`,
      });

      // Refresh data
      fetchSalesData();
      setIsTransactionDialogOpen(false);
      resetForm();

      // Generate new transaction number if it was a new transaction
      if (!isEditMode) {
        fetchReferenceData();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} transaction`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentTransaction) return;

    try {
      // First delete details (child records)
      const { error: detailsError } = await supabase
        .from('salesdetail')
        .delete()
        .eq('transno', currentTransaction.transno);

      if (detailsError) throw detailsError;

      // Then delete the main record
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .eq('transno', currentTransaction.transno);

      if (salesError) throw salesError;

      toast({
        title: "Transaction Deleted",
        description: `Transaction #${currentTransaction.transno} has been deleted successfully`,
      });

      fetchSalesData();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    }
  };

  const toggleTransaction = (transno: string) => {
    if (expandedTransaction === transno) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(transno);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary">SellSmart</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button variant="ghost" onClick={() => navigate('/sales-transactions')} className="font-semibold text-primary">Sales</Button>
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.name || user?.email}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sales Transactions</h2>
          <Button onClick={handleAddTransaction} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-0">
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
                      <TableHead className="w-[120px]">Actions</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((sale) => (
                      <React.Fragment key={sale.transno}>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell className="font-medium">{sale.transno}</TableCell>
                          <TableCell>{formatDate(sale.salesdate)}</TableCell>
                          <TableCell>{sale.custname || 'N/A'}</TableCell>
                          <TableCell>{sale.empname || 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(sale.totalPrice)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTransaction(sale);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTransaction(sale);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => toggleTransaction(sale.transno)}
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
                            <TableCell colSpan={7} className="p-0 border-t">
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
                                          <TableCell>{product.customUnit || product.unit || 'N/A'}</TableCell>
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

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? `Update details for transaction #${currentTransaction?.transno}` 
                : `Create a new sales transaction with transaction #${nextTransNo}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.custno} value={customer.custno}>
                        {customer.custname || customer.custno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.empno} value={employee.empno}>
                        {employee.fullname || employee.empno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Products</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddProduct(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
              
              {showAddProduct && (
                <Card className="p-4 border border-dashed border-primary/50 bg-primary/5">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label htmlFor="product">Product</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.prodcode} value={product.prodcode}>
                              {product.description || product.prodcode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="flex items-end space-x-2">
                      <Button type="button" onClick={handleAddProduct}>Add</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowAddProduct(false)}>Cancel</Button>
                    </div>
                  </div>
                </Card>
              )}
              
              {transactionProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionProducts.map((product, index) => {
                      const productTotal = (product.quantity || 0) * (product.unitprice || 0);
                      const isEditing = editingProductIndex === index;
                      
                      return (
                        <TableRow key={`product-${index}`}>
                          <TableCell>{product.description || product.prodcode}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex space-x-2">
                                <Input
                                  value={editingUnit}
                                  onChange={(e) => setEditingUnit(e.target.value)}
                                  className="w-20 h-8"
                                />
                                <div className="flex space-x-1">
                                  <Button 
                                    type="button" 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={saveEditedUnit}
                                  >
                                    <span className="sr-only">Save</span>
                                    ✓
                                  </Button>
                                  <Button 
                                    type="button" 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={cancelEditingUnit}
                                  >
                                    <span className="sr-only">Cancel</span>
                                    ✕
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span>{product.customUnit || product.unit || 'N/A'}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditingUnit(index, product.customUnit || product.unit)}
                                >
                                  <Edit className="h-3 w-3" />
                                  <span className="sr-only">Edit unit</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">{product.unitprice ? formatCurrency(product.unitprice) : 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(productTotal)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProduct(product.prodcode)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="text-right font-bold">Total:</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(calculateTotal())}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No products added yet
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransactionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction}>
              {isEditMode ? 'Update Transaction' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transaction #{currentTransaction?.transno}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesTransactions;
