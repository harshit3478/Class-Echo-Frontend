export type UserRole = 'admin' | 'school_admin' | 'teacher' | 'student';

export type TokenResponse = {
  access_token: string;
  token_type: string;
  role: UserRole;
};

export type SchoolAdminOut = {
  id: number;
  name: string;
  email: string;
};

export type SchoolOut = {
  id: number;
  name: string;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  admin?: SchoolAdminOut | null;
};

export type SchoolCreatePayload = {
  name: string;
  address?: string | null;
  logo_url?: string | null;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

export type ClassOut = {
  id: number;
  name: string;
  profile_image_url: string | null;
  school_id: number;
  created_at: string;
};

export type TeacherOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  school_id: number | null;
  school_name: string | null;
  created_at: string;
};

export type TeacherBrief = {
  id: number;
  name: string;
  email: string;
};

export type SchoolAdminProfileOut = {
  id: number;
  name: string;
  email: string;
  profile_pic_url: string | null;
  school_id: number;
  school_name: string;
  school_logo_url: string | null;
  school_address: string | null;
  created_at: string;
};

export type ClassBrief = {
  id: number;
  name: string;
};

export type SubjectOut = {
  id: number;
  name: string;
  profile_image_url: string | null;
  class_id: number;
  class_: ClassBrief | null;
  teacher_id: number | null;
  teacher: TeacherBrief | null;
  created_at: string;
};

export type DimensionScore = {
  score: number;
  finding: string;
  evidence: string[];
};

export type ScoreBreakdown = {
  verbal_clarity: DimensionScore;
  pacing_delivery: DimensionScore;
  content_structure: DimensionScore;
  conceptual_depth: DimensionScore;
  student_engagement: DimensionScore;
  language_accessibility: DimensionScore;
  closure_recap: DimensionScore;
};

export type QuantitativeMetrics = {
  wpm_estimate: number;
  filler_words_heard: number;
  questions_asked: number;
  languages_detected: string[];
  code_switching_frequency: 'none' | 'low' | 'medium' | 'high';
  top_strengths: string[];
  priority_improvements: string[];
};

export type LLMReportOut = {
  id: number;
  recording_id: number;
  overall_score: number | null;
  teaching_quality_notes: string | null;
  score_breakdown: ScoreBreakdown | null;
  quantitative_metrics: QuantitativeMetrics | null;
  created_at: string;
};

export type RecordingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type RecordingWithReport = {
  id: number;
  subject_id: number;
  teacher_id: number;
  chapter_name: string | null;
  description: string | null;
  cloudinary_url: string;
  duration_seconds: number | null;
  status: RecordingStatus;
  uploaded_at: string;
  processed_at: string | null;
  report?: LLMReportOut | null;
};

export type StudentWithClassOut = {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  class_id: number;
  class_name: string;
  created_at: string;
};

export type StudentOut = {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  school_id: number;
  class_id: number;
  created_at: string;
};

export type StudentProfileOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  mobile_number: string | null;
  school_id: number;
  school_name: string;
  class_id: number;
  class_name: string;
  created_at: string;
};
