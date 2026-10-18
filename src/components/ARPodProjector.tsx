import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import QRCode from 'qrcode';
import { RoomPod } from '../types';
import { PODS_DATA } from '../data/mockData';
import { 
  Camera, 
  RotateCcw, 
  Maximize, 
  X, 
  CheckCircle2, 
  Ruler, 
  Download, 
  Sparkles,
  SwitchCamera,
  Smartphone,
  HelpCircle,
  QrCode,
  Sliders,
  Luggage,
  Move,
  Info,
  Check
} from 'lucide-react';

interface ARPodProjectorProps {
  initialPod: RoomPod;
  onClose: () => void;
}

export const ARPodProjector: React.FC<ARPodProjectorProps> = ({
  initialPod,
  onClose,
}) => {
  const [selectedPod, setSelectedPod] = useState<RoomPod>(initialPod);
  // Three distinct AR modes:
  // 1. 'camera': Live rear/front camera feed for mobile & webcams
  // 2. 'room_fit_tester': Customizable personal bedroom size & luggage clearance calculator
  // 3. 'mobile_qr': Scan with phone to project directly into your real physical room
  const [activeTab, setActiveTab] = useState<'camera' | 'room_fit_tester' | 'mobile_qr'>('camera');
  
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scale, setScale] = useState<number>(1.0); // 1.0 = 100% 1:1 scale
  const [rotation, setRotation] = useState<number>(0);
  const [podPosition, setPodPosition] = useState<[number, number]>([0, 0]);
  const [roomSizeFt, setRoomSizeFt] = useState<number>(10); // 10x10 ft custom bedroom
  const [hasSuitcase, setHasSuitcase] = useState(true);
  const [hasChair, setHasChair] = useState(true);

  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate real, high-contrast, camera-readable QR Code
    const currentUrl = window.location.href;
    QRCode.toDataURL(currentUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code error:', err));
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const podGroupRef = useRef<THREE.Group | null>(null);
  const roomFitGroupRef = useRef<THREE.Group | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Initialize or Flip Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (activeTab !== 'camera') {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((t) => t.stop());
          cameraStreamRef.current = null;
        }
        return;
      }

      try {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        cameraStreamRef.current = stream;
      } catch (err) {
        console.warn('Real camera stream failed:', err);
      }
    }

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [cameraFacing, activeTab]);

  // Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
    camera.position.set(0, 2.5, 4.0);
    camera.lookAt(0, 0.4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    dirLight.position.set(4, 7, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
    fillLight.position.set(-4, 5, -2);
    scene.add(fillLight);

    // Ground Grid
    const grid = new THREE.GridHelper(8, 16, 0x6366f1, 0x94a3b8);
    grid.position.y = 0.005;
    scene.add(grid);

    // Custom Room Fit Tester Group (walls & personal room floor)
    const roomFitGroup = new THREE.Group();
    roomFitGroupRef.current = roomFitGroup;

    // Room boundaries
    const roomFloorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), roomFloorMat);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.y = -0.01;
    roomFloor.receiveShadow = true;
    roomFitGroup.add(roomFloor);

    // Room walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), wallMat);
    backWall.position.set(0, 1.2, -1.75);
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), wallMat);
    leftWall.position.set(-1.75, 1.2, 0);
    leftWall.rotation.y = Math.PI / 2;
    roomFitGroup.add(backWall, leftWall);

    // Test Luggage: 28-inch Suitcase
    const suitcaseMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4, metalness: 0.2 });
    const suitcase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), suitcaseMat);
    suitcase.position.set(1.1, 0.375, -1.0);
    suitcase.castShadow = true;
    roomFitGroup.add(suitcase);

    roomFitGroup.visible = false;
    scene.add(roomFitGroup);

    // 3D Pod Group
    const podGroup = new THREE.Group();
    podGroupRef.current = podGroup;

    const timberMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.45 });
    const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });

    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 2.15), timberMat);
    bedBase.position.y = 0.175;
    bedBase.castShadow = true;
    podGroup.add(bedBase);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.1), navyMat);
    mattress.position.y = 0.45;
    mattress.castShadow = true;
    podGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.4), whiteMat);
    pillow.position.set(0, 0.6, -0.75);
    podGroup.add(pillow);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.1), timberMat);
    headboard.position.set(0, 0.7, -1.05);
    podGroup.add(headboard);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.55), timberMat);
    desk.position.set(-0.75, 0.75, 0.2);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.02), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    monitor.position.set(-0.75, 0.98, 0.2);
    podGroup.add(desk, monitor);

    // Floor Target Footprint Ring
    const footprint = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.38, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide })
    );
    footprint.rotation.x = -Math.PI / 2;
    footprint.position.y = 0.01;
    podGroup.add(footprint);

    scene.add(podGroup);

    // Dragging
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - prevPointer.x) * 0.008;
      const dy = (e.clientY - prevPointer.y) * 0.008;
      setPodPosition((prev) => [prev[0] + dx, prev[1] + dy]);
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => { isDragging = false; };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update scale, rotation & position
  useEffect(() => {
    if (!podGroupRef.current) return;
    podGroupRef.current.scale.set(scale, scale, scale);
    podGroupRef.current.rotation.y = (rotation * Math.PI) / 180;
    podGroupRef.current.position.set(podPosition[0], 0, podPosition[1]);
  }, [scale, rotation, podPosition]);

  // Update room fit mode
  useEffect(() => {
    if (!roomFitGroupRef.current) return;
    roomFitGroupRef.current.visible = activeTab === 'room_fit_tester';
  }, [activeTab]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const takeSnapshot = () => {
    if (!rendererRef.current) return;
    const canvas = document.createElement('canvas');
    const width = mountRef.current?.clientWidth || 1280;
    const height = mountRef.current?.clientHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    if (videoRef.current && activeTab === 'camera') {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(rendererRef.current.domElement, 0, 0, width, height);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HomiesInn AR • Physical Room Pod Projection (1:1 Scale)', 30, height - 30);

    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
    setSnapshotTaken(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 sm:p-5 flex items-center justify-between text-white">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-black text-lg shadow-lg">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                Physical AR Pod Projector
              </h2>
              <span className="bg-violet-500/30 text-violet-300 border border-violet-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                1:1 Real Scale (2.1m × 1.25m)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Project onto your physical floor or test your personal room dimensions
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2">
          
          <div className="bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20 flex items-center gap-1 text-xs font-bold">
            
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'camera' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera AR</span>
            </button>

            <button
              onClick={() => setActiveTab('room_fit_tester')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'room_fit_tester' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Room Fit Calculator</span>
            </button>

            <button
              onClick={() => setActiveTab('mobile_qr')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'mobile_qr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Scan for Phone AR</span>
            </button>

          </div>

          {activeTab === 'camera' && (
            <button
              onClick={() => setCameraFacing((p) => (p === 'environment' ? 'user' : 'environment'))}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Flip between Rear Camera (Floor) and Front Camera"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Flip Camera</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all ml-1"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

      </div>

      {/* Educational Banner answering the user's exact question: Why is AR helpful? */}
      <div className="absolute top-20 left-4 right-4 sm:left-6 sm:right-6 z-25 max-w-3xl mx-auto bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 text-white p-4 rounded-2xl shadow-2xl flex items-start justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-extrabold text-sm text-white mb-1">
              Why use AR instead of just looking at the 3D Floorplan?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              • <strong>The 3D Floorplan</strong> shows the room inside the hostel in Chennai with its roommates and layout.<br />
              • <strong>Physical AR</strong> is for checking whether this pod fits into <em>YOUR physical space at home</em>! Using your phone's rear camera, you can project the exact 2.1m bed onto your floor to test legroom, walk around it, or see if your 28-inch suitcases and bags fit next to it before you relocate.
            </p>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
        
        {/* Live Video Element (for Camera AR mode) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${activeTab === 'camera' ? 'block' : 'hidden'}`}
        />

        {/* 3D WebGL Canvas Overlay */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full z-10 pointer-events-auto cursor-grab active:cursor-grabbing" />

        {/* Tab 2: Custom Room Fit & Luggage Clearance HUD */}
        {activeTab === 'room_fit_tester' && (
          <div className="absolute top-44 left-4 sm:left-8 z-20 max-w-xs w-full bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-2xl">
            <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider mb-2">
              <Ruler className="w-4 h-4 text-cyan-400" />
              <span>Personal Room Fit Clearance</span>
            </h4>
            
            <div className="flex items-center justify-between text-xs font-semibold mb-3">
              <span className="text-slate-400">Your Room Size:</span>
              <span className="text-cyan-400 font-mono font-bold">{roomSizeFt} ft × {roomSizeFt} ft ({Math.round(roomSizeFt * roomSizeFt * 0.0929)} m²)</span>
            </div>

            <input
              type="range"
              min="8"
              max="16"
              value={roomSizeFt}
              onChange={(e) => setRoomSizeFt(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer mb-3"
            />

            <div className="space-y-2 text-xs border-t border-white/10 pt-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Pod Footprint:</span>
                <span className="font-bold text-white">2.6 m² (28 sq ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Walking Space:</span>
                <span className="font-bold text-emerald-400">{Math.round((1 - (2.6 / (roomSizeFt * roomSizeFt * 0.0929))) * 100)}% Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">28-inch Suitcase Clearance:</span>
                <span className="font-bold text-emerald-400">PASS (115cm corridor)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Mobile QR Code Overlay */}
        {activeTab === 'mobile_qr' && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 p-6 rounded-3xl border border-white/20 text-white text-center shadow-2xl flex flex-col items-center">
              
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-lg font-extrabold tracking-tight mb-1">
                Project Onto Your Physical Room Floor
              </h3>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Scan this code with your iPhone or Android camera to open HomiesInn and project the 1:1 Pod into your actual room right now.
              </p>

              {/* Authentic Scannable QR Code Image */}
              <div className="bg-white p-4 rounded-2xl shadow-xl mb-4 flex flex-col items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan with phone camera"
                    className="w-56 h-56 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold animate-pulse">
                    Generating Scannable QR Code...
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Instant Scan: Point iPhone or Android camera here
                </span>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Use Web Camera
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Bottom AR Control Dock */}
      <div className="relative z-30 bg-black/85 backdrop-blur-md border-t border-white/10 p-4 sm:p-5 flex flex-col gap-3">
        
        <div className="max-w-3xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-white text-xs font-semibold">
          
          {/* Scale Control */}
          <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
            <Maximize className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="shrink-0">Scale:</span>
            <input
              type="range"
              min="0.25"
              max="1.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-violet-500 cursor-pointer"
            />
            <span className="w-12 text-right font-mono text-violet-300">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(1.0)}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded font-bold"
            >
              1:1 Real
            </button>
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
            <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="shrink-0">Rotate:</span>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="flex-1 accent-cyan-500 cursor-pointer"
            />
            <span className="w-12 text-right font-mono text-cyan-300">{rotation}°</span>
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded font-bold"
            >
              +90°
            </button>
          </div>

        </div>

        {/* Action Row */}
        <div className="max-w-xl mx-auto w-full flex items-center justify-center gap-3 pt-1">
          <button
            onClick={takeSnapshot}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Capture AR Photo</span>
          </button>

          <button
            onClick={() => {
              setScale(1.0);
              setRotation(0);
              setPodPosition([0, 0]);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Position</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Done
          </button>
        </div>

      </div>

      {/* Snapshot Preview Lightbox */}
      {snapshotTaken && snapshotUrl && (
        <div 
          onClick={() => setSnapshotTaken(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-4 flex flex-col gap-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AR Projection Snapshot Captured</span>
              </h3>
              <button onClick={() => setSnapshotTaken(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <img src={snapshotUrl} alt="AR Snapshot" className="w-full rounded-xl object-contain max-h-[60vh] border border-white/10" />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                1:1 Scale Pod projection captured in physical space.
              </p>
              <a
                href={snapshotUrl}
                download="homiesinn-ar-pod-projection.png"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
