CREATE TYPE "public"."asset_status" AS ENUM('in_stock', 'assigned', 'in_repair', 'scrapped', 'lost', 'retired');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('open', 'partially_returned', 'closed');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('asset', 'consumable');--> statement-breakpoint
CREATE TYPE "public"."return_condition" AS ENUM('good', 'damaged', 'lost');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'adjust', 'return');--> statement-breakpoint
CREATE TABLE "asset_status_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "asset_status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" integer NOT NULL,
	"from_status" "asset_status",
	"to_status" "asset_status" NOT NULL,
	"reason" text,
	"changed_by" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"asset_tag" varchar(32) NOT NULL,
	"serial_no" varchar(80),
	"category_id" integer,
	"brand" varchar(80),
	"model" varchar(120),
	"status" "asset_status" DEFAULT 'in_stock' NOT NULL,
	"purchase_date" date,
	"warranty_end" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assignment_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignment_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assignment_id" integer NOT NULL,
	"asset_id" integer,
	"consumable_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"returned_at" timestamp with time zone,
	"returned_to" integer,
	"return_condition" "return_condition",
	"return_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_item_kind" CHECK (("assignment_items"."asset_id" IS NOT NULL AND "assignment_items"."consumable_id" IS NULL AND "assignment_items"."quantity" = 1)
       OR ("assignment_items"."asset_id" IS NULL AND "assignment_items"."consumable_id" IS NOT NULL AND "assignment_items"."quantity" > 0)),
	CONSTRAINT "chk_returned_quantity_range" CHECK ("assignment_items"."returned_quantity" >= 0 AND "assignment_items"."returned_quantity" <= "assignment_items"."quantity"),
	CONSTRAINT "chk_return_consistency" CHECK (("assignment_items"."returned_at" IS NOT NULL AND "assignment_items"."returned_quantity" = "assignment_items"."quantity")
       OR ("assignment_items"."returned_at" IS NULL AND "assignment_items"."returned_quantity" < "assignment_items"."quantity"))
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assignment_no" varchar(32) NOT NULL,
	"staff_id" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"department_id" integer,
	"location_note" varchar(160),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "assignment_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entity_type" varchar(40) NOT NULL,
	"entity_id" integer,
	"action" varchar(30) NOT NULL,
	"actor_id" integer,
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumables" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "consumables_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sku" varchar(48),
	"name" varchar(160) NOT NULL,
	"category_id" integer,
	"unit" varchar(16) DEFAULT 'Adet' NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"package_size" integer DEFAULT 1 NOT NULL,
	"min_stock_level" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_consumables_qty_non_negative" CHECK ("consumables"."quantity_on_hand" >= 0),
	CONSTRAINT "chk_consumables_package_size" CHECK ("consumables"."package_size" > 0),
	CONSTRAINT "chk_consumables_min_stock" CHECK ("consumables"."min_stock_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"kind" "category_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"code" varchar(32),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_no" varchar(32) NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"department_id" integer,
	"title" varchar(120),
	"email" varchar(160),
	"phone" varchar(32),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"external_ref" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"consumable_id" integer NOT NULL,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"assignment_item_id" integer,
	"reason" text,
	"performed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_stock_movements_qty_nonzero" CHECK ("stock_movements"."quantity" <> 0),
	CONSTRAINT "chk_stock_movements_balance" CHECK ("stock_movements"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "authorized_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "authorized_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" varchar(64) NOT NULL,
	"password_hash" text,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(160),
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"auth_source" varchar(16) DEFAULT 'local' NOT NULL,
	"external_ref" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" varchar(300),
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_changed_by_authorized_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."authorized_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_consumable_id_consumables_id_fk" FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_returned_to_authorized_users_id_fk" FOREIGN KEY ("returned_to") REFERENCES "public"."authorized_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_authorized_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."authorized_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_authorized_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."authorized_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_consumable_id_consumables_id_fk" FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_assignment_item_id_assignment_items_id_fk" FOREIGN KEY ("assignment_item_id") REFERENCES "public"."assignment_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_authorized_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."authorized_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_authorized_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."authorized_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_asset_status_history_asset" ON "asset_status_history" USING btree ("asset_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assets_tag_active" ON "assets" USING btree ("asset_tag") WHERE "assets"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assets_serial_active" ON "assets" USING btree ("serial_no") WHERE "assets"."deleted_at" IS NULL AND "assets"."serial_no" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_assets_status" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assets_category" ON "assets" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_items_assignment" ON "assignment_items" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_items_asset" ON "assignment_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_items_consumable" ON "assignment_items" USING btree ("consumable_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_asset_open_assignment" ON "assignment_items" USING btree ("asset_id") WHERE "assignment_items"."returned_at" IS NULL AND "assignment_items"."asset_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assignments_no" ON "assignments" USING btree ("assignment_no");--> statement-breakpoint
CREATE INDEX "idx_assignments_staff" ON "assignments" USING btree ("staff_id","assigned_at");--> statement-breakpoint
CREATE INDEX "idx_assignments_status" ON "assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assignments_department" ON "assignments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_consumables_sku_active" ON "consumables" USING btree ("sku") WHERE "consumables"."deleted_at" IS NULL AND "consumables"."sku" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_consumables_category" ON "consumables" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_name_kind_active" ON "categories" USING btree ("name","kind") WHERE "categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_name_active" ON "departments" USING btree ("name") WHERE "departments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_code_active" ON "departments" USING btree ("code") WHERE "departments"."deleted_at" IS NULL AND "departments"."code" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_employee_no_active" ON "staff" USING btree ("employee_no") WHERE "staff"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_staff_department" ON "staff" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_staff_last_name" ON "staff" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_consumable" ON "stock_movements" USING btree ("consumable_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_item" ON "stock_movements" USING btree ("assignment_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_username_active" ON "authorized_users" USING btree ("username") WHERE "authorized_users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_refresh_token_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id","expires_at");