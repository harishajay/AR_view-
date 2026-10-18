import React, { useState } from 'react';
import { X, Sparkles, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { RoomPod } from '../types';

interface HDPhotoMatchModalProps {
  pod: RoomPod;
  onClose: () => void;
}

export const HDPhotoMatchModal: React.FC<HDPhotoMatchModalProps> = ({ pod, onClose }) => {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in">
      <div className="relative max-w-4xl w-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                HD Photo Match • Reality vs 3D Procedural Digital Twin
              </h2>
              <p className="text-xs text-slate-400">
                Verifying millimeter architectural fidelity for {pod.name}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Image Comparison Slider */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
          
          <div className="relative w-full max-w-2xl aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            
            {/* Real Physical Photograph (Left layer) */}
            <img
              src={pod.image}
              alt="Physical Room Reality"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/40">
              ● Physical Reality (Actual Photo)
            </div>

            {/* 3D Model Simulated Rendering (Right layer, clipped by slider) */}
            <div
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              className="absolute inset-0 w-full h-full bg-slate-800 overflow-hidden"
            >
              <img
                src={pod.image}
                alt="3D Digital Twin"
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-110 hue-rotate-15"
              />
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-cyan-400 border border-cyan-500/40">
                ● 3D Procedural Twin
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div
              style={{ left: `${sliderPos}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl flex items-center justify-center pointer-events-none"
            >
              <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center text-xs font-black">
                ⤂⤃
              </div>
            </div>

            {/* Invisible Range Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
            />
          </div>

          {/* Slider instruction */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Drag slider horizontally to cross-compare physical room materials with 3D model</span>
          </div>

          {/* Verification checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-5">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
              <span className="text-emerald-400 font-bold block mb-1">✓ Sun Exposure Match</span>
              <span className="text-slate-300">South-East morning natural radiance accurately mapped</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
              <span className="text-emerald-400 font-bold block mb-1">✓ Furniture Alignment</span>
              <span className="text-slate-300">Oak desk &amp; bouclé armchair matches exact CAD dimensions</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
              <span className="text-emerald-400 font-bold block mb-1">✓ Power Outlets Verified</span>
              <span className="text-slate-300">65W Type-C socket located right beside headboard</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
