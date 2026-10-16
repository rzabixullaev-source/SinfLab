/** SinfLab domain contracts. Dates are UTC ISO-8601 strings at API boundaries. */
export type UUID = string;
export type ISODateTime = string;

export type ClassroomMode = "course" | "club";
export type ClassroomRole = "owner" | "teacher" | "assistant" | "student";
export type MembershipStatus = "active" | "invited" | "removed";
export type LessonStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";
export type ContentStatus = "draft" | "published" | "closed";
export type LabKind = "physics" | "chemistry" | "math" | "code" | "cyber" | "language";

export interface User {
  id: UUID;
  displayName: string;
  email: string | null;
}

export interface Classroom {
  id: UUID;
  ownerId: UUID;
  name: string;
  subject: string | null;
  mode: ClassroomMode;
  description: string | null;
  status: "active" | "archived";
  createdAt: ISODateTime;
}

export interface ClassroomMember {
  classroomId: UUID;
  userId: UUID;
  role: ClassroomRole;
  status: MembershipStatus;
  joinedAt: ISODateTime;
}

export interface ClassroomInvite {
  id: UUID;
  classroomId: UUID;
  intendedRole: Exclude<ClassroomRole, "owner">;
  expiresAt: ISODateTime;
  maxUses: number | null;
  usedCount: number;
}

export interface Lesson {
  id: UUID;
  classroomId: UUID;
  createdBy: UUID;
  title: string;
  description: string | null;
  startsAt: ISODateTime | null;
  endsAt: ISODateTime | null;
  status: LessonStatus;
}

export interface Asset {
  id: UUID;
  classroomId: UUID;
  uploadedBy: UUID;
  filename: string;
  mimeType: string;
  byteSize: number;
  extractionStatus: "pending" | "ready" | "failed" | "not_applicable";
}

export interface LiveSession {
  id: UUID;
  lessonId: UUID;
  provider: string;
  status: "scheduled" | "live" | "ended" | "failed";
  startedAt: ISODateTime | null;
  endedAt: ISODateTime | null;
  recordingAssetId: UUID | null;
}

export interface Assignment {
  id: UUID;
  classroomId: UUID;
  lessonId: UUID | null;
  createdBy: UUID;
  title: string;
  instructions: string;
  dueAt: ISODateTime | null;
  status: ContentStatus;
}

export interface Submission {
  id: UUID;
  assignmentId: UUID;
  studentId: UUID;
  status: "draft" | "submitted" | "needs_revision" | "accepted";
  currentVersion: number;
  submittedAt: ISODateTime | null;
}

export interface SubmissionRevision {
  id: UUID;
  submissionId: UUID;
  version: number;
  body: string | null;
  assetIds: UUID[];
  submittedAt: ISODateTime;
}

export interface SubmissionFeedback {
  id: UUID;
  revisionId: UUID;
  authorId: UUID;
  body: string;
  score: number | null;
  createdAt: ISODateTime;
}

export interface Quiz {
  id: UUID;
  classroomId: UUID;
  lessonId: UUID | null;
  title: string;
  status: ContentStatus;
  timeLimitSeconds: number | null;
}

export type QuestionKind = "single_choice" | "multiple_choice" | "short_text" | "number";
export interface QuizQuestion {
  id: UUID;
  quizId: UUID;
  kind: QuestionKind;
  prompt: string;
  choices: Array<{ id: string; text: string }> | null;
  position: number;
  maxScore: number;
  sourceAssetId: UUID | null;
  sourceLocator: string | null;
}
/** Answer keys have a separate teacher-only API response. */
export interface TeacherQuizQuestion extends QuizQuestion {
  answerKey: unknown;
}

export interface QuizAttempt {
  id: UUID;
  quizId: UUID;
  studentId: UUID;
  attemptNo: number;
  status: "in_progress" | "submitted" | "reviewed";
  score: number | null;
}

export interface LabTemplate {
  id: UUID;
  code: string;
  kind: LabKind;
  version: number;
  title: string;
  enabled: boolean;
}

export interface LabActivity {
  id: UUID;
  classroomId: UUID;
  lessonId: UUID | null;
  templateId: UUID;
  title: string;
  status: ContentStatus;
  configuration: Record<string, unknown>;
  opensAt: ISODateTime | null;
  closesAt: ISODateTime | null;
}

export interface LabRun {
  id: UUID;
  activityId: UUID;
  studentId: UUID;
  attemptNo: number;
  status: "started" | "submitted" | "reviewed" | "expired";
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  evidenceAssetId: UUID | null;
}

export interface ResourceFolder {
  id: UUID;
  classroomId: UUID;
  parentId: UUID | null;
  title: string;
  position: number;
}

export interface LessonMaterial {
  lessonId: UUID;
  assetId: UUID;
  title: string;
  position: number;
}

export interface Message {
  id: UUID;
  classroomId: UUID;
  senderId: UUID;
  replyToId: UUID | null;
  body: string;
  createdAt: ISODateTime;
  editedAt: ISODateTime | null;
  deletedAt: ISODateTime | null;
  assetIds: UUID[];
}

export interface Attendance {
  id: UUID;
  liveSessionId: UUID;
  userId: UUID;
  joinedAt: ISODateTime;
  leftAt: ISODateTime | null;
}

export interface AiDraft {
  id: UUID;
  classroomId: UUID;
  sourceAssetId: UUID | null;
  draftType: "quiz" | "lesson_summary" | "practice";
  status: "draft" | "approved" | "rejected";
  content: Record<string, unknown>;
}
export interface CreateClassroomInput {
  name: string;
  subject?: string;
  mode: ClassroomMode;
  description?: string;
}

export interface CreateLessonInput {
  classroomId: UUID;
  title: string;
  description?: string;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
}

export interface GenerateQuizDraftInput {
  classroomId: UUID;
  sourceAssetId: UUID;
  sourceLocator: string;
  questionCount: number;
  difficulty: "easy" | "mixed" | "hard";
}

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
}
