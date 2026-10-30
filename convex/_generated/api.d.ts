/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity_log from "../activity_log.js";
import type * as categories from "../categories.js";
import type * as documents from "../documents.js";
import type * as members from "../members.js";
import type * as payments from "../payments.js";
import type * as phases from "../phases.js";
import type * as projects from "../projects.js";
import type * as quotes from "../quotes.js";
import type * as seed from "../seed.js";
import type * as suppliers from "../suppliers.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity_log: typeof activity_log;
  categories: typeof categories;
  documents: typeof documents;
  members: typeof members;
  payments: typeof payments;
  phases: typeof phases;
  projects: typeof projects;
  quotes: typeof quotes;
  seed: typeof seed;
  suppliers: typeof suppliers;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
