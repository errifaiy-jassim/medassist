import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, UserCircle, LogOut, Settings, X, User } from 'lucide-react';
import { searchPatients, logout, getStoredUser, fetchNotifications } from '../services/api';

export default function MainLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data || []);
      } catch (error) {
        console.error("Notifications error:", error);
      }
    };
    if (showNotifications) {
        loadNotifications();
    }
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        try {
          const results = await searchPatients(searchTerm);
          setSearchResults(results);
          setShowSearchDropdown(results.length > 0);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      
      <main className="pl-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="relative w-96" ref={searchRef}>
            <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un patient..." 
                className="bg-transparent border-none outline-none text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {showSearchDropdown && (
              <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2">
                {searchResults.map(patient => (
                  <div key={patient.id} className="p-2 hover:bg-slate-50 cursor-pointer rounded-lg text-sm" onClick={() => {navigate(`/patients/${patient.id}`); setShowSearchDropdown(false);}}>
                    {patient.full_name} <span className="text-xs text-slate-400">({patient.nir || 'N/A'})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-blue-900 transition-colors" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={22} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{notifications.length}</span>
              )}
            </button>
            
            {showNotifications && (
                <div className="absolute top-16 right-48 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto">
                    <h4 className="font-bold text-sm mb-3">Notifications</h4>
                    {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500">Aucune nouvelle notification.</p>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map(n => (
                                <div key={n.id} className="text-xs text-slate-700 border-b pb-2">
                                    <p>{n.message}</p>
                                    <span className="text-[10px] text-slate-400">{n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <div className="relative">
                <button className="flex items-center gap-3 border-l border-slate-200 pl-6" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-900 leading-none">{user?.full_name || 'Utilisateur'}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{user?.specialty || 'Praticien'}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 border border-blue-200 overflow-hidden shadow-sm">
                    <UserCircle size={32} strokeWidth={1.5} />
                  </div>
                </button>
                {showProfileMenu && (
                    <div className="absolute top-14 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => navigate('/settings')}><Settings size={16}/> Paramètres</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={handleLogout}><LogOut size={16}/> Déconnexion</button>
                    </div>
                )}
            </div>
          </div>
        </header>

        <section className="p-8 flex-1">
          <Outlet />
        </section>

        <footer className="p-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">© 2026 MedAssist Clinical IA — Accès Sécurisé HDS & RGPD</p>
        </footer>
      </main>
    </div>
  );
}
