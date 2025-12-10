import { useState, useCallback } from 'react';
import { PlacedItem } from '@models/BuildableItem';
import { PavingData } from '@models/types';

/**
 * Represents a snapshot of the application state
 */
export interface HistoryState {
  items: PlacedItem[];
  paving: Record<string, PavingData>;
}

/**
 * Custom hook for managing undo/redo functionality
 */
export function useUndoRedo() {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  /**
   * Save the current state to history
   */
  const saveState = useCallback((items: PlacedItem[], paving: Record<string, PavingData>) => {
    setHistory(prev => {
      // Remove any states after current index (when adding new state after undo)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Deep clone the state to prevent mutations
      const clonedItems = items.map(item => new PlacedItem({
        name: item.name,
        category: item.category as any,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        color: item.color,
        image: item.image,
        imageUrl: item.imageUrl,
      }, item.getImageElement()));
      
      const clonedPaving = JSON.parse(JSON.stringify(paving));
      
      newHistory.push({
        items: clonedItems,
        paving: clonedPaving,
      });
      
      // Limit history size to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(prev => prev); // Don't increment index since we removed first item
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, 49));
  }, [currentIndex]);

  /**
   * Undo the last action
   */
  const undo = useCallback((): HistoryState | null => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  /**
   * Redo the next action
   */
  const redo = useCallback((): HistoryState | null => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  /**
   * Check if undo is available
   */
  const canUndo = currentIndex > 0;

  /**
   * Check if redo is available
   */
  const canRedo = currentIndex < history.length - 1;

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
