import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hotspot, RoomPod } from '../types';
import { WALKTHROUGH_HOTSPOTS } from '../data/mockData';
import { 
  X, 
  Compass, 
  MapPin, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Maximize2
} from 'lucide-react';

interface WalkthroughModeProps {
  onClose: () => void;
  onSelectPod: (pod: RoomPod) => void;
}

// Reusable math vector
const _tempVec = new THREE.Vector3();

// Navigation Waypoints inside the suite
const WAYPOINTS: { id: string; label: string; position: [number, number, number] }[] = [
  { id: 'wp-center', label: 'Suite Center', position: [0, 1.6, 0] },
  { id: 'wp-bed-b', label: 'Bed B (Your Pod)', position: [-2.0, 1.6, 0.4] },
  { id: 'wp-desk', label: 'Workstation', position: [-1.4, 1.6, -1.5] },
  { id: 'wp-balcony', label: 'Balcony Deck', position: [-0.5, 1.6, 3.2] },
  { id: 'wp-entrance', label: 'Keypad Entrance', position: [-0.8, 1.6, 3.8] },
  { id: 'wp-ensuite', label: 'En-Suite Bathroom', position: [2.5, 1.6, 2.2] },
];

export const WalkthroughMode: React.FC<WalkthroughModeProps> = ({
  onClose,
  onSelectPod,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentWaypoint, setCurrentWaypoint] = useState(WAYPOINTS[1]); // start near Bed B
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(WALKTHROUGH_HOTSPOTS[0]);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [cameraHeading, setCameraHeading] = useState(0);

  // Screen coordinates for floating 3D hotspots
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<{
    [id: string]: { x: number; y: number; visible: boolean; dist: number };
  }>({});

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  // Look-around angles (pitch & yaw)
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraYaw = useRef(Math.PI / 4);
  const cameraPitch = useRef(0);
  const targetCamPos = useRef(new THREE.Vector3(...currentWaypoint.position));

  // Initialize First-Person 360 Walkthrough Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // warm interior room atmosphere

    // 2. Camera at human eye-level (1.6m)
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 80);
    camera.position.set(...currentWaypoint.position);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Interior Architecture (Enclosed Room Walls, Ceiling & Floor for authentic 360 presence)
    // Tiled floor
    const floorGeo = new THREE.PlaneGeometry(9.6, 9.6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling with recessed track lights
    const ceilingGeo = new THREE.PlaneGeometry(9.6, 9.6);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 2.9;
    scene.add(ceiling);

    // Warm Interior Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const createWall = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      scene.add(mesh);
      return mesh;
    };
    createWall(9.6, 2.9, 0, 1.45, -4.8, 0); // North
    createWall(9.6, 2.9, -4.8, 1.45, 0, Math.PI / 2); // West
    createWall(9.6, 2.9, 4.8, 1.45, 0, -Math.PI / 2); // East
    createWall(9.6, 2.9, 0, 1.45, 4.8, Math.PI); // South

    // Warm Lighting Rig
    const ambient = new THREE.AmbientLight(0xffedd5, 1.1);
    scene.add(ambient);

    // Bedside glowing sconces
    const addSconce = (x: number, y: number, z: number, color = 0xfbbf24) => {
      const pl = new THREE.PointLight(color, 2.2, 5.0, 1.5);
      pl.position.set(x, y, z);
      pl.castShadow = true;
      scene.add(pl);
    };
    addSconce(-2.8, 1.4, 0.4); // Bed B sconce
    addSconce(-2.8, 1.4, -2.2); // Workstation light
    addSconce(2.4, 1.4, -2.2); // Desk C
    addSconce(0, 2.7, 0, 0x60a5fa); // Center cool halo
    addSconce(-0.5, 1.8, 3.8, 0xf97316); // Balcony sunrise golden glow

    // Balcony panoramic window view
    const windowGeo = new THREE.PlaneGeometry(4.2, 2.2);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xf97316 }); // sunrise amber skyline
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(-0.5, 1.5, 4.78);
    windowMesh.rotation.y = Math.PI;
    scene.add(windowMesh);

    // Bed B 3D Cocoon & Mattress inside Walkthrough
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.5 });
    const navyLinen = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const bedBBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 2.2), timberMat);
    bedBBase.position.set(-2.4, 0.2, 0.4);
    const bedBMattress = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.25, 2.12), navyLinen);
    bedBMattress.position.set(-2.4, 0.5, 0.4);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.4, 0.1), timberMat);
    headboard.position.set(-2.4, 0.7, -0.65);
    scene.add(bedBBase, bedBMattress, headboard);

    // Interactive 3D Hotspot Markers (Pulsing glowing spheres in 3D scene)
    const hotspotMeshes: THREE.Mesh[] = [];
    WALKTHROUGH_HOTSPOTS.forEach((hs) => {
      const geo = new THREE.SphereGeometry(0.12, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...hs.position);
      scene.add(mesh);
      hotspotMeshes.push(mesh);
    });

    // Mouse / Touch Look Around Handlers
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      cameraYaw.current -= deltaX * 0.004;
      cameraPitch.current -= deltaY * 0.003;
      // Clamp pitch to avoid gimbal flip
      cameraPitch.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraPitch.current));

      setCameraHeading(Math.round((-cameraYaw.current * 180) / Math.PI) % 360);
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    // Touch support for mobile devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

      cameraYaw.current -= deltaX * 0.004;
      cameraPitch.current -= deltaY * 0.003;
      cameraPitch.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraPitch.current));

      setCameraHeading(Math.round((-cameraYaw.current * 180) / Math.PI) % 360);
      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging.current = false;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smoothly move camera towards current waypoint
      camera.position.lerp(targetCamPos.current, 0.08);

      // Compute look-at vector from yaw & pitch
      const lookDir = new THREE.Vector3(
        Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current),
        Math.sin(cameraPitch.current),
        -Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current)
      );
      camera.lookAt(camera.position.clone().add(lookDir));

      // Pulse hotspot markers
      hotspotMeshes.forEach((mesh, idx) => {
        const s = 1.0 + Math.sin(time * 3 + idx) * 0.2;
        mesh.scale.set(s, s, s);
      });

      // Project hotspots to 2D coordinates for interactive clicking
      const projected: { [id: string]: { x: number; y: number; visible: boolean; dist: number } } = {};
      WALKTHROUGH_HOTSPOTS.forEach((hs) => {
        _tempVec.set(...hs.position);
        const dist = camera.position.distanceTo(_tempVec);
        _tempVec.project(camera);

        const inFront = _tempVec.z < 1.0;
        const x = (_tempVec.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
        const y = (-(_tempVec.y * 0.5) + 0.5) * mountRef.current!.clientHeight;

        projected[hs.id] = { x, y, visible: inFront, dist };
      });
      setHotspotScreenPositions(projected);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update target waypoint position
  useEffect(() => {
    targetCamPos.current.set(...currentWaypoint.position);
  }, [currentWaypoint]);

  // Ambient sound synthesis with Web Audio API (soothing hostel room acoustic ventilation)
  const toggleAmbientSound = () => {
    if (isAudioMuted) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime); // gentle warm low drone

        // Pink noise buffer for ambient airflow
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.02;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        whiteNoise.connect(gain);
        gain.connect(ctx.destination);
        whiteNoise.start();

        audioContextRef.current = ctx;
        audioGainRef.current = gain;
        setIsAudioMuted(false);
      } catch (err) {
        console.warn('Audio autoplay blocked:', err);
      }
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsAudioMuted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* Top HUD Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:p-6 flex items-center justify-between text-white pointer-events-none">
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-lg shadow-lg">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                360° Walkthrough Inside Suite 529
              </h2>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Interactive First-Person Mode
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Drag mouse or finger to look around • Click hotspots to inspect assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Ambient Sound Toggle */}
          <button
            onClick={toggleAmbientSound}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isAudioMuted
                ? 'bg-black/60 border-white/20 text-slate-300 hover:text-white'
                : 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Room Ambience Off' : 'Acoustic Ambience On'}</span>
          </button>

          {/* Close Walkthrough */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all"
            title="Return to Isometric 3D"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 360 Three.js Viewport */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Floating Interactive Hotspot Buttons */}
        {WALKTHROUGH_HOTSPOTS.map((hs) => {
          const pos = hotspotScreenPositions[hs.id];
          if (!pos || !pos.visible) return null;

          const isSelected = selectedHotspot?.id === hs.id;

          return (
            <div
              key={hs.id}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => setSelectedHotspot(hs)}
              className="absolute z-20 pointer-events-auto cursor-pointer group animate-in fade-in zoom-in-75 duration-200"
            >
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-white scale-110'
                    : 'bg-black/75 hover:bg-black/90 backdrop-blur-md text-white border-white/30 group-hover:scale-105'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold whitespace-nowrap">{hs.title}</span>
              </div>
            </div>
          );
        })}

        {/* Selected Hotspot Detail Card (Floating inspect modal) */}
        {selectedHotspot && (
          <div className="absolute top-20 right-4 sm:right-6 z-30 max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-2xl border border-white/20 shadow-2xl animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-indigo-400/30">
                {selectedHotspot.category} Hotspot
              </span>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-extrabold text-white tracking-tight">
              {selectedHotspot.title}
            </h3>
            <p className="text-xs text-cyan-300 font-semibold mb-2">
              {selectedHotspot.subtitle}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {selectedHotspot.description}
            </p>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 mb-4">
              {selectedHotspot.specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{spec}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                alert(`Asset details for ${selectedHotspot.title} booked for physical review!`);
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Reserve Asset Specs
            </button>
          </div>
        )}

      </div>

      {/* Bottom Walk Navigation Waypoints Bar */}
      <div className="relative z-20 bg-slate-950/95 backdrop-blur-md border-t border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Current Camera Angle & Compass */}
        <div className="flex items-center gap-3 text-xs text-white">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-mono">{cameraHeading}° Azimuth</span>
          </div>
          <span className="text-slate-400 hidden md:inline">
            Location: <strong className="text-white">{currentWaypoint.label}</strong>
          </span>
        </div>

        {/* Clickable Floor Waypoints (Teleport / Walk around) */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Walk To:
          </span>
          {WAYPOINTS.map((wp) => (
            <button
              key={wp.id}
              onClick={() => setCurrentWaypoint(wp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                currentWaypoint.id === wp.id
                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{wp.label}</span>
            </button>
          ))}
        </div>

        {/* Exit Walkthrough Button */}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors shrink-0"
        >
          Exit to Floorplan
        </button>

      </div>

    </div>
  );
};
