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
  measurementTool,
  selection,
  render,
  onStateChange,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<any>(null);
  const [lastPlacedCell, setLastPlacedCell] = React.useState<any>(null);
  const [stateChanged, setStateChanged] = React.useState(false);

  const getGridPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return renderer?.mouseToGrid(x, y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPos(e);
    if (!pos) return;

    // Don't handle placement when measuring
    if (measurementTool.isToolActive()) return;

    // Handle paving drag
    if (selection.selectedPaving || selection.erasePavingMode) {
      setIsDragging(true);
      setDragStart(pos);
      setStateChanged(true);
      
      // Place/erase single cell
      if (selection.erasePavingMode) {
        pavingManager.removePaving(pos.x, pos.y);
      } else if (selection.selectedPaving) {
        pavingManager.placePaving(pos.x, pos.y, selection.selectedPaving);
      }
      render();
    }
    // Handle buildable drag
    else if (selection.selectedBuildable) {
      setIsDragging(true);
      setLastPlacedCell(pos);
      setStateChanged(true);
      
      // Place first buildable
      const newItem = selection.selectedBuildable.createPlacedItem(pos.x, pos.y);
      if (gridManager.addItem(newItem)) {
        newItem.preloadImage().then(() => render());
        render();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPos(e);
    if (!pos) return;

    // Handle measurement preview
    if (measurementTool.isToolActive() && measurementTool.getFirstPoint() && !measurementTool.getSecondPoint()) {
      render(selection.selectedPlaced, pos);
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
      cells.forEach((cell: any) => {
        if (selection.erasePavingMode) {
          pavingManager.removePaving(cell.x, cell.y);
        } else if (selection.selectedPaving) {
          pavingManager.placePaving(cell.x, cell.y, selection.selectedPaving);
        }
      });
      // Only update dragStart for line mode (continuous drawing)
      // For rectangle and circle, keep the original start point fixed
      if (selection.pavingShapeMode === 'line') {
        setDragStart(pos);
      }
      render();
    }
    // Handle buildable drag
    else if (isDragging && selection.selectedBuildable && lastPlacedCell) {
      // Only place if we moved to a different cell
      if (pos.x !== lastPlacedCell.x || pos.y !== lastPlacedCell.y) {
        const newItem = selection.selectedBuildable.createPlacedItem(pos.x, pos.y);
        if (gridManager.addItem(newItem)) {
          newItem.preloadImage().then(() => render());
          render();
          setLastPlacedCell(pos);
        }
      }
    }
  };

  const handleMouseUp = () => {
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
    const pos = getGridPos(e);
    if (!pos || pos.x === undefined) return;

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

    // Check if clicking on existing item (only if nothing is selected for placement)
    if (!selection.selectedBuildable && !selection.selectedPaving && !selection.erasePavingMode) {
      const clickedItem = gridManager.getItemAt(pos.x, pos.y);
      if (clickedItem) {
        selection.selectPlaced(clickedItem);
        render(clickedItem);
      } else {
        selection.selectPlaced(null);
        render();
      }
    } else {
      // Keep selection active for multiple placements
      render();
    }
  };

  // Get cursor style
  const getCursorStyle = () => {
    if (measurementTool.isToolActive()) return 'crosshair';
    if (selection.selectedBuildable || selection.selectedPaving) return 'crosshair';
    return 'default';
  };

  // Handle escape key to deselect
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selection.clearAll();
        measurementTool.reset();
        render();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, measurementTool, render]);

  return (
    <div className="canvas-container">
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{ cursor: getCursorStyle() }}
      />
    </div>
  );
};

export const InfoPanel: React.FC<any> = ({ selection, gridManager, measurementTool, render, onStateChange }) => {
  const handleDelete = () => {
    if (selection.selectedPlaced) {
      if (onStateChange) onStateChange();
      gridManager.removeItem(selection.selectedPlaced);
      selection.selectPlaced(null);
      render();
    }
  };

  const handleRotate = () => {
    if (selection.selectedPlaced && gridManager.rotateItem(selection.selectedPlaced)) {
      if (onStateChange) onStateChange();
      render();
    }
  };

  return (
    <div className="info-panel">
      <div>
        <strong>Selected:</strong>{' '}
        {selection.selectedPlaced?.name || 
         selection.selectedBuildable?.name ||
         selection.selectedPaving?.name ||
         (measurementTool.isToolActive() ? 'Measuring...' : 'None')}
      </div>
      {selection.selectedPlaced && (
        <>
          <button onClick={handleDelete}>Delete</button>
          <button onClick={handleRotate}>Rotate</button>
        </>
      )}
    </div>
  );
};
