import React from 'react';
import { X, Download, Printer, Layers, Compass, CheckCircle2 } from 'lucide-react';
import { SUITE_INFO } from '../data/mockData';

interface CADPlanModalProps {
  onClose: () => void;
}

export const CADPlanModal: React.FC<CADPlanModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in">
      <div className="relative max-w-4xl w-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">
              CAD
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Architectural CAD Floorplan • Suite 529
              </h2>
              <p className="text-xs text-slate-400">
                1:50 Scale Orthographic Vector Blueprint &amp; Egress Pathways
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Print Blueprint"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('CAD Blueprint downloaded as DXF / Vector PDF.')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download DXF</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Blueprint Canvas Graphic */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950">
          <div className="relative w-full max-w-2xl aspect-square bg-[#0b192c] rounded-2xl border-2 border-cyan-500/40 p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

            {/* Blueprint Dimensions */}
            <div className="flex justify-between text-[11px] font-mono text-cyan-400 font-bold border-b border-cyan-500/30 pb-2">
              <span>WIDTH: 9.20 METERS (30.18 FT)</span>
              <span>SCALE 1:50 @ A3</span>
              <span>DEPTH: 9.20 METERS</span>
            </div>

            {/* Architectural Layout Representation */}
            <div className="relative flex-1 my-4 border border-cyan-400/50 rounded-xl p-4 flex flex-col justify-between">
              
              {/* North Wall: Bed A & Rohan */}
              <div className="flex justify-between items-center text-xs">
                <div className="border border-dashed border-cyan-400/80 p-2.5 rounded bg-cyan-950/40">
                  <span className="font-bold text-cyan-200">POD A (Praveen M.)</span>
                  <div className="text-[10px] text-cyan-400 font-mono">2.1m × 1.2m • 230V Active</div>
                </div>

                <div className="text-center font-mono text-[10px] text-cyan-400">
                  ─── 95cm Walkway Clearance ───
                </div>

                <div className="border border-dashed border-cyan-400/80 p-2.5 rounded bg-cyan-950/40">
                  <span className="font-bold text-cyan-200">POD C (Rohan K.)</span>
                  <div className="text-[10px] text-cyan-400 font-mono">2.1m × 1.2m • Desk 1.4m</div>
                </div>
              </div>

              {/* Center Circulation Area */}
              <div className="flex items-center justify-center py-6">
                <div className="w-24 h-24 rounded-full border border-dashed border-cyan-400/40 flex items-center justify-center text-[10px] font-mono text-cyan-300 text-center p-2">
                  150cm Turning Radius (Wheelchair &amp; Luggage)
                </div>
              </div>

              {/* South Wall: Bed B (Your Pod) & Entrance & Balcony */}
              <div className="flex justify-between items-end text-xs">
                <div className="border-2 border-indigo-400 p-3 rounded-lg bg-indigo-950/60 shadow-lg shadow-indigo-500/20">
                  <span className="font-extrabold text-white">YOUR BED (POD B)</span>
                  <div className="text-[10px] text-indigo-300 font-mono">Super Single + 65W GaN</div>
                </div>

                {/* Doorway Keypad */}
                <div className="border border-cyan-400/60 p-2 rounded text-center">
                  <span className="text-[10px] text-emerald-400 font-bold block">DOOR ENTRY 90cm</span>
                  <span className="text-[9px] font-mono text-slate-300">RFID &amp; Keypad 8492</span>
                </div>

                {/* Balcony */}
                <div className="border border-amber-400/80 p-2.5 rounded bg-amber-950/40">
                  <span className="font-bold text-amber-300">SUNRISE BALCONY</span>
                  <div className="text-[10px] text-amber-400 font-mono">French Door 1.8m</div>
                </div>
              </div>

            </div>

            {/* Technical Specs Footer */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-2 border-t border-cyan-500/30">
              <div>CEILING HT: 2.90m</div>
              <div>FIRE SPRINKLERS: 4 NODES</div>
              <div>EGRESS: DIRECT CORRIDOR</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
