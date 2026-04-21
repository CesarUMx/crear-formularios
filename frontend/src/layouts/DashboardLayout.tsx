import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        currentPath={window.location.pathname}
        onToggle={setSidebarOpen}
      />
      
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '16rem' : '5rem' }}
      >
        <main className="py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
