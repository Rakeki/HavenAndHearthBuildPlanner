import { PavingTypeData, PavingData, GridCell, ShapeMode } from './types';

/**
 * Represents a type of paving that can be placed
 */
export class PavingType {
  public readonly name: string;
  public readonly category: string;
  public readonly image: string;
  private imageElement?: HTMLImageElement;

  constructor(data: PavingTypeData) {
    this.name = data.name;
    this.category = data.category;
    this.image = data.image;
  }

  /**
   * Preload the image for this paving type
   */
  public preloadImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.imageElement?.complete) {
        resolve(this.imageElement);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.imageElement = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load paving image: ${this.name}`));
      img.src = this.image;
    });
  }

  /**
   * Get the loaded image element
   */
  public getImageElement(): HTMLImageElement | undefined {
    return this.imageElement;
  }

  /**
   * Create paving data for placement on grid
   */
  public createPavingData(): PavingData {
    return {
      name: this.name,
      category: this.category as any,
      image: this.image,
    };
  }
}

/**
 * Manages the paving grid
 */
export class PavingManager {
  private grid: Map<string, PavingData & { imageElement?: HTMLImageElement }>;
  private pavingTypes: Map<string, PavingType>;

  constructor() {
    this.grid = new Map();
    this.pavingTypes = new Map();
  }

  /**
   * Register paving types
   */
  public registerPavingTypes(types: PavingType[]): void {
    types.forEach(type => {
      this.pavingTypes.set(type.name, type);
    });
  }

  /**
   * Place paving at a cell
   */
  public placePaving(x: number, y: number, paving: PavingType): void {
    const key = this.getCellKey(x, y);
    this.grid.set(key, {
      ...paving.createPavingData(),
      imageElement: paving.getImageElement(),
    });
  }

  /**
   * Remove paving at a cell
   */
  public removePaving(x: number, y: number): void {
    const key = this.getCellKey(x, y);
    this.grid.delete(key);
  }

  /**
   * Get paving at a cell
   */
  public getPavingAt(x: number, y: number): (PavingData & { imageElement?: HTMLImageElement }) | undefined {
    const key = this.getCellKey(x, y);
    return this.grid.get(key);
  }

  /**
   * Check if a cell has paving
   */
  public hasPavingAt(x: number, y: number): boolean {
    return this.grid.has(this.getCellKey(x, y));
  }

  /**
   * Clear all paving
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Get all paving cells
   */
  public getAllPaving(): Map<string, PavingData & { imageElement?: HTMLImageElement }> {
    return new Map(this.grid);
  }

  /**
   * Load paving from saved data
   */
  public loadPaving(data: Record<string, PavingData>): void {
    this.grid.clear();
    Object.entries(data).forEach(([key, pavingData]) => {
      const type = this.pavingTypes.get(pavingData.name);
      this.grid.set(key, {
        ...pavingData,
        imageElement: type?.getImageElement(),
      });
    });
  }

  /**
   * Serialize paving grid for saving
   */
  public toJSON(): Record<string, PavingData> {
    const result: Record<string, PavingData> = {};
    this.grid.forEach((paving, key) => {
      result[key] = {
        name: paving.name,
        category: paving.category,
        image: paving.image,
      };
    });
    return result;
  }

  /**
   * Get cells in a line using Bresenham's algorithm
   */
  public static getLineCells(x0: number, y0: number, x1: number, y1: number): GridCell[] {
    const cells: GridCell[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      cells.push({ x, y });
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return cells;
  }

  /**
   * Get cells in a rectangle
   */
  public static getRectangleCells(x0: number, y0: number, x1: number, y1: number): GridCell[] {
    const cells: GridCell[] = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push({ x, y });
      }
    }
    
    return cells;
  }

  /**
   * Get cells in a circle
   */
  public static getCircleCells(centerX: number, centerY: number, edgeX: number, edgeY: number): GridCell[] {
    const cells: GridCell[] = [];
    const radius = Math.sqrt(Math.pow(edgeX - centerX, 2) + Math.pow(edgeY - centerY, 2));
    const radiusSquared = radius * radius;
    
    const minX = Math.floor(centerX - radius);
    const maxX = Math.ceil(centerX + radius);
    const minY = Math.floor(centerY - radius);
    const maxY = Math.ceil(centerY + radius);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const distSquared = Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2);
        if (distSquared <= radiusSquared) {
          cells.push({ x, y });
        }
      }
    }
    
    return cells;
  }

  /**
   * Get cells based on shape mode
   */
  public static getCellsByShape(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    mode: ShapeMode
  ): GridCell[] {
    switch (mode) {
      case 'line':
        return this.getLineCells(x0, y0, x1, y1);
      case 'rectangle':
        return this.getRectangleCells(x0, y0, x1, y1);
      case 'circle':
        return this.getCircleCells(x0, y0, x1, y1);
    }
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
