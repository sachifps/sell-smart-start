
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface SalesTransaction {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  custname: string | null;
  empname: string | null;
}

interface SalesDetail {
  transno: string;
  prodcode: string;
  quantity: number | null;
  description: string | null;
  unit: string | null;
  unitprice: number | null;
}

interface SalesWithDetails extends SalesTransaction {
  productDetails: SalesDetail[];
  totalPrice: number;
}

interface Customer {
  custno: string;
  custname: string | null;
}

interface Employee {
  empno: string;
  firstname: string | null;
  lastname: string | null;
}

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
}

const FormSchema = z.object({
  salesdate: z.string().nonempty("Date is required"),
  custno: z.string().nonempty("Customer is required"),
  empno: z.string().nonempty("Employee is required"),
});

const DetailFormSchema = z.object({
  prodcode: z.string().nonempty("Product code is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
});

const SalesTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SalesWithDetails | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailsForTransaction, setDetailsForTransaction] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [newDetails, setNewDetails] = useState<{ prodcode: string; quantity: number | null }[]>([]);

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      salesdate: format(new Date(), 'yyyy-MM-dd'),
      custno: '',
      empno: '',
    },
  });

  const detailForm = useForm({
    resolver: zodResolver(DetailFormSchema),
    defaultValues: {
      prodcode: '',
      quantity: 1,
    },
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (data && data.role === 'admin') {
            setIsAdmin(true);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };
    
    checkAdminStatus();
  }, [user]);

  // Query for sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales_transactions'],
    queryFn: async () => {
      try {
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
          `)
          .order('transno', { ascending: false });
        
        if (salesError) throw salesError;
        
        if (!salesData || salesData.length === 0) {
          return [];
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
                  transno: sale.transno,
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
        
        return salesWithDetails;
      } catch (error) {
        console.error('Error fetching sales data:', error);
        throw error;
      }
    },
    enabled: !!user
  });

  // Query for customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer')
        .select('custno, custname')
        .order('custname');
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  // Query for employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee')
        .select('empno, firstname, lastname')
        .order('lastname');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Query for products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product')
        .select('prodcode, description, unit')
        .order('description');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Get next transaction number
  const getNextTransactionNumber = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('transno')
      .order('transno', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting latest transaction:', error);
      return 'T00001';
    }

    if (data && data.length > 0) {
      const lastTransNo = data[0].transno;
      // Extract the numeric part and increment
      const numPart = parseInt(lastTransNo.substring(1), 10);
      return `T${String(numPart + 1).padStart(5, '0')}`;
    }
    
    return 'T00001'; // Default if no transactions exist
  };

  // Add sales transaction mutation
  const addSalesMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof FormSchema>) => {
      const newTransNo = await getNextTransactionNumber();
      
      // Create the sales record
      const { error: salesError } = await supabase
        .from('sales')
        .insert({
          transno: newTransNo,
          salesdate: formData.salesdate,
          custno: formData.custno,
          empno: formData.empno
        });
      
      if (salesError) throw salesError;
      
      // Create salesdetail records for each product
      if (newDetails.length > 0) {
        const detailsToInsert = newDetails.map(detail => ({
          transno: newTransNo,
          prodcode: detail.prodcode,
          quantity: detail.quantity
        }));
        
        const { error: detailsError } = await supabase
          .from('salesdetail')
          .insert(detailsToInsert);
        
        if (detailsError) throw detailsError;
      }
      
      return newTransNo;
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "Sales transaction has been added successfully"
      });
      setIsAddDialogOpen(false);
      form.reset({
        salesdate: format(new Date(), 'yyyy-MM-dd'),
        custno: '',
        empno: '',
      });
      setNewDetails([]);
      queryClient.invalidateQueries({ queryKey: ['sales_transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create transaction: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete sales transaction mutation
  const deleteSalesMutation = useMutation({
    mutationFn: async (transno: string) => {
      // Delete all salesdetail records first (due to foreign key constraint)
      const { error: detailsError } = await supabase
        .from('salesdetail')
        .delete()
        .eq('transno', transno);
      
      if (detailsError) throw detailsError;
      
      // Then delete the sales record
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .eq('transno', transno);
      
      if (salesError) throw salesError;
      
      return transno;
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Sales transaction has been deleted successfully"
      });
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      queryClient.invalidateQueries({ queryKey: ['sales_transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete transaction: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Add sales detail mutation
  const addDetailMutation = useMutation({
    mutationFn: async (data: { transno: string, prodcode: string, quantity: number }) => {
      const { error } = await supabase
        .from('salesdetail')
        .insert({
          transno: data.transno,
          prodcode: data.prodcode,
          quantity: data.quantity
        });
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Product added",
        description: "Product has been added to the transaction"
      });
      detailForm.reset({
        prodcode: '',
        quantity: 1,
      });
      queryClient.invalidateQueries({ queryKey: ['sales_transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add product: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const toggleTransaction = (transno: string) => {
    if (expandedTransaction === transno) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(transno);
    }
  };

  const handleAddDetail = () => {
    const values = detailForm.getValues();
    if (detailsForTransaction) {
      addDetailMutation.mutate({
        transno: detailsForTransaction,
        prodcode: values.prodcode,
        quantity: values.quantity
      });
    }
  };

  const handleAddDetailToNew = () => {
    const values = detailForm.getValues();
    setNewDetails([...newDetails, { prodcode: values.prodcode, quantity: values.quantity }]);
    detailForm.reset({ prodcode: '', quantity: 1 });
  };

  const removeDetailFromNew = (index: number) => {
    const updatedDetails = [...newDetails];
    updatedDetails.splice(index, 1);
    setNewDetails(updatedDetails);
  };

  const handleCreateTransaction = (values: z.infer<typeof FormSchema>) => {
    if (newDetails.length === 0) {
      toast({
        title: "No products",
        description: "Please add at least one product to the transaction",
        variant: "destructive"
      });
      return;
    }
    
    addSalesMutation.mutate(values);
  };

  const handleDeleteTransaction = () => {
    if (selectedTransaction) {
      deleteSalesMutation.mutate(selectedTransaction.transno);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProductName = (prodcode: string): string => {
    const product = products?.find(p => p.prodcode === prodcode);
    return product?.description || prodcode;
  };

  const getProductUnit = (prodcode: string): string => {
    const product = products?.find(p => p.prodcode === prodcode);
    return product?.unit || '';
  };

  const getLatestPrice = async (prodcode: string): Promise<number> => {
    const { data } = await supabase
      .from('pricehist')
      .select('unitprice')
      .eq('prodcode', prodcode)
      .order('effdate', { ascending: false })
      .limit(1);
    
    return data && data.length > 0 ? data[0].unitprice : 0;
  };

  const calculateNewDetailsTotal = async (): Promise<number> => {
    let total = 0;
    for (const detail of newDetails) {
      const price = await getLatestPrice(detail.prodcode);
      total += (detail.quantity || 0) * price;
    }
    return total;
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
            <Button variant="ghost" className="bg-muted" onClick={() => navigate('/transactions')}>Transactions</Button>
            <Button variant="ghost" onClick={() => navigate('/reports')}>Reports</Button>
            {isAdmin && (
              <Button variant="ghost" onClick={() => navigate('/users')}>Users</Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sales Transactions</h2>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          )}
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : salesData && salesData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Transaction No</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="w-[180px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.map((sale) => (
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
                          <div className="flex justify-end space-x-2">
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
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsForTransaction(sale.transno);
                                    setIsDetailDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransaction(sale);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                No sales transactions available
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Transaction</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleCreateTransaction)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="salesdate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="custno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select Customer</option>
                          {customers?.map(customer => (
                            <option key={customer.custno} value={customer.custno}>
                              {customer.custname || customer.custno}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="empno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select Employee</option>
                          {employees?.map(employee => (
                            <option key={employee.empno} value={employee.empno}>
                              {`${employee.firstname || ''} ${employee.lastname || ''}`.trim() || employee.empno}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Products</h3>
                
                {/* Product Detail Form */}
                <div className="flex flex-wrap items-end gap-2 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="product">Product</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...detailForm.register("prodcode")}
                    >
                      <option value="">Select Product</option>
                      {products?.map(product => (
                        <option key={product.prodcode} value={product.prodcode}>
                          {product.description || product.prodcode}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-24">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      {...detailForm.register("quantity", { valueAsNumber: true })}
                    />
                  </div>
                  
                  <Button type="button" onClick={handleAddDetailToNew}>
                    Add Product
                  </Button>
                </div>
                
                {/* Product List */}
                {newDetails.length > 0 ? (
                  <div className="border rounded-md overflow-hidden mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newDetails.map((detail, index) => (
                          <TableRow key={`new-${detail.prodcode}-${index}`}>
                            <TableCell>{getProductName(detail.prodcode)}</TableCell>
                            <TableCell>{getProductUnit(detail.prodcode)}</TableCell>
                            <TableCell className="text-right">{detail.quantity}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => removeDetailFromNew(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground border rounded-md mb-4">
                    No products added yet
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addSalesMutation.isPending}>
                  {addSalesMutation.isPending ? "Creating..." : "Create Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Transaction</DialogTitle>
          </DialogHeader>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleAddDetail(); }}>
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...detailForm.register("prodcode")}
              >
                <option value="">Select Product</option>
                {products?.map(product => (
                  <option key={product.prodcode} value={product.prodcode}>
                    {product.description || product.prodcode}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                type="number"
                min="1"
                {...detailForm.register("quantity", { valueAsNumber: true })}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDetailMutation.isPending}>
                {addDetailMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>Are you sure you want to delete transaction <span className="font-bold">{selectedTransaction?.transno}</span>?</p>
            <p className="text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction} disabled={deleteSalesMutation.isPending}>
              {deleteSalesMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesTransactions;
