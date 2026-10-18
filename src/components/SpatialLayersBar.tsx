import React from 'react';
import { 
  Layers, 
  Zap, 
  Sun, 
  Box, 
  Compass, 
  SplitSquareVertical, 
  FileText, 
  Sparkles,
  Camera,
  Ruler
} from 'lucide-react';
import { SpatialLayer, ViewMode } from '../types';

interface SpatialLayersBarProps {
  currentLayer: SpatialLayer;
  onSelectLayer: (layer: SpatialLayer) => void;
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
  onOpenAR: () => void;
  onOpenLuggageSim: () => void;
}

export const SpatialLayersBar: React.FC<SpatialLayersBarProps> = ({
  currentLayer,
  onSelectLayer,
  viewMode,
  onSelectViewMode,
  onOpenAR,
  onOpenLuggageSim,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200/90 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Interactive Spatial Layers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mr-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Interactive Spatial Layers</span>
          </div>

          <button
            onClick={() => onSelectLayer('master')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              currentLayer === 'master'
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Master Layout</span>
          </button>

          <button
            onClick={() => onSelectLayer('electrical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentLayer === 'electrical'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${currentLayer === 'electrical' ? 'text-white' : 'text-amber-500'}`} />
            <span>Electrical &amp; Charging</span>
          </button>

          <button
            onClick={() => onSelectLayer('sunlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentLayer === 'sunlight'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${currentLayer === 'sunlight' ? 'text-white' : 'text-orange-500'}`} />
            <span>Sunlight &amp; Airflow</span>
          </button>

          <button
            onClick={() => onSelectLayer('dimensions')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentLayer === 'dimensions'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Clearance &amp; Specs</span>
          </button>

          <button
            onClick={onOpenLuggageSim}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-300 shadow-xs transition-all"
          >
            <span className="text-sm">🧳</span>
            <span>Move-In Luggage Sim</span>
          </button>
        </div>

        {/* Right: View Modes matching screenshot */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs overflow-x-auto">
          
          <button
            onClick={() => onSelectViewMode('isometric')}
            className={`px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
              viewMode === 'isometric'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Isometric 3D
          </button>

          <button
            onClick={() => onSelectViewMode('walkthrough')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
              viewMode === 'walkthrough'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Step Inside (360°)</span>
          </button>

          <button
            onClick={() => onSelectViewMode('exploded')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
              viewMode === 'exploded'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Exploded Layers</span>
          </button>

          <button
            onClick={() => onSelectViewMode('cad')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
              viewMode === 'cad'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CAD Plan</span>
          </button>

          <button
            onClick={() => onSelectViewMode('photomatch')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all whitespace-nowrap ${
              viewMode === 'photomatch'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>HD Photo Match</span>
          </button>

          <button
            onClick={onOpenAR}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors whitespace-nowrap shadow-xs"
          >
            <Camera className="w-3 h-3" />
            <span>AR View</span>
          </button>

        </div>

      </div>
    </div>
  );
};
