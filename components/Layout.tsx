import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, PlusCircle, MessageSquare, Settings, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  // Hide sidebar for Auth and Onboarding pages
  if (currentView === 'ONBOARDING' || currentView === 'LOGIN' || currentView === 'REGISTER') {
    return <div className="min-h-screen bg-slate-50 flex flex-col">{children}</div>;
  }

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-full py-3 space-y-1 ${
        currentView === view ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon size={24} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-20">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center bg-white border-r border-slate-200 py-6 z-50">
        <div className="text-emerald-600 font-bold text-xl mb-10">BF</div>
        <div className="flex flex-col gap-8 w-full">
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Home" />
            <NavItem view="LOG_MEAL" icon={PlusCircle} label="Log" />
            <NavItem view="COACH" icon={MessageSquare} label="Coach" />
            <NavItem view="SETTINGS" icon={Settings} label="Config" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 flex justify-between px-2 pb-safe">
        <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Home" />
        <NavItem view="LOG_MEAL" icon={PlusCircle} label="Log" />
        <NavItem view="COACH" icon={MessageSquare} label="Coach" />
        <NavItem view="SETTINGS" icon={Settings} label="Config" />
      </nav>
    </div>
  );
};

export default Layout;