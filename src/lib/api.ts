import {
  ClassOut,
  LLMReportOut,
  RecordingWithReport,
  SchoolCreatePayload,
  SchoolOut,
  StudentProfileOut,
  StudentWithClassOut,
  SubjectOut,
  TeacherOut,
  TokenResponse,
} from '../types/api';

// Switch to local backend for development:
// Android emulator: 'http://10.0.2.2:8000'
// iOS simulator / Expo Go on device: 'http://localhost:8000'
// Production: 'https://class-echo-backend-production.up.railway.app'
const API_BASE_URL =
  'https://class-echo-backend-production.up.railway.app';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const body = await response.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string) {
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  return request<TokenResponse>(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );
}

export async function getAdminSchools(token: string) {
  return request<SchoolOut[]>('/admin/schools', {}, token);
}

export async function createAdminSchool(
  token: string,
  payload: SchoolCreatePayload,
) {
  return request<SchoolOut>(
    '/admin/schools',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getAdminSchool(token: string, schoolId: number) {
  return request<SchoolOut>(`/admin/schools/${schoolId}`, {}, token);
}

export async function getAdminSchoolClasses(token: string, schoolId: number) {
  return request<ClassOut[]>(`/admin/schools/${schoolId}/classes`, {}, token);
}

export async function getSchoolAdminClasses(token: string) {
  return request<ClassOut[]>('/school/classes', {}, token);
}

export async function getSchoolAdminTeachers(token: string) {
  return request<TeacherOut[]>('/school/teachers', {}, token);
}

export async function getTeacherSubjects(token: string) {
  return request<SubjectOut[]>('/teacher/subjects', {}, token);
}

export async function getTeacherSubject(token: string, subjectId: number) {
  return request<SubjectOut>(`/teacher/subjects/${subjectId}`, {}, token);
}

export async function getTeacherSubjectRecordings(
  token: string,
  subjectId: number,
) {
  return request<RecordingWithReport[]>(
    `/teacher/subjects/${subjectId}/recordings`,
    {},
    token,
  );
}

// ── School Admin: Classes ─────────────────────────────────────────────────────

export type ClassCreatePayload = {
  name: string;
  profile_image_url?: string | null;
};

export async function createSchoolAdminClass(token: string, payload: ClassCreatePayload) {
  return request<ClassOut>('/school/classes', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function updateSchoolAdminClass(token: string, classId: number, payload: ClassCreatePayload) {
  return request<ClassOut>(`/school/classes/${classId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
}

export async function deleteSchoolAdminClass(token: string, classId: number) {
  return request<void>(`/school/classes/${classId}`, { method: 'DELETE' }, token);
}

// ── School Admin: Subjects ────────────────────────────────────────────────────

export type SubjectCreatePayload = {
  name: string;
  profile_image_url?: string | null;
};

export async function getClassSubjects(token: string, classId: number) {
  return request<SubjectOut[]>(`/school/classes/${classId}/subjects`, {}, token);
}

export async function createSubject(token: string, classId: number, payload: SubjectCreatePayload) {
  return request<SubjectOut>(
    `/school/classes/${classId}/subjects`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function updateSubject(token: string, subjectId: number, payload: SubjectCreatePayload) {
  return request<SubjectOut>(
    `/school/subjects/${subjectId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export async function assignTeacherToSubject(token: string, subjectId: number, teacherId: number) {
  return request<SubjectOut>(
    `/school/subjects/${subjectId}/assign-teacher`,
    { method: 'PUT', body: JSON.stringify({ teacher_id: teacherId }) },
    token,
  );
}

// ── School Admin: Teachers ────────────────────────────────────────────────────

export type TeacherCreatePayload = {
  name: string;
  email: string;
  password: string;
  profile_image_url?: string | null;
};

export async function createSchoolAdminTeacher(token: string, payload: TeacherCreatePayload) {
  return request<TeacherOut>(
    '/school/teachers',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export async function uploadRecording(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  chapterName?: string,
  description?: string,
) {
  const ext = mimeType.split('/')[1]?.replace('mpeg', 'mp3') ?? 'mp3';
  const form = new FormData();
  form.append('file', { uri: fileUri, type: mimeType, name: `recording_${Date.now()}.${ext}` } as unknown as Blob);
  if (chapterName) form.append('chapter_name', chapterName);
  if (description) form.append('description', description);
  return request<RecordingWithReport>(
    `/teacher/subjects/${subjectId}/recordings`,
    { method: 'POST', body: form, headers: {} },
    token,
  );
}

export async function getTeacherRecordingReport(token: string, recordingId: number) {
  return request<LLMReportOut>(`/teacher/recordings/${recordingId}/report`, {}, token);
}

// ── Student ───────────────────────────────────────────────────────────────────

export type StudentSignupPayload = {
  name: string;
  email: string;
  password: string;
  mobile_number?: string | null;
  school_id: number;
  class_id: number;
};

export async function studentSignup(payload: StudentSignupPayload) {
  return request<TokenResponse>('/auth/student/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTeacherMe(token: string) {
  return request<TeacherOut>('/teacher/me', {}, token);
}

export async function getSchoolAdminStudents(token: string) {
  return request<StudentWithClassOut[]>('/school/students', {}, token);
}

export async function getSchoolSubjectRecordings(token: string, subjectId: number) {
  return request<RecordingWithReport[]>(`/school/subjects/${subjectId}/recordings`, {}, token);
}

export async function getStudentMe(token: string) {
  return request<StudentProfileOut>('/student/me', {}, token);
}

export async function getStudentSubjects(token: string, classId: number) {
  return request<SubjectOut[]>(`/student/classes/${classId}/subjects`, {}, token);
}

export async function getStudentSubjectRecordings(token: string, subjectId: number) {
  return request<RecordingWithReport[]>(`/student/subjects/${subjectId}/recordings`, {}, token);
}

// ── Public (unauthenticated) ──────────────────────────────────────────────────

export async function getPublicSchools(search?: string) {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<SchoolOut[]>(`/public/schools${suffix}`);
}

export async function getPublicSchoolClasses(schoolId: number) {
  return request<ClassOut[]>(`/public/schools/${schoolId}/classes`);
}

export { API_BASE_URL, ApiError };
