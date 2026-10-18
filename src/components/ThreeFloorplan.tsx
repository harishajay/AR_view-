import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoomPod, SpatialLayer, ViewMode, LightingTime } from '../types';
import { PODS_DATA, SUITE_INFO, MAINTENANCE_TICKETS, MaintenanceTicketData } from '../data/mockData';
import { 
  Building, 
  RotateCw, 
  Ruler, 
  Compass, 
  Eye, 
  Sun, 
  Sunrise, 
  Sunset, 
  Moon, 
  Camera,
  Maximize2,
  Layers,
  Sparkles,
  Zap,
  Wrench,
  Utensils,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Flame
} from 'lucide-react';

interface ThreeFloorplanProps {
  currentLayer: SpatialLayer;
  viewMode: ViewMode;
  onSelectPod: (pod: RoomPod) => void;
  selectedPod: RoomPod;
  onEnterWalkthrough: () => void;
  onOpenAR: () => void;
  onOpenMaintenance: (ticket: MaintenanceTicketData) => void;
}

export type BuildingViewLevel = 'building_cutaway' | 'floor_4' | 'floor_3' | 'suite_529' | 'floor_1';

const _vec3 = new THREE.Vector3();

function createFloorTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 512, 512);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 0, 256, 256);
  ctx.strokeRect(0, 256, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ThreeFloorplan: React.FC<ThreeFloorplanProps> = ({
  currentLayer,
  viewMode,
  onSelectPod,
  selectedPod,
  onEnterWalkthrough,
  onOpenAR,
  onOpenMaintenance,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeLevel, setActiveLevel] = useState<BuildingViewLevel>('building_cutaway');
  const [lightingTime, setLightingTime] = useState<LightingTime>('sunset');
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(true);
  const [laserRulerActive, setLaserRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<THREE.Vector3[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  // Screen projected coordinates for 3D overlay badges & maintenance pins
  const [badgePositions, setBadgePositions] = useState<{ [id: string]: { x: number; y: number; visible: boolean } }>({});

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const interiorLightsGroupRef = useRef<THREE.Group | null>(null);
  const suiteGroupRef = useRef<THREE.Group | null>(null);
  const buildingCutawayGroupRef = useRef<THREE.Group | null>(null);
  const elevatorCabinRef = useRef<THREE.Mesh | null>(null);
  const elevatorDirectionRef = useRef<number>(1);
  const podMeshesRef = useRef<{ [id: string]: THREE.Group }>({});
  
  // Camera target coordinates for smooth damping transitions
  const targetCameraPos = useRef(new THREE.Vector3(22, 16, 24));
  const targetLookAt = useRef(new THREE.Vector3(0, 6.0, 0));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.012);

    // 2. Camera initially set to view entire 4-story building cutaway
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 160);
    camera.position.set(22, 16, 24);
    camera.lookAt(0, 6.0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.target.set(0, 6.0, 0);
    controlsRef.current = controls;

    let userInteracting = false;
    controls.addEventListener('start', () => { userInteracting = true; });
    controls.addEventListener('end', () => { userInteracting = false; });

    // 6. Balanced Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x94a3b8, 0.9);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.4);
    dirLight.position.set(18, 26, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    const d = 22;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Interior lights group
    const interiorLightsGroup = new THREE.Group();
    scene.add(interiorLightsGroup);
    interiorLightsGroupRef.current = interiorLightsGroup;

    // Add warm cozy interior spot lights across floors
    const buildingLampPositions = [
      new THREE.Vector3(-3.0, 1.8, 1.0), // Mess warm light
      new THREE.Vector3(3.0, 1.8, 1.0),  // Mess buffet light
      new THREE.Vector3(-2.8, 4.8, 0.5), // Floor 2 Bed B
      new THREE.Vector3(2.5, 4.8, 0.5),  // Floor 2 Suite
      new THREE.Vector3(-2.5, 8.0, 1.0), // Floor 3 Studio
      new THREE.Vector3(2.5, 8.0, 1.0),  // Floor 3 Studio
      new THREE.Vector3(0, 11.2, 0),     // Floor 4 Penthouse
      new THREE.Vector3(3.0, 14.2, 0),   // Rooftop Pergola
    ];
    buildingLampPositions.forEach((pos) => {
      const pl = new THREE.PointLight(0xffdfba, 0.9, 6.0, 1.8);
      pl.position.copy(pos);
      interiorLightsGroup.add(pl);
    });

    // ==========================================
    // GROUP A: DETAILED SUITE 529 (FLOOR 2 CLOSEUP)
    // ==========================================
    const suiteGroup = new THREE.Group();
    suiteGroupRef.current = suiteGroup;
    suiteGroup.visible = false;
    scene.add(suiteGroup);

    const floorTexture = createFloorTileTexture();
    const floorGeo = new THREE.BoxGeometry(9.2, 0.3, 9.2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.65,
      metalness: 0.08,
      color: 0xffffff,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.15;
    floorMesh.receiveShadow = true;
    suiteGroup.add(floorMesh);

    // Foundation Plinth
    const plinthMesh = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.2, 9.6), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
    plinthMesh.position.y = -0.35;
    suiteGroup.add(plinthMesh);

    // Translucent Cutaway Glass Walls for Suite 529
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transmission: 0.65,
      opacity: 0.45,
      transparent: true,
      roughness: 0.15,
      metalness: 0.1,
      ior: 1.45,
      depthWrite: false,
    });
    const wallCapMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });

    const createWallSegment = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const wallGroup = new THREE.Group();
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
      wallMesh.position.set(0, h / 2, 0);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallGroup.add(wallMesh);

      const capMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), wallCapMat);
      capMesh.position.set(0, h + 0.03, 0);
      wallGroup.add(capMesh);

      wallGroup.position.set(x, y, z);
      return wallGroup;
    };

    const wallH = 1.8;
    suiteGroup.add(createWallSegment(9.2, wallH, 0.18, 0, 0, -4.55));
    suiteGroup.add(createWallSegment(0.18, wallH, 9.2, -4.55, 0, 0));
    suiteGroup.add(createWallSegment(0.18, wallH, 9.2, 4.55, 0, 0));
    suiteGroup.add(createWallSegment(3.2, wallH, 0.18, -3.0, 0, 4.55));
    suiteGroup.add(createWallSegment(3.2, wallH, 0.18, 3.0, 0, 4.55));
    suiteGroup.add(createWallSegment(2.6, wallH * 0.9, 0.14, 3.25, 0, 2.0));
    suiteGroup.add(createWallSegment(0.14, wallH * 0.9, 2.6, 2.0, 0, 3.25));

    // Suite Pods
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc89666, roughness: 0.5 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
    const navyLinenMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 });
    const crispLinenMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
    const tealWardrobeMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.35, metalness: 0.1 });
    const oakDeskMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });

    const createPodGroup = (pod: RoomPod, isUserBed: boolean) => {
      const podGroup = new THREE.Group();
      podGroup.userData = { podId: pod.id, pod };

      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 2.2), isUserBed ? darkWoodMat : woodMat);
      baseMesh.position.set(0, 0.175, 0);
      baseMesh.castShadow = true;
      podGroup.add(baseMesh);

      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.25, 2.12), isUserBed ? navyLinenMat : crispLinenMat);
      matMesh.position.set(0, 0.45, 0);
      podGroup.add(matMesh);

      const pillowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.4), crispLinenMat);
      pillowMesh.position.set(0, 0.62, -0.75);
      podGroup.add(pillowMesh);

      const headboardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.2, 0.1), woodMat);
      headboardMesh.position.set(0, 0.6, -1.05);
      podGroup.add(headboardMesh);

      if (isUserBed) {
        const ringGeo = new THREE.RingGeometry(1.2, 1.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(0, 0.015, 0);
        podGroup.add(ringMesh);
      }

      podGroup.position.set(...pod.position);
      return podGroup;
    };

    PODS_DATA.forEach((pod) => {
      const isUser = pod.id === 'pod-b';
      const podMesh = createPodGroup(pod, isUser);
      suiteGroup.add(podMesh);
      podMeshesRef.current[pod.id] = podMesh;
    });

    // ==========================================
    // GROUP B: REALISTIC 4-STORY ARCHITECTURAL CUTAWAY
    // (Visible by default, revealing all interior rooms simultaneously!)
    // ==========================================
    const buildingGroup = new THREE.Group();
    buildingCutawayGroupRef.current = buildingGroup;
    scene.add(buildingGroup);

    // Architectural materials
    const concreteExteriorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const concreteWallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const messTileMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const stainlessSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 });
    const warmTeakDeckMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
    const clearGlassBalustradeMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transmission: 0.8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });

    // Ground Sidewalk & Surrounding Landscape
    const landscapeBase = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 22), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 }));
    landscapeBase.position.y = -0.2;
    landscapeBase.receiveShadow = true;
    buildingGroup.add(landscapeBase);

    // Potted Palm Trees on Ground Entrance
    const makePottedPlant = (x: number, y: number, z: number) => {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      pot.position.y = 0.2;
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), foliageMat);
      foliage.position.y = 0.65;
      g.add(pot, foliage);
      g.position.set(x, y, z);
      return g;
    };
    buildingGroup.add(makePottedPlant(-8, 0, 8));
    buildingGroup.add(makePottedPlant(8, 0, 8));
    buildingGroup.add(makePottedPlant(-8, 0, -8));
    buildingGroup.add(makePottedPlant(8, 0, -8));

    const floorHeight = 3.2;
    const bldgWidth = 17;
    const bldgDepth = 13;

    // BUILD ALL 4 FLOORS WITH FULL INTERIOR ROOMS & CUTAWAY FRONT
    for (let f = 0; f < 4; f++) {
      const floorY = f * floorHeight;
      const floorNum = f + 1;

      // 1. Structural Floor Slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, 0.25, bldgDepth), slabMat);
      slab.position.set(0, floorY, 0);
      slab.receiveShadow = true;
      buildingGroup.add(slab);

      // 2. Exterior Solid North Wall (Back)
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, floorHeight, 0.3), concreteExteriorMat);
      backWall.position.set(0, floorY + floorHeight / 2, -bldgDepth / 2);
      buildingGroup.add(backWall);

      // 3. Exterior West Wall (Left side) with window cutouts
      const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, bldgDepth), concreteExteriorMat);
      westWall.position.set(-bldgWidth / 2, floorY + floorHeight / 2, 0);
      buildingGroup.add(westWall);

      // 4. Exterior East Wall (Right side)
      const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, bldgDepth), concreteExteriorMat);
      eastWall.position.set(bldgWidth / 2, floorY + floorHeight / 2, 0);
      buildingGroup.add(eastWall);

      // 5. Architectural Glass Balustrade on Front Cutaway (Reveals interior clearly)
      const balustrade = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, 0.9, 0.08), clearGlassBalustradeMat);
      balustrade.position.set(0, floorY + 0.45, bldgDepth / 2);
      buildingGroup.add(balustrade);

      // 6. Central Glass Elevator Shaft running vertically
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.6, floorHeight, 2.6), clearGlassBalustradeMat);
      shaft.position.set(0, floorY + floorHeight / 2, -2.5);
      buildingGroup.add(shaft);

      // ==========================================
      // FLOOR 1: GROUND HOSTEL DINING MESS & RECEPTION
      // ==========================================
      if (floorNum === 1) {
        // Floor tile finish
        const messFloor = new THREE.Mesh(new THREE.PlaneGeometry(bldgWidth - 0.6, bldgDepth - 0.6), messTileMat);
        messFloor.rotation.x = -Math.PI / 2;
        messFloor.position.set(0, floorY + 0.13, 0);
        buildingGroup.add(messFloor);

        // A. Long Communal Mess Tables (3 rows)
        for (let row = -1; row <= 1; row++) {
          const messTable = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 1.1), darkWoodMat);
          messTable.position.set(-3.5, floorY + 0.75, row * 2.2 + 0.5);
          const tLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.9), metalMat);
          tLeg1.position.set(-5.6, floorY + 0.375, row * 2.2 + 0.5);
          const tLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.9), metalMat);
          tLeg2.position.set(-1.4, floorY + 0.375, row * 2.2 + 0.5);

          // Dining Benches on both sides
          const bench1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 0.4), darkWoodMat);
          bench1.position.set(-3.5, floorY + 0.45, row * 2.2 + 1.25);
          const bench2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 0.4), darkWoodMat);
          bench2.position.set(-3.5, floorY + 0.45, row * 2.2 - 0.25);

          buildingGroup.add(messTable, tLeg1, tLeg2, bench1, bench2);
        }

        // B. Stainless Steel Bain-Marie Buffet Food Serving Counter
        const buffetCounter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 1.4), stainlessSteelMat);
        buffetCounter.position.set(4.0, floorY + 0.475, 1.5);

        // Heated Food Compartments (golden curry/rice trays)
        const foodTrayColors = [0xd97706, 0xb45309, 0xf59e0b, 0xe11d48];
        foodTrayColors.forEach((color, i) => {
          const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.8), new THREE.MeshStandardMaterial({ color, roughness: 0.3 }));
          tray.position.set(2.0 + i * 1.2, floorY + 0.98, 1.5);
          buildingGroup.add(tray);
        });

        // Sneeze Guard Glass on Buffet
        const sneezeGuard = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.5, 0.05), clearGlassBalustradeMat);
        sneezeGuard.position.set(4.0, floorY + 1.25, 0.85);
        buildingGroup.add(buffetCounter, sneezeGuard);

        // C. Commercial RO Drinking Water Cooler (with Maintenance Tag!)
        const waterDispenser = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.6), stainlessSteelMat);
        waterDispenser.position.set(3.5, floorY + 0.75, -1.0);
        const waterLed = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        waterLed.position.set(3.5, floorY + 1.2, -0.68);
        buildingGroup.add(waterDispenser, waterLed);

        // D. Reception Foyer Desk
        const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.9), darkWoodMat);
        receptionDesk.position.set(4.0, floorY + 0.5, 5.0);
        buildingGroup.add(receptionDesk);
      }

      // ==========================================
      // FLOOR 2: CO-LIVING RESIDENT SUITES (SUITE 529 + 530)
      // ==========================================
      else if (floorNum === 2) {
        // Suite 529 (Left Wing - Allocated to You)
        // Glowing Floor Frame highlighting Floor 2 Suite 529
        const suiteHighlight = new THREE.Mesh(
          new THREE.BoxGeometry(8.2, 0.02, 6.5),
          new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25 })
        );
        suiteHighlight.position.set(-4.0, floorY + 0.14, 0.5);
        buildingGroup.add(suiteHighlight);

        // Bed B (Your Pod)
        const bedB = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.2), darkWoodMat);
        bedB.position.set(-5.5, floorY + 0.225, 0.5);
        const bedBMattress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.1), navyLinenMat);
        bedBMattress.position.set(-5.5, floorY + 0.55, 0.5);
        const bedBPillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.4), crispLinenMat);
        bedBPillow.position.set(-5.5, floorY + 0.7, -0.2);

        // Halo Ring around Bed B
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 24), new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(-5.5, floorY + 0.15, 0.5);

        // Study Desk & 27" Monitor
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.7), oakDeskMat);
        desk.position.set(-2.5, floorY + 0.75, 0.5);
        const mon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.03), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        mon.position.set(-2.5, floorY + 1.05, 0.5);

        // Praveen's Bed (Bed A)
        const bedA = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.2), woodMat);
        bedA.position.set(-5.5, floorY + 0.225, -3.2);

        // En-suite Partition
        const ensuiteWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.1), glassMat);
        ensuiteWall.position.set(-2.0, floorY + 1.1, 3.2);

        buildingGroup.add(bedB, bedBMattress, bedBPillow, ring, desk, mon, bedA, ensuiteWall);

        // Suite 530 (Right Wing)
        const bedC = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.2), woodMat);
        bedC.position.set(4.5, floorY + 0.225, 0.5);
        const bedD = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.2), woodMat);
        bedD.position.set(4.5, floorY + 0.225, -3.2);
        buildingGroup.add(bedC, bedD);
      }

      // ==========================================
      // FLOOR 3: EXECUTIVE SOLO STUDIOS (ROOMS 301-304)
      // ==========================================
      else if (floorNum === 3) {
        // 4 Private Studios with individual Queen pods & Armchairs
        const studioPositions = [-5.5, -2.0, 2.0, 5.5];
        studioPositions.forEach((sx, idx) => {
          // Solo Studio Bed
          const sBed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.2), darkWoodMat);
          sBed.position.set(sx, floorY + 0.225, -1.0);
          const sMattress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 2.1), new THREE.MeshStandardMaterial({ color: 0x334155 }));
          sMattress.position.set(sx, floorY + 0.55, -1.0);

          // Solo Studio Standing Desk
          const sDesk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), oakDeskMat);
          sDesk.position.set(sx, floorY + 0.8, 2.0);

          // Bouclé Lounge Armchair
          const sChair = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }));
          sChair.position.set(sx, floorY + 0.3, 3.8);

          // Privacy Partition Wall between studios
          if (idx < 3) {
            const pWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 8.0), concreteWallMat);
            pWall.position.set(sx + 1.8, floorY + 1.2, 0.5);
            buildingGroup.add(pWall);
          }

          buildingGroup.add(sBed, sMattress, sDesk, sChair);
        });
      }

      // ==========================================
      // FLOOR 4: PENTHOUSE SUITES & RESIDENT RECREATION HUB
      // ==========================================
      else if (floorNum === 4) {
        // Table Tennis / Foosball Table in Recreation Zone
        const ttTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 1.6), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
        ttTable.position.set(-4.0, floorY + 0.75, 0);
        const ttNet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        ttNet.position.set(-4.0, floorY + 0.85, 0);
        const ttLegs = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.2), metalMat);
        ttLegs.position.set(-4.0, floorY + 0.375, 0);

        // Community 65" TV Wall
        const tvWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        tvWall.position.set(-4.0, floorY + 1.6, -4.5);

        // Luxury Penthouse Pod (Right Wing)
        const pBed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.3), darkWoodMat);
        pBed.position.set(4.0, floorY + 0.25, 0);
        const pMattress = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 2.2), navyLinenMat);
        pMattress.position.set(4.0, floorY + 0.6, 0);

        buildingGroup.add(ttTable, ttNet, ttLegs, tvWall, pBed, pMattress);
      }
    }

    // ==========================================
    // ROOFTOP SKYDECK & SUNSET LOUNGE (FLOOR 4+)
    // ==========================================
    const roofY = 4 * floorHeight;

    // 1. Rich Teak Timber Decking
    const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, 0.25, bldgDepth), warmTeakDeckMat);
    roofDeck.position.set(0, roofY, 0);
    roofDeck.receiveShadow = true;
    buildingGroup.add(roofDeck);

    // 2. Glass Perimeter Balustrade for Safety
    const roofBalustrade = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, 1.1, bldgDepth), clearGlassBalustradeMat);
    roofBalustrade.position.set(0, roofY + 0.55, 0);
    buildingGroup.add(roofBalustrade);

    // 3. Sunset Pergola Canopy with Hanging Warm Ambient Lights
    const pergolaRoof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.12, 5.0), darkWoodMat);
    pergolaRoof.position.set(3.5, roofY + 2.5, 0);
    const pergolaPillars = [
      [0.2, -2.3], [6.8, -2.3], [0.2, 2.3], [6.8, 2.3]
    ];
    pergolaPillars.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), metalMat);
      col.position.set(px, roofY + 1.25, pz);
      buildingGroup.add(col);
    });
    buildingGroup.add(pergolaRoof);

    // 4. Outdoor Sectional Lounge Couch
    const couchBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 1.4), new THREE.MeshStandardMaterial({ color: 0x475569 }));
    couchBase.position.set(3.5, roofY + 0.2, 0.8);
    const couchCoffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), darkWoodMat);
    couchCoffeeTable.position.set(3.5, roofY + 0.25, -0.6);
    buildingGroup.add(couchBase, couchCoffeeTable);

    // 5. Rooftop Solar Panel Array (Angled South)
    const solarArray = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 4.0), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.1 }));
    solarArray.position.set(-4.5, roofY + 0.8, -1.5);
    solarArray.rotation.x = 0.3;
    buildingGroup.add(solarArray);

    // 6. Rooftop Central Air Chiller Units
    const chiller = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.5), metalMat);
    chiller.position.set(-4.5, roofY + 0.6, 3.5);
    buildingGroup.add(chiller);

    // 7. Dynamic Elevator Cabin (Animates smoothly up and down)
    const elevatorCab = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.4, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.2, transparent: true, opacity: 0.85 })
    );
    elevatorCab.position.set(0, floorHeight * 1 + 1.2, -2.5);
    buildingGroup.add(elevatorCab);
    elevatorCabinRef.current = elevatorCab;

    // Click handler for 3D navigation and maintenance fixtures
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      if (activeLevel === 'suite_529') {
        const allPodGroups = Object.values(podMeshesRef.current);
        for (const group of allPodGroups) {
          const intersects = raycaster.intersectObjects(group.children, true);
          if (intersects.length > 0) {
            const pod = group.userData.pod as RoomPod;
            if (pod) {
              onSelectPod(pod);
              targetCameraPos.current.set(pod.position[0] + 4, 6, pod.position[2] + 5);
              targetLookAt.current.set(pod.position[0], 0.6, pod.position[2]);
              break;
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize observer
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 600;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      controls.update();

      if (!userInteracting) {
        camera.position.lerp(targetCameraPos.current, 0.05);
        controls.target.lerp(targetLookAt.current, 0.05);
      }

      if (isAutoRotating) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
      } else {
        controls.autoRotate = false;
      }

      // Smooth Elevator Travel Animation between Floor 1 and Floor 4
      if (elevatorCabinRef.current) {
        const minY = 1.4;
        const maxY = 3 * floorHeight + 1.4;
        elevatorCabinRef.current.position.y += elevatorDirectionRef.current * delta * 1.5;
        if (elevatorCabinRef.current.position.y > maxY) {
          elevatorDirectionRef.current = -1;
        } else if (elevatorCabinRef.current.position.y < minY) {
          elevatorDirectionRef.current = 1;
        }
      }

      // 3D coordinates projected to 2D HTML badges
      const newBadges: { [id: string]: { x: number; y: number; visible: boolean } } = {};

      // Building Floor Badges
      if (buildingGroup.visible) {
        const buildingFloors = [
          { id: 'bld-rooftop', pos: new THREE.Vector3(0, roofY + 1.2, 3) },
          { id: 'bld-f4', pos: new THREE.Vector3(0, 3 * floorHeight + 1.6, 4) },
          { id: 'bld-f3', pos: new THREE.Vector3(0, 2 * floorHeight + 1.6, 4) },
          { id: 'bld-f2', pos: new THREE.Vector3(-4.0, 1 * floorHeight + 1.6, 4) },
          { id: 'bld-f1', pos: new THREE.Vector3(-3.5, 0.5 * floorHeight + 1.2, 4) },
        ];
        buildingFloors.forEach(({ id, pos }) => {
          _vec3.copy(pos);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[id] = { x, y, visible: isVisible };
        });

        // Maintenance Pins in Building Cutaway mode
        MAINTENANCE_TICKETS.forEach((ticket) => {
          // Map ticket coordinates to building elevation
          let pinPos = new THREE.Vector3(...ticket.coordinates);
          if (ticket.id === 'ticket-mess-cooler') {
            pinPos.set(3.5, 1.2, -1.0);
          } else if (ticket.id === 'ticket-rooftop-light') {
            pinPos.set(3.5, roofY + 2.6, 0);
          } else {
            pinPos.set(ticket.coordinates[0], ticket.coordinates[1] + floorHeight, ticket.coordinates[2]);
          }

          _vec3.copy(pinPos);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[ticket.id] = { x, y, visible: isVisible };
        });
      }

      // Suite Badges (when zoomed into Suite 529)
      if (suiteGroup.visible) {
        const badgeTargets = [
          { id: 'pod-b', pos: new THREE.Vector3(-2.4, 1.3, 0.4) },
          { id: 'pod-praveen', pos: new THREE.Vector3(-2.4, 1.3, -2.2) },
          { id: 'pod-rohan', pos: new THREE.Vector3(1.8, 1.3, -2.2) },
          { id: 'pod-d-vacant', pos: new THREE.Vector3(0.2, 1.3, 2.3) },
        ];
        badgeTargets.forEach(({ id, pos }) => {
          _vec3.copy(pos);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[id] = { x, y, visible: isVisible };
        });

        // Maintenance pins for Suite
        MAINTENANCE_TICKETS.filter((t) => t.floor === 'Floor 2').forEach((ticket) => {
          _vec3.set(...ticket.coordinates);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[ticket.id] = { x, y, visible: isVisible };
        });
      }

      setBadgePositions(newBadges);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update camera targets when switching floor levels
  useEffect(() => {
    if (!suiteGroupRef.current || !buildingCutawayGroupRef.current) return;

    if (activeLevel === 'building_cutaway') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(22, 16, 24);
      targetLookAt.current.set(0, 6.0, 0);
    } else if (activeLevel === 'suite_529') {
      suiteGroupRef.current.visible = true;
      buildingCutawayGroupRef.current.visible = false;
      targetCameraPos.current.set(9, 10, 11);
      targetLookAt.current.set(0, 0.5, 0);
    } else if (activeLevel === 'floor_4') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(14, 16, 16);
      targetLookAt.current.set(0, 13.0, 0);
    } else if (activeLevel === 'floor_3') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(14, 12, 16);
      targetLookAt.current.set(0, 9.6, 0);
    } else if (activeLevel === 'floor_1') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(14, 6, 16);
      targetLookAt.current.set(0, 3.2, 0);
    }
  }, [activeLevel]);

  // Update lighting conditions
  useEffect(() => {
    if (!dirLightRef.current || !hemiLightRef.current || !sceneRef.current) return;
    const dir = dirLightRef.current;
    const hemi = hemiLightRef.current;
    const interior = interiorLightsGroupRef.current;

    switch (lightingTime) {
      case 'sunrise':
        dir.position.set(20, 12, 16);
        dir.color.setHex(0xffaa5e);
        dir.intensity = 2.4;
        hemi.color.setHex(0xffe8d6);
        hemi.intensity = 0.9;
        sceneRef.current.background = new THREE.Color(0xfbf6f0);
        if (interior) interior.visible = false;
        break;
      case 'noon':
        dir.position.set(0, 30, 4);
        dir.color.setHex(0xffffff);
        dir.intensity = 2.8;
        hemi.color.setHex(0xf1f5f9);
        hemi.intensity = 1.0;
        sceneRef.current.background = new THREE.Color(0xf8fafc);
        if (interior) interior.visible = false;
        break;
      case 'sunset':
        dir.position.set(16, 10, 10);
        dir.color.setHex(0xfb923c);
        dir.intensity = 2.6;
        hemi.color.setHex(0xfde68a);
        hemi.intensity = 0.85;
        sceneRef.current.background = new THREE.Color(0xfff7ed);
        if (interior) interior.visible = true;
        break;
      case 'night':
        dir.position.set(-10, 18, -10);
        dir.color.setHex(0x38bdf8);
        dir.intensity = 0.55;
        hemi.color.setHex(0x1e293b);
        hemi.intensity = 0.35;
        sceneRef.current.background = new THREE.Color(0x0f172a);
        if (interior) interior.visible = true;
        break;
    }
  }, [lightingTime]);

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-100 overflow-hidden select-none">
      
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-4 right-4 sm:left-6 sm:right-6 pointer-events-none flex flex-col gap-2 z-20">
        
        <div className="flex items-center gap-2 overflow-x-auto pointer-events-auto pb-1">
          
          {/* Entire 4-Story Building Cutaway Button */}
          <button
            onClick={() => setActiveLevel('building_cutaway')}
            className={`px-3 py-1.5 rounded-xl border shadow-xs flex items-center gap-1.5 text-xs font-extrabold transition-all ${
              activeLevel === 'building_cutaway'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-500" />
            <span>4-Story Building Cutaway</span>
          </button>

          {/* Floor 2 • Suite 529 Button */}
          <button
            onClick={() => setActiveLevel('suite_529')}
            className={`px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs font-extrabold transition-all ${
              activeLevel === 'suite_529'
                ? 'bg-indigo-600 text-white shadow-indigo-200 scale-105'
                : 'bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>🛏️ Floor 2 • Suite 529</span>
          </button>

          {/* Tap-to-Fix Geo-Spatial Maintenance Mode Toggle */}
          <button
            onClick={() => setMaintenanceModeActive(!maintenanceModeActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-xs flex items-center gap-1.5 transition-all ${
              maintenanceModeActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-200'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Tap-to-Fix Maintenance {maintenanceModeActive ? '(ON)' : '(OFF)'}</span>
          </button>

          <button
            onClick={onEnterWalkthrough}
            className="bg-white/95 hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Watch 360° View</span>
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1.5 rounded-xl border shadow-xs transition-colors ${
              isAutoRotating ? 'bg-indigo-600 text-white' : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="360 Auto-Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAR}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-3.5 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 ml-auto"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Project in AR</span>
          </button>
        </div>

        {/* Dynamic Architectural Banner */}
        <div className="bg-slate-900/95 backdrop-blur-xs text-white text-xs font-medium px-4 py-2 rounded-xl shadow-md border border-slate-800 flex items-center gap-2 max-w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {activeLevel === 'building_cutaway'
              ? '4-Story Building Cutaway • Ground Dining Mess, Floor 2-3 Resident Suites & Rooftop Skydeck'
              : 'Floor 2 • Private Residency Suite 529 (Allocated Bed B • Sunrise Balcony • En-Suite)'}
          </span>
        </div>

      </div>

      {/* Vertical Floor Level Selector */}
      <div className="absolute top-28 left-4 sm:left-6 z-20 pointer-events-auto flex flex-col gap-1.5">
        <div className="bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200 shadow-xl flex flex-col gap-1 text-[11px] font-bold text-slate-700">
          
          <button
            onClick={() => setActiveLevel('building_cutaway')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'building_cutaway' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>All 4 Floors Cutaway</span>
            <Building className="w-3 h-3 text-indigo-400" />
          </button>

          <button
            onClick={() => setActiveLevel('floor_4')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_4' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>Rooftop Skydeck &amp; Penthouse</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </button>

          <button
            onClick={() => setActiveLevel('floor_3')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_3' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>L3: Executive Studios (301-304)</span>
          </button>

          <button
            onClick={() => setActiveLevel('suite_529')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'suite_529' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>L2: Suite 529 (Your Pod B)</span>
            </div>
            <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-extrabold">Active</span>
          </button>

          <button
            onClick={() => setActiveLevel('floor_1')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_1' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1">
              <Utensils className="w-3 h-3 text-amber-500" />
              <span>L1: Dining Mess &amp; Lobby</span>
            </div>
          </button>

        </div>
      </div>

      {/* 3D Floating Floor Tags (Building Cutaway Mode) */}
      {activeLevel === 'building_cutaway' && (
        <>
          {/* Rooftop Tag */}
          {badgePositions['bld-rooftop']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-rooftop'].x}px`, top: `${badgePositions['bld-rooftop'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('floor_4')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-slate-900/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-amber-400/50 shadow-xl hover:bg-indigo-600 flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Rooftop Skydeck • Timber Pergola &amp; Solar Array</span>
            </div>
          )}

          {/* Floor 2 Suite 529 Tag */}
          {badgePositions['bld-f2']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-f2'].x}px`, top: `${badgePositions['bld-f2'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('suite_529')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-indigo-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full border-2 border-white shadow-2xl hover:scale-105 transition-transform flex items-center gap-1.5 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Floor 2 • Suite 529 (Your Allocated Bed B) → Enter Room</span>
            </div>
          )}

          {/* Ground Floor Mess Tag */}
          {badgePositions['bld-f1']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-f1'].x}px`, top: `${badgePositions['bld-f1'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('floor_1')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-xl hover:bg-indigo-600 flex items-center gap-1.5"
            >
              <Utensils className="w-3 h-3 text-amber-400" />
              <span>Ground Floor • Hostel Dining Mess &amp; Buffet Station</span>
            </div>
          )}
        </>
      )}

      {/* Floating 3D Badges (Zoomed Suite 529 Mode) */}
      {activeLevel === 'suite_529' && (
        <>
          {badgePositions['pod-b']?.visible && (
            <div
              style={{ left: `${badgePositions['pod-b'].x}px`, top: `${badgePositions['pod-b'].y}px`, transform: 'translate(-50%, -100%)' }}
              className="absolute z-20 pointer-events-auto cursor-pointer group flex flex-col items-center"
            >
              <div className="bg-indigo-600 text-white text-[11px] font-black tracking-wide px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>YOUR BED (POD B)</span>
              </div>
              <div className="bg-white/95 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 border border-indigo-200 shadow-sm whitespace-nowrap">
                65W TYPE-C • 230V Active
              </div>
            </div>
          )}
        </>
      )}

      {/* Interactive 3D Tap-to-Fix Geo-Spatial Maintenance Pins */}
      {maintenanceModeActive && (
        <>
          {MAINTENANCE_TICKETS.map((ticket) => {
            const pos = badgePositions[ticket.id];
            if (!pos || !pos.visible) return null;

            return (
              <div
                key={ticket.id}
                style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -100%)' }}
                onClick={() => onOpenMaintenance(ticket)}
                className="absolute z-30 pointer-events-auto cursor-pointer group flex flex-col items-center animate-in zoom-in-75 duration-200"
              >
                <div className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5 border-2 border-white group-hover:scale-110 transition-transform">
                  <Wrench className="w-3 h-3 text-amber-300 animate-spin [animation-duration:10s]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{ticket.fixtureName.split(' ')[0]} Alert</span>
                </div>
                <div className="bg-slate-900/90 text-white text-[9px] font-mono px-2 py-0.5 rounded mt-0.5 border border-slate-700 shadow-md whitespace-nowrap">
                  Tap to Fix • {ticket.initialEtaMinutes}m ETA
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Bottom Floating Lighting Simulator Bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-700">
          
          <div className="flex items-center gap-1.5 text-slate-500 pr-1 border-r border-slate-200">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] tracking-wider uppercase font-extrabold">LIGHTING:</span>
          </div>

          <button
            onClick={() => setLightingTime('sunrise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'sunrise' ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sunrise className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-xs">Sunrise 7 AM</span>
          </button>

          <button
            onClick={() => setLightingTime('noon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'noon' ? 'bg-sky-100 text-sky-900 border border-sky-300 shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold text-xs">Noon 12 PM</span>
          </button>

          <button
            onClick={() => setLightingTime('sunset')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'sunset' ? 'bg-indigo-600 text-white border border-indigo-700 shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sunset className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs">Sunset 6 PM</span>
          </button>

          <button
            onClick={() => setLightingTime('night')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'night' ? 'bg-slate-900 text-white border border-slate-800 shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-xs">Night 10:30 PM</span>
          </button>

        </div>
      </div>

    </div>
  );
};
