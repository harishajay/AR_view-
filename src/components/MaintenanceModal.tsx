import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  User, 
  ShieldCheck, 
  PhoneCall, 
  Zap, 
  Droplet, 
  Key, 
  Wind,
  Sparkles,
  Camera
} from 'lucide-react';

export interface MaintenanceTicket {
  id: string;
  fixtureName: string;
  category: 'electrical' | 'plumbing' | 'security' | 'hvac' | 'appliance';
  location: string;
  floor: string;
  coordinates: [number, number, number];
  issueDescription: string;
  severity: 'high' | 'medium' | 'low';
  technicianName: string;
  technicianRole: string;
  initialEtaMinutes: number;
}

interface MaintenanceModalProps {
  ticket: MaintenanceTicket;
  onClose: () => void;
  onTicketDispatched?: (ticketId: string) => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  ticket,
  onClose,
  onTicketDispatched,
}) => {
  const [isDispatched, setIsDispatched] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(ticket.initialEtaMinutes * 60);
  const [currentStep, setCurrentStep] = useState<'diagnose' | 'dispatched' | 'en_route' | 'working' | 'resolved'>('diagnose');
  const [notes, setNotes] = useState('');

  // Live ETA countdown timer when dispatched
  useEffect(() => {
    if (!isDispatched || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentStep('resolved');
          return 0;
        }
        if (prev === Math.floor(ticket.initialEtaMinutes * 60 * 0.7)) {
          setCurrentStep('en_route');
        } else if (prev === Math.floor(ticket.initialEtaMinutes * 60 * 0.3)) {
          setCurrentStep('working');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDispatched, secondsRemaining, ticket.initialEtaMinutes]);

  const handleDispatch = () => {
    setIsDispatched(true);
    setCurrentStep('dispatched');
    if (onTicketDispatched) onTicketDispatched(ticket.id);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = () => {
    switch (ticket.category) {
      case 'electrical':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'plumbing':
        return <Droplet className="w-5 h-5 text-cyan-400" />;
      case 'security':
        return <Key className="w-5 h-5 text-emerald-400" />;
      case 'hvac':
        return <Wind className="w-5 h-5 text-sky-400" />;
      default:
        return <Wrench className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="relative max-w-xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 text-white flex flex-col">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center font-bold shadow-lg">
              {getCategoryIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Tap-to-Fix Geo-Spatial Maintenance
                </h3>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {ticket.severity} Priority
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct on-site dispatch with millimeter 3D spatial coordinate pinning
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          
          {/* Pinpointed Geo-Location Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-xs">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block mb-0.5">
                GEO-PINNED 3D FIXTURE
              </span>
              <h4 className="text-sm font-bold text-white truncate">
                {ticket.fixtureName}
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                {ticket.location} • <strong className="text-indigo-400">{ticket.floor}</strong>
              </p>
              <div className="mt-2 font-mono text-[10px] text-cyan-400 bg-slate-900 px-2.5 py-1 rounded-md inline-block border border-slate-800">
                Spatial Coord: [{ticket.coordinates.join(', ')}]
              </div>
            </div>
          </div>

          {/* Issue Summary */}
          <div className="text-xs space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              DIAGNOSED ISSUE
            </span>
            <p className="text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 leading-relaxed">
              {ticket.issueDescription}
            </p>
          </div>

          {/* Technician & ETA Display */}
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 p-4 rounded-2xl border border-indigo-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-white block">
                  {ticket.technicianName}
                </span>
                <span className="text-slate-400 text-[11px] block">
                  {ticket.technicianRole}
                </span>
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  On-Duty at OMR Tech Hub
                </span>
              </div>
            </div>

            {/* Live Countdown Box */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isDispatched ? 'Technician Live ETA' : 'Estimated Arrival'}
              </span>
              <div className="text-2xl font-black font-mono text-amber-400 flex items-center justify-end gap-1.5 mt-0.5">
                <Clock className="w-5 h-5 text-amber-400 animate-spin [animation-duration:8s]" />
                <span>{isDispatched ? formatCountdown(secondsRemaining) : `${ticket.initialEtaMinutes}:00 min`}</span>
              </div>
            </div>
          </div>

          {/* Dispatch Progress Steps */}
          {isDispatched && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                DISPATCH LIFECYCLE
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                <div className={`p-2 rounded-xl border ${currentStep !== 'diagnose' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  1. Work Order
                </div>
                <div className={`p-2 rounded-xl border ${['en_route', 'working', 'resolved'].includes(currentStep) ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  2. En Route
                </div>
                <div className={`p-2 rounded-xl border ${['working', 'resolved'].includes(currentStep) ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  3. In Progress
                </div>
                <div className={`p-2 rounded-xl border ${currentStep === 'resolved' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  4. Resolved
                </div>
              </div>
            </div>
          )}

          {/* Additional Resident Notes Input */}
          {!isDispatched && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Optional note for technician (e.g. best time to enter room):
              </label>
              <input
                type="text"
                placeholder="e.g. I am in the room right now / key available with reception"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
              />
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {isDispatched ? 'Work order dispatched to on-site service desk.' : 'No phone call or warden approval required.'}
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Close
            </button>

            {!isDispatched ? (
              <button
                onClick={handleDispatch}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Technician Now</span>
              </button>
            ) : (
              <button
                onClick={() => alert(`Direct call initiated to technician ${ticket.technicianName} (+91 98401 23456)`)}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Technician</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
