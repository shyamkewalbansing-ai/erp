import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  Landmark,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  Package,
  Building,
  FolderKanban,
  BarChart3,
  RefreshCw,
  Settings,
  LogOut,
  DollarSign,
  TrendingUp,
  Truck,
  UserCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function BoekhoudingLayout() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const [wisselkoers, setWisselkoers] = useState(null);

  useEffect(() => {
    const fetchKoers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/boekhouding/wisselkoersen/actueel`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWisselkoers(data.EUR_SRD?.koers);
        }
      } catch (e) {
        console.error('Error fetching wisselkoers:', e);
      }
    };
    if (token) fetchKoers();
  }, [token]);

  const menuItems = [
    { path: '/app/boekhouding', icon: LayoutDashboard, label: 'Finance', exact: true },
    { path: '/app/boekhouding/bank-kas', icon: DollarSign, label: 'Cashflow' },
    { path: '/app/boekhouding/debiteuren', icon: Users, label: 'Customers' },
    { path: '/app/boekhouding/crediteuren', icon: Truck, label: 'Suppliers' },
    { path: '/app/boekhouding/rapportages', icon: TrendingUp, label: 'Trend & Forecast' },
  ];

  const secondaryMenuItems = [
    { path: '/app/boekhouding/grootboek', icon: BookOpen, label: 'Grootboek' },
    { path: '/app/boekhouding/btw', icon: Receipt, label: 'BTW' },
    { path: '/app/boekhouding/verkoop', icon: ShoppingCart, label: 'Verkoop' },
    { path: '/app/boekhouding/inkoop', icon: ShoppingBag, label: 'Inkoop' },
    { path: '/app/boekhouding/voorraad', icon: Package, label: 'Voorraad' },
    { path: '/app/boekhouding/vaste-activa', icon: Building, label: 'Vaste Activa' },
    { path: '/app/boekhouding/projecten', icon: FolderKanban, label: 'Projecten' },
    { path: '/app/boekhouding/wisselkoersen', icon: RefreshCw, label: 'Wisselkoersen' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Sidebar - Dark blue design matching reference */}
      <div className="w-52 bg-[#2f4561] flex flex-col">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-6 bg-[#0ea5e9] rounded-sm"></div>
            <div className="w-1.5 h-4 bg-[#0ea5e9] rounded-sm"></div>
            <div className="w-1.5 h-5 bg-[#0ea5e9] rounded-sm"></div>
          </div>
          <span className="text-white font-semibold text-base tracking-wide">
            <span className="text-[#0ea5e9]">KPI</span>DASHBOARD
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-3 transition-all relative ${
                  active
                    ? 'bg-[#243a52] text-white'
                    : 'text-[#8ba4bf] hover:bg-[#374d66] hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0ea5e9] rounded-r"></div>
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-[#8ba4bf]'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-4 mx-5 border-t border-[#3d566f]"></div>

          {/* Secondary Navigation (scrollable) */}
          <div className="max-h-48 overflow-y-auto">
            {secondaryMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-5 py-2.5 transition-all relative ${
                    active
                      ? 'bg-[#243a52] text-white'
                      : 'text-[#8ba4bf] hover:bg-[#374d66] hover:text-white'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0ea5e9] rounded-r"></div>
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-[#6b8299]'}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Settings at bottom */}
        <div className="mt-auto">
          <Link
            to="/app/boekhouding/instellingen"
            className={`flex items-center gap-3 px-5 py-3 transition-all relative ${
              isActive('/app/boekhouding/instellingen')
                ? 'bg-[#243a52] text-white'
                : 'text-[#8ba4bf] hover:bg-[#374d66] hover:text-white'
            }`}
          >
            {isActive('/app/boekhouding/instellingen') && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0ea5e9] rounded-r"></div>
            )}
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {/* User section */}
          <div className="border-t border-[#3d566f] p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0ea5e9] rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-[#8ba4bf] truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex items-center gap-2 text-[#8ba4bf] hover:text-white text-xs transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Uitloggen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Content - Dashboard has its own header */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
