import { PlacedItem } from './BuildableItem';
import { InteriorData } from './types';
import { GridManager } from './GridManager';
import { PavingManager } from './PavingManager';

/**
 * Manages building interiors
 */
export class InteriorManager {
  private interiors: Map<string, Interior> = new Map();

  /**
   * Create an interior for a building
   */
  public createInterior(buildingId: string, width: number, height: number): string {
    const interiorId = `interior_${buildingId}_${Date.now()}`;
    const interior = new Interior(interiorId, buildingId, width, height);
    this.interiors.set(interiorId, interior);
    return interiorId;
  }

  /**
   * Get interior by ID
   */
  public getInterior(interiorId: string): Interior | null {
    return this.interiors.get(interiorId) || null;
  }

  /**
   * Get interior by building ID
   */
  public getInteriorByBuildingId(buildingId: string): Interior | null {
    for (const interior of this.interiors.values()) {
      if (interior.buildingId === buildingId) {
        return interior;
      }
    }
    return null;
  }

  /**
   * Check if a building has an interior
   */
  public hasInterior(buildingId: string): boolean {
    return this.getInteriorByBuildingId(buildingId) !== null;
  }

  /**
   * Remove an interior
   */
  public removeInterior(buildingId: string): void {
    const interior = this.getInteriorByBuildingId(buildingId);
    if (interior) {
      this.interiors.delete(interior.id);
    }
  }

  /**
   * Get all interiors
   */
  public getAllInteriors(): Interior[] {
    return Array.from(this.interiors.values());
  }

  /**
   * Clear all interiors
   */
  public clear(): void {
    this.interiors.clear();
  }

  /**
   * Export interiors to JSON
   */
  public toJSON(): Record<string, InteriorData> {
    const result: Record<string, InteriorData> = {};
    for (const [id, interior] of this.interiors.entries()) {
      result[id] = interior.toJSON();
    }
    return result;
  }

  /**
   * Load interiors from JSON
   */
  public loadInteriors(data: Record<string, InteriorData>): void {
    this.clear();
    for (const [id, interiorData] of Object.entries(data)) {
      const interior = Interior.fromJSON(interiorData);
      this.interiors.set(id, interior);
    }
  }
}

/**
 * Represents a single interior space
 */
export class Interior {
  public id: string;
  public buildingId: string;
  private gridManager: GridManager;
  private pavingManager: PavingManager;

  constructor(id: string, buildingId: string, width: number, height: number) {
    this.id = id;
    this.buildingId = buildingId;
    this.gridManager = new GridManager(width, height);
    this.pavingManager = new PavingManager();
  }

  /**
   * Get the grid manager for this interior
   */
  public getGridManager(): GridManager {
    return this.gridManager;
  }

  /**
   * Get the paving manager for this interior
   */
  public getPavingManager(): PavingManager {
    return this.pavingManager;
  }

  /**
   * Get the size of this interior
   */
  public getSize(): { width: number; height: number } {
    return this.gridManager.getGridSize();
  }

  /**
   * Export to JSON
   */
  public toJSON(): InteriorData {
    return {
      id: this.id,
      buildingId: this.buildingId,
      width: this.gridManager.getGridWidth(),
      height: this.gridManager.getGridHeight(),
      items: this.gridManager.getItems().map(item => item.toJSON()),
      paving: this.pavingManager.toJSON(),
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(data: InteriorData): Interior {
    const interior = new Interior(data.id, data.buildingId, data.width, data.height);
    
    // Load items
    const items = data.items.map(itemData => new PlacedItem(itemData));
    interior.gridManager.loadItems(items);
    
    // Load paving
    interior.pavingManager.loadPaving(data.paving);
    
    return interior;
  }
}
