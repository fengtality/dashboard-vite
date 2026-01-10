import React from 'react';

interface ConfigPageLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function ConfigPageLayout({ children, sidebar }: ConfigPageLayoutProps) {
  return (
    <div className="flex gap-6">
      {/* Main Form Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right Sidebar - Fixed Width, Sticky */}
      <div className="w-80 shrink-0 self-start sticky top-6">
        {sidebar}
      </div>
    </div>
  );
}
