
import React from 'react';
import { AppHeader } from '@/components/app-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex-1 container mx-auto p-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
