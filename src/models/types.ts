// Type definitions for the application

export type Category = 'storage' | 'crafting' | 'agriculture' | 'housing' | 'defense' | 'decoration' | 'furniture' | 'other';

export type PavingCategory = 'stone' | 'ore' | 'metal' | 'brick' | 'special';

export type ShapeMode = 'line' | 'rectangle' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface PointWithOrientation {
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical' | 'corner';
}

export interface BuildableItemData {
  name: string;
  category: Category;
  width: number;
  height: number;
  color: string;
  image?: string;
  imageUrl?: string;
  gridImage?: string;
  usesLineTool?: boolean;
  requiresPalisadeOverlap?: boolean;
  hasInterior?: boolean;
  interiorWidth?: number;
  interiorHeight?: number;
}

export interface PavingTypeData {
  name: string;
  category: PavingCategory;
  image: string;
}

export interface GridCell {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

export interface InteriorData {
  id: string;
  buildingId: string;
  width: number;
  height: number;
  items: PlacedItemData[];
  paving: Record<string, PavingData>;
}

export interface SaveData {
  gridSize?: number; // Legacy support
  gridWidth?: number;
  gridHeight?: number;
  items: PlacedItemData[];
  paving: Record<string, PavingData>;
  interiors?: Record<string, InteriorData>;
}

export interface PlacedItemData {
  name: string;
  category: Category;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  image?: string;
  imageUrl?: string;
  gridImage?: string;
  usesLineTool?: boolean;
  requiresPalisadeOverlap?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'corner';
  rotation?: number; // 0, 90, 180, or 270 degrees
  hasInterior?: boolean;
  interiorId?: string;
}

export interface PavingData {
  name: string;
  category: PavingCategory;
  image: string;
}
