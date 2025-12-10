import { Point } from './types';

/**
 * Manages measurement operations on the grid
 */
export class MeasurementTool {
  private point1: Point | null = null;
  private point2: Point | null = null;
  private isActive: boolean = false;

  /**
   * Activate the measurement tool
   */
  public activate(): void {
    this.isActive = true;
    this.point1 = null;
    this.point2 = null;
  }

  /**
   * Deactivate the measurement tool
   */
  public deactivate(): void {
    this.isActive = false;
    this.point1 = null;
    this.point2 = null;
  }

  /**
   * Check if the tool is active
   */
  public isToolActive(): boolean {
    return this.isActive;
  }

  /**
   * Set the first measurement point
   */
  public setFirstPoint(point: Point): void {
    this.point1 = point;
    this.point2 = null;
  }

  /**
   * Set the second measurement point
   */
  public setSecondPoint(point: Point): void {
    if (!this.point1) {
      this.setFirstPoint(point);
    } else {
      this.point2 = point;
    }
  }

  /**
   * Get the first point
   */
  public getFirstPoint(): Point | null {
    return this.point1;
  }

  /**
   * Get the second point
   */
  public getSecondPoint(): Point | null {
    return this.point2;
  }

  /**
   * Check if measurement is complete
   */
  public isComplete(): boolean {
    return this.point1 !== null && this.point2 !== null;
  }

  /**
   * Calculate Euclidean distance between the two points (inclusive cell count)
   */
  public getEuclideanDistance(): number {
    if (!this.point1 || !this.point2) return 0;
    const dx = Math.abs(this.point2.x - this.point1.x) + 1;
    const dy = Math.abs(this.point2.y - this.point1.y) + 1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Manhattan distance between the two points (inclusive cell count)
   */
  public getManhattanDistance(): number {
    if (!this.point1 || !this.point2) return 0;
    const dx = Math.abs(this.point2.x - this.point1.x) + 1;
    const dy = Math.abs(this.point2.y - this.point1.y) + 1;
    return dx + dy - 1; // Subtract 1 because we count the shared starting cell once
  }

  /**
   * Get delta X
   */
  public getDeltaX(): number {
    if (!this.point1 || !this.point2) return 0;
    return Math.abs(this.point2.x - this.point1.x) + 1;
  }

  /**
   * Get delta Y
   */
  public getDeltaY(): number {
    if (!this.point1 || !this.point2) return 0;
    return Math.abs(this.point2.y - this.point1.y) + 1;
  }

  /**
   * Reset the measurement
   */
  public reset(): void {
    this.point1 = null;
    this.point2 = null;
  }
}
