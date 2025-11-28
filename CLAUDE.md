# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production

## Architecture Overview

**Framework Stack:**
- TanStack Start with React 19 and TypeScript
- Vite with SSR support via TanStack Start plugin
- File-based routing with automatic type generation

**Key Architecture Patterns:**
- **File-based routing**: Routes are defined in `src/routes/` using `createFileRoute()`
- **Server functions**: Use `createServerFn()` for server-side operations (file I/O, API calls)
- **Route tree generation**: `routeTree.gen.ts` is auto-generated from route files
- **SSR-ready**: Root layout in `__root.tsx` provides HTML structure with `HeadContent` and `Scripts`

**Project Structure:**
```
src/
├── routes/
│   ├── __root.tsx          # Root layout with HTML structure and meta tags
│   └── index.tsx           # Home page with server functions for counter
├── router.tsx              # Router configuration using routeTree.gen.ts
└── routeTree.gen.ts        # Auto-generated route tree (do not edit manually)
```

**Server Function Pattern:**
Server functions use `createServerFn()` with method definitions and handlers. Example pattern from counter:
- GET functions for data retrieval
- POST functions with input validators for mutations
- File system operations for state persistence

**Route Components:**
Routes export a `Route` object with `component` and optional `loader` for data fetching. Use `Route.useLoaderData()` to access loader data in components.

**File Naming Convention:**
- **Components**: Use kebab-case for all component file names (e.g., `movie-card.tsx`, `content-row.tsx`)
- **UI Components**: The UI library components (in `src/components/ui/`) follow their existing naming convention
- **Files**: All files should use lowercase with hyphens for readability