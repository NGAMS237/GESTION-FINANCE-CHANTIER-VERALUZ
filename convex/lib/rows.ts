import { v, type Validator } from "convex/values";

/** Ajoute `id` (= `_id`) : le frontend manipule les lignes comme sous Supabase. */
export function toRow<T extends { _id: string }>(doc: T): T & { id: T["_id"] } {
  return { ...doc, id: doc._id };
}

export const nullable = <T extends Validator<any, "required", any>>(t: T) =>
  v.optional(v.union(t, v.null()));

/** Lève une erreur lisible si le document parent n'existe pas. */
export function must<T>(doc: T | null, what: string): T {
  if (doc === null) throw new Error(`${what} introuvable`);
  return doc;
}
