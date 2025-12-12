import { useState } from 'react';
import { PlacedItem, BuildableItem } from '@models/BuildableItem';
import { PavingType } from '@models/PavingManager';
import { ShapeMode } from '@models/types';
import { LineTool } from '@models/LineTool';

export function useSelection() {
  const [selectedBuildable, setSelectedBuildable] = useState<BuildableItem | null>(null);
  const [selectedPlaced, setSelectedPlaced] = useState<PlacedItem | null>(null);
  const [selectedPaving, setSelectedPaving] = useState<PavingType | null>(null);
  const [erasePavingMode, setErasePavingMode] = useState(false);
  const [pavingShapeMode, setPavingShapeMode] = useState<ShapeMode>('line');
  const [lineTool] = useState(() => new LineTool());
  const [previewRotation, setPreviewRotation] = useState<number>(0); // 0, 90, 180, 270

  const selectBuildable = (item: BuildableItem | null) => {
    setSelectedBuildable(item);
    setPreviewRotation(0); // Reset rotation when selecting a new buildable
    if (item) {
      // Clear paving and placed selections when selecting a buildable
      setSelectedPaving(null);
      setErasePavingMode(false);
      setSelectedPlaced(null);
      
      // Reset line tool when selecting non-line buildables
      if (!item.usesLineTool) {
        lineTool.reset();
      }
    }
  };

  const selectPlaced = (item: PlacedItem | null) => {
    setSelectedPlaced(item);
    setSelectedBuildable(null);
    if (item) {
      // Clear paving selections when selecting a placed item
      setSelectedPaving(null);
      setErasePavingMode(false);
      lineTool.reset();
    }
  };

  const selectPaving = (paving: PavingType | null) => {
    setSelectedPaving(paving);
    if (paving) {
      // Clear buildable and placed selections when selecting paving
      setSelectedBuildable(null);
      setSelectedPlaced(null);
      setErasePavingMode(false);
      lineTool.reset();
    }
  };

  const toggleEraseMode = () => {
    setErasePavingMode(!erasePavingMode);
    if (!erasePavingMode) {
      setSelectedPaving(null);
      setSelectedBuildable(null);
      setSelectedPlaced(null);
      lineTool.reset();
    }
  };

  const clearAll = () => {
    setSelectedBuildable(null);
    setSelectedPlaced(null);
    setSelectedPaving(null);
    setErasePavingMode(false);
    setPreviewRotation(0);
    lineTool.reset();
  };

  const setShapeMode = (mode: ShapeMode) => {
    setPavingShapeMode(mode);
  };

  const rotatePreview = () => {
    setPreviewRotation((prev) => (prev + 90) % 360);
  };

  return {
    selectedBuildable,
    selectedPlaced,
    selectedPaving,
    erasePavingMode,
    pavingShapeMode,
    lineTool,
    previewRotation,
    selectBuildable,
    selectPlaced,
    selectPaving,
    toggleEraseMode,
    clearAll,
    setShapeMode,
    rotatePreview,
  };
}
