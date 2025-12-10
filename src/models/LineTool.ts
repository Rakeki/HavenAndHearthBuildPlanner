import { Point } from './types';

/**
 * Manages line drawing for fences, walls, and palisades
 * Supports only vertical and horizontal lines
 */
export class LineTool {
  private startPoint: Point | null = null;
  private currentDirection: 'horizontal' | 'vertical' | null = null;
  private placedSegments: Point[][] = [];
  private currentSegment: Point[] = [];

  /**
   * Check if the line tool is currently active
   */
  public isActive(): boolean {
    return this.startPoint !== null;
  }

  /**
   * Get the start point of the current line
   */
  public getStartPoint(): Point | null {
    return this.startPoint;
  }

  /**
   * Get the current direction
   */
  public getCurrentDirection(): 'horizontal' | 'vertical' | null {
    return this.currentDirection;
  }

  /**
   * Get all placed segments
   */
  public getPlacedSegments(): Point[][] {
    return this.placedSegments;
  }

  /**
   * Get the current segment being drawn
   */
  public getCurrentSegment(): Point[] {
    return this.currentSegment;
  }

  /**
   * Start a new line at the given point
   */
  public startLine(point: Point): void {
    this.startPoint = point;
    this.currentDirection = null;
    this.currentSegment = [point];
  }

  /**
   * Update the current line endpoint
   * Constrains movement to horizontal or vertical based on initial direction
   */
  public updateEndPoint(point: Point): Point[] {
    if (!this.startPoint) return [];

    // Determine direction if not set
    if (!this.currentDirection) {
      const dx = Math.abs(point.x - this.startPoint.x);
      const dy = Math.abs(point.y - this.startPoint.y);
      
      if (dx === 0 && dy === 0) {
        return [this.startPoint];
      }
      
      // Set direction based on which axis has more movement
      this.currentDirection = dx >= dy ? 'horizontal' : 'vertical';
    }

    // Calculate cells along the line
    const cells: Point[] = [];
    
    if (this.currentDirection === 'horizontal') {
      // Horizontal line - keep y constant
      const y = this.startPoint.y;
      const startX = Math.min(this.startPoint.x, point.x);
      const endX = Math.max(this.startPoint.x, point.x);
      
      for (let x = startX; x <= endX; x++) {
        cells.push({ x, y });
      }
    } else {
      // Vertical line - keep x constant
      const x = this.startPoint.x;
      const startY = Math.min(this.startPoint.y, point.y);
      const endY = Math.max(this.startPoint.y, point.y);
      
      for (let y = startY; y <= endY; y++) {
        cells.push({ x, y });
      }
    }

    this.currentSegment = cells;
    return cells;
  }

  /**
   * Check if a point is at the end of the current line (corner)
   * Returns true if clicking this point would allow changing direction
   */
  public isCornerPoint(point: Point): boolean {
    if (!this.startPoint || this.currentSegment.length === 0) return false;

    const lastPoint = this.currentSegment[this.currentSegment.length - 1];
    return lastPoint.x === point.x && lastPoint.y === point.y;
  }

  /**
   * Extend the line from the current endpoint in a new direction
   */
  public extendLine(point: Point): void {
    if (this.currentSegment.length === 0) return;

    // Save the current segment
    if (this.currentSegment.length > 1) {
      this.placedSegments.push([...this.currentSegment]);
    }

    // Start a new segment from the last point
    const lastPoint = this.currentSegment[this.currentSegment.length - 1];
    this.startPoint = lastPoint;
    this.currentDirection = null; // Reset direction
    this.currentSegment = [lastPoint];
    
    // Update with the new endpoint
    this.updateEndPoint(point);
  }

  /**
   * Complete the current line and save it
   */
  public completeLine(): Point[][] {
    if (this.currentSegment.length > 1) {
      this.placedSegments.push([...this.currentSegment]);
    }

    const allSegments = [...this.placedSegments];
    this.reset();
    return allSegments;
  }

  /**
   * Get all cells that are part of the current line (for preview)
   */
  public getAllCells(): Point[] {
    const allCells: Point[] = [];
    
    // Add all placed segments
    for (const segment of this.placedSegments) {
      allCells.push(...segment);
    }
    
    // Add current segment
    allCells.push(...this.currentSegment);
    
    // Remove duplicates
    const uniqueCells = new Map<string, Point>();
    for (const cell of allCells) {
      const key = `${cell.x},${cell.y}`;
      if (!uniqueCells.has(key)) {
        uniqueCells.set(key, cell);
      }
    }
    
    return Array.from(uniqueCells.values());
  }

  /**
   * Reset the line tool
   */
  public reset(): void {
    this.startPoint = null;
    this.currentDirection = null;
    this.placedSegments = [];
    this.currentSegment = [];
  }

  /**
   * Cancel the current line without placing it
   */
  public cancel(): void {
    this.reset();
  }
}
