# Frontend Application Documentation

<cite>
**Referenced Files in This Document**
- [App.jsx](file://Mini_Project/clinical-nids-dashboard/src/App.jsx)
- [main.jsx](file://Mini_Project/clinical-nids-dashboard/src/main.jsx)
- [Layout.jsx](file://Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx)
- [Sidebar.jsx](file://Mini_Project/clinical-nids-dashboard/src/components/Sidebar.jsx)
- [TopNav.jsx](file://Mini_Project/clinical-nids-dashboard/src/components/TopNav.jsx)
- [api.js](file://Mini_Project/clinical-nids-dashboard/src/data/api.js)
- [mockData.js](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js)
- [Dashboard.jsx](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx)
- [Monitoring.jsx](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx)
- [Alerts.jsx](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx)
- [Analytics.jsx](file://Mini_Project/clinical-nids-dashboard/src/pages/Analytics.jsx)
- [DatasetUpload.jsx](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx)
- [package.json](file://Mini_Project/clinical-nids-dashboard/package.json)
- [tailwind.config.js](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js)
- [vite.config.js](file://Mini_Project/clinical-nids-dashboard/vite.config.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the React-based frontend dashboard for the Clinical-NIDS cybersecurity platform. It covers the component architecture, routing system, state management patterns, styling with Tailwind CSS, and integration with backend APIs. It documents the major pages: Dashboard analytics, Real-time Monitoring, Alert management, Dataset Upload interface, and Threat Details view. Guidance is included for extending the dashboard with new features and maintaining responsive design.

## Project Structure
The frontend is organized around a clean separation of concerns:
- Routing and entry point: App routes and main.jsx bootstrap
- Layout and navigation: Layout, Sidebar, and TopNav compose the shell
- Pages: Individual feature pages under pages/
- Data layer: API service module and mock data for development
- Styling: Tailwind CSS configuration and Vite build pipeline

```mermaid
graph TB
A["main.jsx<br/>Bootstrap"] --> B["App.jsx<br/>Routing"]
B --> C["Layout.jsx<br/>Shell"]
C --> D["Sidebar.jsx<br/>Navigation"]
C --> E["TopNav.jsx<br/>Header"]
C --> F["Outlet<br/>Page Content"]
F --> G["Dashboard.jsx"]
F --> H["Monitoring.jsx"]
F --> I["Alerts.jsx"]
F --> J["Analytics.jsx"]
F --> K["DatasetUpload.jsx"]
G --> L["api.js<br/>Backend Integration"]
H --> L
I --> L
J --> L
K --> L
L --> M["mockData.js<br/>Development Data"]
```

**Diagram sources**
- [main.jsx:1-14](file://Mini_Project/clinical-nids-dashboard/src/main.jsx#L1-L14)
- [App.jsx:1-32](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L1-L32)
- [Layout.jsx:1-18](file://Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx#L1-L18)
- [Sidebar.jsx:1-76](file://Mini_Project/clinical-nids-dashboard/src/components/Sidebar.jsx#L1-L76)
- [TopNav.jsx:1-46](file://Mini_Project/clinical-nids-dashboard/src/components/TopNav.jsx#L1-L46)
- [Dashboard.jsx:1-328](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx#L1-L328)
- [Monitoring.jsx:1-191](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx#L1-L191)
- [Alerts.jsx:1-157](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx#L1-L157)
- [Analytics.jsx:1-124](file://Mini_Project/clinical-nids-dashboard/src/pages/Analytics.jsx#L1-L124)
- [DatasetUpload.jsx:1-287](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx#L1-L287)
- [api.js:1-236](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L1-L236)
- [mockData.js:1-91](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L1-L91)

**Section sources**
- [main.jsx:1-14](file://Mini_Project/clinical-nids-dashboard/src/main.jsx#L1-L14)
- [App.jsx:1-32](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L1-L32)

## Core Components
- Layout composes Sidebar, TopNav, and Outlet for nested page rendering.
- Sidebar provides primary navigation with icons and active state styling.
- TopNav displays status indicators, notifications, and user profile.
- Pages implement domain-specific UI and integrate with the API service.

Key styling and build configuration:
- Tailwind CSS configured with custom colors, fonts, animations, and keyframes.
- Vite plugin for React enables fast development builds.
- Package dependencies include React, React Router DOM, Recharts, and Lucide icons.

**Section sources**
- [Layout.jsx:1-18](file://Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx#L1-L18)
- [Sidebar.jsx:1-76](file://Mini_Project/clinical-nids-dashboard/src/components/Sidebar.jsx#L1-L76)
- [TopNav.jsx:1-46](file://Mini_Project/clinical-nids-dashboard/src/components/TopNav.jsx#L1-L46)
- [tailwind.config.js:1-49](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js#L1-L49)
- [vite.config.js:1-7](file://Mini_Project/clinical-nids-dashboard/vite.config.js#L1-L7)
- [package.json:1-31](file://Mini_Project/clinical-nids-dashboard/package.json#L1-L31)

## Architecture Overview
The application follows a layered architecture:
- Presentation layer: React components and pages
- Routing layer: React Router DOM with nested routes inside Layout
- Data access layer: api.js encapsulates HTTP requests to Spring Boot and FastAPI services
- Styling layer: Tailwind CSS utility classes with custom theme tokens

```mermaid
graph TB
subgraph "Presentation"
P1["Layout"]
P2["Sidebar"]
P3["TopNav"]
P4["Pages"]
end
subgraph "Routing"
R1["App Routes"]
R2["Outlet"]
end
subgraph "Data Access"
D1["api.js"]
D2["Backend (Spring Boot)"]
D3["ML Service (FastAPI)"]
end
subgraph "Styling"
S1["Tailwind CSS"]
S2["Custom Theme"]
end
R1 --> R2
R2 --> P1
P1 --> P2
P1 --> P3
P1 --> P4
P4 --> D1
D1 --> D2
D1 --> D3
P1 --> S1
P4 --> S1
S1 --> S2
```

**Diagram sources**
- [App.jsx:1-32](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L1-L32)
- [Layout.jsx:1-18](file://Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx#L1-L18)
- [Sidebar.jsx:1-76](file://Mini_Project/clinical-nids-dashboard/src/components/Sidebar.jsx#L1-L76)
- [TopNav.jsx:1-46](file://Mini_Project/clinical-nids-dashboard/src/components/TopNav.jsx#L1-L46)
- [Dashboard.jsx:1-328](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx#L1-L328)
- [Monitoring.jsx:1-191](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx#L1-L191)
- [Alerts.jsx:1-157](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx#L1-L157)
- [Analytics.jsx:1-124](file://Mini_Project/clinical-nids-dashboard/src/pages/Analytics.jsx#L1-L124)
- [DatasetUpload.jsx:1-287](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx#L1-L287)
- [api.js:1-236](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L1-L236)
- [tailwind.config.js:1-49](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js#L1-L49)

## Detailed Component Analysis

### Routing System
- Root routes define public login and protected layout.
- Nested routes under Layout include Dashboard, Monitoring, Alerts, Analytics, Dataset Upload, and Threat Details.
- Catch-all route redirects to Dashboard.

```mermaid
sequenceDiagram
participant U as "User"
participant BR as "BrowserRouter"
participant R as "Routes/App"
participant L as "Layout"
participant O as "Outlet"
U->>BR : Navigate to "/dashboard"
BR->>R : Match "/"
R->>L : Render Layout
L->>O : Render Dashboard
U->>BR : Navigate to "/monitoring"
BR->>R : Match "/monitoring"
R->>L : Render Layout
L->>O : Render Monitoring
```

**Diagram sources**
- [App.jsx:12-28](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L12-L28)
- [Layout.jsx:1-18](file://Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx#L1-L18)

**Section sources**
- [App.jsx:1-32](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L1-L32)

### Dashboard Analytics Page
Responsibilities:
- Fetch datasets and latest analysis results via API.
- Render summary cards, charts, recent datasets, and predictions table.
- Integrate Recharts for area, pie, bar, and line charts.
- Support fallback to mock data when backend is unavailable.

State management:
- useState for datasets, latest analysis, loading state.
- useEffect to load data on mount.

Data flow:
- getDatasets -> getAnalysis -> render charts and tables.

```mermaid
flowchart TD
Start(["Mount Dashboard"]) --> Fetch["Fetch Datasets"]
Fetch --> HasData{"Has datasets?"}
HasData --> |Yes| GetAnalysis["Fetch Latest Analysis"]
HasData --> |No| UseMock["Use Mock Data"]
GetAnalysis --> Render["Render Charts & Tables"]
UseMock --> Render
Render --> End(["Ready"])
```

**Diagram sources**
- [Dashboard.jsx:30-56](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx#L30-L56)
- [Dashboard.jsx:85-327](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx#L85-L327)
- [api.js:158-194](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L158-L194)
- [mockData.js:1-91](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L1-L91)

**Section sources**
- [Dashboard.jsx:1-328](file://Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx#L1-L328)
- [api.js:158-194](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L158-L194)
- [mockData.js:1-91](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L1-L91)

### Real-time Monitoring Page
Responsibilities:
- Display live metrics and detection events.
- Render live packet flow chart and bandwidth utilization.
- Show AI feature importance for explainability.
- Provide navigation to Threat Details.

State management:
- useState for filter state.

Data sources:
- Uses mockData for live-like charts and threat events.

```mermaid
sequenceDiagram
participant U as "User"
participant M as "Monitoring Page"
participant RC as "Recharts"
participant MD as "mockData"
U->>M : Open Monitoring
M->>RC : Render Line/Area Charts
M->>MD : Use live-like data
M-->>U : Show detection events table
U->>M : Click "View Details"
M-->>U : Navigate to Threat Details
```

**Diagram sources**
- [Monitoring.jsx:19-191](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx#L19-L191)
- [mockData.js:1-91](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L1-L91)

**Section sources**
- [Monitoring.jsx:1-191](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx#L1-L191)
- [mockData.js:1-91](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L1-L91)

### Alert Management Page
Responsibilities:
- Filter and display security alerts by status and search term.
- Show summary cards for alert counts.
- Provide actions to review and block IPs.

State management:
- useState for tab selection and search input.

Data sources:
- Static mock data for alerts.

```mermaid
flowchart TD
A["Open Alerts"] --> B["Apply Tab Filter"]
B --> C["Apply Search Filter"]
C --> D{"Results Found?"}
D --> |Yes| E["Render Alert Cards"]
D --> |No| F["Show Empty State"]
E --> G["User Actions"]
G --> H["Navigate to Threat Details"]
```

**Diagram sources**
- [Alerts.jsx:15-157](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx#L15-L157)
- [mockData.js:45-54](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L45-L54)

**Section sources**
- [Alerts.jsx:1-157](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx#L1-L157)
- [mockData.js:45-54](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L45-L54)

### Analytics Page
Responsibilities:
- Present attack analytics with KPIs and multiple charts.
- Render attack distribution pie, protocol usage bar, attack timeline line, and threat intensity area charts.

Data sources:
- Uses mockData for all analytics visuals.

**Section sources**
- [Analytics.jsx:1-124](file://Mini_Project/clinical-nids-dashboard/src/pages/Analytics.jsx#L1-L124)
- [mockData.js:29-43](file://Mini_Project/clinical-nids-dashboard/src/data/mockData.js#L29-L43)

### Dataset Upload Interface
Responsibilities:
- Drag-and-drop file upload with validation.
- Two-stage process: upload dataset and trigger analysis.
- Fallback to ML service if backend is unavailable.
- Progress tracking and success/error messaging.
- Auto-navigation to Analysis Result page upon completion.

```mermaid
sequenceDiagram
participant U as "User"
participant DU as "DatasetUpload"
participant API as "api.js"
participant SB as "Spring Boot"
participant ML as "FastAPI ML"
U->>DU : Select/Drop .parquet file
DU->>DU : Validate file
DU->>API : uploadDataset(file)
alt Backend Available
API->>SB : POST /api/dataset/upload
SB-->>API : {datasetId}
API-->>DU : uploadResult
else Fallback
API->>ML : POST /api/upload
ML-->>API : {dataset_id}
API-->>DU : mlResult
end
DU->>API : analyzeDataset(datasetId)
alt Backend Flow
API->>SB : POST /api/dataset/{id}/analyze
SB-->>API : analysisResult
else ML Flow
API->>ML : POST /api/analyze/{datasetId}
ML-->>API : analysisResult
end
DU-->>U : Navigate to Analysis Result
```

**Diagram sources**
- [DatasetUpload.jsx:65-135](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx#L65-L135)
- [api.js:159-178](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L159-L178)
- [api.js:206-223](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L206-L223)

**Section sources**
- [DatasetUpload.jsx:1-287](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx#L1-L287)
- [api.js:159-178](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L159-L178)
- [api.js:206-223](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L206-L223)

### Threat Details View
- Navigation to Threat Details is integrated across Monitoring and Alerts pages.
- The route pattern supports dynamic ID binding for detailed views.
- Implementation is routed but not present in the current snapshot; integration points are defined in parent pages.

**Section sources**
- [Monitoring.jsx:178-180](file://Mini_Project/clinical-nids-dashboard/src/pages/Monitoring.jsx#L178-L180)
- [Alerts.jsx:129-131](file://Mini_Project/clinical-nids-dashboard/src/pages/Alerts.jsx#L129-L131)
- [App.jsx:24](file://Mini_Project/clinical-nids-dashboard/src/App.jsx#L24)

## Dependency Analysis
External libraries and their roles:
- React and React DOM: Core framework
- React Router DOM: Declarative routing and navigation
- Recharts: Charting library for analytics and monitoring
- Lucide React: Icons for UI affordances

Build and tooling:
- Vite: Development server and bundling
- Tailwind CSS: Utility-first styling with custom theme

```mermaid
graph LR
R["React"] --> RR["React Router DOM"]
R --> RC["Recharts"]
R --> LU["Lucide React"]
V["Vite"] --> R
TW["Tailwind CSS"] --> UI["UI Components"]
```

**Diagram sources**
- [package.json:11-26](file://Mini_Project/clinical-nids-dashboard/package.json#L11-L26)
- [vite.config.js:1-7](file://Mini_Project/clinical-nids-dashboard/vite.config.js#L1-L7)
- [tailwind.config.js:1-49](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js#L1-L49)

**Section sources**
- [package.json:1-31](file://Mini_Project/clinical-nids-dashboard/package.json#L1-L31)
- [vite.config.js:1-7](file://Mini_Project/clinical-nids-dashboard/vite.config.js#L1-L7)
- [tailwind.config.js:1-49](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js#L1-L49)

## Performance Considerations
- Prefer lazy loading for heavy pages if the bundle grows large.
- Debounce search inputs in Alerts and Analytics for reduced re-renders.
- Virtualize long lists (e.g., detection events) to minimize DOM nodes.
- Use responsive chart containers to avoid layout thrashing on resize.
- Cache API responses where appropriate and implement optimistic updates for better perceived performance.

## Troubleshooting Guide
Common issues and resolutions:
- Backend unavailability during upload: The upload flow automatically falls back to the ML service if the Spring Boot endpoint fails.
- Authentication errors: Ensure tokens are persisted and included in API requests; verify token lifecycle in local storage.
- Chart rendering anomalies: Confirm responsive container sizes and data shape compatibility with Recharts.
- Styling inconsistencies: Verify Tailwind content paths and ensure custom theme tokens are applied consistently.

**Section sources**
- [DatasetUpload.jsx:77-87](file://Mini_Project/clinical-nids-dashboard/src/pages/DatasetUpload.jsx#L77-L87)
- [api.js:35-41](file://Mini_Project/clinical-nids-dashboard/src/data/api.js#L35-L41)
- [tailwind.config.js:3-6](file://Mini_Project/clinical-nids-dashboard/tailwind.config.js#L3-L6)

## Conclusion
The Clinical-NIDS dashboard provides a modular, data-driven interface with clear separation between routing, layout, and feature pages. Its integration with backend APIs and Recharts enables rich visualizations and real-time monitoring capabilities. The Tailwind CSS configuration ensures a cohesive, responsive design. Extending the dashboard involves adding new pages, integrating additional API endpoints, and leveraging the existing charting and styling patterns.