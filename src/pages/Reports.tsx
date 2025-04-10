
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileDown, History } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Transaction, TransactionHistory } from '@/types/supabase';

const Reports = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("current");

  // Query for current transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Transaction[];
    },
  });

  // Query for transaction history
  const { data: transactionHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['transaction_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('*, profiles:user_id(email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        user_email: item.profiles?.email || 'Unknown'
      })) as TransactionHistory[];
    },
  });

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "No data to download",
        description: "There is no data available to download",
        variant: "destructive",
      });
      return;
    }

    // Get headers
    const headers = Object.keys(data[0]).filter(header => 
      !['id', 'created_at', 'updated_at'].includes(header)
    );
    
    // Convert data to CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that need quotes (strings with commas, etc.)
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `${filename} download has started`,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="current">Current Transactions</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Current Transactions</h2>
                <Button 
                  onClick={() => downloadCSV(transactions || [], 'transactions')}
                  disabled={!transactions || transactions.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>

              {isLoadingTransactions ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions && transactions.length > 0 ? (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.product_code}</TableCell>
                            <TableCell>{transaction.product_name}</TableCell>
                            <TableCell>{transaction.unit}</TableCell>
                            <TableCell className="text-right">{transaction.quantity}</TableCell>
                            <TableCell className="text-right">{transaction.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{transaction.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Transaction History</h2>
                <Button 
                  onClick={() => downloadCSV(transactionHistory || [], 'transaction-history')}
                  disabled={!transactionHistory || transactionHistory.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionHistory && transactionHistory.length > 0 ? (
                        transactionHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>{format(new Date(history.created_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                history.action === 'create' 
                                  ? 'bg-green-100 text-green-800' 
                                  : history.action === 'update' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>{history.product_code}</TableCell>
                            <TableCell>{history.product_name}</TableCell>
                            <TableCell className="text-right">{history.quantity}</TableCell>
                            <TableCell className="text-right">{history.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{history.amount.toFixed(2)}</TableCell>
                            <TableCell>{history.user_email}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No history records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
