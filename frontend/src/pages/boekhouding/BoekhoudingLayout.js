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
  Euro
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
    { path: '/app/boekhouding', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/app/boekhouding/grootboek', icon: BookOpen, label: 'Grootboek' },
    { path: '/app/boekhouding/debiteuren', icon: Users, label: 'Debiteuren' },
    { path: '/app/boekhouding/crediteuren', icon: Building2, label: 'Crediteuren' },
    { path: '/app/boekhouding/bank-kas', icon: Landmark, label: 'Bank/Kas' },
    { path: '/app/boekhouding/btw', icon: Receipt, label: 'BTW' },
    { path: '/app/boekhouding/verkoop', icon: ShoppingCart, label: 'Verkoop' },
    { path: '/app/boekhouding/inkoop', icon: ShoppingBag, label: 'Inkoop' },
    { path: '/app/boekhouding/voorraad', icon: Package, label: 'Voorraad' },
    { path: '/app/boekhouding/vaste-activa', icon: Building, label: 'Vaste Activa' },
    { path: '/app/boekhouding/projecten', icon: FolderKanban, label: 'Projecten' },
    { path: '/app/boekhouding/rapportages', icon: BarChart3, label: 'Rapportages' },
    { path: '/app/boekhouding/wisselkoersen', icon: RefreshCw, label: 'Wisselkoersen' },
    { path: '/app/boekhouding/instellingen', icon: Settings, label: 'Instellingen' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Fixed width, no collapse */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            FO
          </div>
          <span className="font-semibold text-gray-800">Finance OS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Uitloggen</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with wisselkoers */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6">
          {wisselkoers && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Euro className="w-4 h-4" />
              <span>EUR/SRD: <strong>{wisselkoers}</strong></span>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
