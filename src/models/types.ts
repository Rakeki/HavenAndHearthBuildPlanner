// Type definitions for the application

export type Category = 'storage' | 'crafting' | 'agriculture' | 'housing' | 'defense' | 'decoration' | 'furniture' | 'other';

export type PavingCategory = 'stone' | 'ore' | 'metal' | 'brick' | 'special';

export type ShapeMode = 'line' | 'rectangle' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface BuildableItemData {
  name: string;
  category: Category;
  width: number;
  height: number;
  color: string;
  image?: string;
  imageUrl?: string;
  usesLineTool?: boolean;
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

export interface SaveData {
  gridSize: number;
  items: PlacedItemData[];
  paving: Record<string, PavingData>;
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
  usesLineTool?: boolean;
}

export interface PavingData {
  name: string;
  category: PavingCategory;
  image: string;
}
