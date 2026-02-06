# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, and an AI agent generates/edits files in a virtual file system displayed via Monaco editor and an iframe preview.

## Commands

- `npm run dev` — Start dev server (Turbopack, port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test` — Run all tests with Vitest
- `npx vitest run src/path/to/file.test.ts` — Run a single test file
- `npm run setup` — First-time setup (install deps, generate Prisma client, run migrations)
- `npm run db:reset` — Reset SQLite database

## Tech Stack

- **Next.js 15** (App Router, Server Actions, Turbopack)
- **React 19**, **TypeScript 5**, **Tailwind CSS v4**
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for streaming chat with tool calling
- **Prisma** with SQLite (`prisma/dev.db`), generated client output at `src/generated/prisma`
- **Monaco Editor** for code editing, **@babel/standalone** for client-side JSX transformation
- **shadcn/ui** (New York style) with Radix UI primitives in `src/components/ui/`
- **Vitest** + **Testing Library** (jsdom environment)

## Architecture

### Routing & Entry Points

- `/` — Home page; redirects authenticated users to their first project
- `/[projectId]` — Project workspace (chat + editor + preview)
- `/api/chat` (POST) — Streaming AI chat endpoint with tool calling

### Core Data Flow

1. **ChatContext** wraps the Vercel AI SDK `useChat` hook, sending messages to `/api/chat` with the serialized virtual file system
2. The API route reconstructs a `VirtualFileSystem` from the request, runs `streamText()` with two tools (`str_replace_editor`, `file_manager`), and streams responses back
3. **FileSystemContext** receives tool calls client-side via `onToolCall` and applies file operations to the in-memory `VirtualFileSystem`
4. The editor and preview components react to file system changes via a `refreshTrigger` counter

### Virtual File System (`src/lib/file-system.ts`)

Tree-based in-memory file system (`FileNode` with `Map<string, FileNode>` children). Supports create/read/update/delete/rename with path normalization. Serializes to JSON for database persistence (stored as stringified JSON in Project.data). The server-side instance and client-side instance are separate — the server operates on its copy during AI generation, while the client applies tool calls independently.

### AI Integration (`src/lib/provider.ts`)

- Uses `claude-haiku-4-5` via `@ai-sdk/anthropic` when `ANTHROPIC_API_KEY` is set
- Falls back to `MockLanguageModel` (returns canned component code) when no API key is present
- Two tools exposed to the AI: `str_replace_editor` (view/create/replace/insert in files) and `file_manager` (rename/delete)
- System prompt defined in `src/lib/prompts/generation.tsx`

### Preview System (`src/lib/transform/jsx-transformer.ts`)

Client-side JSX → JS transformation using `@babel/standalone`. Generates an HTML document with import maps that resolve `@/` paths, embeds React via CDN, and renders in an iframe.

### Authentication

- JWT-based sessions using `jose`, stored in HTTP-only cookies
- Password hashing with `bcrypt`
- Server Actions in `src/actions/` handle sign up/in/out and project CRUD
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes
- Anonymous users can use the app; work is tracked in `sessionStorage` and migrated on sign-up

### Database Schema (Prisma)

Two models: `User` (email, password) and `Project` (name, messages as JSON string, data as serialized VFS JSON string). Projects optionally link to users via `userId`.

### Node.js Compatibility

`node-compat.cjs` is required via `NODE_OPTIONS` in all scripts to remove `localStorage`/`sessionStorage` globals added by Node.js 25+, preventing SSR errors.

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json and resolved by vite-tsconfig-paths in tests).

## Test Conventions

Tests live in `__tests__/` directories next to the code they test. Run with Vitest in jsdom environment. Tests use React Testing Library for component tests.
