import {
  ClassOut,
  RecordingWithReport,
  SchoolCreatePayload,
  SchoolOut,
  SubjectOut,
  TeacherOut,
  TokenResponse,
} from '../types/api';

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

export async function getStudentSchools(token: string, search?: string) {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<SchoolOut[]>(`/student/schools${suffix}`, {}, token);
}

export { API_BASE_URL, ApiError };
