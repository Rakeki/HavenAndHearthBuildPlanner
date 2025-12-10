# Haven & Hearth Base Planner - React TypeScript Edition

A complete rewrite of the Haven & Hearth Base Planner using React, TypeScript, and Object-Oriented principles.

## Architecture

### Object-Oriented Structure

The application follows SOLID principles with a clean separation of concerns:

#### Models (`src/models/`)
- **BuildableItem**: Represents buildable items with image preloading
- **PlacedItem**: Represents items placed on the grid with collision detection
- **GridManager**: Manages the grid state and item placement logic
- **PavingManager**: Handles paving tiles and shape drawing (line, rectangle, circle)
- **MeasurementTool**: Provides measurement functionality
- **CanvasRenderer**: Encapsulates all canvas drawing operations
- **types.ts**: TypeScript type definitions

#### Services (`src/services/`)
- **DataService**: Loads and filters buildable items and paving types
- **ImageLoaderService**: Handles asynchronous image preloading
- **PersistenceService**: Manages save/load and PNG export functionality

#### Components (`src/components/`)
- **App**: Main application component
- **Header**: Top navigation with controls
- **BuildablesSidebar**: Searchable/filterable list of buildable items
- **PavingSidebar**: Paving selection and tools
- **PlannerCanvas**: Interactive canvas component
- **InfoPanel**: Displays selection info and action buttons

#### Hooks (`src/hooks/`)
- **useCanvas**: Manages canvas rendering and managers
- **useSelection**: Handles selection state for buildables, placed items, and paving

## Installation

```bash
cd react-app
npm install
```

## Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Features

- ✅ **Object-Oriented Design**: Clean separation with classes for domain logic
- ✅ **TypeScript**: Full type safety across the application
- ✅ **React Hooks**: Custom hooks for state management
- ✅ **Service Layer**: Business logic separated from UI
- ✅ **Canvas Rendering**: Dedicated renderer class
- ✅ **Image Preloading**: Async loading with service
- ✅ **Save/Load**: JSON-based persistence
- ✅ **PNG Export**: Export canvas as image
- ✅ **Measurement Tool**: Measure distances on grid
- ✅ **Paving Tools**: Line, rectangle, and circle paving modes
- ✅ **Drag & Place**: Interactive item placement
- ✅ **Rotation**: Rotate placed items
- ✅ **Collision Detection**: Prevent overlapping items
- ✅ **Search & Filter**: Find items quickly by name or category

## Key Design Patterns

1. **Singleton Pattern**: Services (DataService, PersistenceService, ImageLoaderService)
2. **Strategy Pattern**: Shape drawing in PavingManager
3. **Observer Pattern**: React's state management
4. **Factory Pattern**: BuildableItem.createPlacedItem()
5. **Repository Pattern**: DataService for data access

## Class Responsibilities

### GridManager
- Maintains grid size and placed items
- Validates item placement (bounds, collisions)
- Provides item manipulation methods (add, remove, move, rotate)

### PavingManager
- Manages paving grid (Map-based storage)
- Implements shape algorithms (Bresenham's line, circle, rectangle)
- Handles paving placement and removal

### CanvasRenderer
- Encapsulates all canvas drawing operations
- Draws grid, paving, items, and measurements
- Converts mouse coordinates to grid coordinates

### MeasurementTool
- Manages measurement state
- Calculates Euclidean and Manhattan distances
- Provides delta X/Y values

## Benefits of This Architecture

1. **Testability**: Each class can be unit tested independently
2. **Maintainability**: Clear responsibilities make changes easier
3. **Reusability**: Models and services can be reused in other projects
4. **Type Safety**: TypeScript prevents many runtime errors
5. **Separation of Concerns**: UI logic separated from business logic
6. **Scalability**: Easy to add new features without breaking existing code

## Migration Notes

The original vanilla JS implementation has been completely refactored:
- Global variables → Class-based state management
- Procedural code → Object-oriented classes
- Inline logic → Service layer
- Direct DOM manipulation → React components
- No types → Full TypeScript

## Data Files

- `src/data/buildables.json`: 313 buildable items
- `src/data/paving.json`: 90 paving types

Both files are imported and instantiated as proper class instances at runtime.
