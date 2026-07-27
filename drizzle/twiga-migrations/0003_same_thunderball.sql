CREATE TABLE "admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_email" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"request_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_feedback_note" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_id" text NOT NULL,
	"author_user_id" text,
	"author_email" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_feedback_review" (
	"feedback_id" text PRIMARY KEY NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"assigned_to_user_id" text,
	"resolution" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_telemetry" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text,
	"chat_id" text,
	"route" text NOT NULL,
	"model" text NOT NULL,
	"provider_model" text,
	"status" varchar NOT NULL,
	"duration_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"cost_usd" real,
	"tool_call_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generation_telemetry_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "admin_feedback_note" ADD CONSTRAINT "admin_feedback_note_feedback_id_answer_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."answer_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_feedback_note" ADD CONSTRAINT "admin_feedback_note_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_feedback_review" ADD CONSTRAINT "admin_feedback_review_feedback_id_answer_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."answer_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_feedback_review" ADD CONSTRAINT "admin_feedback_review_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_telemetry" ADD CONSTRAINT "generation_telemetry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adminAuditLog_createdAt_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "adminAuditLog_actorUserId_createdAt_idx" ON "admin_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "adminAuditLog_target_idx" ON "admin_audit_log" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "adminFeedbackNote_feedbackId_createdAt_idx" ON "admin_feedback_note" USING btree ("feedback_id","created_at");--> statement-breakpoint
CREATE INDEX "adminFeedbackReview_status_updatedAt_idx" ON "admin_feedback_review" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "generationTelemetry_createdAt_idx" ON "generation_telemetry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generationTelemetry_route_createdAt_idx" ON "generation_telemetry" USING btree ("route","created_at");--> statement-breakpoint
CREATE INDEX "generationTelemetry_status_createdAt_idx" ON "generation_telemetry" USING btree ("status","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_admin_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only
BEFORE UPDATE OR DELETE ON "admin_audit_log"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_mutation();
