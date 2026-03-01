import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Calendar,
  BarChart3,
  FileArchive,
  ChevronLeft
} from 'lucide-react';

const menuItems = [
  { path: '/app/schuldbeheer', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/app/schuldbeheer/relaties', icon: Users, label: 'Schuldeisers' },
  { path: '/app/schuldbeheer/schulden', icon: FileText, label: 'Schulden' },
  { path: '/app/schuldbeheer/betalingen', icon: CreditCard, label: 'Betalingen' },
  { path: '/app/schuldbeheer/inkomsten', icon: TrendingUp, label: 'Inkomsten' },
  { path: '/app/schuldbeheer/uitgaven', icon: TrendingDown, label: 'Uitgaven' },
  { path: '/app/schuldbeheer/rekeningen', icon: Wallet, label: 'Bankrekeningen' },
  { path: '/app/schuldbeheer/planning', icon: Calendar, label: 'Planning' },
  { path: '/app/schuldbeheer/rapportages', icon: BarChart3, label: 'Rapportages' },
  { path: '/app/schuldbeheer/documenten', icon: FileArchive, label: 'Documenten' },
];

export default function SchuldbeheerLayout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back Button & Title */}
            <div className="flex items-center gap-4">
              <NavLink 
                to="/app/dashboard" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Terug</span>
              </NavLink>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">Schuldbeheer</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto scrollbar-hide -mb-px">
            {menuItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
