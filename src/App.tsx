/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { SpatialLayersBar } from './components/SpatialLayersBar';
import { ThreeFloorplan } from './components/ThreeFloorplan';
import { SpatialInspector } from './components/SpatialInspector';
import { ARPodProjector } from './components/ARPodProjector';
import { WalkthroughMode } from './components/WalkthroughMode';
import { FutureRoadmapModal } from './components/FutureRoadmapModal';
import { CADPlanModal } from './components/CADPlanModal';
import { HDPhotoMatchModal } from './components/HDPhotoMatchModal';
import { LuggageSimulatorModal } from './components/LuggageSimulatorModal';
import { PODS_DATA } from './data/mockData';
import { RoomPod, SpatialLayer, ViewMode } from './types';

export default function App() {
  // Default to Bed 203–Solo matching the exact screenshot!
  const [selectedPod, setSelectedPod] = useState<RoomPod>(
    PODS_DATA.find((p) => p.id === 'pod-203') || PODS_DATA[0]
  );
  const [currentLayer, setCurrentLayer] = useState<SpatialLayer>('master');
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Overlay Modes
  const [showAR, setShowAR] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showCAD, setShowCAD] = useState(false);
  const [showPhotoMatch, setShowPhotoMatch] = useState(false);
  const [showLuggageSim, setShowLuggageSim] = useState(false);

  // Handle View Mode changes from the top toolbar
  const handleSelectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'walkthrough') {
      setShowWalkthrough(true);
    } else if (mode === 'ar') {
      setShowAR(true);
    } else if (mode === 'cad') {
      setShowCAD(true);
    } else if (mode === 'photomatch') {
      setShowPhotoMatch(true);
    } else if (mode === 'exploded') {
      // Toggle exploded view layer
      setCurrentLayer((prev) => (prev === 'master' ? 'dimensions' : 'master'));
    }
  };

  // Filter pods by search query
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q) return;
    const lower = q.toLowerCase();
    const found = PODS_DATA.find(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.resident.name.toLowerCase().includes(lower) ||
        p.resident.status.toLowerCase().includes(lower) ||
        p.roomType.toLowerCase().includes(lower)
    );
    if (found) {
      setSelectedPod(found);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Top Header: HomiesInn Brand, Location, Search, Profile */}
      <Header
        onOpenAR={() => setShowAR(true)}
        onOpenRoadmap={() => setShowRoadmap(true)}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      {/* 2. Secondary Filter & Layer Bar matching Screenshot */}
      <SpatialLayersBar
        currentLayer={currentLayer}
        onSelectLayer={setCurrentLayer}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
        onOpenAR={() => setShowAR(true)}
        onOpenLuggageSim={() => setShowLuggageSim(true)}
      />

      {/* 3. Main Workspace: 3D Scene Viewport + Spatial Inspector Sidebar */}
      <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden h-[calc(100vh-112px)]">
        
        {/* Left/Center: Three.js Interactive 3D Floorplan & Controls */}
        <section className="flex-1 relative w-full h-full min-h-[500px]">
          <ThreeFloorplan
            currentLayer={currentLayer}
            viewMode={viewMode}
            onSelectPod={(pod) => setSelectedPod(pod)}
            selectedPod={selectedPod}
            onEnterWalkthrough={() => setShowWalkthrough(true)}
            onOpenAR={() => setShowAR(true)}
          />
        </section>

        {/* Right: SPATIAL INSPECTOR Panel matching screenshot identically */}
        <SpatialInspector
          pod={selectedPod}
          onEnterWalkthrough={() => setShowWalkthrough(true)}
          onOpenAR={() => setShowAR(true)}
          onOpenLuggageSim={() => setShowLuggageSim(true)}
        />

      </main>

      {/* Modal: Augmented Reality (AR) Camera Projection Mode */}
      {showAR && (
        <ARPodProjector
          initialPod={selectedPod}
          onClose={() => {
            setShowAR(false);
            setViewMode('isometric');
          }}
        />
      )}

      {/* Modal: 360° Interactive Walkthrough Mode with Hotspots */}
      {showWalkthrough && (
        <WalkthroughMode
          onClose={() => {
            setShowWalkthrough(false);
            setViewMode('isometric');
          }}
          onSelectPod={(pod) => setSelectedPod(pod)}
        />
      )}

      {/* Modal: Beyond 3D Viewing - Next-Gen Innovation Roadmap */}
      {showRoadmap && (
        <FutureRoadmapModal
          onClose={() => setShowRoadmap(false)}
          onLaunchLuggageSim={() => setShowLuggageSim(true)}
        />
      )}

      {/* Modal: Virtual Move-In & Luggage Clearance Simulator */}
      {showLuggageSim && (
        <LuggageSimulatorModal
          onClose={() => setShowLuggageSim(false)}
        />
      )}

      {/* Modal: Architectural CAD Vector Floorplan */}
      {showCAD && (
        <CADPlanModal
          onClose={() => {
            setShowCAD(false);
            setViewMode('isometric');
          }}
        />
      )}

      {/* Modal: HD Photo Match Digital Twin Comparison */}
      {showPhotoMatch && (
        <HDPhotoMatchModal
          pod={selectedPod}
          onClose={() => {
            setShowPhotoMatch(false);
            setViewMode('isometric');
          }}
        />
      )}

    </div>
  );
}
