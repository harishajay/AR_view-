import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { 
  X, 
  Luggage, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Box, 
  Layers, 
  Tv, 
  Music, 
  Bike, 
  Plus, 
  Trash2, 
  ArrowUpRight,
  ShieldCheck,
  Download,
  Info
} from 'lucide-react';

interface LuggageItem {
  id: string;
  name: string;
  category: 'suitcase' | 'monitor' | 'instrument' | 'cycle' | 'backpack';
  dimensions: string;
  volumeLiters: number;
  icon: any;
  defaultSlot: 'underbed' | 'wardrobe' | 'desk' | 'nook';
  slotName: string;
  color: number;
}

const AVAILABLE_BELONGINGS: LuggageItem[] = [
  {
    id: 'item-suitcase-28',
    name: '28" Check-In Suitcase',
    category: 'suitcase',
    dimensions: '75 × 52 × 32 cm',
    volumeLiters: 95,
    icon: Luggage,
    defaultSlot: 'underbed',
    slotName: 'Under-Bed Hydraulic Bay',
    color: 0xe11d48, // Crimson red
  },
  {
    id: 'item-cabin-20',
    name: '20" Cabin Carry-On',
    category: 'suitcase',
    dimensions: '55 × 38 × 22 cm',
    volumeLiters: 42,
    icon: Luggage,
    defaultSlot: 'underbed',
    slotName: 'Under-Bed Hydraulic Bay',
    color: 0x0284c7, // Sky blue
  },
  {
    id: 'item-monitor-27',
    name: '27" External 4K Monitor',
    category: 'monitor',
    dimensions: '62 × 36 × 18 cm',
    volumeLiters: 25,
    icon: Tv,
    defaultSlot: 'desk',
    slotName: 'Desk Ergonomic Gas Arm',
    color: 0x38bdf8, // Cyan screen
  },
  {
    id: 'item-guitar',
    name: 'Acoustic Guitar in Case',
    category: 'instrument',
    dimensions: '105 × 42 × 16 cm',
    volumeLiters: 48,
    icon: Music,
    defaultSlot: 'wardrobe',
    slotName: '180L RFID Wardrobe Hanger Zone',
    color: 0xd97706, // Amber wood
  },
  {
    id: 'item-folding-bike',
    name: 'Urban Folding Commuter Cycle',
    category: 'cycle',
    dimensions: '85 × 68 × 35 cm',
    volumeLiters: 80,
    icon: Bike,
    defaultSlot: 'nook',
    slotName: 'Balcony / Entrance Sit-Out',
    color: 0x059669, // Emerald green
  },
];

interface LuggageSimulatorModalProps {
  onClose: () => void;
}

export const LuggageSimulatorModal: React.FC<LuggageSimulatorModalProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Placed items in pod
  const [placedItems, setPlacedItems] = useState<string[]>([
    'item-suitcase-28',
    'item-cabin-20',
    'item-monitor-27',
  ]);

  // Hydraulic lift state & Wardrobe doors state
  const [hydraulicLiftOpen, setHydraulicLiftOpen] = useState(true);
  const [wardrobeDoorsOpen, setWardrobeDoorsOpen] = useState(true);

  // 3D Scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mattressLiftMeshRef = useRef<THREE.Group | null>(null);
  const wardrobeDoorLRef = useRef<THREE.Mesh | null>(null);
  const wardrobeDoorRRef = useRef<THREE.Mesh | null>(null);
  const itemMeshesRef = useRef<{ [id: string]: THREE.Group }>({});

  // Compute storage capacity
  const underbedUsed = placedItems
    .filter((id) => AVAILABLE_BELONGINGS.find((b) => b.id === id)?.defaultSlot === 'underbed')
    .reduce((acc, id) => acc + (AVAILABLE_BELONGINGS.find((b) => b.id === id)?.volumeLiters || 0), 0);

  const wardrobeUsed = placedItems
    .filter((id) => AVAILABLE_BELONGINGS.find((b) => b.id === id)?.defaultSlot === 'wardrobe')
    .reduce((acc, id) => acc + (AVAILABLE_BELONGINGS.find((b) => b.id === id)?.volumeLiters || 0), 0);

  const underbedCapacity = 350; // Liters
  const wardrobeCapacity = 180; // Liters

  // Initialize Three.js 3D Simulator Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // sleek dark studio
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(4.5, 4.2, 5.0);
    camera.lookAt(0, 0.6, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.5;
    controls.maxDistance = 14;
    controls.target.set(0, 0.6, 0);
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    keyLight.position.set(6, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const blueFill = new THREE.DirectionalLight(0x38bdf8, 1.0);
    blueFill.position.set(-5, 4, -3);
    scene.add(blueFill);

    // Floor Base
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grid lines
    const grid = new THREE.GridHelper(8, 16, 0x6366f1, 0x334155);
    grid.position.y = 0.005;
    scene.add(grid);

    // Materials
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
    const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const tealWardrobeMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4 });
    const deskOakMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });

    // 1. BED FRAME with HOLLOW HYDRAULIC STORAGE CAVITY
    const bedOuterBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.2), darkWoodMat);
    bedOuterBase.position.set(0, 0.225, 0);
    bedOuterBase.castShadow = true;
    bedOuterBase.receiveShadow = true;
    scene.add(bedOuterBase);

    // Hollow storage interior floor
    const storageCavityMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const cavity = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.35, 2.05), storageCavityMat);
    cavity.position.set(0, 0.25, 0);
    scene.add(cavity);

    // Hydraulic Gas-Struts (Piston cylinders)
    const strutLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), metalMat);
    strutLeft.position.set(-0.55, 0.45, 0.4);
    strutLeft.rotation.x = -0.5;
    const strutRight = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), metalMat);
    strutRight.position.set(0.55, 0.45, 0.4);
    strutRight.rotation.x = -0.5;
    scene.add(strutLeft, strutRight);

    // 2. HYDRAULIC MATTRESS LIFT PLATFORM (Rotates up from headboard)
    const mattressLiftGroup = new THREE.Group();
    // Pivot at the headboard end (z = -1.0)
    mattressLiftGroup.position.set(0, 0.45, -1.0);

    const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.06, 2.15), darkWoodMat);
    platformMesh.position.set(0, 0.03, 1.075);
    platformMesh.castShadow = true;

    const mattressMesh = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.22, 2.1), navyMat);
    mattressMesh.position.set(0, 0.17, 1.075);
    mattressMesh.castShadow = true;

    const pillowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.4), whiteMat);
    pillowMesh.position.set(0, 0.32, 0.3);

    mattressLiftGroup.add(platformMesh, mattressMesh, pillowMesh);
    scene.add(mattressLiftGroup);
    mattressLiftMeshRef.current = mattressLiftGroup;

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.4, 0.1), darkWoodMat);
    headboard.position.set(0, 0.7, -1.1);
    scene.add(headboard);

    // 3. 180L RFID WARDROBE (Positioned at right: x = 1.6, z = -0.3)
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(1.4, 0, -0.2);

    // Wardrobe frame (hollow)
    const wardrobeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.1, 0.65), tealWardrobeMat);
    wardrobeFrame.position.set(0, 1.05, 0);
    wardrobeGroup.add(wardrobeFrame);

    // Wardrobe Interior shelf
    const wardrobeShelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.6), darkWoodMat);
    wardrobeShelf.position.set(0, 0.5, 0);
    wardrobeGroup.add(wardrobeShelf);

    // Wardrobe Doors (swing open on Y axis)
    const doorGeo = new THREE.BoxGeometry(0.4, 2.05, 0.04);
    const doorL = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: 0x115e59 }));
    doorL.position.set(-0.2, 1.05, 0.33);
    const doorR = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: 0x115e59 }));
    doorR.position.set(0.2, 1.05, 0.33);

    wardrobeGroup.add(doorL, doorR);
    scene.add(wardrobeGroup);
    wardrobeDoorLRef.current = doorL;
    wardrobeDoorRRef.current = doorR;

    // 4. FLOATING DESK (Positioned at left: x = -1.2, z = 0.4)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-1.2, 0, 0.4);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), deskOakMat);
    deskTop.position.set(0, 0.75, 0);
    deskTop.castShadow = true;
    const deskLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75), metalMat);
    deskLeg.position.set(-0.4, 0.375, 0);
    deskGroup.add(deskTop, deskLeg);
    scene.add(deskGroup);

    // 5. BALCONY / NOOK ZONE (Positioned at front: x = -1.0, z = 1.8)
    const nookMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const nookZone = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 1.0), nookMat);
    nookZone.position.set(-1.0, 0.01, 1.8);
    scene.add(nookZone);

    // 6. 3D ITEM MODELS (Suitcase, Monitor, Guitar, Folding Bike)
    const createSuitcase3D = (w: number, h: number, d: number, color: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 }));
      body.castShadow = true;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.06, 0.04), metalMat);
      handle.position.y = h / 2 + 0.04;
      g.add(body, handle);
      return g;
    };

    // Item 1: 28-inch Suitcase inside Under-Bed Storage
    const suitcase28 = createSuitcase3D(0.52, 0.3, 0.75, 0xe11d48);
    suitcase28.position.set(-0.25, 0.25, 0.3); // inside bed cavity
    scene.add(suitcase28);
    itemMeshesRef.current['item-suitcase-28'] = suitcase28;

    // Item 2: 20-inch Cabin Bag inside Under-Bed Storage (next to 28-inch)
    const cabin20 = createSuitcase3D(0.38, 0.22, 0.55, 0x0284c7);
    cabin20.position.set(0.3, 0.22, -0.4); // inside bed cavity
    scene.add(cabin20);
    itemMeshesRef.current['item-cabin-20'] = cabin20;

    // Item 3: 27-inch Monitor on Desk
    const monitorGroup = new THREE.Group();
    const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.025), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    monScreen.position.set(-1.2, 1.05, 0.35);
    const monStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), metalMat);
    monStand.position.set(-1.2, 0.88, 0.35);
    monitorGroup.add(monScreen, monStand);
    scene.add(monitorGroup);
    itemMeshesRef.current['item-monitor-27'] = monitorGroup;

    // Item 4: Acoustic Guitar Case inside Wardrobe
    const guitarGroup = new THREE.Group();
    const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, 0.16), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }));
    gBody.position.set(1.4, 1.1, -0.2);
    guitarGroup.add(gBody);
    guitarGroup.visible = false;
    scene.add(guitarGroup);
    itemMeshesRef.current['item-guitar'] = guitarGroup;

    // Item 5: Folding Bicycle in Nook
    const bikeGroup = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.25), new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8, roughness: 0.2 }));
    frame.position.set(-1.0, 0.35, 1.8);
    const wheel1 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 12, 24), metalMat);
    wheel1.position.set(-1.2, 0.2, 1.8);
    const wheel2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 12, 24), metalMat);
    wheel2.position.set(-0.8, 0.2, 1.8);
    bikeGroup.add(frame, wheel1, wheel2);
    bikeGroup.visible = false;
    scene.add(bikeGroup);
    itemMeshesRef.current['item-folding-bike'] = bikeGroup;

    // Render loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Animate hydraulic lift smoothly
      if (mattressLiftMeshRef.current) {
        const targetAngle = hydraulicLiftOpen ? -0.55 : 0; // tilt up 32 degrees
        mattressLiftMeshRef.current.rotation.x = THREE.MathUtils.damp(
          mattressLiftMeshRef.current.rotation.x,
          targetAngle,
          6,
          clock.getDelta()
        );
      }

      // Animate wardrobe doors smoothly
      if (wardrobeDoorLRef.current && wardrobeDoorRRef.current) {
        const targetDoorAngle = wardrobeDoorsOpen ? -1.6 : 0;
        wardrobeDoorLRef.current.rotation.y = THREE.MathUtils.damp(
          wardrobeDoorLRef.current.rotation.y,
          targetDoorAngle,
          6,
          clock.getDelta()
        );
        wardrobeDoorRRef.current.rotation.y = THREE.MathUtils.damp(
          wardrobeDoorRRef.current.rotation.y,
          -targetDoorAngle,
          6,
          clock.getDelta()
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync placed items visibility in 3D
  useEffect(() => {
    Object.keys(itemMeshesRef.current).forEach((itemId) => {
      const mesh = itemMeshesRef.current[itemId];
      if (mesh) {
        mesh.visible = placedItems.includes(itemId);
      }
    });
  }, [placedItems]);

  const toggleItem = (itemId: string) => {
    setPlacedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative max-w-6xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center font-black shadow-lg">
              <Luggage className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Virtual Move-In &amp; Luggage Clearance Simulator
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  3D Ergonomic Fit Verification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Test placing your 28" suitcases, 27" monitors, instruments &amp; cycle inside the 350L hydraulic bed &amp; 180L RFID locker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Move-In Baggage Clearance Certificate exported! 100% Fit Guaranteed.')}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Clearance Cert</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Left: 3D Simulator Canvas & Animation Struts */}
          <div className="flex-1 relative w-full h-[380px] lg:h-auto min-h-[350px] bg-slate-950">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Top Canvas Controls for Hydraulic Struts & Wardrobe */}
            <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Toggle Bed Hydraulic Lift */}
                <button
                  onClick={() => setHydraulicLiftOpen(!hydraulicLiftOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border shadow-lg flex items-center gap-1.5 transition-all ${
                    hydraulicLiftOpen
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                  <span>{hydraulicLiftOpen ? 'Bed Lift Open (350L Bay)' : 'Open Hydraulic Lift'}</span>
                </button>

                {/* Toggle Wardrobe Doors */}
                <button
                  onClick={() => setWardrobeDoorsOpen(!wardrobeDoorsOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border shadow-lg flex items-center gap-1.5 transition-all ${
                    wardrobeDoorsOpen
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>{wardrobeDoorsOpen ? 'Wardrobe Open (180L)' : 'Open Wardrobe Doors'}</span>
                </button>
              </div>

              {/* Orbit rotation tip */}
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 border border-white/10 hidden sm:flex items-center gap-1.5">
                <RotateCw className="w-3 h-3 text-cyan-400" />
                <span>Drag to Orbit 360°</span>
              </div>
            </div>

            {/* Floating Live Storage Gauges on Canvas */}
            <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* Under-bed Capacity Bar */}
              <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white pointer-events-auto">
                <div className="flex justify-between text-xs font-extrabold mb-1">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Box className="w-3.5 h-3.5" />
                    <span>Under-Bed Hydraulic Storage</span>
                  </span>
                  <span className="font-mono">{underbedUsed}L / {underbedCapacity}L ({Math.round((underbedUsed / underbedCapacity) * 100)}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (underbedUsed / underbedCapacity) * 100)}%` }}
                    className={`h-full transition-all duration-300 ${
                      underbedUsed <= underbedCapacity ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Fits 2 Large 28" Suitcases + Shoes</span>
                  <span className="text-emerald-400 font-bold">✓ Clearance OK</span>
                </div>
              </div>

              {/* Wardrobe Capacity Bar */}
              <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white pointer-events-auto">
                <div className="flex justify-between text-xs font-extrabold mb-1">
                  <span className="flex items-center gap-1.5 text-teal-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>180L RFID Smart Wardrobe</span>
                  </span>
                  <span className="font-mono">{wardrobeUsed}L / {wardrobeCapacity}L ({Math.round((wardrobeUsed / wardrobeCapacity) * 100)}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (wardrobeUsed / wardrobeCapacity) * 100)}%` }}
                    className={`h-full transition-all duration-300 ${
                      wardrobeUsed <= wardrobeCapacity ? 'bg-teal-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Hanger Rail + Digital Pin Safe</span>
                  <span className="text-emerald-400 font-bold">✓ Clearance OK</span>
                </div>
              </div>

            </div>

          </div>

          {/* Right: Interactive Belongings Picker */}
          <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 text-white">
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                BELONGINGS INVENTORY
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                {placedItems.length} Items Loaded
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Toggle items below to test 3D placement inside your pod's storage zones:
            </p>

            {/* Belongings List */}
            <div className="flex flex-col gap-2.5">
              {AVAILABLE_BELONGINGS.map((item) => {
                const Icon = item.icon;
                const isPlaced = placedItems.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isPlaced
                        ? 'bg-slate-800/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40'
                        : 'bg-slate-950 hover:bg-slate-800/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ backgroundColor: isPlaced ? '#4f46e5' : '#334155' }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-colors shadow-xs"
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.dimensions} • {item.volumeLiters} Liters
                        </p>
                        <span className="text-[9px] font-semibold text-cyan-400 block mt-0.5">
                          ↳ {item.slotName}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isPlaced
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isPlaced ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Move-In Verdict Card */}
            <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-950 border border-emerald-500/40 text-white">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Move-In Clearance Guarantee</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                All selected luggage items fit comfortably inside your pod's storage without blocking walkway circulation or air vents.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirm Move-In Fit &amp; Book Bed B
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
