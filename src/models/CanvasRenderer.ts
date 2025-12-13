import { PlacedItem, BuildableItem } from './BuildableItem';
import { PavingManager } from './PavingManager';
import { MeasurementTool } from './MeasurementTool';
import { LineTool } from './LineTool';
import { Point, PavingCategory } from './types';

/**
 * Handles all canvas rendering operations
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private gridSize: number;
  private cornerImageCache: Map<string, HTMLImageElement> = new Map();

  constructor(ctx: CanvasRenderingContext2D, cellSize: number = 30) {
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.gridSize = 50;
    this.preloadCornerImages();
  }

  /**
   * Preload corner images
   */
  private preloadCornerImages(): void {
    const cornerImg = new Image();
    cornerImg.src = 'images/texture/palisade-wall-corner.png';
    cornerImg.onload = () => {
      this.cornerImageCache.set('palisade-corner', cornerImg);
    };
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
   * Set the cell size (for zooming)
   */
  public setCellSize(size: number): void {
    this.cellSize = size;
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
  public drawItems(items: PlacedItem[], selectedItem: PlacedItem | null, selectedItems?: PlacedItem[]): void {
    items.forEach(item => {
      const x = item.x * this.cellSize;
      const y = item.y * this.cellSize;
      const width = item.width * this.cellSize;
      const height = item.height * this.cellSize;

      const isMultiSelected = selectedItems?.includes(item) || false;

      // For line tool items (fences/walls), draw with texture if available
      if (item.usesLineTool) {
        let img = item.getImageElement();
        const isCorner = item.orientation === 'corner';
        
        // Use corner image if this is marked as a corner piece
        if (isCorner) {
          const cornerImg = this.cornerImageCache.get('palisade-corner');
          if (cornerImg?.complete) {
            img = cornerImg;
          }
        }
        
        if (img?.complete) {
          // Check orientation for rotation (corners don't rotate)
          const isVertical = item.orientation === 'vertical';
          
          if (isVertical) {
            // Save context state
            this.ctx.save();
            
            // Move to center of the item
            this.ctx.translate(x + width / 2, y + height / 2);
            
            // Rotate 90 degrees clockwise
            this.ctx.rotate(Math.PI / 2);
            
            // Draw image centered (note: width and height are swapped for rotation)
            this.ctx.drawImage(
              img,
              -height / 2,
              -width / 2,
              height,
              width
            );
            
            // Restore context state
            this.ctx.restore();
          } else {
            // Draw horizontally or corner (no rotation)
            this.ctx.drawImage(img, x, y, width, height);
          }
        } else {
          // Fallback to color if no image
          this.ctx.fillStyle = item.color;
          this.ctx.fillRect(x, y, width, height);
        }
        
        // Draw border if selected (single or multi)
        if (selectedItem === item || isMultiSelected) {
          this.ctx.strokeStyle = '#FFD700';
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(x, y, width, height);
        }
      } else {
        // Regular items - draw with icons/images and borders
        // Don't draw background for gates or items with gridImage (they should be transparent)
        const isGate = item.name.includes('Gate');
        const hasGridImage = !!item.gridImage;
        
        if (!isGate && !hasGridImage) {
          // Draw background color
          this.ctx.fillStyle = item.color;
          this.ctx.fillRect(x, y, width, height);
        }

        // Draw border (if selected, or normal border for non-gates)
        if (selectedItem === item || isMultiSelected) {
          this.ctx.strokeStyle = '#FFD700';
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(x, y, width, height);
        } else if (!isGate && !hasGridImage) {
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x, y, width, height);
        }

        // Draw image if available
        const img = item.getImageElement();
        if (img?.complete) {
          // No padding for gates, small padding for other items
          const padding = isGate ? 0 : 4;
          const rotation = item.rotation || 0;
          
          if (rotation !== 0) {
            // Save context state
            this.ctx.save();
            
            // Move to center of the item
            this.ctx.translate(x + width / 2, y + height / 2);
            
            // Rotate by the specified angle
            this.ctx.rotate((rotation * Math.PI) / 180);
            
            // Swap dimensions back for drawing since we want to draw the image
            // in its original orientation, then let rotation transform it
            const shouldSwap = rotation === 90 || rotation === 270;
            const drawWidth = shouldSwap ? height : width;
            const drawHeight = shouldSwap ? width : height;
            
            // Draw image centered in original orientation
            this.ctx.drawImage(
              img,
              -drawWidth / 2 + padding,
              -drawHeight / 2 + padding,
              drawWidth - padding * 2,
              drawHeight - padding * 2
            );
            
            // Restore context state
            this.ctx.restore();
          } else {
            // No rotation - draw normally
            this.ctx.drawImage(
              img,
              x + padding,
              y + padding,
              width - padding * 2,
              height - padding * 2
            );
          }
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
      }
    });
  }

  /**
   * Draw a preview of an item being placed
   */
  public drawItemPreview(x: number, y: number, width: number, height: number, color: string, isValid: boolean, imageElement?: HTMLImageElement | null, name?: string, rotation?: number): void {
    const pixelX = x * this.cellSize;
    const pixelY = y * this.cellSize;
    const pixelWidth = width * this.cellSize;
    const pixelHeight = height * this.cellSize;

    // Don't draw background for gates or items with images (check if imageElement is from gridImage)
    const isGate = name?.includes('Gate');
    // If there's an image, skip background (assumes items with gridImage don't need background)
    const hasImage = imageElement?.complete;
    
    if (!isGate && !hasImage) {
      this.ctx.globalAlpha = 0.7;
      this.ctx.fillStyle = isValid ? color : '#ff0000';
      this.ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
    }

    this.ctx.strokeStyle = isValid ? '#00ff00' : '#ff0000';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    this.ctx.setLineDash([]);

    // Draw image if available
    if (imageElement?.complete) {
      // No padding for gates, small padding for other items
      const padding = isGate ? 0 : 4;
      const rot = rotation || 0;
      
      if (rot !== 0) {
        // Save context state
        this.ctx.save();
        
        // Move to center of the preview
        this.ctx.translate(pixelX + pixelWidth / 2, pixelY + pixelHeight / 2);
        
        // Rotate by the specified angle
        this.ctx.rotate((rot * Math.PI) / 180);
        
        // Swap dimensions back for drawing since we want to draw the image
        // in its original orientation, then let rotation transform it
        const shouldSwap = rot === 90 || rot === 270;
        const drawWidth = shouldSwap ? pixelHeight : pixelWidth;
        const drawHeight = shouldSwap ? pixelWidth : pixelHeight;
        
        // Draw image centered in original orientation
        this.ctx.drawImage(
          imageElement,
          -drawWidth / 2 + padding,
          -drawHeight / 2 + padding,
          drawWidth - padding * 2,
          drawHeight - padding * 2
        );
        
        // Restore context state
        this.ctx.restore();
      } else {
        // No rotation - draw normally
        this.ctx.drawImage(
          imageElement,
          pixelX + padding,
          pixelY + padding,
          pixelWidth - padding * 2,
          pixelHeight - padding * 2
        );
      }
    } else if (name) {
      // Draw name as text fallback
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const textX = pixelX + pixelWidth / 2;
      const textY = pixelY + pixelHeight / 2;

      // Text shadow
      this.ctx.fillStyle = '#000';
      this.ctx.fillText(name, textX + 1, textY + 1);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(name, textX, textY);
    }

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
   * Draw line tool preview for fences, walls, and palisades
   */
  public drawLineTool(lineTool: LineTool, buildable: BuildableItem, gridManager: any): void {
    if (!lineTool.isActive()) return;

    const cells = lineTool.getAllCells();
    let img = buildable.getImageElement();

    cells.forEach((cell, index) => {
      const pixelX = cell.x * this.cellSize;
      const pixelY = cell.y * this.cellSize;
      
      // Check if this cell can be placed
      const isValid = gridManager.canPlaceItem(cell.x, cell.y, 1, 1, null);

      // Draw cell with texture if available, otherwise use color
      this.ctx.globalAlpha = 0.7;
      
      // Use different image for corners
      let cellImg = img;
      const isCorner = cell.orientation === 'corner';
      if (isCorner) {
        const cornerImg = this.cornerImageCache.get('palisade-corner');
        if (cornerImg?.complete) {
          cellImg = cornerImg;
        }
      }
      
      if (cellImg?.complete) {
        const isVertical = cell.orientation === 'vertical';
        
        if (isVertical) {
          // Save context state
          this.ctx.save();
          
          // Move to center of the cell
          this.ctx.translate(pixelX + this.cellSize / 2, pixelY + this.cellSize / 2);
          
          // Rotate 90 degrees clockwise
          this.ctx.rotate(Math.PI / 2);
          
          // Draw image centered
          this.ctx.drawImage(
            cellImg,
            -this.cellSize / 2,
            -this.cellSize / 2,
            this.cellSize,
            this.cellSize
          );
          
          // Restore context state
          this.ctx.restore();
        } else {
          // Draw horizontally or corner
          this.ctx.drawImage(cellImg, pixelX, pixelY, this.cellSize, this.cellSize);
        }
      } else {
        // Fallback to color
        this.ctx.fillStyle = isValid ? buildable.color : '#ff0000';
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
      }

      // Draw border - highlight corners/endpoints
      const isEndpoint = index === 0 || index === cells.length - 1;
      this.ctx.strokeStyle = isValid ? (isEndpoint ? '#00ff00' : '#88ff88') : '#ff0000';
      this.ctx.lineWidth = isEndpoint ? 3 : 2;
      this.ctx.setLineDash(isEndpoint ? [] : [5, 5]);
      this.ctx.strokeRect(pixelX, pixelY, this.cellSize, this.cellSize);
      this.ctx.setLineDash([]);
    });

    this.ctx.globalAlpha = 1.0;

    // Draw direction indicator
    if (cells.length > 1) {
      const direction = lineTool.getCurrentDirection();
      const lastCell = cells[cells.length - 1];
      const centerX = lastCell.x * this.cellSize + this.cellSize / 2;
      const centerY = lastCell.y * this.cellSize + this.cellSize / 2;

      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Draw direction text
      const directionText = direction === 'horizontal' ? '↔' : '↕';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText(directionText, centerX + 1, centerY - 1);
      this.ctx.fillStyle = '#00ff00';
      this.ctx.fillText(directionText, centerX, centerY);

      // Draw info text
      const infoText = `${cells.length} tiles - Click to place, click corner to change direction`;
      const infoY = Math.min(centerY + this.cellSize, this.gridSize * this.cellSize - 20);
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const textWidth = this.ctx.measureText(infoText).width;
      this.ctx.fillRect(centerX - textWidth / 2 - 5, infoY - 15, textWidth + 10, 20);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(infoText, centerX, infoY - 5);
    }
  }

  /**
   * Draw preview paving cells (before committing on mouse release)
   */
  public drawPreviewPaving(cells: Array<{x: number, y: number}>, paving: any, isErase: boolean = false): void {
    cells.forEach(cell => {
      const pixelX = cell.x * this.cellSize;
      const pixelY = cell.y * this.cellSize;

      if (isErase) {
        // Show erase preview with red overlay
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
        
        // Draw X pattern
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(pixelX + 2, pixelY + 2);
        this.ctx.lineTo(pixelX + this.cellSize - 2, pixelY + this.cellSize - 2);
        this.ctx.moveTo(pixelX + this.cellSize - 2, pixelY + 2);
        this.ctx.lineTo(pixelX + 2, pixelY + this.cellSize - 2);
        this.ctx.stroke();
      } else if (paving) {
        // Draw preview with semi-transparent overlay
        const imageElement = paving.getImageElement?.();
        
        if (imageElement?.complete && imageElement.naturalWidth > 0) {
          try {
            this.ctx.globalAlpha = 0.6;
            this.ctx.drawImage(
              imageElement,
              pixelX,
              pixelY,
              this.cellSize,
              this.cellSize
            );
            this.ctx.globalAlpha = 1.0;
          } catch (e) {
            // Fallback to color preview
            this.ctx.fillStyle = 'rgba(100, 150, 255, 0.4)';
            this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
          }
        } else {
          // Fallback to color preview
          this.ctx.fillStyle = 'rgba(100, 150, 255, 0.4)';
          this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
        }
        
        // Draw green border to indicate preview
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(pixelX, pixelY, this.cellSize, this.cellSize);
        this.ctx.setLineDash([]);
      }
    });
  }

  /**
   * Draw selection box for multi-select
   */
  public drawSelectionBox(start: Point, end: Point): void {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const pixelX = minX * this.cellSize;
    const pixelY = minY * this.cellSize;
    const pixelWidth = (maxX - minX + 1) * this.cellSize;
    const pixelHeight = (maxY - minY + 1) * this.cellSize;

    // Draw semi-transparent fill
    this.ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
    this.ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);

    // Draw dashed border
    this.ctx.strokeStyle = '#0096FF';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    this.ctx.setLineDash([]);
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
