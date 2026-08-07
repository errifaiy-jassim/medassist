import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, UserCircle } from 'lucide-react';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      
      <main className="pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full w-96">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher un patient, une consultation..." 
              className="bg-transparent border-none outline-none text-sm w-full sans-font"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-blue-900 transition-colors">
              <Bell size={22} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                3
              </span>
            </button>
            
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">Dr. Jassim Errifaiy</p>
                <p className="text-[11px] text-slate-500 sans-font mt-1">Chirurgien Cardiologue</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 border border-blue-200 overflow-hidden shadow-sm">
                <UserCircle size={32} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="p-8 flex-1">
          <Outlet />
        </section>

        {/* Footer */}
        <footer className="p-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 sans-font italic">
                © 2026 MedAssist Clinical IA — Accès Sécurisé HDS & RGPD
            </p>
        </footer>
      </main>
    </div>
  );
}
