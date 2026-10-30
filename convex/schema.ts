import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    budget: v.number(),
    currency: v.string(),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    status: v.string(),
    color: v.string(),
    owner_name: v.optional(v.string()),
    position: v.number(),
    type: v.optional(v.string()),
  }),

  categories: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    position: v.number(),
  }).index("by_project", ["project_id"]),

  phases: defineTable({
    category_id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    status: v.string(),
  }).index("by_category", ["category_id"]),

  quotes: defineTable({
    phase_id: v.id("phases"),
    supplier_id: v.optional(v.id("suppliers")),
    number: v.optional(v.string()),
    description: v.string(),
    date: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_phase", ["phase_id"])
    .index("by_supplier", ["supplier_id"]),

  payments: defineTable({
    quote_id: v.id("quotes"),
    date: v.string(),
    amount: v.number(),
    method: v.string(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  }).index("by_quote", ["quote_id"]),

  suppliers: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    speciality: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["project_id"]),

  documents: defineTable({
    project_id: v.id("projects"),
    name: v.string(),
    storage_id: v.optional(v.string()),
    url: v.optional(v.string()),
    file_type: v.string(),
    size: v.optional(v.number()),
    category: v.string(),
    linked_to_type: v.optional(v.string()),
    linked_to_id: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_project", ["project_id"])
    .index("by_project_category", ["project_id", "category"]),

  tasks: defineTable({
    project_id: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    priority: v.string(),
    due_date: v.optional(v.string()),
    linked_to_type: v.optional(v.string()),
    linked_to_id: v.optional(v.string()),
  })
    .index("by_project", ["project_id"])
    .index("by_project_status", ["project_id", "status"]),

  members: defineTable({
    project_id: v.id("projects"),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(),
  })
    .index("by_project", ["project_id"])
    .index("by_email", ["email"]),

  activity_log: defineTable({
    project_id: v.id("projects"),
    action: v.string(),
    entity_type: v.string(),
    entity_label: v.optional(v.string()),
    amount: v.optional(v.number()),
  }).index("by_project", ["project_id"]),
});
