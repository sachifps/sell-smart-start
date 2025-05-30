
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/services/dashboardService";

interface TopProductsTableProps {
  products: Product[];
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.prodcode}>
                <TableCell className="font-medium">{product.prodcode}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.sales)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
