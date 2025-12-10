import { BuildableItem, PlacedItem } from '@models/BuildableItem';
import { PavingType } from '@models/PavingManager';

/**
 * Service for preloading images
 */
export class ImageLoaderService {
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  /**
   * Preload buildable item images
   */
  public async preloadBuildableImages(items: BuildableItem[]): Promise<void> {
    const promises = items.map(async (item) => {
      try {
        const img = await item.preloadImage();
        const key = item.image || item.imageUrl || item.name;
        this.loadedImages.set(key, img);
      } catch (error) {
        console.warn(`Failed to load image for ${item.name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Preload paving images
   */
  public async preloadPavingImages(pavingTypes: PavingType[]): Promise<void> {
    const promises = pavingTypes.map(async (paving) => {
      try {
        const img = await paving.preloadImage();
        this.loadedImages.set(paving.image, img);
      } catch (error) {
        console.warn(`Failed to load paving image for ${paving.name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Preload a single placed item's image
   */
  public async preloadPlacedItemImage(item: PlacedItem): Promise<void> {
    try {
      await item.preloadImage();
    } catch (error) {
      console.warn(`Failed to load image for placed item ${item.name}:`, error);
    }
  }

  /**
   * Get a loaded image
   */
  public getImage(key: string): HTMLImageElement | undefined {
    return this.loadedImages.get(key);
  }
}

/**
 * Singleton instance
 */
export const imageLoaderService = new ImageLoaderService();
