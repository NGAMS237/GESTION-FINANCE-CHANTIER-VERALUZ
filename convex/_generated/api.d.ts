/* eslint-disable */
/**
 * Version écrite à la main en attendant `npx convex dev`, qui régénère ce
 * fichier à l'identique dès qu'un déploiement est configuré.
 */
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_rows from "../lib/rows.js";
import type * as migration from "../migration.js";
import type * as payments from "../payments.js";
import type * as phases from "../phases.js";
import type * as projects from "../projects.js";
import type * as quotes from "../quotes.js";
import type * as suppliers from "../suppliers.js";
import type * as users from "../users.js";
import type * as workspace from "../workspace.js";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  documents: typeof documents;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/cascade": typeof lib_cascade;
  "lib/rows": typeof lib_rows;
  migration: typeof migration;
  payments: typeof payments;
  phases: typeof phases;
  projects: typeof projects;
  quotes: typeof quotes;
  suppliers: typeof suppliers;
  users: typeof users;
  workspace: typeof workspace;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
