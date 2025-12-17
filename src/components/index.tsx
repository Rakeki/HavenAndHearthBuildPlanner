// Simplified component stubs - full implementations would follow similar patterns

import React from 'react';
import { PavingManager } from '@models/PavingManager';

export const PavingSidebar: React.FC<any> = ({ dataService, selection, pavingManager, render, onStateChange }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const filteredPavings = dataService.filterPavingTypes(searchTerm, category);
  
  const handleClearAllPaving = () => {
    if (onStateChange) onStateChange();
    pavingManager.clear();
    render();
  };
  
  return (
    <aside className="paving-sidebar">
      <h2>Paving Types</h2>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search paving..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="category-filter">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Types</option>
          <option value="stone">Stone</option>
          <option value="ore">Ore</option>
          <option value="metal">Metal</option>
          <option value="brick">Brick</option>
          <option value="special">Special Stone</option>
        </select>
      </div>
      <div className="paving-controls">
        <div className="shape-tools">
          <button 
            className={`shape-btn ${selection.pavingShapeMode === 'line' ? 'active' : ''}`}
            onClick={() => selection.setShapeMode('line')}
          >
            Line
          </button>
          <button 
            className={`shape-btn ${selection.pavingShapeMode === 'rectangle' ? 'active' : ''}`}
            onClick={() => selection.setShapeMode('rectangle')}
          >
            Rectangle
          </button>
          <button 
            className={`shape-btn ${selection.pavingShapeMode === 'circle' ? 'active' : ''}`}
            onClick={() => selection.setShapeMode('circle')}
          >
            Circle
          </button>
        </div>
        <button onClick={selection.toggleEraseMode}>
          {selection.erasePavingMode ? 'Erase Mode (ON)' : 'Erase Mode'}
        </button>
        <button onClick={handleClearAllPaving}>Clear All Paving</button>
      </div>
      <div className="paving-list">
        {filteredPavings.map((paving: any, i: number) => {
          const isSelected = selection.selectedPaving && selection.selectedPaving.name === paving.name;
          return (
          <div 
            key={i} 
            className={`paving-item ${isSelected ? 'selected' : ''}`}
            onClick={() => selection.selectPaving(paving)}
          >
            <img src={paving.image} alt={paving.name} className="paving-icon" />
            <div>{paving.name}</div>
          </div>
        )})}
      </div>
    </aside>
  );
};

export const PlannerCanvas: React.FC<any> = ({ 
  canvasRef, 
  renderer, 
  gridManager, 
  pavingManager, 
  interiorManager,
  measurementTool,
  selection,
  render,
  onStateChange,
  handleZoom,
  onHoverChange,
  activeInteriorId,
  onOpenInterior,
  onCloseInterior,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<any>(null);
  const [lastPlacedCell, setLastPlacedCell] = React.useState<any>(null);
  const [stateChanged, setStateChanged] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState<{x: number, y: number} | null>(null);
  const [lastClickTime, setLastClickTime] = React.useState(0);
  const [lastClickedItem, setLastClickedItem] = React.useState<any>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<{x: number, y: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<{x: number, y: number} | null>(null);
  const [justCompletedSelection, setJustCompletedSelection] = React.useState(false);
  const [previewPavingCells, setPreviewPavingCells] = React.useState<Array<{x: number, y: number}>>([]);
  const [isDraggingPlaced, setIsDraggingPlaced] = React.useState(false);
  const [draggedItemOriginalPos, setDraggedItemOriginalPos] = React.useState<{x: number, y: number} | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{x: number, y: number}>({x: 0, y: 0});

  const getGridPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return renderer?.mouseToGrid(x, y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getGridPos(e);
    if (!pos) return;

    // Don't handle placement when measuring
    if (measurementTool.isToolActive()) return;

    // Check if clicking on a selected placed item to start dragging it
    if (selection.selectedPlaced && e.button === 0) {
      const clickedItem = gridManager.getItemAt(pos.x, pos.y);
      if (clickedItem === selection.selectedPlaced) {
        setIsDraggingPlaced(true);
        setDraggedItemOriginalPos({ x: clickedItem.x, y: clickedItem.y });
        setDragOffset({ x: pos.x - clickedItem.x, y: pos.y - clickedItem.y });
        setStateChanged(true);
        return;
      }
    }

    // Start selection box if nothing is selected and left click without modifiers on empty space
    if (!selection.selectedBuildable && !selection.selectedPaving && !selection.erasePavingMode && 
        e.button === 0 && !selection.lineTool.isActive()) {
      const clickedItem = gridManager.getItemAt(pos.x, pos.y);
      
      // If clicking on empty space, start selection box
      if (!clickedItem) {
        setIsSelecting(true);
        setSelectionStart(pos);
        setSelectionEnd(pos);
        return;
      }
    }

    // Handle paving drag
    if (selection.selectedPaving || selection.erasePavingMode) {
      setIsDragging(true);
      setDragStart(pos);
      setStateChanged(true);
      
      // For single-cell mode (line with no drag), place/erase immediately
      // For shape modes (rectangle/circle), start preview mode
      if (selection.pavingShapeMode === 'line') {
        // Single cell placement in line mode
        if (selection.erasePavingMode) {
          pavingManager.removePaving(pos.x, pos.y);
        } else if (selection.selectedPaving) {
          pavingManager.placePaving(pos.x, pos.y, selection.selectedPaving);
        }
        render();
      } else {
        // Start preview mode for rectangle/circle
        const cells = [{ x: pos.x, y: pos.y }];
        setPreviewPavingCells(cells);
        render(selection.selectedPlaced, undefined, undefined, undefined, undefined, undefined, undefined, {
          cells,
          paving: selection.selectedPaving,
          isErase: selection.erasePavingMode
        });
      }
    }
    // Handle buildable drag (non-line tool items)
    else if (selection.selectedBuildable && !selection.selectedBuildable.usesLineTool) {
      let canPlace = true;
      
      // Get the appropriate grid manager (interior or main)
      const currentGridManager = activeInteriorId ? 
        interiorManager.getInterior(activeInteriorId)?.getGridManager() :
        gridManager;
      
      if (!currentGridManager) return;
      
      // Check if this item requires palisade overlap (gates, walls, fences, etc.)
      // Only check this in main grid, not in interiors
      if (!activeInteriorId && selection.selectedBuildable.requiresPalisadeOverlap) {
        const items = currentGridManager.getItems();
        
        // Determine item dimensions based on rotation
        const shouldSwap = selection.previewRotation === 90 || selection.previewRotation === 270;
        const itemWidth = shouldSwap ? selection.selectedBuildable.height : selection.selectedBuildable.width;
        const itemHeight = shouldSwap ? selection.selectedBuildable.width : selection.selectedBuildable.height;
        const isHorizontal = itemWidth > itemHeight;
        
        if (isHorizontal) {
          
          // Horizontal item: check for horizontal palisades/walls to replace
          const palisadesToRemove = [];
          let hasPalisades = false;
          
          for (let x = pos.x; x < pos.x + itemWidth; x++) {
            const palisade = items.find(
              (item: any) => item.x === x && item.y === pos.y && 
                      item.usesLineTool && (item.orientation === 'horizontal' || item.orientation === 'corner')
            );
            if (palisade) {
              hasPalisades = true;
              palisadesToRemove.push(palisade);
            }
          }
          
          // Need at least some palisades to replace
          if (!hasPalisades) {
            canPlace = false;
          } else {
            // Remove all palisade segments that the item will replace
            palisadesToRemove.forEach(p => currentGridManager.removeItem(p));
          }
        } else {
          // Vertical item: check for vertical palisades/walls to replace
          const palisadesToRemove = [];
          let hasPalisades = false;
          
          for (let y = pos.y; y < pos.y + itemHeight; y++) {
            const palisade = items.find(
              (item: any) => item.x === pos.x && item.y === y && 
                      item.usesLineTool && (item.orientation === 'vertical' || item.orientation === 'corner')
            );
            if (palisade) {
              hasPalisades = true;
              palisadesToRemove.push(palisade);
            }
          }
          
          // Need at least some palisades to replace
          if (!hasPalisades) {
            canPlace = false;
          } else {
            // Remove all palisade segments that the item will replace
            palisadesToRemove.forEach(p => currentGridManager.removeItem(p));
          }
        }
      }
      
      // Only proceed with placement if allowed
      if (canPlace) {
        setIsDragging(true);
        setLastPlacedCell(pos);
        setStateChanged(true);
        
        // Place the building/gate/wall item
        const newItem = selection.selectedBuildable.createPlacedItem(pos.x, pos.y, undefined, selection.previewRotation);
        if (currentGridManager.addItem(newItem)) {
          // Create interior if building has interior (only in main grid, not in interior)
          if (!activeInteriorId) {
            console.log('[Placement] Building placed:', newItem.name, 'hasInterior:', selection.selectedBuildable.hasInterior);
            if (selection.selectedBuildable.hasInterior && selection.selectedBuildable.interiorWidth && selection.selectedBuildable.interiorHeight) {
              const buildingId = `${newItem.name}_${newItem.x}_${newItem.y}`;
              const interiorId = interiorManager.createInterior(
                buildingId,
                selection.selectedBuildable.interiorWidth,
                selection.selectedBuildable.interiorHeight
              );
              newItem.interiorId = interiorId;
              console.log('[Placement] Created interior:', interiorId, 'for building:', newItem.name, 'dimensions:', selection.selectedBuildable.interiorWidth, 'x', selection.selectedBuildable.interiorHeight);
              console.log('[Placement] Total interiors now:', interiorManager.getAllInteriors().length);
            } else {
              console.log('[Placement] No interior created - hasInterior:', selection.selectedBuildable.hasInterior, 'width:', selection.selectedBuildable.interiorWidth, 'height:', selection.selectedBuildable.interiorHeight);
            }
          }
          newItem.preloadImage().then(() => render());
          render();
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Store last mouse event for use in mouseup
    (window as any).lastMouseEvent = e;
    
    // Handle middle mouse button panning
    if (isPanning && panStart) {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const dx = panStart.x - e.clientX;
        const dy = panStart.y - e.clientY;
        container.scrollLeft += dx;
        container.scrollTop += dy;
        setPanStart({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    const pos = getGridPos(e);
    if (!pos) return;

    // Handle selection box dragging
    if (isSelecting && selectionStart) {
      setSelectionEnd(pos);
      // Get items that would be selected and preview them
      const itemsInBox = gridManager.getItemsInBounds(
        selectionStart.x,
        selectionStart.y,
        pos.x,
        pos.y
      );
      render(selection.selectedPlaced, pos, undefined, undefined, selectionStart, pos, itemsInBox);
      return;
    }

    // Handle measurement preview
    if (measurementTool.isToolActive() && measurementTool.getFirstPoint() && !measurementTool.getSecondPoint()) {
      render(selection.selectedPlaced, pos);
      return;
    }

    // Handle line tool preview
    if (selection.selectedBuildable && selection.selectedBuildable.usesLineTool) {
      if (selection.lineTool.isActive()) {
        // Update line preview
        selection.lineTool.updateEndPoint(pos);
        render(selection.selectedPlaced, pos, { buildable: selection.selectedBuildable, isValid: true }, selection.lineTool);
      } else {
        // Show single item preview at cursor
        const isValid = gridManager.canPlaceItem(pos.x, pos.y, 1, 1, null);
        render(selection.selectedPlaced, pos, { buildable: selection.selectedBuildable, isValid });
      }
      return;
    }

    // Show buildable preview at cursor when buildable is selected (and not dragging)
    if (!isDragging && selection.selectedBuildable) {
      // Apply rotation to dimensions for placement check
      const shouldSwap = selection.previewRotation === 90 || selection.previewRotation === 270;
      const width = shouldSwap ? selection.selectedBuildable.height : selection.selectedBuildable.width;
      const height = shouldSwap ? selection.selectedBuildable.width : selection.selectedBuildable.height;
      
      const isValid = gridManager.canPlaceItem(
        pos.x,
        pos.y,
        width,
        height,
        null,
        selection.selectedBuildable.requiresPalisadeOverlap
      );
      render(selection.selectedPlaced, pos, { buildable: selection.selectedBuildable, isValid, rotation: selection.previewRotation });
      return;
    }

    // Handle paving drag
    if (isDragging && dragStart && (selection.selectedPaving || selection.erasePavingMode)) {
      const cells = PavingManager.getCellsByShape(
        dragStart.x, 
        dragStart.y, 
        pos.x, 
        pos.y, 
        selection.pavingShapeMode
      );
      
      if (selection.pavingShapeMode === 'line') {
        // Line mode: commit immediately as before (continuous drawing)
        cells.forEach((cell: any) => {
          if (selection.erasePavingMode) {
            pavingManager.removePaving(cell.x, cell.y);
          } else if (selection.selectedPaving) {
            pavingManager.placePaving(cell.x, cell.y, selection.selectedPaving);
          }
        });
        setDragStart(pos);
        render();
      } else {
        // Rectangle/Circle mode: update preview only
        setPreviewPavingCells(cells);
        render(selection.selectedPlaced, undefined, undefined, undefined, undefined, undefined, undefined, {
          cells,
          paving: selection.selectedPaving,
          isErase: selection.erasePavingMode
        });
      }
    }
    // Handle buildable drag (non-line tool items)
    else if (isDragging && selection.selectedBuildable && !selection.selectedBuildable.usesLineTool && lastPlacedCell) {
      // Only place if we moved to a different cell
      if (pos.x !== lastPlacedCell.x || pos.y !== lastPlacedCell.y) {
        const newItem = selection.selectedBuildable.createPlacedItem(pos.x, pos.y, undefined, selection.previewRotation);
        if (gridManager.addItem(newItem)) {
          // Create interior if building has interior
          if (selection.selectedBuildable.hasInterior && selection.selectedBuildable.interiorWidth && selection.selectedBuildable.interiorHeight) {
            const interiorId = interiorManager.createInterior(
              `${newItem.name}_${newItem.x}_${newItem.y}`,
              selection.selectedBuildable.interiorWidth,
              selection.selectedBuildable.interiorHeight
            );
            newItem.interiorId = interiorId;
          }
          newItem.preloadImage().then(() => render());
          render();
          setLastPlacedCell(pos);
        }
      }
    }
    // Handle dragging a placed item
    else if (isDraggingPlaced && selection.selectedPlaced) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;
      
      // Temporarily move to show preview
      const item = selection.selectedPlaced;
      const oldX = item.x;
      const oldY = item.y;
      item.moveTo(newX, newY);
      
      const isValid = gridManager.canPlaceItem(
        newX,
        newY,
        item.width,
        item.height,
        item,
        item.requiresPalisadeOverlap
      );
      
      // Render with preview
      render(item, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { x: newX, y: newY, isValid });
      
      // Restore original position (actual move happens on mouse up)
      item.moveTo(oldX, oldY);
    }
    // Show preview when just hovering with selected buildable
    else if (selection.selectedBuildable) {
      // Apply rotation to dimensions for placement check
      const shouldSwap = selection.previewRotation === 90 || selection.previewRotation === 270;
      const width = shouldSwap ? selection.selectedBuildable.height : selection.selectedBuildable.width;
      const height = shouldSwap ? selection.selectedBuildable.width : selection.selectedBuildable.height;
      
      const isValid = gridManager.canPlaceItem(
        pos.x,
        pos.y,
        width,
        height,
        null,
        selection.selectedBuildable.requiresPalisadeOverlap
      );
      render(selection.selectedPlaced, pos, { buildable: selection.selectedBuildable, isValid, rotation: selection.previewRotation });
    }
    
    // Track hover position for info display
    if (onHoverChange) {
      onHoverChange(pos);
    }
  };

  const handleMouseUp = () => {
    // Complete dragging placed item
    if (isDraggingPlaced && selection.selectedPlaced) {
      const pos = draggedItemOriginalPos;
      if (pos) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const lastEvent = (window as any).lastMouseEvent;
          if (lastEvent) {
            const gridPos = renderer?.mouseToGrid(lastEvent.clientX - rect.left, lastEvent.clientY - rect.top);
            if (gridPos) {
              const newX = gridPos.x - dragOffset.x;
              const newY = gridPos.y - dragOffset.y;
              
              if (gridManager.moveItem(selection.selectedPlaced, newX, newY)) {
                if (onStateChange) onStateChange();
              } else {
                // Move failed, revert to original position
                selection.selectedPlaced.moveTo(pos.x, pos.y);
              }
            }
          }
        }
      }
      setIsDraggingPlaced(false);
      setDraggedItemOriginalPos(null);
      render();
    }
    
    // End panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
    
    // Complete selection box
    if (isSelecting && selectionStart && selectionEnd) {
      console.log('Completing selection from', selectionStart, 'to', selectionEnd);
      
      const selectedItems = gridManager.getItemsInBounds(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x,
        selectionEnd.y
      );
      console.log('Found items in bounds:', selectedItems.length);
      
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      setJustCompletedSelection(true);
      
      if (selectedItems.length > 0) {
        selection.selectMultiplePlaced(selectedItems);
      }
      
      // Always render to clear the selection box visual
      render();
      return;
    }
    
    // Commit preview paving if any (for rectangle/circle modes)
    if (previewPavingCells.length > 0) {
      previewPavingCells.forEach((cell) => {
        if (selection.erasePavingMode) {
          pavingManager.removePaving(cell.x, cell.y);
        } else if (selection.selectedPaving) {
          pavingManager.placePaving(cell.x, cell.y, selection.selectedPaving);
        }
      });
      setPreviewPavingCells([]);
      render();
    }
    
    // Save state after dragging/placing if state changed
    if (stateChanged && onStateChange) {
      onStateChange();
    }
    setIsDragging(false);
    setDragStart(null);
    setLastPlacedCell(null);
    setStateChanged(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent click from clearing selection if we just completed a selection box
    if (justCompletedSelection) {
      setJustCompletedSelection(false);
      return;
    }
    
    const pos = getGridPos(e);
    if (!pos || pos.x === undefined) return;

    // Handle double-click detection for opening interiors
    const currentTime = Date.now();
    const clickedItem = activeInteriorId ? 
      interiorManager.getInterior(activeInteriorId)?.getGridManager().getItemAt(pos.x, pos.y) :
      gridManager.getItemAt(pos.x, pos.y);
    
    const isDoubleClick = (currentTime - lastClickTime < 300) && 
                          clickedItem && 
                          lastClickedItem === clickedItem;
    
    if (isDoubleClick && clickedItem && clickedItem.hasInterior && clickedItem.interiorId && !activeInteriorId && onOpenInterior) {
      // Open interior overlay
      onOpenInterior(clickedItem.interiorId);
      setLastClickTime(0);
      setLastClickedItem(null);
      return;
    }
    
    setLastClickTime(currentTime);
    setLastClickedItem(clickedItem);

    // Handle measurement tool
    if (measurementTool.isToolActive()) {
      if (!measurementTool.getFirstPoint()) {
        measurementTool.setFirstPoint(pos);
      } else if (!measurementTool.getSecondPoint()) {
        measurementTool.setSecondPoint(pos);
      } else {
        // Reset and start new measurement
        measurementTool.reset();
        measurementTool.setFirstPoint(pos);
      }
      render();
      return;
    }

    // Handle line tool for fences/walls/palisades
    if (selection.selectedBuildable && selection.selectedBuildable.usesLineTool) {
      if (!selection.lineTool.isActive()) {
        // Start new line
        selection.lineTool.startLine(pos);
        setStateChanged(true);
        render();
      } else {
        // Check if clicking at the start point (place single corner post)
        const startPoint = selection.lineTool.getStartPoint();
        const clickingAtStart = startPoint && startPoint.x === pos.x && startPoint.y === pos.y;
        
        if (clickingAtStart) {
          // Check if this position is at a gate edge
          const items = gridManager.getItems();
          const isAtGateEdge = items.some((item: any) => {
            if (!item.name.includes('Gate')) return false;
            
            const isHorizontalGate = item.width > item.height;
            if (isHorizontalGate) {
              return item.y === pos.y && (item.x === pos.x || item.x + item.width - 1 === pos.x);
            } else {
              return item.x === pos.x && (item.y === pos.y || item.y + item.height - 1 === pos.y);
            }
          });
          
          // If at gate edge and there's already a palisade corner post, keep it
          const existingItem = gridManager.getItemAt(pos.x, pos.y);
          if (isAtGateEdge && existingItem && existingItem.name === 'Palisade') {
            // Don't replace - the gate edge post is already there
            selection.lineTool.reset();
            if (onStateChange) onStateChange();
            render();
            return;
          }
          
          // Place a single corner post
          if (existingItem) {
            gridManager.removeItem(existingItem);
          }
          
          const newItem = selection.selectedBuildable.createPlacedItem(pos.x, pos.y, 'corner');
          if (gridManager.addItem(newItem)) {
            newItem.preloadImage().then(() => render());
            if (onStateChange) onStateChange();
          }
          
          // Reset and start new line from clicked position
          selection.lineTool.reset();
          selection.lineTool.startLine(pos);
          setStateChanged(true);
          render();
          return;
        }
        
        // Place the current line
        const allCells = selection.lineTool.getAllCellsWithCorners(gridManager.getItems());
        let placedCount = 0;
        
        // Check if this line connects to a gate (first cell on or adjacent to gate)
        const items = gridManager.getItems();
        // const firstCell = allCells[0];
        // Variable kept for future gate connection logic
        // const connectsToGate = firstCell && items.some((item: any) => {
        //   if (!item.name.includes('Gate')) return false;
        //   
        //   const isHorizontalGate = item.width > item.height;
        //   if (isHorizontalGate) {
        //     // Check if on or adjacent to left or right edge of gate
        //     return item.y === firstCell.y && (
        //       item.x - 1 === firstCell.x || 
        //       item.x + item.width === firstCell.x || 
        //       item.x === firstCell.x || 
        //       item.x + item.width - 1 === firstCell.x
        //     );
        //   } else {
        //     // Check if on or adjacent to top or bottom edge of gate
        //     return item.x === firstCell.x && (
        //       item.y - 1 === firstCell.y || 
        //       item.y + item.height === firstCell.y ||
        //       item.y === firstCell.y || 
        //       item.y + item.height - 1 === firstCell.y
        //     );
        //   }
        // });
        
        for (let i = 0; i < allCells.length; i++) {
          const cell = allCells[i];
          const existingItem = gridManager.getItemAt(cell.x, cell.y);
          
          // Check if this position overlaps with a gate (not just at edges, but anywhere on the gate)
          const overlapsGate = items.some((item: any) => {
            if (!item.name.includes('Gate')) return false;
            return item.contains(cell.x, cell.y);
          });
          
          // Skip placing on gates entirely
          if (overlapsGate) {
            placedCount++; // Count as successful for line validation
            continue;
          }
          
          // If there's an existing palisade with different orientation, update it to corner
          if (cell.orientation === 'corner' && existingItem && 
              existingItem.name === 'Palisade' &&
              existingItem.orientation !== 'corner') {
            // Update the existing palisade to be a corner instead of removing and re-adding
            existingItem.orientation = 'corner';
            existingItem.preloadImage().then(() => render());
            placedCount++;
            continue;
          }
          
          // If this is a corner piece, remove any existing item at this position
          if (cell.orientation === 'corner' && existingItem) {
            if (existingItem.name === 'Palisade') {
              gridManager.removeItem(existingItem);
            }
          }
          
          const newItem = selection.selectedBuildable.createPlacedItem(cell.x, cell.y, cell.orientation);
          
          if (gridManager.addItem(newItem)) {
            newItem.preloadImage().then(() => render());
            placedCount++;
          }
        }
        
        if (placedCount > 0) {
          if (onStateChange) onStateChange();
        }
        
        // Reset line tool but keep palisade selected
        selection.lineTool.reset();
        setStateChanged(true);
        render();
      }
      return;
    }

    // Check if clicking on existing item (only if nothing is selected for placement)
    if (!selection.selectedBuildable && !selection.selectedPaving && !selection.erasePavingMode) {
      const currentGridManager = activeInteriorId ? 
        interiorManager.getInterior(activeInteriorId)?.getGridManager() :
        gridManager;
        
      if (currentGridManager) {
        const clickedItem = currentGridManager.getItemAt(pos.x, pos.y);
        if (clickedItem) {
          selection.selectPlaced(clickedItem);
          render(clickedItem);
        } else {
          selection.selectPlaced(null);
          selection.selectMultiplePlaced([]);
          render();
        }
      }
    } else {
      // Keep selection active for multiple placements
      render();
    }
  };

  // Get cursor style
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (isDraggingPlaced) return 'grabbing';
    if (measurementTool.isToolActive()) return 'crosshair';
    if (selection.selectedBuildable || selection.selectedPaving) return 'crosshair';
    if (selection.selectedPlaced) return 'move';
    return 'default';
  };

  // Handle escape key to place line tool items and deselect, and R key to rotate
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If line tool is active, place current line and exit drawing mode
        if (selection.lineTool.isActive() && selection.selectedBuildable) {
          const allCells = selection.lineTool.getAllCellsWithCorners(gridManager.getItems());
          let placedCount = 0;
          
          for (const cell of allCells) {
            const newItem = selection.selectedBuildable.createPlacedItem(cell.x, cell.y, cell.orientation);
            if (gridManager.addItem(newItem)) {
              newItem.preloadImage().then(() => render());
              placedCount++;
            }
          }
          
          if (placedCount > 0 && onStateChange) {
            onStateChange();
          }
          
          // Reset line tool but keep palisade selected
          selection.lineTool.reset();
          setStateChanged(false);
          render();
        } else {
          // Only clear all selections if not in line drawing mode
          selection.clearAll();
          measurementTool.reset();
          render();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        // Rotate the preview if a buildable is selected (but not line tool items)
        if (selection.selectedBuildable && !selection.selectedBuildable.usesLineTool && !measurementTool.isToolActive()) {
          selection.rotatePreview();
          render();
        }
        // Rotate a placed item if one is selected (but not line tool items)
        else if (selection.selectedPlaced && !selection.selectedPlaced.usesLineTool && !measurementTool.isToolActive()) {
          if (gridManager.rotateItem(selection.selectedPlaced)) {
            if (onStateChange) onStateChange();
            render();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, measurementTool, gridManager, render, onStateChange]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Zoom in when scrolling up (negative deltaY), out when scrolling down
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(zoomDelta);
    render();
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    if (onHoverChange) {
      onHoverChange(null);
    }
  };

  const handleContainerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Prevent scrolling the page when over the canvas container
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName === 'CANVAS') {
      e.preventDefault();
    }
  };

  return (
    <div className="canvas-container" onWheel={handleContainerWheel}>
      {activeInteriorId && onCloseInterior && (
        <div className="interior-overlay-header">
          <div className="interior-overlay-title">
            Interior View - Double-click to add items
          </div>
          <button 
            className="interior-overlay-close"
            onClick={onCloseInterior}
          >
            ✕ Close Interior
          </button>
        </div>
      )}
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: getCursorStyle() }}
      />
    </div>
  );
};

export const InfoPanel: React.FC<any> = ({ selection, gridManager, pavingManager, measurementTool, render, onStateChange, hoverPosition }) => {
  const handleDelete = () => {
    if (selection.selectedPlaced) {
      if (onStateChange) onStateChange();
      gridManager.removeItem(selection.selectedPlaced);
      selection.selectPlaced(null);
      render();
    }
  };

  const handleDeleteMultiple = () => {
    if (selection.selectedPlacedItems && selection.selectedPlacedItems.length > 0) {
      if (onStateChange) onStateChange();
      selection.selectedPlacedItems.forEach((item: any) => {
        gridManager.removeItem(item);
      });
      selection.selectMultiplePlaced([]);
      render();
    }
  };

  const handleRotate = () => {
    if (selection.selectedPlaced && gridManager.rotateItem(selection.selectedPlaced)) {
      if (onStateChange) onStateChange();
      render();
    }
  };

  // Get hover info
  const hoverBuildable = hoverPosition ? gridManager.getItemAt(hoverPosition.x, hoverPosition.y) : null;
  const hoverPaving = hoverPosition ? pavingManager.getPavingAt(hoverPosition.x, hoverPosition.y) : null;

  // Determine buildable display
  let buildableDisplay = 'None';
  let buildableActions = null;
  
  if (measurementTool.isToolActive()) {
    buildableDisplay = 'Measuring...';
  } else if (selection.selectedPlacedItems && selection.selectedPlacedItems.length > 0) {
    buildableDisplay = `${selection.selectedPlacedItems.length} items`;
    buildableActions = (
      <button onClick={handleDeleteMultiple}>Delete Selected ({selection.selectedPlacedItems.length})</button>
    );
  } else if (selection.selectedPlaced) {
    buildableDisplay = selection.selectedPlaced.name;
    buildableActions = (
      <>
        <button onClick={handleDelete}>Delete</button>
        <button onClick={handleRotate}>Rotate</button>
      </>
    );
  } else if (selection.selectedBuildable) {
    buildableDisplay = `${selection.selectedBuildable.name} (placing)`;
  } else if (hoverBuildable && !selection.selectedPaving && !selection.erasePavingMode) {
    buildableDisplay = `${hoverBuildable.name} (hover)`;
  }

  // Determine paving display
  let pavingDisplay = 'None';
  
  if (selection.erasePavingMode) {
    pavingDisplay = 'Erase Mode';
  } else if (selection.selectedPaving) {
    pavingDisplay = `${selection.selectedPaving.name} (placing)`;
  } else if (hoverPaving && !selection.selectedBuildable) {
    pavingDisplay = `${hoverPaving.name} (hover)`;
  }

  return (
    <div className="info-panel">
      <div className="info-section">
        <strong>Buildable:</strong>{' '}
        <span>{buildableDisplay}</span>
        {buildableActions && <div className="info-actions">{buildableActions}</div>}
      </div>
      <div className="info-section">
        <strong>Paving:</strong>{' '}
        <span>{pavingDisplay}</span>
      </div>
    </div>
  );
};
