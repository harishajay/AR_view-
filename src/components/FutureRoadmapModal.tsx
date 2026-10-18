import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Activity, 
  Gauge, 
  Luggage, 
  Wrench, 
  Users2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Zap,
  Radio,
  Layers
} from 'lucide-react';

interface FutureRoadmapModalProps {
  onClose: () => void;
  onLaunchLuggageSim?: () => void;
}

export const FutureRoadmapModal: React.FC<FutureRoadmapModalProps> = ({ 
  onClose,
  onLaunchLuggageSim,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_radar' | 'iot_twin' | 'luggage_sim' | 'smart_ops' | 'social_book'>('ai_radar');

  const ideas = [
    {
      id: 'ai_radar',
      name: 'AI Roommate Acoustic & Schedule Matcher',
      icon: Radio,
      badge: 'Machine Learning & Sleep Science',
      headline: 'Match with roommates based on real lifestyle acoustic & sleep rhythms',
      description: 'Beyond basic questionnaires, generate an acoustic decibel timeline and sleep schedule heatmap in the 3D suite. Identifies quiet zones, call hours, and guarantees undisturbed sleep for tech professionals and students.',
      benefits: [
        'Decibel radar showing noise exposure from common areas & bathroom',
        'Circadian rhythm compatibility score (e.g. 96% match between Bed B and Bed A)',
        'Automatic silent hours agreement integrated into digital lease',
      ],
      mockStat: { label: 'Acoustic Compatibility', value: '94.2%', sub: 'Quiet zone between 11 PM - 7 AM' },
    },
    {
      id: 'iot_twin',
      name: 'IoT Digital Twin & Live Resource Telemetry',
      icon: Gauge,
      badge: 'Live Smart Building Sensors',
      headline: 'Turn the 3D hostel floorplan into a live operational cockpit',
      description: 'Connect each pod to smart sub-meters and environmental sensors. Residents and facility managers see live power usage, ambient room temperature, air quality (AQI), and bathroom geyser hot-water availability directly on the 3D model.',
      benefits: [
        'Live wattage readout for each 65W Type-C socket and 230V pod outlet',
        'Thermal micro-climate map showing AC cooling distribution across beds',
        'Occupancy indicator and washroom availability queue to avoid morning delays',
      ],
      mockStat: { label: 'Live Pod B Consumption', value: '42W Active', sub: 'Laptop + Bedside Lamp' },
    },
    {
      id: 'luggage_sim',
      name: 'Virtual Move-In & Luggage Clearance Simulator',
      icon: Luggage,
      badge: '3D Spatial Ergonomics',
      headline: 'Test your actual suitcases, monitors, and gear inside the pod before moving',
      description: 'Allow incoming residents to drag and drop standard travel luggage (28-inch check-in, 20-inch cabin bags, ergonomic desk setups, guitar cases) directly into the 3D wardrobe and under-bed storage to verify exact physical clearances.',
      benefits: [
        'Color-coded fit validation: Green (fits with ease), Red (exceeds clearance)',
        'Optimized packing suggestions based on allocated 180L RFID wardrobe size',
        'Prevents moving-day clutter and ensures smooth check-in',
      ],
      mockStat: { label: 'Storage Utilization', value: '180L Safe', sub: 'Accommodates 2 Large Suitcases' },
    },
    {
      id: 'smart_ops',
      name: 'Spatial Maintenance Ticketing & Egress Safety',
      icon: Wrench,
      badge: 'Automated Facility Ops',
      headline: 'Tap any 3D asset to dispatch instant repairs with geolocation',
      description: 'Instead of texting a warden, residents simply tap the specific 3D asset (e.g. leaking faucet, jammed RFID locker door, flickering desk lamp) in the app. The system generates a geo-tagged work order for the technician with pinpoint precision.',
      benefits: [
        'Technician receives exact suite number and 3D coordinate of the broken fixture',
        'Live maintenance progress tracker with push notification upon resolution',
        'Integrated emergency egress simulation & fire evacuation route visualizer',
      ],
      mockStat: { label: 'Avg Resolution Time', value: '45 mins', sub: 'Direct to on-site technicians' },
    },
    {
      id: 'social_book',
      name: 'Multi-User Collaborative Pod Booking ("Squad Move-In")',
      icon: Users2,
      badge: 'Social Co-Living',
      headline: 'Friends book adjacent pods simultaneously with live cursors',
      description: 'College classmates or corporate cohort join a shared WebRTC 3D session. They see each other’s cursor badges in real-time, pick neighboring pods (like Bed A + Bed B), and split the security deposit seamlessly via UPI.',
      benefits: [
        'Multiplayer cursor presence showing friend avatars in 3D floorplan',
        'Split deposit calculator and automatic joint tenancy perks',
        'Cohort onboarding with shared community group chat activation',
      ],
      mockStat: { label: 'Group Booking Discount', value: '15% Off', sub: 'When claiming 2+ adjacent pods' },
    },
  ];

  const current = ideas.find((i) => i.id === activeTab)!;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Beyond 3D Viewing: Next-Gen Innovation Roadmap
              </h2>
              <p className="text-xs text-slate-400">
                Strategic capabilities to transform HomiesInn into the future of urban co-living
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-3 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs font-bold">
          {ideas.map((idea) => {
            const Icon = idea.icon;
            const isSel = idea.id === activeTab;
            return (
              <button
                key={idea.id}
                onClick={() => setActiveTab(idea.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{idea.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {current.badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {current.headline}
              </h3>
            </div>

            {/* Stat Pill */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl min-w-[180px] shrink-0 border border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {current.mockStat.label}
              </span>
              <span className="text-xl font-black text-amber-400 block mt-0.5">
                {current.mockStat.value}
              </span>
              <span className="text-[11px] text-slate-300 block">
                {current.mockStat.sub}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {current.description}
          </p>

          {/* Key Advantages */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              Core Capabilities &amp; Technical Implementation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {current.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Launch Button if activeTab is luggage_sim */}
          {activeTab === 'luggage_sim' && onLaunchLuggageSim && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
              <div>
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-sm">🧳</span>
                  <span>Interactive 3D Luggage Simulator is Live</span>
                </h5>
                <p className="text-[11px] text-slate-500">
                  Open the hydraulic bed lift &amp; wardrobe doors to test your actual bags and monitor fit.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onLaunchLuggageSim();
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm whitespace-nowrap transition-transform hover:scale-105"
              >
                Launch 3D Simulator Now →
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            Designed for HomiesInn high-density co-living platforms &amp; student residences.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors ml-auto"
          >
            Back to 3D Floorplan
          </button>
        </div>

      </div>
    </div>
  );
};
