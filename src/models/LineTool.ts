import { Point, PointWithOrientation } from './types';

/**
 * Manages line drawing for fences, walls, and palisades
 * Supports only vertical and horizontal lines
 */
export class LineTool {
  private startPoint: Point | null = null;
  private currentDirection: 'horizontal' | 'vertical' | null = null;
  private currentSegment: PointWithOrientation[] = [];

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
   * Get the current segment being drawn
   */
  public getCurrentSegment(): PointWithOrientation[] {
    return this.currentSegment;
  }

  /**
   * Start a new line at the given point
   * Checks if the starting point should be a corner based on existing items
   */
  public startLine(point: Point): void {
    this.startPoint = point;
    this.currentDirection = null;
    
    // Check if starting point connects to existing palisade
    // We don't know the orientation yet, but we can mark it for corner checking
    this.currentSegment = [point];
  }

  /**
   * Update the current line endpoint
   * Constrains movement to horizontal or vertical based on initial direction
   */
  public updateEndPoint(point: Point): PointWithOrientation[] {
    if (!this.startPoint) return [];

    // Determine direction if not set
    if (!this.currentDirection) {
      const dx = Math.abs(point.x - this.startPoint.x);
      const dy = Math.abs(point.y - this.startPoint.y);
      
      if (dx === 0 && dy === 0) {
        return [{ ...this.startPoint, orientation: 'horizontal' }];
      }
      
      // Set direction based on which axis has more movement
      this.currentDirection = dx >= dy ? 'horizontal' : 'vertical';
    }

    // Calculate cells along the line with orientation
    const cells: PointWithOrientation[] = [];
    
    if (this.currentDirection === 'horizontal') {
      // Horizontal line - keep y constant
      const y = this.startPoint.y;
      const startX = Math.min(this.startPoint.x, point.x);
      const endX = Math.max(this.startPoint.x, point.x);
      
      for (let x = startX; x <= endX; x++) {
        cells.push({ x, y, orientation: 'horizontal' });
      }
    } else {
      // Vertical line - keep x constant
      const x = this.startPoint.x;
      const startY = Math.min(this.startPoint.y, point.y);
      const endY = Math.max(this.startPoint.y, point.y);
      
      for (let y = startY; y <= endY; y++) {
        cells.push({ x, y, orientation: 'vertical' });
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
   * Complete the current line and return cells
   */
  public completeLine(): PointWithOrientation[] {
    const cells = [...this.currentSegment];
    this.reset();
    return cells;
  }

  /**
   * Get all cells that are part of the current line (for preview)
   */
  public getAllCells(): PointWithOrientation[] {
    return [...this.currentSegment];
  }
  
  /**
   * Get all cells with corners marked at connection points
   */
  public getAllCellsWithCorners(placedItems: any[]): PointWithOrientation[] {
    if (this.currentSegment.length === 0) return [];
    
    const result = [...this.currentSegment];
    
    // Single cell placement should always be a corner post
    if (result.length === 1) {
      result[0] = { ...result[0], orientation: 'corner' };
      return result;
    }
    
    // First cell is always a corner (lines always start with corner posts)
    result[0] = { ...result[0], orientation: 'corner' };
    
    // Check if last cell connects to existing palisade with different orientation
    const lastCell = result[result.length - 1];
    const existingAtEnd = placedItems.find(
      item => item.x === lastCell.x && item.y === lastCell.y && 
              item.usesLineTool && item.orientation &&
              item.orientation !== 'corner' &&
              item.orientation !== lastCell.orientation
    );
    if (existingAtEnd) {
      result[result.length - 1] = { ...lastCell, orientation: 'corner' };
    }
    
    return result;
  }

  /**
   * Reset the line tool
   */
  public reset(): void {
    this.startPoint = null;
    this.currentDirection = null;
    this.currentSegment = [];
  }

  /**
   * Cancel the current line without placing it
   */
  public cancel(): void {
    this.reset();
  }
}
