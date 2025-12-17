import { useState, useEffect, useRef, useCallback } from 'react';
import { GridManager } from '@models/GridManager';
import { PavingManager } from '@models/PavingManager';
import { CanvasRenderer } from '@models/CanvasRenderer';
import { MeasurementTool } from '@models/MeasurementTool';
import { InteriorManager } from '@models/InteriorManager';
import { PlacedItem } from '@models/BuildableItem';
import { Point } from '@models/types';

export function useCanvas(gridWidth: number, gridHeight: number, showBuildables: boolean = true, activeInteriorId: string | null = null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
  const [gridManager] = useState(() => new GridManager(gridWidth, gridHeight));
  const [pavingManager] = useState(() => new PavingManager());
  const [interiorManager] = useState(() => new InteriorManager());
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
    // Add extra height for potential interiors (we'll start with 30 rows of extra space)
    const extraHeightForInteriors = baseCellSize * 30;
    canvas.width = gridWidth * baseCellSize;
    canvas.height = gridHeight * baseCellSize + extraHeightForInteriors;

    const newRenderer = new CanvasRenderer(ctx, baseCellSize);
    newRenderer.setGridSize(gridWidth, gridHeight);
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
    canvas.width = gridWidth * cellSize;
    canvas.height = gridHeight * cellSize;
    
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
  }, [zoomLevel, renderer, pavingManager, gridManager, showBuildables, gridWidth, gridHeight]);

  // Update grid size when it changes
  useEffect(() => {
    if (!renderer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const baseCellSize = 32;
    const cellSize = baseCellSize * zoomLevel;
    const extraHeightForInteriors = cellSize * 30;
    canvas.width = gridWidth * cellSize;
    canvas.height = gridHeight * cellSize + extraHeightForInteriors;
    
    gridManager.setGridSize(gridWidth, gridHeight);
    renderer.setGridSize(gridWidth, gridHeight);
    
    renderer.clear();
    renderer.drawGrid(pavingManager);
    if (showBuildables) {
      renderer.drawItems(gridManager.getItems(), null);
    }
  }, [gridWidth, gridHeight]);

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

      // Resize canvas based on mode
      const canvas = canvasRef.current;
      if (canvas) {
        const cellSize = renderer.getCellSize();
        const mainGridHeight = gridHeight * cellSize;
        const mainGridWidth = gridWidth * cellSize;
        
        if (activeInteriorId) {
          // Interior overlay mode - size canvas to the interior
          const interior = interiorManager.getInterior(activeInteriorId);
          if (interior) {
            const size = interior.getSize();
            canvas.width = size.width * cellSize;
            canvas.height = size.height * cellSize;
          }
        } else {
          // Normal mode - ensure canvas is sized for main grid only
          canvas.width = mainGridWidth;
          canvas.height = mainGridHeight;
        }
      }

      renderer.clear();
      
      // Render based on mode
      if (activeInteriorId) {
        // Interior overlay mode - draw only the interior
        const interior = interiorManager.getInterior(activeInteriorId);
        if (interior) {
          renderer.drawInteriorOverlay(interior, selectedItem, selectedItems, dragPreview);
        }
      } else {
        // Normal mode - draw main grid
        renderer.drawGrid(pavingManager);
        if (showBuildables) {
          renderer.drawItems(gridManager.getItems(), selectedItem, selectedItems, dragPreview);
        }

      }

      // Draw measurement if active (only in normal mode)
      if (!activeInteriorId && measurementTool.isToolActive()) {
        renderer.drawMeasurement(measurementTool, previewPoint);
      }

      // Draw selection box if dragging
      if (selectionBoxStart && selectionBoxEnd) {
        renderer.drawSelectionBox(selectionBoxStart, selectionBoxEnd);
      }

      // Draw preview paving if available (only in normal mode)
      if (!activeInteriorId && previewPaving && previewPaving.cells.length > 0) {
        renderer.drawPreviewPaving(previewPaving.cells, previewPaving.paving, previewPaving.isErase);
      }

      // Draw line tool preview if active (only in normal mode)
      if (!activeInteriorId && lineTool?.isActive && lineTool.isActive() && previewBuildable?.buildable) {
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
    [renderer, gridManager, pavingManager, interiorManager, measurementTool, showBuildables, activeInteriorId]
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
    interiorManager,
    measurementTool,
    render,
    zoomLevel,
    handleZoom,
  };
}
