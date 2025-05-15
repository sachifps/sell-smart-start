
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatDate } from "@/utils/formatters";
import { TransactionsByDay } from "@/services/dashboardService";

interface TransactionsChartProps {
  data: TransactionsByDay[];
}

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-background border border-border rounded-md shadow-md p-3">
      <p className="text-sm font-medium">{payload[0].payload.date}</p>
      <p className="text-xs text-blue-500">
        Sales: {new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(payload[0].value)}
      </p>
      <p className="text-xs text-green-500">
        Transactions: {payload[1].value}
      </p>
    </div>
  );
};

export function TransactionsChart({ data }: TransactionsChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Transaction History (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ChartContainer 
            config={{
              sales: { color: "#3498db" },
              transactions: { color: "#2ecc71" }
            }}
          >
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{fontSize: 12}}
              />
              <YAxis yAxisId="left" tickFormatter={(value) => `$${value}`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="totalAmount" 
                stroke="#3498db" 
                name="Sales"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="transactionCount" 
                stroke="#2ecc71" 
                name="Transactions"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </div>
        
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Sales Amount</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Transaction Count</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
