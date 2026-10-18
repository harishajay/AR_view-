export type ViewMode = 'isometric' | 'walkthrough' | 'exploded' | 'cad' | 'photomatch' | 'ar';
export type SpatialLayer = 'master' | 'electrical' | 'sunlight' | 'dimensions';
export type LightingTime = 'sunrise' | 'noon' | 'sunset' | 'night';

export interface PodResident {
  id: string;
  name: string;
  status: string;
  companyOrRole: string;
  avatar?: string;
  type: 'self' | 'roommate' | 'vacant' | 'occupied';
}

export interface RoomAsset {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  iconType: 'desk' | 'chair' | 'locker' | 'power' | 'wifi' | 'bed' | 'balcony';
  specs?: string;
}

export interface RoomPod {
  id: string;
  podNumber: string;
  name: string;
  roomType: string;
  resident: PodResident;
  position: [number, number, number]; // 3D coordinates in room
  status: 'occupied' | 'available' | 'reserved' | 'your_bed';
  priceMonthly: number;
  specs: {
    dimensions: string;
    deskType: string;
    power: string;
    sunExposure: string;
    balconyAccess: boolean;
  };
  assets: RoomAsset[];
  image: string;
}

export interface Hotspot {
  id: string;
  title: string;
  subtitle: string;
  category: 'sleep' | 'workspace' | 'amenity' | 'utility' | 'tech';
  position: [number, number, number];
  description: string;
  specs: string[];
}
