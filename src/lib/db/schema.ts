import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  pgEnum,
  jsonb,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "ceo",
  "ea",
  "md",
  "hod",
  "contributor",
  "external",
]);

export const accessLevelEnum = pgEnum("access_level", [
  "read",
  "write",
  "admin",
]);

export const projectCategoryEnum = pgEnum("project_category", [
  "capex",
  "financing",
  "regulatory",
  "commercial",
  "operations",
  "corporate",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "not_started",
  "in_progress",
  "on_hold",
  "blocked",
  "done",
  "cancelled",
]);

export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const actionItemStatusEnum = pgEnum("action_item_status", [
  "not_started",
  "in_progress",
  "blocked",
  "done",
  "postponed",
]);

export const activityEventTypeEnum = pgEnum("activity_event_type", [
  "created",
  "status_change",
  "reassign",
  "delegate",
  "postpone",
  "comment_added",
]);

export const defaultViewEnum = pgEnum("default_view", [
  "todo",
  "kanban",
  "planner",
]);

export const digestFrequencyEnum = pgEnum("digest_frequency", [
  "daily",
  "weekly",
  "off",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "in_app",
]);

// 1. Entities
export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentEntityId: uuid("parent_entity_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brandPrimaryColor: text("brand_primary_color").notNull().default("#023542"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  parent: one(entities, {
    fields: [entities.parentEntityId],
    references: [entities.id],
    relationName: "entity_children",
  }),
  children: many(entities, {
    relationName: "entity_children",
  }),
  projects: many(projects),
  meetings: many(meetings),
  userAccess: many(userEntityAccess),
}));

// 2. Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phoneE164: text("phone_e164"),
  role: userRoleEnum("role").notNull().default("contributor"),
  hasGlobalAccess: boolean("has_global_access").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  entityAccess: many(userEntityAccess),
  ownedProjects: many(projects, { relationName: "project_owner" }),
  sponsoredProjects: many(projects, { relationName: "project_sponsor" }),
  assignedActionItems: many(actionItems, { relationName: "action_item_assignee" }),
  createdActionItems: many(actionItems, { relationName: "action_item_creator" }),
  createdMeetings: many(meetings, { relationName: "meeting_creator" }),
  meetingAttendances: many(meetingAttendees),
  comments: many(comments),
  activities: many(activityLog, { relationName: "activity_actor" }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  notifications: many(notifications),
}));

// 3. User Entity Access
export const userEntityAccess = pgTable(
  "user_entity_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    accessLevel: accessLevelEnum("access_level").notNull().default("read"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userEntityUnique: uniqueIndex("user_entity_unique_idx").on(
      table.userId,
      table.entityId
    ),
  })
);

export const userEntityAccessRelations = relations(userEntityAccess, ({ one }) => ({
  user: one(users, {
    fields: [userEntityAccess.userId],
    references: [users.id],
  }),
  entity: one(entities, {
    fields: [userEntityAccess.entityId],
    references: [entities.id],
  }),
}));

// 4. Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: projectCategoryEnum("category").notNull().default("operations"),
  status: projectStatusEnum("status").notNull().default("not_started"),
  priority: priorityEnum("priority").notNull().default("medium"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  sponsorId: uuid("sponsor_id").references(() => users.id),
  startDate: date("start_date").notNull(),
  targetDate: date("target_date").notNull(),
  actualEndDate: date("actual_end_date"),
  budgetNotes: text("budget_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  entity: one(entities, {
    fields: [projects.entityId],
    references: [entities.id],
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "project_owner",
  }),
  sponsor: one(users, {
    fields: [projects.sponsorId],
    references: [users.id],
    relationName: "project_sponsor",
  }),
  actionItems: many(actionItems),
}));

// 5. Meetings (defined before action_items so source_meeting_id can reference it)
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  meetingDate: date("meeting_date").notNull(),
  venue: text("venue"),
  isVirtual: boolean("is_virtual").default(false),
  minutesDocUrl: text("minutes_doc_url"),
  externalEventId: text("external_event_id"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  entity: one(entities, {
    fields: [meetings.entityId],
    references: [entities.id],
  }),
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
    relationName: "meeting_creator",
  }),
  attendees: many(meetingAttendees),
  actionItems: many(actionItems),
}));

// 6. Action Items
export const actionItems = pgTable("action_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id")
    .notNull()
    .references(() => users.id),
  deadline: date("deadline").notNull(),
  status: actionItemStatusEnum("status").notNull().default("not_started"),
  priority: priorityEnum("priority").notNull().default("medium"),
  tag: text("tag"),
  sourceMeetingId: uuid("source_meeting_id").references(() => meetings.id, {
    onDelete: "set null",
  }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionItemsRelations = relations(actionItems, ({ one, many }) => ({
  project: one(projects, {
    fields: [actionItems.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [actionItems.assigneeId],
    references: [users.id],
    relationName: "action_item_assignee",
  }),
  creator: one(users, {
    fields: [actionItems.createdBy],
    references: [users.id],
    relationName: "action_item_creator",
  }),
  sourceMeeting: one(meetings, {
    fields: [actionItems.sourceMeetingId],
    references: [meetings.id],
  }),
  comments: many(comments),
  activityLogs: many(activityLog),
  notifications: many(notifications),
}));

// 7. Meeting Attendees
export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    meetingUserUnique: uniqueIndex("meeting_user_unique_idx").on(
      table.meetingId,
      table.userId
    ),
  })
);

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendees.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingAttendees.userId],
    references: [users.id],
  }),
}));

// 8. Comments
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionItemId: uuid("action_item_id")
    .notNull()
    .references(() => actionItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  actionItem: one(actionItems, {
    fields: [comments.actionItemId],
    references: [actionItems.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// 9. Activity Log
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionItemId: uuid("action_item_id")
    .notNull()
    .references(() => actionItems.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  eventType: activityEventTypeEnum("event_type").notNull(),
  fromValue: text("from_value"),
  toValue: text("to_value"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  actionItem: one(actionItems, {
    fields: [activityLog.actionItemId],
    references: [actionItems.id],
  }),
  actor: one(users, {
    fields: [activityLog.actorId],
    references: [users.id],
    relationName: "activity_actor",
  }),
}));

// 10. User Preferences
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultView: defaultViewEnum("default_view").notNull().default("todo"),
  kanbanColumns: jsonb("kanban_columns")
    .notNull()
    .$type<string[]>()
    .default(sql`'["Backlog", "This Week", "In Progress", "Blocked", "Done"]'::jsonb`),
  timezone: text("timezone").notNull().default("Africa/Accra"),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(true),
  digestFrequency: digestFrequencyEnum("digest_frequency")
    .notNull()
    .default("daily"),
  calendarFeedUrl: text("calendar_feed_url"),
  calendarLastSyncedAt: timestamp("calendar_last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// 11. Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actionItemId: uuid("action_item_id").references(() => actionItems.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  channel: notificationChannelEnum("channel").notNull().default("in_app"),
  payload: jsonb("payload").$type<Record<string, any>>().default({}),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  actionItem: one(actionItems, {
    fields: [notifications.actionItemId],
    references: [actionItems.id],
  }),
}));

// Types
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserEntityAccess = typeof userEntityAccess.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type ActivityLogItem = typeof activityLog.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
