import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoomPod, SpatialLayer, ViewMode, LightingTime } from '../types';
import { PODS_DATA, SUITE_INFO } from '../data/mockData';
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
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';

interface ThreeFloorplanProps {
  currentLayer: SpatialLayer;
  viewMode: ViewMode;
  onSelectPod: (pod: RoomPod) => void;
  selectedPod: RoomPod;
  onEnterWalkthrough: () => void;
  onOpenAR: () => void;
}

export type BuildingViewLevel = 'building_cutaway' | 'floor_4' | 'floor_3' | 'suite_529' | 'floor_1';

// Reusable math vectors to prevent GC allocations
const _vec3 = new THREE.Vector3();

// Helper to create a procedural subtle tile canvas texture
function createFloorTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Large floor grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 512, 512);

  // Subtle interior tile sub-divisions
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
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeLevel, setActiveLevel] = useState<BuildingViewLevel>('suite_529');
  const [lightingTime, setLightingTime] = useState<LightingTime>('sunset');
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [laserRulerActive, setLaserRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<THREE.Vector3[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  // Screen projected coordinates for 3D overlay badges
  const [badgePositions, setBadgePositions] = useState<{ [id: string]: { x: number; y: number; visible: boolean } }>({});

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const interiorLightsGroupRef = useRef<THREE.Group | null>(null);
  const suiteGroupRef = useRef<THREE.Group | null>(null);
  const buildingCutawayGroupRef = useRef<THREE.Group | null>(null);
  const electricalLayerGroupRef = useRef<THREE.Group | null>(null);
  const airflowLayerGroupRef = useRef<THREE.Group | null>(null);
  const podMeshesRef = useRef<{ [id: string]: THREE.Group }>({});
  
  // Camera target coordinates for smooth damping transitions
  const targetCameraPos = useRef(new THREE.Vector3(9, 10, 11));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.5, 0));

  // Initialize Three.js scene once with guaranteed dimensions and ResizeObserver
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    
    // Fallback safe initial dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    camera.position.set(9, 10, 11);
    camera.lookAt(0, 0.5, 0);
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
    controls.maxDistance = 45;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    let userInteracting = false;
    controls.addEventListener('start', () => { userInteracting = true; });
    controls.addEventListener('end', () => { userInteracting = false; });

    // 6. Balanced 3-Point Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x94a3b8, 0.85);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    dirLight.position.set(16, 20, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    const d = 16;
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

    // Cozy ambient point lights
    const lampPositions = [
      new THREE.Vector3(-2.8, 1.3, 0.5),
      new THREE.Vector3(-2.8, 1.3, -2.1),
      new THREE.Vector3(2.2, 1.3, -2.1),
      new THREE.Vector3(0.3, 1.3, 2.2),
      new THREE.Vector3(0, 2.2, 0),
    ];
    lampPositions.forEach((pos) => {
      const pl = new THREE.PointLight(0xffdfba, 0.85, 4.5, 1.8);
      pl.position.copy(pos);
      interiorLightsGroup.add(pl);
    });

    // ==========================================
    // GROUP A: DETAILED SUITE 529 (FLOOR 2)
    // ==========================================
    const suiteGroup = new THREE.Group();
    suiteGroupRef.current = suiteGroup;
    scene.add(suiteGroup);

    // Suite Floor Slab
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
    const plinthGeo = new THREE.BoxGeometry(9.6, 0.2, 9.6);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = -0.35;
    suiteGroup.add(plinthMesh);

    // Translucent Cutaway Glass Walls (matching screenshot)
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
    suiteGroup.add(createWallSegment(9.2, wallH, 0.18, 0, 0, -4.55)); // North
    suiteGroup.add(createWallSegment(0.18, wallH, 9.2, -4.55, 0, 0)); // West
    suiteGroup.add(createWallSegment(0.18, wallH, 9.2, 4.55, 0, 0));  // East
    suiteGroup.add(createWallSegment(3.2, wallH, 0.18, -3.0, 0, 4.55)); // South Left
    suiteGroup.add(createWallSegment(3.2, wallH, 0.18, 3.0, 0, 4.55));  // South Right

    // Bathroom En-suite partition
    suiteGroup.add(createWallSegment(2.6, wallH * 0.9, 0.14, 3.25, 0, 2.0));
    suiteGroup.add(createWallSegment(0.14, wallH * 0.9, 2.6, 2.0, 0, 3.25));

    // Balcony Railing
    const balconyRailGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.2);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const railMesh = new THREE.Mesh(balconyRailGeo, metalMat);
    railMesh.rotation.z = Math.PI / 2;
    railMesh.position.set(-2.8, 1.1, 4.5);
    suiteGroup.add(railMesh);

    // Pods & Furnishings
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc89666, roughness: 0.5 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
    const navyLinenMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 });
    const crispLinenMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
    const tealWardrobeMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.35, metalness: 0.1 });
    const oakDeskMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const monitorScreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const createPodGroup = (pod: RoomPod, isUserBed: boolean) => {
      const podGroup = new THREE.Group();
      podGroup.userData = { podId: pod.id, pod };

      // Base
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 2.2), isUserBed ? darkWoodMat : woodMat);
      baseMesh.position.set(0, 0.175, 0);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      podGroup.add(baseMesh);

      // Mattress
      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.25, 2.12), isUserBed ? navyLinenMat : crispLinenMat);
      matMesh.position.set(0, 0.45, 0);
      matMesh.castShadow = true;
      podGroup.add(matMesh);

      // Duvet
      const duvetMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 1.3), isUserBed ? navyLinenMat : new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
      duvetMesh.position.set(0, 0.59, 0.4);
      podGroup.add(duvetMesh);

      // Pillow
      const pillowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.4), crispLinenMat);
      pillowMesh.position.set(0, 0.62, -0.75);
      pillowMesh.rotation.x = -0.15;
      podGroup.add(pillowMesh);

      // Headboard & Fin
      const headboardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.2, 0.1), woodMat);
      headboardMesh.position.set(0, 0.6, -1.05);
      headboardMesh.castShadow = true;
      podGroup.add(headboardMesh);

      const sideFinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.4), woodMat);
      sideFinMesh.position.set(0.65, 0.6, -0.4);
      podGroup.add(sideFinMesh);

      // Bedside Shelf & 65W Charger
      const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.35), woodMat);
      shelfMesh.position.set(0.85, 0.45, -0.6);
      const chargerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: isUserBed ? 0x06b6d4 : 0x10b981 }));
      chargerMesh.position.set(0.85, 0.51, -0.6);
      podGroup.add(shelfMesh, chargerMesh);

      // Glowing Ground Ring for User's Bed B
      if (isUserBed) {
        const ringGeo = new THREE.RingGeometry(1.2, 1.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(0, 0.015, 0);
        podGroup.add(ringMesh);

        const outerRingGeo = new THREE.RingGeometry(1.5, 1.55, 32);
        const outerRingMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
        const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
        outerRingMesh.rotation.x = -Math.PI / 2;
        outerRingMesh.position.set(0, 0.012, 0);
        podGroup.add(outerRingMesh);
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

    // Desks, Monitors, and Task Chairs
    const createDeskWithMonitor = (x: number, y: number, z: number, rotY: number) => {
      const group = new THREE.Group();
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), oakDeskMat);
      topMesh.position.y = 0.75;
      topMesh.castShadow = true;
      group.add(topMesh);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.65), metalMat);
      legL.position.set(-0.62, 0.375, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.65), metalMat);
      legR.position.set(0.62, 0.375, 0);
      group.add(legL, legR);

      const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.03), monitorScreenMat);
      screenMesh.position.set(0, 1.05, -0.15);
      const standMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), metalMat);
      standMesh.position.set(0, 0.88, -0.15);
      group.add(screenMesh, standMesh);

      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), metalMat);
      seatMesh.position.set(0, 0.48, 0.45);
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.06), metalMat);
      backMesh.position.set(0, 0.75, 0.68);
      group.add(seatMesh, backMesh);

      group.position.set(x, y, z);
      group.rotation.y = rotY;
      return group;
    };

    suiteGroup.add(createDeskWithMonitor(-1.4, 0, -2.4, 0));
    suiteGroup.add(createDeskWithMonitor(0.8, 0, -2.4, 0));
    suiteGroup.add(createDeskWithMonitor(-0.5, 0, 1.5, Math.PI / 2));

    // Tall Green Wardrobes
    const createWardrobe = (x: number, z: number, rotY = 0) => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.65), tealWardrobeMat);
      wMesh.position.set(x, 1.05, z);
      wMesh.rotation.y = rotY;
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      return wMesh;
    };
    suiteGroup.add(createWardrobe(0.2, -4.0));
    suiteGroup.add(createWardrobe(3.8, 0));
    suiteGroup.add(createWardrobe(-3.8, 2.8, Math.PI / 2));

    // Bouclé Lounge Armchair & Coffee Table
    const boucléMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.95 });
    const loungeChairGroup = new THREE.Group();
    const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24), boucléMat);
    chairBase.position.y = 0.25;
    const chairBack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI), boucléMat);
    chairBack.rotation.x = -Math.PI / 2;
    chairBack.position.set(0, 0.55, 0.1);
    loungeChairGroup.add(chairBase, chairBack);
    loungeChairGroup.position.set(2.4, 0, 0.2);
    loungeChairGroup.rotation.y = -Math.PI / 4;
    suiteGroup.add(loungeChairGroup);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), oakDeskMat);
    tableTop.position.set(1.7, 0.32, 0.6);
    suiteGroup.add(tableTop);

    // Keypad Entry
    const keypadGroup = new THREE.Group();
    const keypadPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), metalMat);
    keypadPillar.position.set(0, 0.65, 0);
    const keypadFace = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.05), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    keypadFace.position.set(0, 1.15, 0.05);
    keypadGroup.add(keypadPillar, keypadFace);
    keypadGroup.position.set(-1.0, 0, 4.45);
    suiteGroup.add(keypadGroup);

    // Electrical Layer
    const electricalGroup = new THREE.Group();
    const conduitMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const wifiMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const conduit1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 7.8), conduitMat);
    conduit1.position.set(-2.4, 0.02, 0);
    const conduit2 = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.02, 0.04), conduitMat);
    conduit2.position.set(0, 0.02, -2.2);
    electricalGroup.add(conduit1, conduit2);
    const wifiSphere = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), wifiMat);
    wifiSphere.position.set(0, 2.8, 0);
    electricalGroup.add(wifiSphere);
    electricalGroup.visible = false;
    suiteGroup.add(electricalGroup);
    electricalLayerGroupRef.current = electricalGroup;

    // Sunlight & Airflow Layer
    const airflowGroup = new THREE.Group();
    const streamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    for (let i = 0; i < 24; i++) {
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6), streamMat);
      stream.rotation.x = Math.PI / 2;
      stream.position.set(-2.5 + Math.random() * 3.5, 0.8 + Math.random() * 0.8, 3.5 - i * 0.28);
      airflowGroup.add(stream);
    }
    airflowGroup.visible = false;
    suiteGroup.add(airflowGroup);
    airflowLayerGroupRef.current = airflowGroup;

    // ==========================================
    // GROUP B: 4-STORY BUILDING CUTAWAY MODEL
    // (Visible when user selects 4-Story Building Cutaway)
    // ==========================================
    const buildingGroup = new THREE.Group();
    buildingCutawayGroupRef.current = buildingGroup;
    buildingGroup.visible = false;
    scene.add(buildingGroup);

    // Architectural concrete materials
    const buildingConcreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 });
    const floorSlabMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
    const exteriorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transmission: 0.7,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
    });
    const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
    const accentOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });

    // Ground sidewalk & entrance road
    const groundBase = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 }));
    groundBase.position.y = -0.2;
    groundBase.receiveShadow = true;
    buildingGroup.add(groundBase);

    // Front sidewalk planters
    const planter = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 1.2), grassMat);
    planter.position.set(0, 0.15, 8.5);
    buildingGroup.add(planter);

    // Build the 4 Stacked Floors Cutaway
    const floorHeight = 2.8;
    const floorWidth = 14;
    const floorDepth = 12;

    for (let f = 0; f < 4; f++) {
      const floorY = f * floorHeight;
      const floorLevelNum = f + 1;

      // Floor Slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(floorWidth, 0.25, floorDepth), floorSlabMat);
      slab.position.set(0, floorY, 0);
      slab.receiveShadow = true;
      slab.castShadow = true;
      buildingGroup.add(slab);

      // Back exterior solid wall (cutaway is open on front side)
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(floorWidth, floorHeight, 0.25), buildingConcreteMat);
      backWall.position.set(0, floorY + floorHeight / 2, -floorDepth / 2);
      backWall.castShadow = true;
      buildingGroup.add(backWall);

      // Left exterior wall with cutouts
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, floorHeight, floorDepth), buildingConcreteMat);
      leftWall.position.set(-floorWidth / 2, floorY + floorHeight / 2, 0);
      buildingGroup.add(leftWall);

      // Right exterior wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, floorHeight, floorDepth), buildingConcreteMat);
      rightWall.position.set(floorWidth / 2, floorY + floorHeight / 2, 0);
      buildingGroup.add(rightWall);

      // Central Glass Elevator Shaft
      const elevatorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, floorHeight, 2.4), exteriorGlassMat);
      elevatorGlass.position.set(0, floorY + floorHeight / 2, -2);
      buildingGroup.add(elevatorGlass);

      // Luminous elevator cabin
      const elevatorCab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 }));
      elevatorCab.position.set(0, 1 * floorHeight + 1.2, -2); // elevator at floor 2
      buildingGroup.add(elevatorCab);

      // Floor Specific Interior Modules:
      if (floorLevelNum === 1) {
        // Floor 1: Ground Reception Lobby & Cafe
        const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 1.2), darkWoodMat);
        receptionDesk.position.set(-3, floorY + 0.45, 1);
        const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x0f766e }));
        loungeSofa.position.set(3, floorY + 0.3, 2);
        buildingGroup.add(receptionDesk, loungeSofa);
      } else if (floorLevelNum === 2) {
        // Floor 2: Suite 529 (Highlighted in glowing blue!)
        const suite2Pod = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 2.2), navyLinenMat);
        suite2Pod.position.set(-3.5, floorY + 0.4, 0);
        const desk2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.8), oakDeskMat);
        desk2.position.set(3.5, floorY + 0.4, 0);
        
        // Glowing outline frame highlighting Floor 2 (Your Suite)
        const highlightBox = new THREE.Mesh(
          new THREE.BoxGeometry(floorWidth + 0.2, floorHeight + 0.1, floorDepth + 0.2),
          new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true })
        );
        highlightBox.position.set(0, floorY + floorHeight / 2, 0);
        buildingGroup.add(suite2Pod, desk2, highlightBox);
      } else if (floorLevelNum === 3) {
        // Floor 3: Executive Solo Suites with mini pods
        for (let p = -1; p <= 1; p++) {
          const miniPod = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), woodMat);
          miniPod.position.set(p * 3.5, floorY + 0.35, 1);
          buildingGroup.add(miniPod);
        }
      } else if (floorLevelNum === 4) {
        // Floor 4: Penthouse & Rooftop Lounge
        const gymTreadmill = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), metalMat);
        gymTreadmill.position.set(-3.5, floorY + 0.45, 0);
        const loungeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 3.0), woodDeckMat);
        loungeDeck.position.set(3, floorY + 0.05, 1);
        buildingGroup.add(gymTreadmill, loungeDeck);
      }

      // Exterior cantilevered balconies on each floor
      const balconySlab = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 1.6), woodDeckMat);
      balconySlab.position.set(-3.5, floorY + 0.1, floorDepth / 2 + 0.8);
      const balconyGlass = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.9, 0.08), exteriorGlassMat);
      balconyGlass.position.set(-3.5, floorY + 0.55, floorDepth / 2 + 1.55);
      buildingGroup.add(balconySlab, balconyGlass);
    }

    // Rooftop Roof Slab & Pergola
    const roofY = 4 * floorHeight;
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(floorWidth, 0.3, floorDepth), floorSlabMat);
    roofSlab.position.set(0, roofY, 0);
    buildingGroup.add(roofSlab);

    // Rooftop Pergola Canopy
    const pergola = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 4), darkWoodMat);
    pergola.position.set(3, roofY + 2.2, 0);
    const pergolaPillars = [
      [-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]
    ];
    pergolaPillars.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2), metalMat);
      col.position.set(3 + px, roofY + 1.1, pz);
      buildingGroup.add(col);
    });
    buildingGroup.add(pergola);

    // Rooftop Solar Panel array
    const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 3), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.1 }));
    solarPanel.position.set(-3.5, roofY + 0.6, -2);
    solarPanel.rotation.x = 0.25;
    buildingGroup.add(solarPanel);

    // 10. Click Raycasting for Pods and Floor navigation
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // If in suite mode, inspect pods
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

    // 11. ROBUST RESIZE OBSERVER (Never zero dimensions)
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

    // 12. Render Loop with Silky Exponential Damping
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      controls.update();

      // Smooth camera interpolation
      if (!userInteracting) {
        camera.position.lerp(targetCameraPos.current, 0.05);
        controls.target.lerp(targetLookAt.current, 0.05);
      }

      if (isAutoRotating) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
      } else {
        controls.autoRotate = false;
      }

      // Airflow stream animation
      if (airflowGroup.visible) {
        airflowGroup.children.forEach((child, idx) => {
          child.position.z -= delta * (1.2 + (idx % 3) * 0.4);
          if (child.position.z < -4.0) child.position.z = 4.0;
        });
      }

      // 13. Project 3D positions to 2D HTML markers
      const newBadges: { [id: string]: { x: number; y: number; visible: boolean } } = {};

      if (suiteGroup.visible) {
        const badgeTargets = [
          { id: 'pod-b', pos: new THREE.Vector3(-2.4, 1.3, 0.4) },
          { id: 'pod-praveen', pos: new THREE.Vector3(-2.4, 1.3, -2.2) },
          { id: 'pod-rohan', pos: new THREE.Vector3(1.8, 1.3, -2.2) },
          { id: 'pod-d-vacant', pos: new THREE.Vector3(0.2, 1.3, 2.3) },
          { id: 'keypad', pos: new THREE.Vector3(-1.0, 1.4, 4.4) },
        ];

        badgeTargets.forEach(({ id, pos }) => {
          _vec3.copy(pos);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[id] = { x, y, visible: isVisible };
        });
      }

      // Badges for 4-Story Building Cutaway mode
      if (buildingGroup.visible) {
        const buildingFloors = [
          { id: 'bld-f4', pos: new THREE.Vector3(0, 4 * floorHeight + 1.2, 3) },
          { id: 'bld-f3', pos: new THREE.Vector3(0, 3 * floorHeight + 1.2, 3) },
          { id: 'bld-f2', pos: new THREE.Vector3(0, 2 * floorHeight + 1.2, 3) },
          { id: 'bld-f1', pos: new THREE.Vector3(0, 1 * floorHeight + 1.2, 3) },
        ];
        buildingFloors.forEach(({ id, pos }) => {
          _vec3.copy(pos);
          _vec3.project(camera);
          const isVisible = _vec3.z < 1.0;
          const x = (_vec3.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
          const y = (-(_vec3.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
          newBadges[id] = { x, y, visible: isVisible };
        });
      }

      setBadgePositions(newBadges);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Switch between 4-Story Building Cutaway and Suite 529 or other levels
  useEffect(() => {
    if (!suiteGroupRef.current || !buildingCutawayGroupRef.current) return;

    if (activeLevel === 'building_cutaway') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      // Pull camera out to view all 4 floors
      targetCameraPos.current.set(20, 16, 22);
      targetLookAt.current.set(0, 5.5, 0);
    } else if (activeLevel === 'suite_529') {
      suiteGroupRef.current.visible = true;
      buildingCutawayGroupRef.current.visible = false;
      // Focus camera on Suite 529
      targetCameraPos.current.set(9, 10, 11);
      targetLookAt.current.set(0, 0.5, 0);
    } else if (activeLevel === 'floor_4') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(12, 14, 14);
      targetLookAt.current.set(0, 11.2, 0);
    } else if (activeLevel === 'floor_3') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(12, 11, 14);
      targetLookAt.current.set(0, 8.4, 0);
    } else if (activeLevel === 'floor_1') {
      suiteGroupRef.current.visible = false;
      buildingCutawayGroupRef.current.visible = true;
      targetCameraPos.current.set(12, 6, 14);
      targetLookAt.current.set(0, 2.8, 0);
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
        dir.position.set(16, 8, 12);
        dir.color.setHex(0xffaa5e);
        dir.intensity = 2.4;
        hemi.color.setHex(0xffe8d6);
        hemi.intensity = 0.9;
        sceneRef.current.background = new THREE.Color(0xfbf6f0);
        if (interior) interior.visible = false;
        break;

      case 'noon':
        dir.position.set(0, 24, 2);
        dir.color.setHex(0xffffff);
        dir.intensity = 2.8;
        hemi.color.setHex(0xf1f5f9);
        hemi.intensity = 1.0;
        sceneRef.current.background = new THREE.Color(0xf8fafc);
        if (interior) interior.visible = false;
        break;

      case 'sunset':
        dir.position.set(14, 8, 8);
        dir.color.setHex(0xfb923c);
        dir.intensity = 2.6;
        hemi.color.setHex(0xfde68a);
        hemi.intensity = 0.85;
        sceneRef.current.background = new THREE.Color(0xfff7ed);
        if (interior) interior.visible = true;
        break;

      case 'night':
        dir.position.set(-8, 14, -8);
        dir.color.setHex(0x38bdf8);
        dir.intensity = 0.55;
        hemi.color.setHex(0x1e293b);
        hemi.intensity = 0.35;
        sceneRef.current.background = new THREE.Color(0x0f172a);
        if (interior) interior.visible = true;
        break;
    }
  }, [lightingTime]);

  // Spatial layers visibility
  useEffect(() => {
    if (electricalLayerGroupRef.current) {
      electricalLayerGroupRef.current.visible = currentLayer === 'electrical';
    }
    if (airflowLayerGroupRef.current) {
      airflowLayerGroupRef.current.visible = currentLayer === 'sunlight';
    }
  }, [currentLayer]);

  const handleCenterBedB = () => {
    setActiveLevel('suite_529');
    const bedB = PODS_DATA.find((p) => p.id === 'pod-b')!;
    onSelectPod(bedB);
    targetCameraPos.current.set(bedB.position[0] + 4.5, 6, bedB.position[2] + 4.5);
    targetLookAt.current.set(bedB.position[0], 0.6, bedB.position[2]);
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-100 overflow-hidden select-none">
      
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Bar matching screenshot */}
      <div className="absolute top-3 left-4 right-4 sm:left-6 sm:right-6 pointer-events-none flex flex-col gap-2 z-20">
        
        <div className="flex items-center gap-2 overflow-x-auto pointer-events-auto pb-1">
          
          {/* 4-Story Building Cutaway Button */}
          <button
            onClick={() => setActiveLevel('building_cutaway')}
            className={`px-3 py-1.5 rounded-lg border shadow-xs flex items-center gap-1.5 text-xs font-bold transition-all ${
              activeLevel === 'building_cutaway'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span>4-Story Building Cutaway</span>
          </button>

          {/* Floor 2 • Suite 529 Button */}
          <button
            onClick={() => setActiveLevel('suite_529')}
            className={`px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 text-xs font-bold transition-all ${
              activeLevel === 'suite_529'
                ? 'bg-indigo-600 text-white shadow-indigo-200 scale-105'
                : 'bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>🛏️ Floor 2 • Suite 529</span>
          </button>

          <button
            onClick={onEnterWalkthrough}
            className="bg-white/95 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Watch 360° View</span>
          </button>

          <button
            onClick={() => {
              setLaserRulerActive(!laserRulerActive);
              setRulerPoints([]);
              setMeasuredDistance(null);
            }}
            className={`px-3 py-1.5 rounded-lg border shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              laserRulerActive
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Laser Ruler</span>
          </button>

          <button
            onClick={handleCenterBedB}
            className="bg-white/95 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Center on Bed B</span>
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1.5 rounded-lg border shadow-xs transition-colors ${
              isAutoRotating ? 'bg-indigo-600 text-white' : 'bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50'
            }`}
            title="360 Auto-Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* AR Trigger Button */}
          <button
            onClick={onOpenAR}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs flex items-center gap-1.5 ml-auto"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Project in AR</span>
          </button>
        </div>

        {/* Suite Banner matching screenshot */}
        <div className="bg-slate-900/95 backdrop-blur-xs text-white text-xs font-medium px-4 py-2 rounded-xl shadow-md border border-slate-800/80 flex items-center gap-2 max-w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {activeLevel === 'building_cutaway'
              ? 'HomiesInn OMR Residency • 4-Story Multi-Level Building Cutaway'
              : 'Floor 2 • Private Residency Suite (Allocated Bed B • Sunrise Balcony • En-Suite)'}
          </span>
        </div>

      </div>

      {/* Floor Level Selector Vertical Dock (Visible on left) */}
      <div className="absolute top-28 left-4 sm:left-6 z-20 pointer-events-auto flex flex-col gap-1.5">
        <div className="bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200 shadow-lg flex flex-col gap-1 text-[11px] font-bold text-slate-700">
          
          <button
            onClick={() => setActiveLevel('building_cutaway')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'building_cutaway' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>All 4 Floors</span>
            <Building className="w-3 h-3 text-indigo-400" />
          </button>

          <button
            onClick={() => setActiveLevel('floor_4')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_4' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>L4: Rooftop &amp; Gym</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </button>

          <button
            onClick={() => setActiveLevel('floor_3')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_3' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>L3: Executive Studios</span>
          </button>

          <button
            onClick={() => setActiveLevel('suite_529')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'suite_529' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>L2: Suite 529 (You)</span>
            </div>
            <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-extrabold">Active</span>
          </button>

          <button
            onClick={() => setActiveLevel('floor_1')}
            className={`px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
              activeLevel === 'floor_1' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span>L1: Lobby &amp; Dining</span>
          </button>

        </div>
      </div>

      {/* Floating 3D HTML Badges for Suite 529 */}
      {activeLevel === 'suite_529' && (
        <>
          {/* Bed B */}
          {badgePositions['pod-b']?.visible && (
            <div
              style={{
                left: `${badgePositions['pod-b'].x}px`,
                top: `${badgePositions['pod-b'].y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={handleCenterBedB}
              className="absolute z-20 pointer-events-auto cursor-pointer group flex flex-col items-center animate-in fade-in zoom-in-95"
            >
              <div className="bg-indigo-600 text-white text-[11px] font-black tracking-wide px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-indigo-400 group-hover:scale-105 transition-transform">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>YOUR BED (POD B)</span>
              </div>
              <div className="bg-white/95 backdrop-blur-xs text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 border border-indigo-200 shadow-sm whitespace-nowrap">
                65W TYPE-C • 230V Active
              </div>
            </div>
          )}

          {/* Praveen Bed A */}
          {badgePositions['pod-praveen']?.visible && (
            <div
              style={{
                left: `${badgePositions['pod-praveen'].x}px`,
                top: `${badgePositions['pod-praveen'].y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={() => onSelectPod(PODS_DATA.find((p) => p.id === 'pod-praveen')!)}
              className="absolute z-20 pointer-events-auto cursor-pointer group flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-300 shadow-sm hover:border-emerald-500 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-slate-800">Praveen M. • Deep Work</span>
            </div>
          )}

          {/* Rohan Bed C */}
          {badgePositions['pod-rohan']?.visible && (
            <div
              style={{
                left: `${badgePositions['pod-rohan'].x}px`,
                top: `${badgePositions['pod-rohan'].y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={() => onSelectPod(PODS_DATA.find((p) => p.id === 'pod-rohan')!)}
              className="absolute z-20 pointer-events-auto cursor-pointer group flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-300 shadow-sm hover:border-amber-500 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-bold text-slate-800">Rohan K. • At Zoho</span>
            </div>
          )}

          {/* Vacant Bed D */}
          {badgePositions['pod-d-vacant']?.visible && (
            <div
              style={{
                left: `${badgePositions['pod-d-vacant'].x}px`,
                top: `${badgePositions['pod-d-vacant'].y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={() => onSelectPod(PODS_DATA.find((p) => p.id === 'pod-d-vacant')!)}
              className="absolute z-20 pointer-events-auto cursor-pointer group flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-300 shadow-sm hover:bg-emerald-100 transition-colors animate-bounce"
            >
              <span className="text-xs font-black">+</span>
              <span className="text-[11px] font-black tracking-wide">CLAIM FOR FRIEND</span>
            </div>
          )}

          {/* Keypad */}
          {badgePositions['keypad']?.visible && (
            <div
              style={{
                left: `${badgePositions['keypad'].x}px`,
                top: `${badgePositions['keypad'].y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="absolute z-20 pointer-events-none flex items-center gap-1.5 bg-slate-900/90 text-white px-2.5 py-1 rounded-full border border-slate-700 shadow-md text-[10px] font-bold tracking-wider"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>KEYPAD ENTRY (8492)</span>
            </div>
          )}
        </>
      )}

      {/* Badges for Building Cutaway Mode */}
      {activeLevel === 'building_cutaway' && (
        <>
          {badgePositions['bld-f4']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-f4'].x}px`, top: `${badgePositions['bld-f4'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('floor_4')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-lg hover:bg-indigo-600 transition-colors"
            >
              Floor 4 • Rooftop Gym &amp; Sunset Lounge
            </div>
          )}

          {badgePositions['bld-f2']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-f2'].x}px`, top: `${badgePositions['bld-f2'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('suite_529')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-indigo-600 text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-full border-2 border-white shadow-xl hover:scale-105 transition-transform flex items-center gap-1.5 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Floor 2 • Suite 529 (Your Allocated Pod B) - Tap to Enter</span>
            </div>
          )}

          {badgePositions['bld-f1']?.visible && (
            <div
              style={{ left: `${badgePositions['bld-f1'].x}px`, top: `${badgePositions['bld-f1'].y}px`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setActiveLevel('floor_1')}
              className="absolute z-20 pointer-events-auto cursor-pointer bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-lg hover:bg-indigo-600 transition-colors"
            >
              Floor 1 • Reception Lobby &amp; Co-Dining
            </div>
          )}
        </>
      )}

      {/* Bottom Floating Lighting Simulator Bar matching screenshot */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-xl flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-700">
          
          <div className="flex items-center gap-1.5 text-slate-500 pr-1 border-r border-slate-200">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] tracking-wider uppercase font-extrabold">LIGHTING:</span>
          </div>

          <button
            onClick={() => setLightingTime('sunrise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'sunrise'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sunrise className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-xs">Sunrise 7 AM</span>
          </button>

          <button
            onClick={() => setLightingTime('noon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'noon'
                ? 'bg-sky-100 text-sky-900 border border-sky-300 shadow-xs'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold text-xs">Noon 12 PM</span>
          </button>

          <button
            onClick={() => setLightingTime('sunset')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'sunset'
                ? 'bg-indigo-600 text-white border border-indigo-700 shadow-xs'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Sunset className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs">Sunset 6 PM</span>
          </button>

          <button
            onClick={() => setLightingTime('night')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              lightingTime === 'night'
                ? 'bg-slate-900 text-white border border-slate-800 shadow-xs'
                : 'hover:bg-slate-100 text-slate-600'
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
