import React from 'react';
import Sidebar from '../components/layout/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath={window.location.pathname} />
      
      <div className="lg:ml-64 transition-all duration-300">
        <main className="py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
