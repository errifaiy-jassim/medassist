import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mic, 
  ClipboardList, 
  Users, 
  History, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      ${isActive 
        ? 'bg-blue-50 text-blue-900 font-semibold shadow-sm border border-blue-100' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-800'}
    `}
  >
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    <span className="text-sm sans-font">{label}</span>
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-50">
        <img src="/logo.png" alt="MedAssist Logo" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="text-xl font-bold tracking-tight m-0 leading-none">MedAssist</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 sans-font">Clinical IA</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
        <SidebarItem to="/" icon={LayoutDashboard} label="Tableau de bord" />
        <SidebarItem to="/dictation" icon={Mic} label="Nouvelle Dictée" />
        <SidebarItem to="/patients" icon={Users} label="Patients" />
        <SidebarItem to="/history" icon={History} label="Historique SIH" />
        <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarItem to="/settings" icon={Settings} label="Paramètres" />
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sans-font text-sm font-medium">
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
