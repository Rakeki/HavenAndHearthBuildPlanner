import { PlacedItem } from './BuildableItem';
import { InteriorData } from './types';
import { GridManager } from './GridManager';
import { PavingManager, PavingType } from './PavingManager';

/**
 * Manages building interiors
 */
export class InteriorManager {
  private interiors: Map<string, Interior> = new Map();
  private pavingTypes: PavingType[] = [];

  /**
   * Set paving types for all interiors
   */
  public setPavingTypes(types: PavingType[]): void {
    this.pavingTypes = types;
  }

  /**
   * Create an interior for a building
   */
  public createInterior(buildingId: string, width: number, height: number, floors: number = 1): string {
    const interiorId = `interior_${buildingId}_${Date.now()}`;
    const interior = new Interior(interiorId, buildingId, width, height, floors, this.pavingTypes);
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
      const interior = Interior.fromJSON(interiorData, this.pavingTypes);
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
  private width: number;
  private height: number;
  private floors: number;
  private floorManagers: Map<number, { grid: GridManager, paving: PavingManager }>;

  constructor(id: string, buildingId: string, width: number, height: number, floors: number = 1, pavingTypes: PavingType[] = []) {
    this.id = id;
    this.buildingId = buildingId;
    this.width = width;
    this.height = height;
    this.floors = floors;
    this.floorManagers = new Map();
    
    // Initialize all floors with default interior floor paving
    for (let i = 0; i < floors; i++) {
      const pavingManager = new PavingManager();
      
      // Register paving types
      if (pavingTypes.length > 0) {
        pavingManager.registerPavingTypes(pavingTypes);
      }
      
      // Fill entire floor with default interior_floor paving
      // We'll use the raw data format which will be stored directly
      const defaultPavingData = {
        name: 'interior_floor',
        category: 'interior',
        image: 'images/paving/interior_floor.png'
      };
      
      // Load the default paving for all cells
      const pavingData: Record<string, any> = {};
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          pavingData[`${x},${y}`] = defaultPavingData;
        }
      }
      pavingManager.loadPaving(pavingData);
      
      this.floorManagers.set(i, {
        grid: new GridManager(width, height),
        paving: pavingManager
      });
    }
  }

  /**
   * Get the grid manager for a specific floor
   */
  public getGridManager(floor: number = 0): GridManager | null {
    const managers = this.floorManagers.get(floor);
    return managers?.grid || null;
  }

  /**
   * Get the paving manager for a specific floor
   */
  public getPavingManager(floor: number = 0): PavingManager | null {
    const managers = this.floorManagers.get(floor);
    return managers?.paving || null;
  }

  /**
   * Get the number of floors
   */
  public getFloors(): number {
    return this.floors;
  }

  /**
   * Get the size of this interior
   */
  public getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Add a cellar floor (floor -1) with dirt paving
   */
  public addCellarFloor(pavingTypes: PavingType[]): void {
    // Check if cellar already exists
    if (this.floorManagers.has(-1)) {
      return;
    }

    const pavingManager = new PavingManager();
    
    // Register paving types
    if (pavingTypes.length > 0) {
      pavingManager.registerPavingTypes(pavingTypes);
    }
    
    // Fill entire cellar floor with dirt paving (using Arkose as dirt-like texture)
    const defaultPavingData = {
      name: 'Arkose',
      category: 'stone',
      image: 'images/paving/Arkose.png'
    };
    
    const pavingData: Record<string, any> = {};
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        pavingData[`${x},${y}`] = defaultPavingData;
      }
    }
    pavingManager.loadPaving(pavingData);
    
    this.floorManagers.set(-1, {
      grid: new GridManager(this.width, this.height),
      paving: pavingManager
    });
  }

  /**
   * Remove the cellar floor (floor -1)
   */
  public removeCellarFloor(): void {
    this.floorManagers.delete(-1);
  }

  /**
   * Check if cellar floor exists
   */
  public hasCellarFloor(): boolean {
    return this.floorManagers.has(-1);
  }

  /**
   * Get all floor numbers (including negative floors)
   */
  public getAllFloors(): number[] {
    return Array.from(this.floorManagers.keys()).sort((a, b) => a - b);
  }

  /**
   * Export to JSON
   */
  public toJSON(): InteriorData {
    const floorData: Record<number, { items: any[], paving: any }> = {};
    
    // Export all floors including cellar (negative floors)
    this.floorManagers.forEach((managers, floor) => {
      floorData[floor] = {
        items: managers.grid.getItems().map(item => item.toJSON()),
        paving: managers.paving.toJSON()
      };
    });
    
    // For backwards compatibility, export floor 0 at root level too
    const floor0 = this.floorManagers.get(0);
    
    return {
      id: this.id,
      buildingId: this.buildingId,
      width: this.width,
      height: this.height,
      floors: this.floors,
      items: floor0 ? floor0.grid.getItems().map(item => item.toJSON()) : [],
      paving: floor0 ? floor0.paving.toJSON() : {},
      floorData
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(data: InteriorData, pavingTypes: PavingType[] = []): Interior {
    const floors = data.floors || 1;
    const interior = new Interior(data.id, data.buildingId, data.width, data.height, floors, pavingTypes);
    
    // Load floor data if available
    if (data.floorData) {
      // Load all floors from floorData (including negative floors like cellar)
      Object.entries(data.floorData).forEach(([floorStr, floorInfo]) => {
        const floorNum = parseInt(floorStr);
        
        // If it's a cellar floor (-1), create it
        if (floorNum === -1) {
          interior.addCellarFloor(pavingTypes);
        }
        
        const managers = interior.floorManagers.get(floorNum);
        if (managers && floorInfo) {
          const items = floorInfo.items.map((itemData: any) => new PlacedItem(itemData));
          managers.grid.loadItems(items);
          managers.paving.loadPaving(floorInfo.paving);
        }
      });
    } else {
      // Legacy: load into floor 0
      const managers = interior.floorManagers.get(0);
      if (managers) {
        const items = data.items.map(itemData => new PlacedItem(itemData));
        managers.grid.loadItems(items);
        managers.paving.loadPaving(data.paving);
      }
    }
    
    return interior;
  }
}
