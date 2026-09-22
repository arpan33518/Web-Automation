import { pgTable, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';
import type { Edge } from '@xyflow/react';

import type { StepNodeType } from '@/features/workflows/nodes/node-registry';

export type WorkflowGraph = { nodes: StepNodeType[]; edges: Edge[]; }

export const users = pgTable('users', {
  id: varchar('id', { length: 256 }).primaryKey(), // Clerk User ID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workflows = pgTable('workflows', {
  id: varchar('id', { length: 256 }).primaryKey(), // NanoID or UUID
  name: text('name').notNull(),
  orgId: varchar('org_id', { length: 256 }).notNull(),
  graph: text('graph').$type<WorkflowGraph>(),
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
