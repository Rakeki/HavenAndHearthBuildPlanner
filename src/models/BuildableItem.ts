import { BuildableItemData, PlacedItemData } from './types';

/**
 * Represents a buildable item that can be placed on the grid
 */
export class BuildableItem {
  public readonly name: string;
  public readonly category: string;
  public readonly width: number;
  public readonly height: number;
  public readonly color: string;
  public readonly image?: string;
  public readonly imageUrl?: string;
  public readonly usesLineTool: boolean;
  private imageElement?: HTMLImageElement;

  constructor(data: BuildableItemData) {
    this.name = data.name;
    this.category = data.category;
    this.width = data.width;
    this.height = data.height;
    this.color = data.color;
    this.image = data.image;
    this.imageUrl = data.imageUrl;
    this.usesLineTool = data.usesLineTool || false;
  }

  /**
   * Preload the image for this buildable item
   */
  public preloadImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.imageElement?.complete) {
        resolve(this.imageElement);
        return;
      }

      const img = new Image();
      const src = this.image || this.imageUrl;
      
      if (!src) {
        reject(new Error('No image URL available'));
        return;
      }

      img.onload = () => {
        this.imageElement = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Get the loaded image element
   */
  public getImageElement(): HTMLImageElement | undefined {
    return this.imageElement;
  }

  /**
   * Create a PlacedItem from this buildable at the given position
   */
  public createPlacedItem(x: number, y: number): PlacedItem {
    return new PlacedItem({
      name: this.name,
      category: this.category as any,
      x,
      y,
      width: this.width,
      height: this.height,
      color: this.color,
      image: this.image,
      imageUrl: this.imageUrl,
      usesLineTool: this.usesLineTool,
    }, this.imageElement);
  }
}

/**
 * Represents an item that has been placed on the grid
 */
export class PlacedItem {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public readonly name: string;
  public readonly category: string;
  public readonly color: string;
  public readonly image?: string;
  public readonly imageUrl?: string;
  private imageElement?: HTMLImageElement;

  constructor(data: PlacedItemData, imageElement?: HTMLImageElement) {
    this.name = data.name;
    this.category = data.category;
    this.x = data.x;
    this.y = data.y;
    this.width = data.width;
    this.height = data.height;
    this.color = data.color;
    this.image = data.image;
    this.imageUrl = data.imageUrl;
    this.imageElement = imageElement;
  }

  /**
   * Check if this item overlaps with another item
   */
  public overlaps(other: PlacedItem): boolean {
    return !(
      this.x >= other.x + other.width ||
      this.x + this.width <= other.x ||
      this.y >= other.y + other.height ||
      this.y + this.height <= other.y
    );
  }

  /**
   * Check if a point is within this item's bounds
   */
  public contains(x: number, y: number): boolean {
    return x >= this.x && x < this.x + this.width &&
           y >= this.y && y < this.y + this.height;
  }

  /**
   * Check if this item is within grid bounds
   */
  public isWithinBounds(gridSize: number): boolean {
    return this.x >= 0 && this.y >= 0 &&
           this.x + this.width <= gridSize &&
           this.y + this.height <= gridSize;
  }

  /**
   * Move this item to a new position
   */
  public moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Rotate this item 90 degrees
   */
  public rotate(): void {
    const temp = this.width;
    this.width = this.height;
    this.height = temp;
  }

  /**
   * Get the loaded image element
   */
  public getImageElement(): HTMLImageElement | undefined {
    return this.imageElement;
  }

  /**
   * Set the image element (used when loading from saved data)
   */
  public setImageElement(img: HTMLImageElement): void {
    this.imageElement = img;
  }

  /**
   * Preload the image for this placed item
   */
  public preloadImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.imageElement?.complete) {
        resolve(this.imageElement);
        return;
      }

      const img = new Image();
      const src = this.image || this.imageUrl;
      
      if (!src) {
        reject(new Error('No image URL available'));
        return;
      }

      img.onload = () => {
        this.imageElement = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Serialize to plain object for saving
   */
  public toJSON(): PlacedItemData {
    return {
      name: this.name,
      category: this.category as any,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.color,
      image: this.image,
      imageUrl: this.imageUrl,
    };
  }
}
