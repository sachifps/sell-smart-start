
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/app-header';

const Dashboard = () => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPath={location.pathname} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-card text-card-foreground rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Welcome to SellSmart</h2>
            <p>This is your dashboard. You can view sales data and manage transactions from here.</p>
          </div>
          
          {/* Additional dashboard content can be added here */}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
