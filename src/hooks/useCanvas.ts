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

  // Check when canvas is mounted and ready
  useEffect(() => {
    if (canvasRef.current && !canvasReady) {
      setCanvasReady(true);
    }
  });

  // Initialize canvas and renderer when canvas is ready
  useEffect(() => {
    if (!canvasReady) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 20;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;

    const newRenderer = new CanvasRenderer(ctx, cellSize);
    newRenderer.setGridSize(gridSize);
    setRenderer(newRenderer);
    
    // Draw immediately
    newRenderer.clear();
    newRenderer.drawGrid(pavingManager);
    if (showBuildables) {
      newRenderer.drawItems(gridManager.getItems(), null);
    }
  }, [canvasReady, gridSize, pavingManager, gridManager, showBuildables]);

  // Update grid size when it changes
  useEffect(() => {
    if (!renderer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const cellSize = 20;
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
    (selectedItem: PlacedItem | null = null, previewPoint?: Point) => {
      if (!renderer) return;

      renderer.clear();
      renderer.drawGrid(pavingManager);
      if (showBuildables) {
        renderer.drawItems(gridManager.getItems(), selectedItem);
      }

      // Draw measurement if active
      if (measurementTool.isToolActive()) {
        renderer.drawMeasurement(measurementTool, previewPoint);
      }
    },
    [renderer, gridManager, pavingManager, measurementTool, showBuildables]
  );

  return {
    canvasRef,
    renderer,
    gridManager,
    pavingManager,
    measurementTool,
    render,
  };
}
