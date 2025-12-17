import { PlacedItem } from '@models/BuildableItem';
import { PavingManager } from '@models/PavingManager';
import { InteriorManager } from '@models/InteriorManager';
import { SaveData } from '@models/types';

/**
 * Service for saving and loading plans
 */
export class PersistenceService {
  /**
   * Create save data from current state
   */
  public createSaveData(
    gridWidth: number,
    gridHeight: number,
    items: PlacedItem[],
    pavingManager: PavingManager,
    interiorManager?: InteriorManager
  ): SaveData {
    return {
      gridWidth,
      gridHeight,
      items: items.map(item => item.toJSON()),
      paving: pavingManager.toJSON(),
      interiors: interiorManager?.toJSON(),
    };
  }

  /**
   * Save plan to file
   */
  public savePlan(data: SaveData, filename: string = 'hnh_base_plan.json'): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Load plan from file
   */
  public async loadPlan(): Promise<SaveData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            resolve(data as SaveData);
          } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file: ' + (error as Error).message);
            resolve(null);
          }
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  /**
   * Export canvas as PNG
   */
  public exportPNG(canvas: HTMLCanvasElement, filename: string = 'hnh_base_plan.png'): void {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}

/**
 * Singleton instance
 */
export const persistenceService = new PersistenceService();
