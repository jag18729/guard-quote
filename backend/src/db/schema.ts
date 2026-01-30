import { relations } from "drizzle-orm";
import {
  boolean,
  datetime,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

// ============================================
// 3NF NORMALIZED SCHEMA FOR GUARDQUOTE
// ============================================

// 1. USERS - Authentication & Authorization
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["admin", "manager", "user"]).default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(new Date()),
  updatedAt: datetime("updated_at").default(new Date()),
});

// 2. LOCATIONS - Normalized location data with risk zones
export const locations = mysqlTable("locations", {
  id: int("id").primaryKey().autoincrement(),
  zipCode: varchar("zip_code", { length: 10 }).notNull().unique(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  county: varchar("county", { length: 100 }),
  region: varchar("region", { length: 50 }), // e.g., "West Coast", "Midwest"
  riskZone: mysqlEnum("risk_zone", ["low", "medium", "high", "critical"]).default("medium"),
  baseMultiplier: decimal("base_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
});

// 3. EVENT_TYPES - Normalized event categories with pricing
export const eventTypes = mysqlTable("event_types", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  baseHourlyRate: decimal("base_hourly_rate", { precision: 8, scale: 2 }).notNull(),
  riskWeight: decimal("risk_weight", { precision: 4, scale: 2 }).notNull(),
  minGuards: int("min_guards").default(1),
  isActive: boolean("is_active").default(true),
});

// 4. SERVICE_OPTIONS - Pricing for add-on services
export const serviceOptions = mysqlTable("service_options", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceType: mysqlEnum("price_type", ["flat", "hourly", "per_guard", "percentage"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
});

// 5. CLIENTS - Customer information
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactFirstName: varchar("contact_first_name", { length: 100 }),
  contactLastName: varchar("contact_last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 255 }),
  locationId: int("location_id").references(() => locations.id),
  taxId: varchar("tax_id", { length: 50 }),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
  paymentTerms: int("payment_terms").default(30), // days
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(new Date()),
  updatedAt: datetime("updated_at").default(new Date()),
});

// 6. QUOTES - Main quote header
export const quotes = mysqlTable("quotes", {
  id: int("id").primaryKey().autoincrement(),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull().unique(),
  clientId: int("client_id")
    .references(() => clients.id)
    .notNull(),
  createdBy: int("created_by")
    .references(() => users.id)
    .notNull(),
  eventTypeId: int("event_type_id")
    .references(() => eventTypes.id)
    .notNull(),
  locationId: int("location_id")
    .references(() => locations.id)
    .notNull(),

  // Event details
  eventDate: datetime("event_date").notNull(),
  eventEndDate: datetime("event_end_date"),
  eventName: varchar("event_name", { length: 255 }),
  eventDescription: text("event_description"),

  // Requirements
  numGuards: int("num_guards").notNull(),
  hoursPerGuard: decimal("hours_per_guard", { precision: 5, scale: 2 }).notNull(),
  crowdSize: int("crowd_size").default(0),

  // Calculated values (stored for audit trail)
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0.0000"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),

  // ML-generated fields
  riskScore: decimal("risk_score", { precision: 4, scale: 3 }),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]),
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 3 }),

  // Status tracking
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "sent",
    "accepted",
    "rejected",
    "expired",
    "completed",
  ]).default("draft"),
  validUntil: datetime("valid_until"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),

  createdAt: datetime("created_at").default(new Date()),
  updatedAt: datetime("updated_at").default(new Date()),
});

// 7. QUOTE_LINE_ITEMS - Itemized pricing breakdown (3NF)
export const quoteLineItems = mysqlTable("quote_line_items", {
  id: int("id").primaryKey().autoincrement(),
  quoteId: int("quote_id")
    .references(() => quotes.id)
    .notNull(),
  serviceOptionId: int("service_option_id").references(() => serviceOptions.id),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: int("sort_order").default(0),
});

// 8. QUOTE_STATUS_HISTORY - Audit trail for status changes
export const quoteStatusHistory = mysqlTable("quote_status_history", {
  id: int("id").primaryKey().autoincrement(),
  quoteId: int("quote_id")
    .references(() => quotes.id)
    .notNull(),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  changedBy: int("changed_by").references(() => users.id),
  reason: text("reason"),
  changedAt: datetime("changed_at").default(new Date()),
});

// 9. ML_TRAINING_DATA - Denormalized view for ML training
export const mlTrainingData = mysqlTable("ml_training_data", {
  id: int("id").primaryKey().autoincrement(),
  quoteId: int("quote_id")
    .references(() => quotes.id)
    .notNull(),

  // Features (denormalized for ML performance)
  eventTypeCode: varchar("event_type_code", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  riskZone: varchar("risk_zone", { length: 20 }),
  numGuards: int("num_guards").notNull(),
  hoursPerGuard: decimal("hours_per_guard", { precision: 5, scale: 2 }).notNull(),
  totalGuardHours: decimal("total_guard_hours", { precision: 8, scale: 2 }).notNull(),
  crowdSize: int("crowd_size").default(0),
  dayOfWeek: int("day_of_week").notNull(), // 0-6
  hourOfDay: int("hour_of_day").notNull(), // 0-23
  month: int("month").notNull(), // 1-12
  isWeekend: boolean("is_weekend").default(false),
  isNightShift: boolean("is_night_shift").default(false),
  isArmed: boolean("is_armed").default(false),
  hasVehicle: boolean("has_vehicle").default(false),

  // Targets
  finalPrice: decimal("final_price", { precision: 12, scale: 2 }).notNull(),
  riskScore: decimal("risk_score", { precision: 4, scale: 3 }),
  wasAccepted: boolean("was_accepted").default(false),

  // Metadata
  createdAt: datetime("created_at").default(new Date()),
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  quotes: many(quotes),
  statusChanges: many(quoteStatusHistory),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  clients: many(clients),
  quotes: many(quotes),
}));

export const eventTypesRelations = relations(eventTypes, ({ many }) => ({
  quotes: many(quotes),
}));

export const serviceOptionsRelations = relations(serviceOptions, ({ many }) => ({
  lineItems: many(quoteLineItems),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  location: one(locations, { fields: [clients.locationId], references: [locations.id] }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  creator: one(users, { fields: [quotes.createdBy], references: [users.id] }),
  eventType: one(eventTypes, { fields: [quotes.eventTypeId], references: [eventTypes.id] }),
  location: one(locations, { fields: [quotes.locationId], references: [locations.id] }),
  lineItems: many(quoteLineItems),
  statusHistory: many(quoteStatusHistory),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLineItems.quoteId], references: [quotes.id] }),
  serviceOption: one(serviceOptions, {
    fields: [quoteLineItems.serviceOptionId],
    references: [serviceOptions.id],
  }),
}));

export const quoteStatusHistoryRelations = relations(quoteStatusHistory, ({ one }) => ({
  quote: one(quotes, { fields: [quoteStatusHistory.quoteId], references: [quotes.id] }),
  user: one(users, { fields: [quoteStatusHistory.changedBy], references: [users.id] }),
}));

export const mlTrainingDataRelations = relations(mlTrainingData, ({ one }) => ({
  quote: one(quotes, { fields: [mlTrainingData.quoteId], references: [quotes.id] }),
}));
