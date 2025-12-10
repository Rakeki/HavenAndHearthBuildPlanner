import { BuildableItem } from '@models/BuildableItem';
import { PavingType } from '@models/PavingManager';
import { BuildableItemData, PavingTypeData, Category } from '@models/types';

/**
 * Service for loading and managing data
 */
export class DataService {
  private buildableItems: BuildableItem[] = [];
  private pavingTypes: PavingType[] = [];

  /**
   * Load buildable items from data
   */
  public loadBuildableItems(data: BuildableItemData[]): void {
    this.buildableItems = data.map(item => new BuildableItem(item));
  }

  /**
   * Load paving types from data
   */
  public loadPavingTypes(data: PavingTypeData[]): void {
    this.pavingTypes = data.map(paving => new PavingType(paving));
  }

  /**
   * Get all buildable items
   */
  public getBuildableItems(): BuildableItem[] {
    return this.buildableItems;
  }

  /**
   * Get all paving types
   */
  public getPavingTypes(): PavingType[] {
    return this.pavingTypes;
  }

  /**
   * Filter buildable items
   */
  public filterBuildableItems(searchTerm: string, category: string): BuildableItem[] {
    return this.buildableItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }

  /**
   * Filter paving types
   */
  public filterPavingTypes(searchTerm: string, category: string): PavingType[] {
    return this.pavingTypes.filter(paving => {
      const matchesSearch = paving.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'all' || paving.category === category;
      return matchesSearch && matchesCategory;
    });
  }

  /**
   * Find a buildable item by name
   */
  public findBuildableItem(name: string): BuildableItem | undefined {
    return this.buildableItems.find(item => item.name === name);
  }

  /**
   * Find a paving type by name
   */
  public findPavingType(name: string): PavingType | undefined {
    return this.pavingTypes.find(paving => paving.name === name);
  }

  /**
   * Get category color mapping
   */
  public getCategoryColor(category: Category): string {
    const colors: Record<Category, string> = {
      storage: '#8B4513',
      crafting: '#FF6347',
      agriculture: '#32CD32',
      housing: '#4169E1',
      defense: '#DC143C',
      decoration: '#FFD700',
      furniture: '#DEB887',
      other: '#808080',
    };
    return colors[category] || '#808080';
  }
}

/**
 * Singleton instance
 */
export const dataService = new DataService();
