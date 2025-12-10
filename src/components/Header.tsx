import React from 'react';
import { MeasurementTool } from '@models/MeasurementTool';

interface HeaderProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPNG: () => void;
  onToggleBuildables: () => void;
  showBuildables: boolean;
  measurementTool: MeasurementTool;
  onMeasure: () => void;
  onClearSelection?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  gridSize,
  onGridSizeChange,
  onClear,
  onSave,
  onLoad,
  onExportPNG,
  onToggleBuildables,
  showBuildables,
  measurementTool,
  onMeasure,
  onClearSelection,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const handleMeasureToggle = () => {
    if (measurementTool.isToolActive()) {
      measurementTool.deactivate();
    } else {
      measurementTool.activate();
      // Clear selections when activating measurement tool
      if (onClearSelection) {
        onClearSelection();
      }
    }
    onMeasure();
  };

  return (
    <header>
      <h1>Haven & Hearth Base Planner</h1>
      <div className="controls">
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          ↷ Redo
        </button>
        <button onClick={onClear}>Clear Grid</button>
        <button onClick={onSave}>Save Plan</button>
        <button onClick={onLoad}>Load Plan</button>
        <button onClick={onExportPNG}>Export PNG</button>
        <button onClick={onToggleBuildables}>
          {showBuildables ? 'Hide' : 'Show'} Buildables
        </button>
        <button
          onClick={handleMeasureToggle}
          className={measurementTool.isToolActive() ? 'active' : ''}
        >
          Measure {measurementTool.isToolActive() ? '(ON)' : ''}
        </button>
        <label>
          Grid Size:{' '}
          <input
            type="number"
            value={gridSize}
            onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
            min={20}
            max={100}
          />
        </label>
      </div>
    </header>
  );
};
