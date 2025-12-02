# Network Editor Project Context

## Overview
This is a Network Editor application built with Next.js, React Flow, and Material UI. It allows users to design and simulate fluid network diagrams (nodes and pipes).

## Tech Stack
- **Framework**: Next.js (App Router)
- **UI Library**: Material UI (MUI)
- **Diagramming**: React Flow (@xyflow/react)
- **State Management**: Zustand
- **Language**: TypeScript

## Looks and Feels
The application has a modern, clean look with a dark theme and a light theme. The dark theme is the default, and the light theme can be enabled by clicking the sun icon in the top right corner. The dialog and panel components are styled using Material UI with glassmorphism and iOS like design and are responsive.

## Current State (as of Dec 2, 2025)
The application has recently undergone a major refactor to move state management from local state/prop drilling to a global Zustand store.

### Recent Changes
- **Zustand Integration**: `NetworkEditor.tsx` and `PropertiesPanel.tsx` now consume state directly from `useNetworkStore`.
- **Prop Removal**: `page.tsx` has been cleaned up and no longer passes massive amounts of props to child components.
- **Refactoring**: `NetworkEditor` was split into a wrapper and an inner `EditorCanvas` component.
- **Linting**: Fixed various lint errors and circular dependency issues in the refactored components.

## Key Files
- **Store**: `src/store/useNetworkStore.ts` - Centralized state management for the network, selection, and UI state.
- **Main Page**: `src/app/page.tsx` - The main entry point, now simplified.
- **Editor**: `src/components/NetworkEditor.tsx` - The canvas component (React Flow wrapper).
- **Properties**: `src/components/PropertiesPanel.tsx` - The side panel for editing node/pipe properties.
- **Summary**: `src/components/SummaryTable.tsx` - The data grid view of the network.

## Setup Instructions
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build**:
    ```bash
    npm run build
    ```

## Next Steps / Pending Tasks
- **SummaryTable Refactor**: The `SummaryTable` component still receives `network` and `onNetworkChange` as props. Consider refactoring it to use `useNetworkStore` for consistency.
- **Testing**: Verify all interactions (drag, drop, connect, property updates) work as expected after the refactor.
- **Feature Work**: Continue with any pending feature requests (e.g., advanced fluid calculations, export options).
- **Database**: Add a database to store the network data.
- **Performance**: Optimize the application for better performance, especially when handling large networks.
- **Documentation**: Update the documentation to reflect the recent changes.

## Notes for Continuity
- If you open this project on a new machine, ensure you have the latest `node_modules`.
- The `GEMINI.md` file (this file) serves as a high-level context for the AI assistant to quickly understand the project state.
