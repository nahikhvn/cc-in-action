# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude generates JSX/TSX code, and the result renders instantly in an iframe via a virtual file system.

## Development Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack at http://localhost:3000
npm run build          # Production build
npm run test           # Run all tests with Vitest
npm run test -- --watch           # Watch mode
npm run test -- path/to/file.test # Run a single test file
npm run db:reset       # Reset database (destructive)
```

Dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (included in npm scripts).

## Environment

Copy `.env.example` to `.env`. Key variables:
- `ANTHROPIC_API_KEY` — optional; without it the app uses a `MockLanguageModel` that returns static placeholder code
- `JWT_SECRET` — defaults to `"development-secret-key"` if unset

## Architecture

### Request Flow

1. User sends a message in `ChatInterface`
2. `ChatProvider` (wraps Vercel AI SDK's `useChat`) sends it to `POST /api/chat`
3. `/api/chat/route.ts` calls Claude via `streamText` with two tools: `str_replace_editor` and `file_manager`
4. Claude streams back tool calls; the client processes them via `handleToolCall` in `ChatProvider`
5. Tool calls are dispatched to `FileSystemProvider` which updates the in-memory virtual file system
6. `PreviewFrame` re-renders the iframe by Babel-transforming the virtual files into blob URLs

### Key Contexts

- **`FileSystemProvider`** (`src/lib/contexts/file-system-context.tsx`) — owns the virtual file system state; processes `str_replace_editor` and `file_manager` tool call results
- **`ChatProvider`** (`src/lib/contexts/chat-context.tsx`) — wraps `useChat`, connects tool calls to the file system, tracks anonymous usage

### Virtual File System

`src/lib/file-system.ts` — a pure in-memory implementation (no disk I/O). The full VFS is serialized to JSON and sent with each API request so the server can pass it to Claude as context.

### AI Integration

- **Provider**: `src/lib/provider.ts` — returns `claude-haiku-4-5` model or `MockLanguageModel` if no API key
- **System Prompt**: `src/lib/prompts/generation.tsx` — instructs Claude to write React components with Tailwind CSS, always use `/App.jsx` as entry point, use `@/` import aliases
- **Tools**: `src/lib/tools/str-replace.ts` (file editing) and `src/lib/tools/file-manager.ts` (file CRUD)

### JSX Preview

`src/lib/transform/jsx-transformer.ts` — uses Babel standalone to transpile virtual files to browser-runnable JS, then creates blob URLs loaded in the iframe.

### Authentication

JWT-based with bcrypt passwords stored in SQLite via Prisma. Sessions use HTTP-only cookies (7-day expiry). `src/middleware.ts` protects API routes. Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out.

### Database

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

Prisma + SQLite with two models:
- `User` — email/password auth
- `Project` — stores `messages` and `data` (VFS snapshot) as JSON blobs

Run `npx prisma studio` to inspect data.

## Testing

Tests live in `__tests__/` directories colocated with source files. Uses Vitest + jsdom + React Testing Library. Key test areas:

- `src/lib/__tests__/file-system.test.ts` — VFS core logic
- `src/lib/transform/__tests__/jsx-transformer.test.ts` — Babel transform
- `src/lib/contexts/__tests__/` — context providers
- `src/components/chat/__tests__/` — chat UI components

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**, **TypeScript 5**, **Tailwind CSS 4**
- **Vercel AI SDK 4** + **@ai-sdk/anthropic**
- **Prisma 6** / SQLite
- **Monaco Editor** for the code editor
- **Babel standalone** for in-browser JSX transform
- **shadcn/ui** (new-york style) + **Radix UI** primitives
- **Vitest** + **Testing Library** for tests
