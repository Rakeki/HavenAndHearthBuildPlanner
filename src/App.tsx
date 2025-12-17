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
  const [gridWidth, setGridWidth] = useState(50);
  const [gridHeight, setGridHeight] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuildables, setShowBuildables] = useState(true);
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number} | null>(null);
  const [activeInteriorId, setActiveInteriorId] = useState<string | null>(null);

  const {
    canvasRef,
    renderer,
    gridManager,
    pavingManager,
    interiorManager,
    measurementTool,
    render,
    handleZoom,
  } = useCanvas(gridWidth, gridHeight, showBuildables, activeInteriorId);

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
      
      // Log buildings with interiors
      const buildingsWithInteriors = buildables.filter(b => b.hasInterior);
      console.log('[App] Buildings with interiors:', buildingsWithInteriors.map(b => ({
        name: b.name,
        hasInterior: b.hasInterior,
        interiorWidth: b.interiorWidth,
        interiorHeight: b.interiorHeight
      })));
      
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
    console.log('Selection changed - selectedPlacedItems:', selection.selectedPlacedItems?.length || 0);
    // Deactivate measurement tool when selecting buildable or paving
    if ((selection.selectedBuildable || selection.selectedPaving || selection.erasePavingMode) && measurementTool.isToolActive()) {
      measurementTool.deactivate();
    }
    render(selection.selectedPlaced, undefined, undefined, undefined, undefined, undefined, selection.selectedPlacedItems);
  }, [selection.selectedPlaced, selection.selectedPlacedItems, selection.selectedBuildable, selection.selectedPaving, selection.erasePavingMode, selection.previewRotation, measurementTool, render]);

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
      // Don't handle shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (e.key === 'Escape') {
        // Close interior overlay if open
        if (activeInteriorId) {
          setActiveInteriorId(null);
          render();
          return;
        }
        selection.clearAll();
        if (measurementTool.isToolActive()) {
          measurementTool.deactivate();
          render();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        // Delete selected item(s) - only if not typing
        if (selection.selectedPlaced) {
          saveCurrentState();
          // Remove interior if building has one
          if (selection.selectedPlaced.interiorId) {
            interiorManager.removeInterior(`${selection.selectedPlaced.name}_${selection.selectedPlaced.x}_${selection.selectedPlaced.y}`);
          }
          gridManager.removeItem(selection.selectedPlaced);
          selection.selectPlaced(null);
          render();
        } else if (selection.selectedPlacedItems && selection.selectedPlacedItems.length > 0) {
          saveCurrentState();
          selection.selectedPlacedItems.forEach((item: PlacedItem) => {
            // Remove interior if building has one
            if (item.interiorId) {
              interiorManager.removeInterior(`${item.name}_${item.x}_${item.y}`);
            }
            gridManager.removeItem(item);
          });
          selection.selectMultiplePlaced([]);
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
  }, [selection, measurementTool, gridManager, render, activeInteriorId]);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire grid?')) {
      saveCurrentState();
      gridManager.clear();
      pavingManager.clear();
      interiorManager.clear();
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
      gridWidth,
      gridHeight,
      gridManager.getItems(),
      pavingManager,
      interiorManager
    );
    persistenceService.savePlan(data);
  };

  const handleLoad = async () => {
    const data = await persistenceService.loadPlan();
    if (!data) return;

    // Support legacy saves with single gridSize
    if (data.gridSize !== undefined && (data.gridWidth === undefined || data.gridHeight === undefined)) {
      setGridWidth(data.gridSize);
      setGridHeight(data.gridSize);
    } else {
      setGridWidth(data.gridWidth || 50);
      setGridHeight(data.gridHeight || 50);
    }
    
    // Load items
    const items = data.items.map(itemData => new PlacedItem(itemData));
    await Promise.all(items.map(item => imageLoaderService.preloadPlacedItemImage(item)));
    gridManager.loadItems(items);
    
    // Load paving
    pavingManager.loadPaving(data.paving);
    
    // Load interiors
    if (data.interiors) {
      interiorManager.loadInteriors(data.interiors);
    }
    
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
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        onGridWidthChange={setGridWidth}
        onGridHeightChange={setGridHeight}
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
            interiorManager={interiorManager}
            measurementTool={measurementTool}
            selection={selection}
            render={render}
            onStateChange={saveCurrentState}
            handleZoom={handleZoom}
            dataService={dataService}
            onHoverChange={setHoverPosition}
            activeInteriorId={activeInteriorId}
            onOpenInterior={(interiorId: string) => setActiveInteriorId(interiorId)}
            onCloseInterior={() => setActiveInteriorId(null)}
          />
          
          <InfoPanel
            selection={selection}
            gridManager={gridManager}
            pavingManager={pavingManager}
            measurementTool={measurementTool}
            render={render}
            onStateChange={saveCurrentState}
            hoverPosition={hoverPosition}
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
