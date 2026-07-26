CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_mode_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anthropic_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_session" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"box_id" text,
	"runtime" text DEFAULT 'node' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"snapshot_id" text,
	"total_cost_usd" real,
	"total_compute_ms" integer,
	"total_input_tokens" integer,
	"total_output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_instructions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dodosubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"status" text NOT NULL,
	"product_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"business_id" text,
	"brand_id" text,
	"currency" text NOT NULL,
	"amount" integer NOT NULL,
	"interval" text,
	"interval_count" integer,
	"trial_period_days" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"ended_at" timestamp,
	"discount_id" text,
	"customer" json,
	"metadata" json,
	"product_cart" json,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "extreme_search_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"search_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookout" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"frequency" text NOT NULL,
	"cron_schedule" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"qstash_schedule_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"search_mode" text DEFAULT 'extreme' NOT NULL,
	"last_run_at" timestamp,
	"last_run_chat_id" text,
	"run_history" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"completion_time" real
);
--> statement-breakpoint
CREATE TABLE "message_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"brand_id" text,
	"business_id" text,
	"card_issuing_country" text,
	"card_last_four" text,
	"card_network" text,
	"card_type" text,
	"currency" text NOT NULL,
	"digital_products_delivered" boolean DEFAULT false,
	"discount_id" text,
	"error_code" text,
	"error_message" text,
	"payment_link" text,
	"payment_method" text,
	"payment_method_type" text,
	"settlement_amount" integer,
	"settlement_currency" text,
	"settlement_tax" integer,
	"status" text,
	"subscription_id" text,
	"tax" integer,
	"total_amount" integer NOT NULL,
	"billing" json,
	"customer" json,
	"disputes" json,
	"metadata" json,
	"product_cart" json,
	"refunds" json,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stream" (
	"id" text PRIMARY KEY NOT NULL,
	"chatId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp NOT NULL,
	"modifiedAt" timestamp,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"recurringInterval" text NOT NULL,
	"status" text NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"canceledAt" timestamp,
	"startedAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"endedAt" timestamp,
	"customerId" text NOT NULL,
	"productId" text NOT NULL,
	"discountId" text,
	"checkoutId" text NOT NULL,
	"customerCancellationReason" text,
	"customerCancellationComment" text,
	"metadata" text,
	"customFieldData" text,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_mcp_server" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"transport_type" varchar DEFAULT 'http' NOT NULL,
	"url" text NOT NULL,
	"auth_type" varchar DEFAULT 'none' NOT NULL,
	"encrypted_credentials" text,
	"oauth_issuer_url" text,
	"oauth_authorization_url" text,
	"oauth_token_url" text,
	"oauth_scopes" text,
	"oauth_client_id" text,
	"oauth_client_secret_encrypted" text,
	"oauth_access_token_encrypted" text,
	"oauth_refresh_token_encrypted" text,
	"oauth_access_token_expires_at" timestamp,
	"oauth_connected_at" timestamp,
	"oauth_error" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"disabled_tools" json DEFAULT '[]'::json,
	"last_tested_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preferences" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_mode_usage_events" ADD CONSTRAINT "agent_mode_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anthropic_usage" ADD CONSTRAINT "anthropic_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_session" ADD CONSTRAINT "build_session_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_session" ADD CONSTRAINT "build_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_instructions" ADD CONSTRAINT "custom_instructions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dodosubscription" ADD CONSTRAINT "dodosubscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extreme_search_usage" ADD CONSTRAINT "extreme_search_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_usage" ADD CONSTRAINT "google_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookout" ADD CONSTRAINT "lookout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_usage" ADD CONSTRAINT "message_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mcp_server" ADD CONSTRAINT "user_mcp_server_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentModeUsageEvents_userId_idx" ON "agent_mode_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentModeUsageEvents_userId_date_idx" ON "agent_mode_usage_events" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "agentModeUsageEvents_messageId_unique" ON "agent_mode_usage_events" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agentModeUsageEvents_userId_date_messageId_unique" ON "agent_mode_usage_events" USING btree ("user_id","date","message_id");--> statement-breakpoint
CREATE INDEX "anthropicUsage_userId_idx" ON "anthropic_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anthropicUsage_userId_date_idx" ON "anthropic_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "anthropicUsage_userId_date_unique" ON "anthropic_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "build_session_chatId_idx" ON "build_session" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "build_session_userId_idx" ON "build_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "build_session_userId_status_idx" ON "build_session" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "chat_userId_idx" ON "chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chat_userId_createdAt_idx" ON "chat" USING btree ("userId","created_at");--> statement-breakpoint
CREATE INDEX "chat_userId_isPinned_updatedAt_idx" ON "chat" USING btree ("userId","is_pinned","updated_at");--> statement-breakpoint
CREATE INDEX "customInstructions_userId_idx" ON "custom_instructions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dodosubscription_userId_idx" ON "dodosubscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dodosubscription_userId_status_idx" ON "dodosubscription" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "dodosubscription_customerId_idx" ON "dodosubscription" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "extremeSearchUsage_userId_idx" ON "extreme_search_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "extremeSearchUsage_userId_date_idx" ON "extreme_search_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "extremeSearchUsage_userId_date_unique" ON "extreme_search_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "googleUsage_userId_idx" ON "google_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "googleUsage_userId_date_idx" ON "google_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "googleUsage_userId_date_unique" ON "google_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "lookout_userId_idx" ON "lookout" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lookout_userId_status_idx" ON "lookout" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "message_chatId_idx" ON "message" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "message_chatId_createdAt_idx" ON "message" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "messageUsage_userId_idx" ON "message_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messageUsage_userId_date_idx" ON "message_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "messageUsage_userId_date_unique" ON "message_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stream_chatId_idx" ON "stream" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "subscription_userId_idx" ON "subscription" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "subscription_userId_status_idx" ON "subscription" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "userMcpServer_userId_idx" ON "user_mcp_server" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "userMcpServer_userId_enabled_idx" ON "user_mcp_server" USING btree ("user_id","is_enabled");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");