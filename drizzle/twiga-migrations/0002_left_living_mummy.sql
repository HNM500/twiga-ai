CREATE TABLE "answer_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"chat_id" text,
	"user_id" text,
	"kind" varchar NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comment" text,
	"requested_search_mode" text,
	"resolved_search_mode" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_feedback" ADD CONSTRAINT "answer_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answerFeedback_messageId_idx" ON "answer_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "answerFeedback_userId_createdAt_idx" ON "answer_feedback" USING btree ("user_id","created_at");