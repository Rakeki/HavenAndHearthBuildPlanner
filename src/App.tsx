import { useState, useEffect } from 'react';
import { dataService } from '@services/DataService';
import { imageLoaderService } from '@services/ImageLoaderService';
import { persistenceService } from '@services/PersistenceService';
import { buildableItems as buildablesData, pavingTypes as pavingData } from '@data/index';
import { useCanvas } from '@hooks/useCanvas';
import { useSelection } from '@hooks/useSelection';
import { useUndoRedo } from '@hooks/useUndoRedo';
import { Header } from '@components/Header';
import { BuildablesSidebar } from '@components/BuildablesSidebar';
import { PavingSidebar } from '@components/PavingSidebar';
import { PlannerCanvas } from '@components/PlannerCanvas';
import { InfoPanel } from '@components/InfoPanel';
import { PlacedItem } from '@models/BuildableItem';
import './App.css';

function App() {
  const [gridSize, setGridSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuildables, setShowBuildables] = useState(true);

  const {
    canvasRef,
    renderer,
    gridManager,
    pavingManager,
    measurementTool,
    render,
  } = useCanvas(gridSize, showBuildables);

  const selection = useSelection();
  const undoRedo = useUndoRedo();

  // Save state helper function
  const saveCurrentState = () => {
    const items = gridManager.getItems();
    const paving = pavingManager.toJSON();
    undoRedo.saveState(items, paving);
  };

  // Initialize data
  useEffect(() => {
    const init = async () => {
      dataService.loadBuildableItems(buildablesData);
      dataService.loadPavingTypes(pavingData);
      
      const buildables = dataService.getBuildableItems();
      const pavings = dataService.getPavingTypes();
      
      pavingManager.registerPavingTypes(pavings);
      
      // Preload images
      await Promise.all([
        imageLoaderService.preloadBuildableImages(buildables),
        imageLoaderService.preloadPavingImages(pavings),
      ]);
      
      setIsLoading(false);
    };
    
    init();
  }, [pavingManager]);

  // Re-render when selection changes
  useEffect(() => {
    // Deactivate measurement tool when selecting buildable or paving
    if ((selection.selectedBuildable || selection.selectedPaving || selection.erasePavingMode) && measurementTool.isToolActive()) {
      measurementTool.deactivate();
    }
    render(selection.selectedPlaced);
  }, [selection.selectedPlaced, selection.selectedBuildable, selection.selectedPaving, selection.erasePavingMode, measurementTool, render]);

  // Initial render after renderer is ready and loading is complete
  useEffect(() => {
    if (renderer && !isLoading) {
      render();
      // Save initial empty state
      saveCurrentState();
    }
  }, [renderer, isLoading, render]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selection.clearAll();
        if (measurementTool.isToolActive()) {
          measurementTool.deactivate();
          render();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected item
        if (selection.selectedPlaced) {
          saveCurrentState();
          gridManager.removeItem(selection.selectedPlaced);
          selection.selectPlaced(null);
          render();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Undo
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Redo
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, measurementTool, gridManager, render]);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire grid?')) {
      saveCurrentState();
      gridManager.clear();
      pavingManager.clear();
      selection.clearAll();
      render();
    }
  };

  const handleUndo = async () => {
    const state = undoRedo.undo();
    if (state) {
      // Restore items
      await Promise.all(state.items.map(item => imageLoaderService.preloadPlacedItemImage(item)));
      gridManager.loadItems(state.items);
      
      // Restore paving
      pavingManager.loadPaving(state.paving);
      
      selection.clearAll();
      render();
    }
  };

  const handleRedo = async () => {
    const state = undoRedo.redo();
    if (state) {
      // Restore items
      await Promise.all(state.items.map(item => imageLoaderService.preloadPlacedItemImage(item)));
      gridManager.loadItems(state.items);
      
      // Restore paving
      pavingManager.loadPaving(state.paving);
      
      selection.clearAll();
      render();
    }
  };

  const handleSave = () => {
    const data = persistenceService.createSaveData(
      gridSize,
      gridManager.getItems(),
      pavingManager
    );
    persistenceService.savePlan(data);
  };

  const handleLoad = async () => {
    const data = await persistenceService.loadPlan();
    if (!data) return;

    setGridSize(data.gridSize);
    
    // Load items
    const items = data.items.map(itemData => new PlacedItem(itemData));
    await Promise.all(items.map(item => imageLoaderService.preloadPlacedItemImage(item)));
    gridManager.loadItems(items);
    
    // Load paving
    pavingManager.loadPaving(data.paving);
    
    selection.clearAll();
    
    // Clear undo/redo history and save initial state
    undoRedo.clearHistory();
    saveCurrentState();
    
    render();
  };

  const handleExportPNG = () => {
    if (canvasRef.current) {
      persistenceService.exportPNG(canvasRef.current);
    }
  };

  const handleToggleBuildables = () => {
    setShowBuildables(!showBuildables);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading Haven & Hearth Base Planner...</h2>
        <p>Preloading images...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        onClear={handleClear}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportPNG={handleExportPNG}
        onToggleBuildables={handleToggleBuildables}
        showBuildables={showBuildables}
        measurementTool={measurementTool}
        onMeasure={() => render()}
        onClearSelection={selection.clearAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoRedo.canUndo}
        canRedo={undoRedo.canRedo}
      />
      
      <div className="main-content">
        <BuildablesSidebar
          dataService={dataService}
          onSelectItem={selection.selectBuildable}
          selectedBuildable={selection.selectedBuildable}
        />
        
        <main className="canvas-area">
          <PlannerCanvas
            canvasRef={canvasRef}
            renderer={renderer}
            gridManager={gridManager}
            pavingManager={pavingManager}
            measurementTool={measurementTool}
            selection={selection}
            render={render}
            onStateChange={saveCurrentState}
          />
          
          <InfoPanel
            selection={selection}
            gridManager={gridManager}
            measurementTool={measurementTool}
            render={render}
            onStateChange={saveCurrentState}
          />
        </main>
        
        <PavingSidebar
          dataService={dataService}
          selection={selection}
          pavingManager={pavingManager}
          render={render}
          onStateChange={saveCurrentState}
        />
      </div>
    </div>
  );
}

export default App;
