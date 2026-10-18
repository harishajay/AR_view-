import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  User, 
  Camera, 
  Lightbulb, 
  Sparkles,
  ChevronDown,
  Building2,
  CalendarCheck,
  Users
} from 'lucide-react';

interface HeaderProps {
  onOpenAR: () => void;
  onOpenRoadmap: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAR,
  onOpenRoadmap,
  onSearch,
  searchQuery,
}) => {
  const [city, setCity] = useState('Chennai');
  const [showCityMenu, setShowCityMenu] = useState(false);
  const cities = ['Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Gurugram'];

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & City Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-sm tracking-tighter">
              H
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                HomiesInn
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Urban Co-Living
              </span>
            </div>
          </div>

          {/* City Dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowCityMenu(!showCityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>{city}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showCityMenu && (
              <div className="absolute top-full mt-1.5 left-0 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                {cities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCity(c);
                      setShowCityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                      c === city ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hostels, clusters, amenities, or room"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Right: Navigation, AR Button, & Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          <button 
            onClick={() => onSearch('vacant')} 
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            Find a Bed
          </button>

          <button 
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100/70 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
            My Bookings
          </button>

          <button 
            onClick={onOpenRoadmap}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors inline-flex items-center gap-1.5"
            title="Future features & innovation roadmap"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden lg:inline">Next-Gen Ideas</span>
          </button>

          {/* AR Trigger CTA Button */}
          <button
            onClick={onOpenAR}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:shadow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Project in AR</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Resident Profile Pill */}
          <div className="flex items-center gap-2 pl-1 cursor-pointer group">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                Harish Aravind
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                Resident • #529
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-100 shadow-xs">
              <User className="w-4 h-4" />
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
