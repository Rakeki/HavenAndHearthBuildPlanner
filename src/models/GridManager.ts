import { PlacedItem } from './BuildableItem';

/**
 * Manages the grid and placed items
 */
export class GridManager {
  private gridWidth: number;
  private gridHeight: number;
  private items: PlacedItem[];

  constructor(gridWidth: number = 50, gridHeight: number = 50) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.items = [];
  }

  /**
   * Get the current grid size
   */
  public getGridSize(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight };
  }

  /**
   * Get the grid width
   */
  public getGridWidth(): number {
    return this.gridWidth;
  }

  /**
   * Get the grid height
   */
  public getGridHeight(): number {
    return this.gridHeight;
  }

  /**
   * Set the grid size
   */
  public setGridSize(width: number, height: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
  }

  /**
   * Get all placed items
   */
  public getItems(): PlacedItem[] {
    return [...this.items];
  }

  /**
   * Add an item to the grid
   */
  public addItem(item: PlacedItem): boolean {
    if (!this.canPlaceItem(item.x, item.y, item.width, item.height, null, item.requiresPalisadeOverlap)) {
      return false;
    }
    this.items.push(item);
    return true;
  }

  /**
   * Remove an item from the grid
   */
  public removeItem(item: PlacedItem): void {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  /**
   * Get item at position
   */
  public getItemAt(x: number, y: number): PlacedItem | null {
    return this.items.find(item => item.contains(x, y)) || null;
  }

  /**
   * Check if an item can be placed at the given position
   */
  public canPlaceItem(
    x: number,
    y: number,
    width: number,
    height: number,
    excludeItem: PlacedItem | null,
    requiresPalisadeOverlap: boolean = false
  ): boolean {
    // Check bounds
    if (x < 0 || y < 0 || x + width > this.gridWidth || y + height > this.gridHeight) {
      return false;
    }

    // Check overlap with other items
    const tempItem = new PlacedItem({
      name: 'temp',
      category: 'other',
      x,
      y,
      width,
      height,
      color: '#000000',
    });

    let hasOverlapWithPalisade = false;

    for (const item of this.items) {
      if (item === excludeItem) continue;
      if (tempItem.overlaps(item)) {
        // If this item requires palisade overlap, check if overlapping item is a palisade
        if (requiresPalisadeOverlap && item.name === 'Palisade') {
          hasOverlapWithPalisade = true;
          // Check if overlap is at the edges of the gate
          // For horizontal gates (width >= height): check left/right edges
          // For vertical gates (height > width): check top/bottom edges
          const isVerticalGate = height > width;
          
          if (isVerticalGate) {
            const gateTopEdge = y;
            const gateBottomEdge = y + height - 1;
            // Check if palisade overlaps with either vertical end of the gate
            if (item.contains(x, gateTopEdge) || item.contains(x, gateBottomEdge)) {
              continue; // Allow this overlap
            }
          } else {
            const gateLeftEdge = x;
            const gateRightEdge = x + width - 1;
            // Check if palisade overlaps with either horizontal end of the gate
            if (item.contains(gateLeftEdge, y) || item.contains(gateRightEdge, y)) {
              continue; // Allow this overlap
            }
          }
        }
        return false;
      }
    }

    // Check if adjacent to a gate edge (for palisades connecting to gates)
    let isAdjacentToGateEdge = false;
    if (requiresPalisadeOverlap && !hasOverlapWithPalisade) {
      for (const item of this.items) {
        if (item.name.includes('Gate')) {
          const isHorizontalGate = item.width > item.height;
          
          if (isHorizontalGate) {
            // Check if palisade is adjacent to left or right edge of horizontal gate
            if (item.y === y && ((item.x - 1 === x) || (item.x + item.width === x))) {
              isAdjacentToGateEdge = true;
              break;
            }
          } else {
            // Check if palisade is adjacent to top or bottom edge of vertical gate
            if (item.x === x && ((item.y - 1 === y) || (item.y + item.height === y))) {
              isAdjacentToGateEdge = true;
              break;
            }
          }
        }
      }
    }
    
    // If item requires palisade overlap, ensure we found at least one palisade OR adjacent to gate
    if (requiresPalisadeOverlap && !hasOverlapWithPalisade && !isAdjacentToGateEdge) {
      return false;
    }

    return true;
  }

  /**
   * Move an item to a new position
   */
  public moveItem(item: PlacedItem, newX: number, newY: number): boolean {
    if (!this.canPlaceItem(newX, newY, item.width, item.height, item, item.requiresPalisadeOverlap)) {
      return false;
    }
    item.moveTo(newX, newY);
    return true;
  }

  /**
   * Rotate an item
   */
  public rotateItem(item: PlacedItem): boolean {
    item.rotate();
    
    if (!this.canPlaceItem(item.x, item.y, item.width, item.height, item, item.requiresPalisadeOverlap)) {
      // Revert rotation
      item.rotate();
      return false;
    }
    
    return true;
  }

  /**
   * Get all items within the specified bounds (for multi-select)
   */
  public getItemsInBounds(x1: number, y1: number, x2: number, y2: number): PlacedItem[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return this.items.filter(item => {
      // Check if item's bounding box intersects with selection box
      const itemMinX = item.x;
      const itemMaxX = item.x + item.width - 1;
      const itemMinY = item.y;
      const itemMaxY = item.y + item.height - 1;

      return !(itemMaxX < minX || itemMinX > maxX || itemMaxY < minY || itemMinY > maxY);
    });
  }

  /**
   * Clear all items
   */
  public clear(): void {
    this.items = [];
  }

  /**
   * Load items from array
   */
  public loadItems(items: PlacedItem[]): void {
    this.items = items;
  }
}
