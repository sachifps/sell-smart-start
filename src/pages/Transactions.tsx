
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Pencil, Trash2, X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

interface TransactionFormData {
  product_code: string;
  product_name: string;
  unit: string;
  quantity: number;
  price: number;
}

const Transactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    product_code: '',
    product_name: '',
    unit: 'pc',
    quantity: 1,
    price: 0,
  });

  // Check if user is admin
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data && data.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    checkUserRole();
  }, [user]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const amount = data.quantity * data.price;
      const { data: newData, error } = await supabase
        .from('transactions')
        .insert([
          { 
            product_code: data.product_code,
            product_name: data.product_name, 
            unit: data.unit,
            quantity: data.quantity,
            price: data.price,
            amount
          }
        ])
        .select();
      
      if (error) throw error;
      return newData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsAdding(false);
      resetForm();
      toast({
        title: "Transaction added",
        description: "The transaction has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionFormData }) => {
      const amount = data.quantity * data.price;
      const { data: updatedData, error } = await supabase
        .from('transactions')
        .update({ 
          product_code: data.product_code,
          product_name: data.product_name,
          unit: data.unit,
          quantity: data.quantity,
          price: data.price,
          amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsEditing(null);
      resetForm();
      toast({
        title: "Transaction updated",
        description: "The transaction has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleUnitChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      unit: value
    }));
  };

  const handleAddTransaction = () => {
    if (!formData.product_code || !formData.product_name) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setIsEditing(transaction.id);
    setFormData({
      product_code: transaction.product_code,
      product_name: transaction.product_name,
      unit: transaction.unit,
      quantity: transaction.quantity,
      price: transaction.price,
    });
  };

  const handleUpdateTransaction = (id: string) => {
    if (!formData.product_code || !formData.product_name) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ id, data: formData });
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteMutation.mutate(id);
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    resetForm();
  };

  const cancelAdd = () => {
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_code: '',
      product_name: '',
      unit: 'pc',
      quantity: 1,
      price: 0,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          {isAdmin && !isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isAdding && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-lg font-medium mb-4">Add New Transaction</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Code *</label>
                  <Input
                    name="product_code"
                    value={formData.product_code}
                    onChange={handleInputChange}
                    placeholder="Enter product code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <Input
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <Select value={formData.unit} onValueChange={handleUnitChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pc">pc</SelectItem>
                      <SelectItem value="ea">ea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <Input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <Input
                    value={(formData.quantity * formData.price).toFixed(2)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={cancelAdd}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      {isEditing === transaction.id ? (
                        <>
                          <TableCell>
                            <Input
                              name="product_code"
                              value={formData.product_code}
                              onChange={handleInputChange}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              name="product_name"
                              value={formData.product_name}
                              onChange={handleInputChange}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Select value={formData.unit} onValueChange={handleUnitChange}>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pc">pc</SelectItem>
                                <SelectItem value="ea">ea</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              name="quantity"
                              type="number"
                              min="1"
                              value={formData.quantity}
                              onChange={handleInputChange}
                              className="w-[80px] text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              name="price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.price}
                              onChange={handleInputChange}
                              className="w-[100px] text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {(formData.quantity * formData.price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateTransaction(transaction.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{transaction.product_code}</TableCell>
                          <TableCell>{transaction.product_name}</TableCell>
                          <TableCell>{transaction.unit}</TableCell>
                          <TableCell className="text-right">{transaction.quantity}</TableCell>
                          <TableCell className="text-right">{transaction.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{transaction.amount.toFixed(2)}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditTransaction(transaction)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-4">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;
