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

**TypeScript Best Practices:**

- **Avoid the `any` type**: Never use `any` in this codebase. Always prefer proper TypeScript typing
- Use specific types or interfaces instead of `any` for better type safety and code maintainability
- When working with external APIs or unknown data structures, create proper type definitions
- Use `unknown` instead of `any` when you truly cannot determine the type at development time
- Leverage TypeScript's type inference to reduce explicit type annotations where appropriate

**UI Component Usage:**

- **Always prefer shadcn UI components** over native HTML elements
- Use `@/components/ui/button` instead of `<button>` elements
- Use `@/components/ui/checkbox` instead of `<input type="checkbox">`
- Use `@/components/ui/radio-group` instead of `<input type="radio">`
- Use `@/components/ui/input` instead of `<input type="text">`
- Use `@/components/ui/label` instead of `<label>` elements
- Available components are listed in `src/components/ui/` - always check what's available before using native elements

**Environment Variables:**

- `INCLUDE_ADULT_CONTENT` - Controls whether adult content is included in TMDB search results (default: false)
  - Set to `true` to include adult content in search results
  - Set to `false` or omit to exclude adult content
  - Used in: `src/lib/data/search.ts` for TMDB multi-search API calls

## ULTRATHINK PROMPT

For complex tasks, always activate ULTRATHINK mode:

1. **Analysis**: Understand the requirements and constraints.
2. **Planning**: Break down the task into manageable steps.
3. **Execution**: Implement each step with precision.
4. **Review**: Evaluate the solution for completeness and efficiency.

Use ULTRATHINK to ensure the best possible outcomes for challenging problems.
