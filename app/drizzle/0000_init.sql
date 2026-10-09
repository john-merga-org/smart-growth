CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text,
	"kind" text NOT NULL,
	"day" text NOT NULL,
	"minutes" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"problem_key" text NOT NULL,
	"kind" text NOT NULL,
	"difficulty" text NOT NULL,
	"ladder_label" text,
	"started_at" timestamp with time zone NOT NULL,
	"paused_at" timestamp with time zone,
	"pause_ms" integer DEFAULT 0 NOT NULL,
	"pause_used" boolean DEFAULT false NOT NULL,
	"hint_taken" boolean DEFAULT false NOT NULL,
	"kept_going" boolean DEFAULT false NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_on" text,
	"outcome" text,
	"passed" boolean,
	"alone" boolean,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"time_ms" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"kind" text NOT NULL,
	"source_key" text NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"front" text,
	"back" text,
	"due" timestamp with time zone NOT NULL,
	"fsrs" jsonb NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_state" (
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text NOT NULL,
	"started_on" text,
	CONSTRAINT "course_state_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"section_id" text,
	"color" text NOT NULL,
	"exact" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"note" text,
	"orphan" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"day" text NOT NULL,
	"problem_key" text,
	"problem_title" text,
	"category" text NOT NULL,
	"what" text NOT NULL,
	"rule" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"day" text NOT NULL,
	"platform" text NOT NULL,
	"problems" text NOT NULL,
	"result" text NOT NULL,
	"broke_down" text,
	"fix" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text,
	"unit_id" text,
	"body" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"struggle" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"user_id" text DEFAULT 'me' NOT NULL,
	"key" text NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" text NOT NULL,
	"pattern" text NOT NULL,
	"url" text NOT NULL,
	"nc" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"anchor" text,
	"due" text,
	"first_solved_on" text,
	"retired_on" text,
	CONSTRAINT "problems_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"user_id" text DEFAULT 'me' NOT NULL,
	"href" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"course_id" text,
	"unit_id" text,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_user_id_href_pk" PRIMARY KEY("user_id","href")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"block_key" text NOT NULL,
	"kind" text NOT NULL,
	"response" jsonb,
	"correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'me' NOT NULL,
	"card_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"was_due" timestamp with time zone,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_on" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_reads" (
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"section_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_reads_user_id_course_id_unit_id_section_id_pk" PRIMARY KEY("user_id","course_id","unit_id","section_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text PRIMARY KEY DEFAULT 'me' NOT NULL,
	"tz" text DEFAULT 'UTC' NOT NULL,
	"daily_resolve_cap" integer DEFAULT 4 NOT NULL,
	"daily_card_cap" integer DEFAULT 20 NOT NULL,
	"ai_monthly_cap_usd" real DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_progress" (
	"user_id" text DEFAULT 'me' NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"build_url" text,
	"build_checked" boolean DEFAULT false NOT NULL,
	"checkpoint_passed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"milestone_score" text,
	"milestone_notes" text,
	CONSTRAINT "unit_progress_user_id_course_id_unit_id_pk" PRIMARY KEY("user_id","course_id","unit_id")
);
--> statement-breakpoint
CREATE INDEX "activity_day_idx" ON "activity" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "attempts_problem_idx" ON "attempts" USING btree ("user_id","problem_key");--> statement-breakpoint
CREATE INDEX "attempts_open_idx" ON "attempts" USING btree ("user_id","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_source_idx" ON "cards" USING btree ("user_id","source_key");--> statement-breakpoint
CREATE INDEX "cards_due_idx" ON "cards" USING btree ("user_id","due");--> statement-breakpoint
CREATE INDEX "highlights_unit_idx" ON "highlights" USING btree ("user_id","course_id","unit_id");--> statement-breakpoint
CREATE INDEX "responses_block_idx" ON "responses" USING btree ("user_id","block_key");--> statement-breakpoint
CREATE INDEX "review_logs_day_idx" ON "review_logs" USING btree ("user_id","reviewed_on");