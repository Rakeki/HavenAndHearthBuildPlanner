import { PlacedItem } from './BuildableItem';
import { PavingManager } from './PavingManager';
import { MeasurementTool } from './MeasurementTool';
import { Point, PavingCategory } from './types';

/**
 * Handles all canvas rendering operations
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private gridSize: number;

  constructor(ctx: CanvasRenderingContext2D, cellSize: number = 20) {
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.gridSize = 50;
  }

  /**
   * Set the grid size
   */
  public setGridSize(size: number): void {
    this.gridSize = size;
  }

  /**
   * Get the cell size
   */
  public getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    const width = this.gridSize * this.cellSize;
    const height = this.gridSize * this.cellSize;
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * Draw the grid background
   */
  public drawGrid(pavingManager: PavingManager): void {
    const width = this.gridSize * this.cellSize;
    const height = this.gridSize * this.cellSize;

    // Background
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(0, 0, width, height);

    // Draw paving first (under grid lines)
    this.drawPaving(pavingManager);

    // Grid lines
    this.ctx.strokeStyle = '#dee2e6';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += this.cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= height; y += this.cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw paving tiles
   */
  private drawPaving(pavingManager: PavingManager): void {
    const allPaving = pavingManager.getAllPaving();
    
    allPaving.forEach((paving, key) => {
      const [x, y] = key.split(',').map(Number);
      const pixelX = x * this.cellSize;
      const pixelY = y * this.cellSize;

      if (paving.imageElement?.complete && paving.imageElement.naturalWidth > 0) {
        try {
          this.ctx.drawImage(
            paving.imageElement,
            pixelX,
            pixelY,
            this.cellSize,
            this.cellSize
          );
        } catch (e) {
          this.drawPavingFallback(pixelX, pixelY, this.cellSize, paving.name, paving.category);
        }
      } else {
        this.drawPavingFallback(pixelX, pixelY, this.cellSize, paving.name, paving.category);
      }
    });
  }

  /**
   * Draw fallback paving when image is not available
   */
  private drawPavingFallback(x: number, y: number, size: number, name: string, category: PavingCategory): void {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const baseColor = this.getCategoryColor(category, hash);

    this.ctx.fillStyle = baseColor;
    this.ctx.globalAlpha = 0.85;
    this.ctx.fillRect(x, y, size, size);

    // Add subtle texture pattern
    this.ctx.globalAlpha = 0.3;
    const patternSize = 4;
    for (let py = 0; py < size; py += patternSize) {
      for (let px = 0; px < size; px += patternSize) {
        if ((px + py + hash) % (patternSize * 2) === 0) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(x + px, y + py, patternSize / 2, patternSize / 2);
        }
      }
    }

    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Get color based on paving category
   */
  private getCategoryColor(category: PavingCategory, hash: number): string {
    switch (category) {
      case 'stone': {
        const grayShade = 100 + (Math.abs(hash) % 80);
        return `rgb(${grayShade}, ${grayShade}, ${grayShade})`;
      }
      case 'ore': {
        const r = 100 + (Math.abs(hash) % 100);
        const g = 50 + (Math.abs(hash >> 8) % 70);
        const b = 30 + (Math.abs(hash >> 16) % 50);
        return `rgb(${r}, ${g}, ${b})`;
      }
      case 'metal': {
        const metalShade = 150 + (Math.abs(hash) % 80);
        const tint = Math.abs(hash >> 8) % 30;
        return `rgb(${metalShade}, ${metalShade - tint}, ${metalShade - tint * 2})`;
      }
      case 'brick': {
        const red = 150 + (Math.abs(hash) % 80);
        const green = 60 + (Math.abs(hash >> 8) % 60);
        const blue = 40 + (Math.abs(hash >> 16) % 60);
        return `rgb(${red}, ${green}, ${blue})`;
      }
      case 'special': {
        const pr = 120 + (Math.abs(hash) % 80);
        const pg = 60 + (Math.abs(hash >> 8) % 80);
        const pb = 140 + (Math.abs(hash >> 16) % 80);
        return `rgb(${pr}, ${pg}, ${pb})`;
      }
      default:
        return '#999999';
    }
  }

  /**
   * Draw all placed items
   */
  public drawItems(items: PlacedItem[], selectedItem: PlacedItem | null): void {
    items.forEach(item => {
      const x = item.x * this.cellSize;
      const y = item.y * this.cellSize;
      const width = item.width * this.cellSize;
      const height = item.height * this.cellSize;

      // Draw background color
      this.ctx.fillStyle = item.color;
      this.ctx.fillRect(x, y, width, height);

      // Draw border
      this.ctx.strokeStyle = selectedItem === item ? '#FFD700' : '#000';
      this.ctx.lineWidth = selectedItem === item ? 3 : 2;
      this.ctx.strokeRect(x, y, width, height);

      // Draw image if available
      const img = item.getImageElement();
      if (img?.complete) {
        const padding = 4;
        this.ctx.drawImage(
          img,
          x + padding,
          y + padding,
          width - padding * 2,
          height - padding * 2
        );
      } else {
        // Draw name as text fallback
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const textX = x + width / 2;
        const textY = y + height / 2;

        // Text shadow
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(item.name, textX + 1, textY + 1);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(item.name, textX, textY);
      }
    });
  }

  /**
   * Draw a preview of an item being placed
   */
  public drawItemPreview(x: number, y: number, width: number, height: number, color: string, isValid: boolean): void {
    const pixelX = x * this.cellSize;
    const pixelY = y * this.cellSize;
    const pixelWidth = width * this.cellSize;
    const pixelHeight = height * this.cellSize;

    this.ctx.globalAlpha = 0.7;
    this.ctx.fillStyle = isValid ? color : '#ff0000';
    this.ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);

    this.ctx.strokeStyle = isValid ? '#00ff00' : '#ff0000';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Draw measurement line and info
   */
  public drawMeasurement(tool: MeasurementTool, previewPoint?: Point): void {
    const point1 = tool.getFirstPoint();
    if (!point1) return;

    const point2 = previewPoint || tool.getSecondPoint();
    if (!point2) return;

    const x1 = point1.x * this.cellSize + this.cellSize / 2;
    const y1 = point1.y * this.cellSize + this.cellSize / 2;
    const x2 = point2.x * this.cellSize + this.cellSize / 2;
    const y2 = point2.y * this.cellSize + this.cellSize / 2;

    const isPreview = !!previewPoint;

    // Draw line
    this.ctx.strokeStyle = isPreview ? '#ffaa00' : '#00ff00';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw points
    this.drawMeasurementPoint(x1, y1, isPreview);
    this.drawMeasurementPoint(x2, y2, isPreview);

    // Draw info box if measurement is complete
    if (!isPreview) {
      this.drawMeasurementInfo(tool, x1, y1, x2, y2);
    }
  }

  /**
   * Draw a measurement point
   */
  private drawMeasurementPoint(x: number, y: number, isPreview: boolean): void {
    this.ctx.fillStyle = isPreview ? '#ffaa00' : '#00ff00';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draw measurement information box
   */
  private drawMeasurementInfo(tool: MeasurementTool, x1: number, y1: number, x2: number, y2: number): void {
    const euclidean = tool.getEuclideanDistance();
    const manhattan = tool.getManhattanDistance();
    const dx = tool.getDeltaX();
    const dy = tool.getDeltaY();

    const text1 = `Distance: ${euclidean.toFixed(2)} tiles`;
    const text2 = `Δx: ${dx}, Δy: ${dy}`;
    const text3 = `Manhattan: ${manhattan} tiles`;

    this.ctx.font = 'bold 14px Arial';
    const maxWidth = Math.max(
      this.ctx.measureText(text1).width,
      this.ctx.measureText(text2).width,
      this.ctx.measureText(text3).width
    );
    const boxWidth = maxWidth + 20;
    const boxHeight = 70;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Position box to avoid going off canvas
    const canvasWidth = this.gridSize * this.cellSize;
    const canvasHeight = this.gridSize * this.cellSize;
    let boxX = midX - boxWidth / 2;
    let boxY = midY - boxHeight / 2;
    boxX = Math.max(5, Math.min(boxX, canvasWidth - boxWidth - 5));
    boxY = Math.max(5, Math.min(boxY, canvasHeight - boxHeight - 5));

    // Draw background box
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Draw text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text1, boxX + boxWidth / 2, boxY + 20);
    this.ctx.fillText(text2, boxX + boxWidth / 2, boxY + 40);
    this.ctx.fillText(text3, boxX + boxWidth / 2, boxY + 60);
    this.ctx.textAlign = 'left';
  }

  /**
   * Convert mouse coordinates to grid coordinates
   */
  public mouseToGrid(mouseX: number, mouseY: number): Point {
    return {
      x: Math.floor(mouseX / this.cellSize),
      y: Math.floor(mouseY / this.cellSize),
    };
  }
}
