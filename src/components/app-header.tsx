
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Menu, LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';

interface AppHeaderProps {
  currentPath?: string;
}

export function AppHeader({ currentPath = '' }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white dark:bg-zinc-950 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-primary">SellSmart</h1>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}
            className={currentPath === '/dashboard' ? "font-semibold text-primary" : ""}>
            Dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate('/sales-transactions')} 
            className={currentPath === '/sales-transactions' ? "font-semibold text-primary" : ""}>
            Sales
          </Button>
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.user_metadata?.name || user?.email}
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>

        <div className="flex md:hidden">
          <ThemeToggle />
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>SellSmart</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6 py-4 flex flex-col">
                <span className="text-sm text-muted-foreground px-2">
                  Welcome, {user?.user_metadata?.name || user?.email}
                </span>
                
                <Button 
                  variant="ghost" 
                  className="justify-start" 
                  onClick={() => {
                    navigate('/dashboard');
                    setIsOpen(false);
                  }}
                >
                  Dashboard
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="justify-start" 
                  onClick={() => {
                    navigate('/sales-transactions');
                    setIsOpen(false);
                  }}
                >
                  Sales
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="justify-start text-destructive"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
