-- SinfLab: first core schema. Run against PostgreSQL 13+.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  email text UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  subject text,
  mode text NOT NULL CHECK (mode IN ('course', 'club')),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classroom_members (
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('owner', 'teacher', 'assistant', 'student')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);
CREATE INDEX classroom_members_user_idx ON classroom_members(user_id, status);

CREATE TABLE classroom_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  intended_role text NOT NULL CHECK (intended_role IN ('teacher', 'assistant', 'student')),
  expires_at timestamptz NOT NULL,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_by uuid NOT NULL REFERENCES users(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_uses IS NULL OR used_count <= max_uses)
);
CREATE INDEX classroom_invites_classroom_idx ON classroom_invites(classroom_id);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX lessons_classroom_start_idx ON lessons(classroom_id, starts_at);

CREATE TABLE resource_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES resource_folders(id),
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resource_folders_classroom_idx ON resource_folders(classroom_id, parent_id);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES resource_folders(id),
  uploaded_by uuid NOT NULL REFERENCES users(id),
  storage_key text NOT NULL UNIQUE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  extraction_status text NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'ready', 'failed', 'not_applicable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assets_classroom_idx ON assets(classroom_id, created_at DESC);

CREATE TABLE lesson_materials (
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id),
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (lesson_id, asset_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  reply_to_id uuid REFERENCES messages(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX messages_classroom_time_idx ON messages(classroom_id, created_at DESC);

CREATE TABLE message_assets (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id),
  PRIMARY KEY (message_id, asset_id)
);

CREATE TABLE live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_room_id text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  recording_asset_id uuid REFERENCES assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_room_id),
  CHECK (started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  joined_at timestamptz NOT NULL,
  left_at timestamptz,
  CHECK (left_at IS NULL OR left_at >= joined_at)
);
CREATE INDEX attendance_session_user_idx ON attendance(live_session_id, user_id);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id),
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  due_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX assignments_classroom_due_idx ON assignments(classroom_id, due_at);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'needs_revision', 'accepted')),
  current_version integer NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX submissions_student_idx ON submissions(student_id, updated_at DESC);

CREATE TABLE submission_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  body text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, version)
);

CREATE TABLE submission_assets (
  revision_id uuid NOT NULL REFERENCES submission_revisions(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id),
  PRIMARY KEY (revision_id, asset_id)
);

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES submission_revisions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  score numeric(6,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id),
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  time_limit_seconds integer CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX quizzes_classroom_idx ON quizzes(classroom_id, created_at DESC);

CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('single_choice', 'multiple_choice', 'short_text', 'number')),
  prompt text NOT NULL,
  choices jsonb,
  answer_key jsonb NOT NULL,
  source_asset_id uuid REFERENCES assets(id),
  source_locator text,
  position integer NOT NULL CHECK (position >= 0),
  max_score numeric(6,2) NOT NULL DEFAULT 1 CHECK (max_score > 0),
  UNIQUE (quiz_id, position)
);

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id),
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'reviewed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric(8,2) CHECK (score IS NULL OR score >= 0),
  UNIQUE (quiz_id, student_id, attempt_no)
);
CREATE INDEX quiz_attempts_student_idx ON quiz_attempts(student_id, started_at DESC);

CREATE TABLE quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id),
  answer jsonb NOT NULL,
  awarded_score numeric(6,2) CHECK (awarded_score IS NULL OR awarded_score >= 0),
  feedback text,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE lab_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('physics', 'chemistry', 'math', 'code', 'cyber', 'language')),
  version integer NOT NULL CHECK (version > 0),
  title text NOT NULL,
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (code, version)
);

CREATE TABLE lab_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id),
  template_id uuid NOT NULL REFERENCES lab_templates(id),
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (opens_at IS NULL OR closes_at IS NULL OR closes_at > opens_at)
);
CREATE INDEX lab_activities_classroom_idx ON lab_activities(classroom_id, created_at DESC);

CREATE TABLE lab_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES lab_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id),
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'submitted', 'reviewed', 'expired')),
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_asset_id uuid REFERENCES assets(id),
  sandbox_expires_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (activity_id, student_id, attempt_no),
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);
CREATE INDEX lab_runs_student_idx ON lab_runs(student_id, started_at DESC);

CREATE TABLE ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id),
  source_asset_id uuid REFERENCES assets(id),
  draft_type text NOT NULL CHECK (draft_type IN ('quiz', 'lesson_summary', 'practice')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'rejected')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_classroom_time_idx ON audit_events(classroom_id, created_at DESC);
