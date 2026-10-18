import React, { useState } from 'react';
import { 
  RoomPod, 
  RoomAsset 
} from '../types';
import { 
  Sparkles, 
  Maximize2, 
  Layers, 
  Armchair, 
  Zap, 
  Lock, 
  Sun, 
  Wifi, 
  Camera, 
  Compass, 
  Calendar, 
  ArrowLeftRight, 
  Download,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface SpatialInspectorProps {
  pod: RoomPod;
  onEnterWalkthrough: () => void;
  onOpenAR: () => void;
  onOpenLuggageSim: () => void;
}

export const SpatialInspector: React.FC<SpatialInspectorProps> = ({
  pod,
  onEnterWalkthrough,
  onOpenAR,
  onOpenLuggageSim,
}) => {
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Status badge style
  const getStatusBadge = () => {
    switch (pod.status) {
      case 'your_bed':
        return (
          <span className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
            Allocated to You
          </span>
        );
      case 'occupied':
        return (
          <span className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
            Occupied
          </span>
        );
      case 'available':
        return (
          <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs animate-pulse">
            Available Now
          </span>
        );
      default:
        return (
          <span className="bg-slate-700 text-white text-[11px] font-bold px-3 py-1 rounded-full">
            Reserved
          </span>
        );
    }
  };

  const getAssetIcon = (iconType: RoomAsset['iconType']) => {
    switch (iconType) {
      case 'desk':
        return <Layers className="w-4 h-4 text-indigo-600" />;
      case 'chair':
        return <Armchair className="w-4 h-4 text-indigo-600" />;
      case 'power':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'locker':
        return <Lock className="w-4 h-4 text-teal-600" />;
      case 'wifi':
        return <Wifi className="w-4 h-4 text-cyan-500" />;
      default:
        return <Sun className="w-4 h-4 text-orange-500" />;
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-l border-slate-200/90 flex flex-col h-full overflow-y-auto select-none shadow-xs">
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        
        {/* Top Tag & Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            SPATIAL INSPECTOR
          </span>
          {getStatusBadge()}
        </div>

        {/* Room Title & Resident Details */}
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {pod.name}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {pod.resident.name} • {pod.roomType}
          </p>
        </div>

        {/* High-Fidelity Room Media Card matching Screenshot */}
        <div className="relative rounded-2xl overflow-hidden shadow-md group border border-slate-200 aspect-[16/10] bg-slate-900">
          <img
            src={pod.image}
            alt={pod.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Expand Photo Button */}
          <button
            onClick={() => setPhotoExpanded(true)}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white flex items-center justify-center transition-all shadow-sm"
            title="Expand Photo"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Bottom Sun & Balcony Badge matching screenshot */}
          <div className="absolute bottom-3 left-3 right-3 bg-black/65 backdrop-blur-md rounded-xl py-2 px-3 flex items-center gap-2 border border-white/10 text-white">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold tracking-tight truncate">
              {pod.specs.sunExposure || 'All-Day Panoramic Sun & Private Balcony'}
            </span>
          </div>
        </div>

        {/* Spatial Key Metrics */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Footprint</span>
            <span className="font-bold text-slate-800">{pod.specs.dimensions}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Monthly Rent</span>
            <span className="font-extrabold text-indigo-600">₹{pod.priceMonthly.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* ALLOCATED ROOM ASSETS Section matching screenshot */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              ALLOCATED ROOM ASSETS
            </span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {pod.assets.length} Verified
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {pod.assets.map((asset) => (
              <div
                key={asset.id}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-2xs shrink-0">
                    {getAssetIcon(asset.iconType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {asset.name}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 truncate">
                      {asset.subtitle}
                    </p>
                  </div>
                </div>

                {asset.tag && (
                  <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200/80 shrink-0 whitespace-nowrap shadow-2xs">
                    {asset.tag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/80">
          
          {/* Augmented Reality Button */}
          <button
            onClick={onOpenAR}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Camera className="w-4 h-4" />
            <span>Project Pod in Augmented Reality (AR)</span>
          </button>

          {/* Move-In & Luggage Simulator Button */}
          <button
            onClick={onOpenLuggageSim}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <span className="text-sm">🧳</span>
            <span>Test Move-In Luggage Fit (350L Hydraulic Bed)</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={handleShare}
              className="py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Pod'}</span>
            </button>

            <button
              onClick={() => alert(`Spatial floorplan specifications exported for ${pod.name} in PDF format!`)}
              className="py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Specs</span>
            </button>
          </div>

        </div>

      </div>

      {/* Expanded Photo Lightbox Modal */}
      {photoExpanded && (
        <div 
          onClick={() => setPhotoExpanded(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img src={pod.image} alt={pod.name} className="w-full max-h-[80vh] object-cover" />
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{pod.name}</h3>
                <p className="text-xs text-slate-400">{pod.specs.sunExposure}</p>
              </div>
              <button
                onClick={() => setPhotoExpanded(false)}
                className="px-4 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};
