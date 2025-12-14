import { useState, useEffect, useRef, useCallback } from 'react';
import { GridManager } from '@models/GridManager';
import { PavingManager } from '@models/PavingManager';
import { CanvasRenderer } from '@models/CanvasRenderer';
import { MeasurementTool } from '@models/MeasurementTool';
import { PlacedItem } from '@models/BuildableItem';
import { Point } from '@models/types';

export function useCanvas(gridSize: number, showBuildables: boolean = true) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
  const [gridManager] = useState(() => new GridManager(gridSize));
  const [pavingManager] = useState(() => new PavingManager());
  const [measurementTool] = useState(() => new MeasurementTool());
  const [canvasReady, setCanvasReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 0.5 = 50%, 2 = 200%

  // Check when canvas is mounted and ready
  useEffect(() => {
    if (canvasRef.current && !canvasReady) {
      setCanvasReady(true);
    }
  });

  // Initialize canvas and renderer when canvas is ready (only once)
  useEffect(() => {
    if (!canvasReady) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseCellSize = 32;
    canvas.width = gridSize * baseCellSize;
    canvas.height = gridSize * baseCellSize;

    const newRenderer = new CanvasRenderer(ctx, baseCellSize);
    newRenderer.setGridSize(gridSize);
    setRenderer(newRenderer);
    
    // Draw immediately
    newRenderer.clear();
    newRenderer.drawGrid(pavingManager);
    if (showBuildables) {
      newRenderer.drawItems(gridManager.getItems(), null);
    }
  }, [canvasReady]);

  // Update zoom when it changes
  useEffect(() => {
    if (!renderer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const scrollX = container?.scrollLeft || 0;
    const scrollY = container?.scrollTop || 0;
    const containerCenterX = (container?.clientWidth || 0) / 2;
    const containerCenterY = (container?.clientHeight || 0) / 2;
    
    // Calculate the grid position at the center before zoom
    const oldCellSize = renderer.getCellSize();
    const gridCenterX = (scrollX + containerCenterX) / oldCellSize;
    const gridCenterY = (scrollY + containerCenterY) / oldCellSize;
    
    const baseCellSize = 32;
    const cellSize = baseCellSize * zoomLevel;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    
    renderer.setCellSize(cellSize);
    
    renderer.clear();
    renderer.drawGrid(pavingManager);
    if (showBuildables) {
      renderer.drawItems(gridManager.getItems(), null);
    }
    
    // Restore scroll position to keep the same grid position centered
    if (container) {
      const newScrollX = gridCenterX * cellSize - containerCenterX;
      const newScrollY = gridCenterY * cellSize - containerCenterY;
      container.scrollLeft = newScrollX;
      container.scrollTop = newScrollY;
    }
  }, [zoomLevel, renderer, pavingManager, gridManager, showBuildables, gridSize]);

  // Update grid size when it changes
  useEffect(() => {
    if (!renderer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const baseCellSize = 32;
    const cellSize = baseCellSize * zoomLevel;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    
    gridManager.setGridSize(gridSize);
    renderer.setGridSize(gridSize);
    
    renderer.clear();
    renderer.drawGrid(pavingManager);
    if (showBuildables) {
      renderer.drawItems(gridManager.getItems(), null);
    }
  }, [gridSize]);

  const render = useCallback(
    (
      selectedItem: PlacedItem | null = null, 
      previewPoint?: Point, 
      previewBuildable?: { buildable: any, isValid: boolean, rotation?: number },
      lineTool?: any,
      selectionBoxStart?: Point,
      selectionBoxEnd?: Point,
      selectedItems?: PlacedItem[],
      previewPaving?: { cells: Array<{x: number, y: number}>, paving: any, isErase: boolean },
      dragPreview?: { x: number, y: number, isValid: boolean }
    ) => {
      if (!renderer) return;

      renderer.clear();
      renderer.drawGrid(pavingManager);
      if (showBuildables) {
        renderer.drawItems(gridManager.getItems(), selectedItem, selectedItems, dragPreview);
      }

      // Draw measurement if active
      if (measurementTool.isToolActive()) {
        renderer.drawMeasurement(measurementTool, previewPoint);
      }

      // Draw selection box if dragging
      if (selectionBoxStart && selectionBoxEnd) {
        renderer.drawSelectionBox(selectionBoxStart, selectionBoxEnd);
      }

      // Draw preview paving if available
      if (previewPaving && previewPaving.cells.length > 0) {
        renderer.drawPreviewPaving(previewPaving.cells, previewPaving.paving, previewPaving.isErase);
      }

      // Draw line tool preview if active
      if (lineTool?.isActive && lineTool.isActive() && previewBuildable?.buildable) {
        renderer.drawLineTool(lineTool, previewBuildable.buildable, gridManager);
      }
      // Draw buildable preview if available (for non-line tools)
      else if (previewBuildable && previewPoint && !previewBuildable.buildable?.usesLineTool) {
        const img = previewBuildable.buildable.getImageElement?.();
        
        // Apply rotation to dimensions
        const rotation = previewBuildable.rotation || 0;
        const shouldSwap = rotation === 90 || rotation === 270;
        const width = shouldSwap ? previewBuildable.buildable.height : previewBuildable.buildable.width;
        const height = shouldSwap ? previewBuildable.buildable.width : previewBuildable.buildable.height;
        
        renderer.drawItemPreview(
          previewPoint.x,
          previewPoint.y,
          width,
          height,
          previewBuildable.buildable.color,
          previewBuildable.isValid,
          img,
          previewBuildable.buildable.name,
          rotation
        );
      }
    },
    [renderer, gridManager, pavingManager, measurementTool, showBuildables]
  );

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel(prev => {
      const newZoom = prev + delta;
      // Clamp between 0.25 (25%) and 3 (300%)
      return Math.max(0.25, Math.min(3, newZoom));
    });
  }, []);

  return {
    canvasRef,
    renderer,
    gridManager,
    pavingManager,
    measurementTool,
    render,
    zoomLevel,
    handleZoom,
  };
}
