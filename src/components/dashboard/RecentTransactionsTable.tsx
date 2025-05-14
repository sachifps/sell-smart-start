
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import { formatCurrency, formatFullDate } from "@/utils/formatters";
import { Transaction } from "@/services/dashboardService";

interface RecentTransactionsTableProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

export function RecentTransactionsTable({ transactions, onViewAll }: RecentTransactionsTableProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <Button 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={onViewAll}
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.product_name}</TableCell>
                  <TableCell>{formatFullDate(transaction.created_at)}</TableCell>
                  <TableCell>{transaction.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(transaction.amount))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No recent transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
