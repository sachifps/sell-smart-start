
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, PieChart, DollarSign, TrendingUp, Users, Package } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    // If user is not logged in, redirect to login
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-sales-800">SellSmart</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.name}
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
