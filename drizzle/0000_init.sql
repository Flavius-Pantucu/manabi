CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_revision" (
	"user_id" text PRIMARY KEY NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stat" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"new_cards" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_stat_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "review_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"grade" smallint NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"elapsed" real DEFAULT 0 NOT NULL,
	"scheduled" real DEFAULT 0 NOT NULL,
	"phase" text NOT NULL,
	"duration_ms" integer,
	"device_id" text,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_log_dedup" UNIQUE("user_id","card_id","reviewed_at")
);
--> statement-breakpoint
CREATE TABLE "srs_card" (
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"phase" text DEFAULT 'new' NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"last_review" timestamp with time zone,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"deck" text,
	"level" text,
	"device_id" text,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "srs_card_user_id_card_id_pk" PRIMARY KEY("user_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "srs_setting" (
	"user_id" text PRIMARY KEY NOT NULL,
	"new_per_day" integer DEFAULT 10 NOT NULL,
	"max_reviews_per_day" integer DEFAULT 120 NOT NULL,
	"disabled_decks" text[] DEFAULT '{}' NOT NULL,
	"levels" text[] DEFAULT '{"N5"}' NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_device" (
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"label" text,
	"user_agent" text,
	"cursor" bigint DEFAULT 0 NOT NULL,
	"last_push_at" timestamp with time zone,
	"last_pull_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_device_user_id_device_id_pk" PRIMARY KEY("user_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"client_id" text,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmark_user_id_kind_ref_id_pk" PRIMARY KEY("user_id","kind","ref_id")
);
--> statement-breakpoint
CREATE TABLE "content_status" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"status" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_status_user_id_kind_ref_id_pk" PRIMARY KEY("user_id","kind","ref_id")
);
--> statement-breakpoint
CREATE TABLE "learning_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"words_learned" integer DEFAULT 0 NOT NULL,
	"verbs_mastered" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"learned_today" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"daily_goal" integer DEFAULT 10 NOT NULL,
	"show_furigana" boolean DEFAULT true NOT NULL,
	"auto_play_audio" boolean DEFAULT false NOT NULL,
	"voice_uri" text,
	"voice_rate" real DEFAULT 1 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"reading" text,
	"notes" text,
	"accepts" text[] DEFAULT '{}' NOT NULL,
	"speak" text,
	"position" real DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_deck" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tone" text DEFAULT 'sakura' NOT NULL,
	"level" text,
	"archived" boolean DEFAULT false NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question_id" text NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"options" text[] NOT NULL,
	"chosen" smallint,
	"answer" smallint NOT NULL,
	"correct" boolean NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"quiz_title" text NOT NULL,
	"kind" text,
	"level" text,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"client_id" text,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_revision" ADD CONSTRAINT "user_revision_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stat" ADD CONSTRAINT "daily_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_card" ADD CONSTRAINT "srs_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_setting" ADD CONSTRAINT "srs_setting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_device" ADD CONSTRAINT "sync_device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_status" ADD CONSTRAINT "content_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_profile" ADD CONSTRAINT "learning_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_card" ADD CONSTRAINT "custom_card_deck_id_custom_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."custom_deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_card" ADD CONSTRAINT "custom_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_deck" ADD CONSTRAINT "custom_deck_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answer" ADD CONSTRAINT "quiz_answer_attempt_id_quiz_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_uq" ON "account" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "daily_stat_sync_idx" ON "daily_stat" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "review_log_user_time_idx" ON "review_log" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_log_sync_idx" ON "review_log" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "review_log_card_idx" ON "review_log" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "srs_card_sync_idx" ON "srs_card" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "srs_card_due_idx" ON "srs_card" USING btree ("user_id","due");--> statement-breakpoint
CREATE INDEX "activity_user_time_idx" ON "activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_sync_idx" ON "activity" USING btree ("user_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_client_uq" ON "activity" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "bookmark_sync_idx" ON "bookmark" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "content_status_sync_idx" ON "content_status" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "custom_card_deck_idx" ON "custom_card" USING btree ("deck_id","position");--> statement-breakpoint
CREATE INDEX "custom_card_sync_idx" ON "custom_card" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "custom_deck_user_idx" ON "custom_deck" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "custom_deck_sync_idx" ON "custom_deck" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "quiz_answer_attempt_idx" ON "quiz_answer" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE INDEX "quiz_attempt_user_time_idx" ON "quiz_attempt" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "quiz_attempt_sync_idx" ON "quiz_attempt" USING btree ("user_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_client_uq" ON "quiz_attempt" USING btree ("user_id","client_id");