<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# React Flow Documentation & Usage

Never rely on training data for React Flow (`@xyflow/react` / `reactflow`) APIs, types, conventions, or component usage. Every time you need to use, write, or modify React Flow code (components, hooks, types, node/edge registration, or styling), do NOT rely on training data; search and consult https://reactflow.dev/llms.txt (and documentation links referenced within it) to use current, accurate APIs.

# Database Types

Derive database types from the Drizzle schema – never hand-write custom or partial shapes for table rows. Export `typeof table.$inferSelect` (and `$inferInsert` when needed) from `lib/schema.ts` and import it. When a consumer needs only some columns, narrow with `Pick<Row, ...>` / `Omit<Row, ...>` rather than redeclaring a literal type. Don't add an insert type where `db.insert(...).values()` already enforces the shape.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
