import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Edit, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
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

import { AppHeader } from '@/components/app-header';

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

type SortField = 'transno' | 'salesdate' | 'custname' | 'empname' | 'totalPrice';
type SortOrder = 'asc' | 'desc';

const SalesTransactions = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  
  const [salesData, setSalesData] = useState<SalesTransaction[]>([]);
  const [filteredSalesData, setFilteredSalesData] = useState<SalesTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<SalesTransaction | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [transactionProducts, setTransactionProducts] = useState<SalesDetail[]>([]);
  const [nextTransNo, setNextTransNo] = useState('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<string>('');

  const [customerName, setCustomerName] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');

  const [sortField, setSortField] = useState<SortField>('transno');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<string>('all');

  useEffect(() => {
    fetchSalesData();
    fetchReferenceData();
  }, []);

  useEffect(() => {
    let filtered = [...salesData];
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      
      filtered = filtered.filter(sale => {
        if (searchField === 'transno' || searchField === 'all') {
          if (sale.transno.toLowerCase().includes(term)) return true;
        }
        
        if (searchField === 'salesdate' || searchField === 'all') {
          if (sale.salesdate && formatDate(sale.salesdate).toLowerCase().includes(term)) return true;
        }
        
        if (searchField === 'custname' || searchField === 'all') {
          if (sale.custname && sale.custname.toLowerCase().includes(term)) return true;
        }
        
        if (searchField === 'empname' || searchField === 'all') {
          if (sale.empname && sale.empname.toLowerCase().includes(term)) return true;
        }
        
        return false;
      });
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'transno':
          comparison = a.transno.localeCompare(b.transno);
          break;
        case 'salesdate':
          const dateA = a.salesdate || '';
          const dateB = b.salesdate || '';
          comparison = dateA.localeCompare(dateB);
          break;
        case 'custname':
          const custNameA = a.custname || '';
          const custNameB = b.custname || '';
          comparison = custNameA.localeCompare(custNameB);
          break;
        case 'empname':
          const empNameA = a.empname || '';
          const empNameB = b.empname || '';
          comparison = empNameA.localeCompare(empNameB);
          break;
        case 'totalPrice':
          comparison = a.totalPrice - b.totalPrice;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredSalesData(filtered);
  }, [salesData, searchTerm, searchField, sortField, sortOrder]);

  const fetchReferenceData = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select('custno, custname');
      
      if (customersError) throw customersError;
      setCustomers(customersData || []);
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employee')
        .select('empno, firstname, lastname');
      
      if (employeesError) throw employeesError;
      setEmployees(employeesData.map(emp => ({
        ...emp,
        fullname: `${emp.firstname || ''} ${emp.lastname || ''}`.trim()
      })) || []);
      
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select('prodcode, description, unit');
      
      if (productsError) throw productsError;
      
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
      
      await fetchLatestTransactionNumber();
      
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
        .order('transno', { ascending: false });
      
      if (salesError) throw salesError;
      
      if (!salesData || salesData.length === 0) {
        setSalesData([]);
        setFilteredSalesData([]);
        setIsLoading(false);
        return;
      }
      
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
          
          const productDetailsWithPrice = await Promise.all(
            (detailsData || []).map(async (detail) => {
              const { data: priceData, error: priceError } = await supabase
                .from('pricehist')
                .select('unitprice')
                .eq('prodcode', detail.prodcode)
                .lte('effdate', sale.salesdate || new Date().toISOString())
                .order('effdate', { ascending: false })
                .limit(1);
              
              if (priceError) throw priceError;
              
              const unitprice = priceData && priceData.length > 0 ? priceData[0].unitprice : null;
              
              const { data: productData } = await supabase
                .from('product')
                .select('unit')
                .eq('prodcode', detail.prodcode)
                .single();
                
              return {
                prodcode: detail.prodcode,
                quantity: detail.quantity,
                description: detail.product?.description,
                unit: productData?.unit || detail.product?.unit,
                unitprice,
                customUnit: productData?.unit !== detail.product?.unit ? productData?.unit : undefined
              };
            })
          );
          
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
      setFilteredSalesData(salesWithDetails);
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
    
    fetchLatestTransactionNumber().then(() => {
      setIsTransactionDialogOpen(true);
    });
  };

  const fetchLatestTransactionNumber = async () => {
    try {
      const { data: lastTrans, error: lastTransError } = await supabase
        .from('sales')
        .select('transno')
        .order('transno', { ascending: false })
        .limit(1);
      
      if (lastTransError) throw lastTransError;
      
      let nextNumber;
      if (lastTrans && lastTrans.length > 0) {
        const lastTransNo = lastTrans[0].transno;
        
        const matches = lastTransNo.match(/^([A-Za-z]*)(\d+)$/);
        if (matches && matches.length === 3) {
          const prefix = matches[1];
          const numPart = matches[2];
          
          const nextNumValue = parseInt(numPart) + 1;
          
          const paddedNum = nextNumValue.toString().padStart(numPart.length, '0');
          
          nextNumber = `${prefix}${paddedNum}`;
        } else {
          const numericPart = parseInt(lastTransNo);
          nextNumber = isNaN(numericPart) ? "1001" : (numericPart + 1).toString();
        }
      } else {
        nextNumber = "TR000001";
      }
      
      setNextTransNo(nextNumber);
      return nextNumber;
    } catch (error) {
      console.error('Error fetching latest transaction number:', error);
      toast({
        title: "Error",
        description: "Failed to generate transaction number",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  const handleEditTransaction = (transaction: SalesTransaction) => {
    setIsEditMode(true);
    setCurrentTransaction(transaction);
    
    setTransactionDate(transaction.salesdate || '');
    setSelectedCustomer(transaction.custno || '');
    setSelectedEmployee(transaction.empno || '');
    setCustomerName(transaction.custname || '');
    setEmployeeName(transaction.empname || '');
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
    setCustomerName('');
    setEmployeeName('');
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

    const existingProductIndex = transactionProducts.findIndex(p => p.prodcode === selectedProduct);

    if (existingProductIndex >= 0) {
      const updatedProducts = [...transactionProducts];
      const existingQuantity = updatedProducts[existingProductIndex].quantity || 0;
      updatedProducts[existingProductIndex].quantity = existingQuantity + productQuantity;
      setTransactionProducts(updatedProducts);
    } else {
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
      if (!transactionDate || transactionProducts.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one product",
          variant: "destructive"
        });
        return;
      }

      const transno = isEditMode ? currentTransaction!.transno : nextTransNo;

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            salesdate: transactionDate,
            custno: selectedCustomer || null,
            empno: selectedEmployee || null
          })
          .eq('transno', transno);

        if (updateError) throw updateError;

        if (selectedCustomer && customerName) {
          const { error: customerError } = await supabase
            .from('customer')
            .update({ custname: customerName })
            .eq('custno', selectedCustomer);
          
          if (customerError) console.error('Error updating customer:', customerError);
        }

        if (selectedEmployee && employeeName) {
          const names = employeeName.split(' ');
          const firstname = names[0] || '';
          const lastname = names.slice(1).join(' ') || '';
          
          const { error: employeeError } = await supabase
            .from('employee')
            .update({ firstname, lastname })
            .eq('empno', selectedEmployee);
          
          if (employeeError) console.error('Error updating employee:', employeeError);
        }

        const { error: deleteError } = await supabase
          .from('salesdetail')
          .delete()
          .eq('transno', transno);

        if (deleteError) throw deleteError;
      } else {
        let custno = selectedCustomer;
        let empno = selectedEmployee;

        if (!custno && customerName) {
          const { data: lastCust } = await supabase
            .from('customer')
            .select('custno')
            .order('custno', { ascending: false })
            .limit(1);
            
          const newCustNo = lastCust && lastCust.length > 0 
            ? `C${(parseInt(lastCust[0].custno.substring(1)) + 1).toString().padStart(3, '0')}` 
            : 'C001';
            
          const { error: custError } = await supabase
            .from('customer')
            .insert({ custno: newCustNo, custname: customerName });
            
          if (custError) console.error('Error creating customer:', custError);
          else custno = newCustNo;
        }

        if (!empno && employeeName) {
          const { data: lastEmp } = await supabase
            .from('employee')
            .select('empno')
            .order('empno', { ascending: false })
            .limit(1);
            
          const newEmpNo = lastEmp && lastEmp.length > 0 
            ? `E${(parseInt(lastEmp[0].empno.substring(1)) + 1).toString().padStart(3, '0')}` 
            : 'E001';
            
          const names = employeeName.split(' ');
          const firstname = names[0] || '';
          const lastname = names.slice(1).join(' ') || '';
          
          const { error: empError } = await supabase
            .from('employee')
            .insert({ 
              empno: newEmpNo, 
              firstname, 
              lastname,
              hiredate: new Date().toISOString()
            });
            
          if (empError) console.error('Error creating employee:', empError);
          else empno = newEmpNo;
        }

        const { error: insertError } = await supabase
          .from('sales')
          .insert({
            transno,
            salesdate: transactionDate,
            custno,
            empno
          });

        if (insertError) throw insertError;
      }

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

      await fetchSalesData();
      setIsTransactionDialogOpen(false);
      resetForm();

      if (!isEditMode) {
        await fetchLatestTransactionNumber();
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
      const { error: detailsError } = await supabase
        .from('salesdetail')
        .delete()
        .eq('transno', currentTransaction.transno);

      if (detailsError) throw detailsError;

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
      <AppHeader currentPath={location.pathname} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sales Transactions</h2>
          <Button onClick={handleAddTransaction} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
        
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search transactions..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={searchField} onValueChange={(value) => setSearchField(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Search in..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="transno">Transaction No</SelectItem>
                <SelectItem value="salesdate">Date</SelectItem>
                <SelectItem value="custname">Customer</SelectItem>
                <SelectItem value="empname">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredSalesData.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                {searchTerm ? 'No matching transactions found' : 'No sales data available'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="font-semibold cursor-pointer" 
                        onClick={() => handleToggleSort('transno')}
                      >
                        <div className="flex items-center">
                          Transaction No
                          {getSortIcon('transno')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer" 
                        onClick={() => handleToggleSort('salesdate')}
                      >
                        <div className="flex items-center">
                          Date
                          {getSortIcon('salesdate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer" 
                        onClick={() => handleToggleSort('custname')}
                      >
                        <div className="flex items-center">
                          Customer
                          {getSortIcon('custname')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer" 
                        onClick={() => handleToggleSort('empname')}
                      >
                        <div className="flex items-center">
                          Employee
                          {getSortIcon('empname')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right font-semibold cursor-pointer" 
                        onClick={() => handleToggleSort('totalPrice')}
                      >
                        <div className="flex items-center justify-end">
                          Total
                          {getSortIcon('totalPrice')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalesData.map((sale) => (
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
                <Label htmlFor="transactionNo">Transaction No</Label>
                <Input
                  id="transactionNo"
                  type="text"
                  value={isEditMode ? currentTransaction?.transno || '' : nextTransNo}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Input
                  id="customer"
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Input
                  id="employee"
                  type="text"
                  placeholder="Enter employee name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                />
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
                        onChange={(e) => setProductQuantity(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={handleAddProduct}
                        className="flex-1"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
              
              {transactionProducts.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionProducts.map((product, index) => {
                        const productTotal = (product.quantity || 0) * (product.unitprice || 0);
                        return (
                          <TableRow key={`new-${product.prodcode}-${index}`}>
                            <TableCell>{product.description || 'N/A'}</TableCell>
                            <TableCell>
                              {editingProductIndex === index ? (
                                <div className="flex items-center space-x-2">
                                  <Input 
                                    value={editingUnit} 
                                    onChange={(e) => setEditingUnit(e.target.value)} 
                                    className="w-20 h-8"
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={saveEditedUnit}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={cancelEditingUnit}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span 
                                  className="cursor-pointer hover:underline" 
                                  onClick={() => startEditingUnit(index, product.unit)}
                                >
                                  {product.customUnit || product.unit || 'N/A'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{product.quantity || 0}</TableCell>
                            <TableCell className="text-right">{product.unitprice ? formatCurrency(product.unitprice) : 'N/A'}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(productTotal)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive" 
                                onClick={() => handleRemoveProduct(product.prodcode)}
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
                </div>
              ) : (
                <div className="text-center p-4 border rounded-md text-muted-foreground">
                  No products added yet. Click the "Add Product" button to add one.
                </div>
              )}
              
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction}>{isEditMode ? 'Update' : 'Create'} Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transaction #{currentTransaction?.transno}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
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
