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
  created_at: string;
};

export type TeacherBrief = {
  id: number;
  name: string;
  email: string;
};

export type SubjectOut = {
  id: number;
  name: string;
  profile_image_url: string | null;
  class_id: number;
  teacher_id: number | null;
  teacher: TeacherBrief | null;
  created_at: string;
};

export type LLMReportOut = {
  id: number;
  recording_id: number;
  overall_score: number | null;
  teaching_quality_notes: string | null;
  strengths: string | null;
  improvements: string | null;
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

export type StudentProfileOut = {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  school_id: number;
  school_name: string;
  class_id: number;
  class_name: string;
  created_at: string;
};
