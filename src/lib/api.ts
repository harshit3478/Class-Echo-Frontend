import {
  ClassOut,
  LLMReportOut,
  RecordingWithReport,
  SchoolCreatePayload,
  SchoolAdminProfileOut,
  SchoolOut,
  StudentOut,
  StudentProfileOut,
  StudentWithClassOut,
  SubjectOut,
  TeacherOut,
  TokenResponse,
} from '../types/api';

import { notifyUnauthorized } from './authSession';

// Switch to local backend for development:
// Android emulator: 'http://10.0.2.2:8000'
// iOS simulator / Expo Go on device: 'http://localhost:8000'
// Production: 'https://classecho-web-gu6527wmpa-el.a.run.app'
const API_BASE_URL =
  'https://classecho-web-gu6527wmpa-el.a.run.app';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function debugLog(label: string, payload?: unknown) {
  console.log(`[api] ${label}`, payload ?? '');
}

function debugError(label: string, payload?: unknown) {
  console.error(`[api] ${label}`, payload ?? '');
}

function appendFile(
  form: FormData,
  fieldName: string,
  fileUri: string,
  mimeType: string,
  fallbackPrefix: string,
) {
  const uploadUri = normalizeUploadUri(fileUri);
  const normalizedType = normalizeMimeType(uploadUri, mimeType);
  const ext = inferFileExtension(uploadUri, normalizedType);
  debugLog('appendFile', {
    fieldName,
    originalUri: fileUri,
    uploadUri,
    normalizedType,
    ext,
  });
  form.append(
    fieldName,
    {
      uri: uploadUri,
      type: normalizedType,
      name: `${fallbackPrefix}_${Date.now()}.${ext}`,
    } as unknown as Blob,
  );
}

function normalizeUploadUri(fileUri: string) {
  if (
    fileUri.startsWith('file://')
    || fileUri.startsWith('content://')
    || fileUri.startsWith('http://')
    || fileUri.startsWith('https://')
  ) {
    return fileUri;
  }

  if (fileUri.startsWith('/')) {
    return `file://${fileUri}`;
  }

  return fileUri;
}

function normalizeMimeType(fileUri: string, mimeType?: string | null) {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (normalized) {
    return normalized;
  }

  const ext = fileUri.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'webm':
      return 'audio/webm';
    case 'aac':
      return 'audio/aac';
    default:
      return 'application/octet-stream';
  }
}

function inferFileExtension(fileUri: string, mimeType: string) {
  const fromUri = fileUri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) {
    return fromUri;
  }

  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/mp4':
      return 'm4a';
    default:
      return mimeType.split('/')[1] ?? 'bin';
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

  debugLog('request:start', {
    path,
    method: init.method ?? 'GET',
    hasToken: Boolean(token),
    isFormData: init.body instanceof FormData,
  });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    debugError('request:network_error', {
      path,
      method: init.method ?? 'GET',
      hasToken: Boolean(token),
      isFormData: init.body instanceof FormData,
      error,
    });
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Network request failed';
    throw new ApiError(message, 0);
  }

  debugLog('request:response', {
    path,
    method: init.method ?? 'GET',
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifyUnauthorized();
    }
    let message = 'Request failed';
    const raw = await response.text();
    debugError('request:http_error', {
      path,
      method: init.method ?? 'GET',
      status: response.status,
      raw,
    });
    if (raw) {
      try {
        const body = JSON.parse(raw) as { detail?: string; message?: string };
        message = body.detail ?? body.message ?? raw;
      } catch {
        message = raw;
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

export async function updateAdminSchool(
  token: string,
  schoolId: number,
  payload: { name: string; address?: string | null },
) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteAdminSchool(token: string, schoolId: number) {
  return request<void>(`/admin/schools/${schoolId}`, { method: 'DELETE' }, token);
}

export async function getAdminSchoolClasses(token: string, schoolId: number) {
  return request<ClassOut[]>(`/admin/schools/${schoolId}/classes`, {}, token);
}

export async function getAdminClass(
  token: string,
  schoolId: number,
  classId: number,
) {
  return request<ClassOut>(`/admin/schools/${schoolId}/classes/${classId}`, {}, token);
}

export async function getAdminClassSubjects(
  token: string,
  schoolId: number,
  classId: number,
) {
  return request<SubjectOut[]>(
    `/admin/schools/${schoolId}/classes/${classId}/subjects`,
    {},
    token,
  );
}

export async function getAdminSubjectStudents(
  token: string,
  schoolId: number,
  subjectId: number,
) {
  return request<StudentOut[]>(
    `/admin/schools/${schoolId}/subjects/${subjectId}/students`,
    {},
    token,
  );
}

export async function getAdminSubjectRecordings(
  token: string,
  schoolId: number,
  subjectId: number,
) {
  return request<RecordingWithReport[]>(
    `/admin/schools/${schoolId}/subjects/${subjectId}/recordings`,
    {},
    token,
  );
}

export async function deleteAdminRecording(token: string, recordingId: number) {
  return request<void>(`/admin/recordings/${recordingId}`, { method: 'DELETE' }, token);
}

export async function getSchoolAdminClasses(token: string) {
  return request<ClassOut[]>('/school/classes', {}, token);
}

export async function getSchoolAdminTeachers(token: string) {
  return request<TeacherOut[]>('/school/teachers', {}, token);
}

export async function getSchoolAdminMe(token: string) {
  return request<SchoolAdminProfileOut>('/school/me', {}, token);
}

export async function updateSchoolAdminMe(
  token: string,
  payload: {
    name?: string | null;
    school_name?: string | null;
    school_address?: string | null;
  },
) {
  return request<SchoolAdminProfileOut>(
    '/school/me',
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
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

export async function getTeacherSubjectStudents(token: string, subjectId: number) {
  return request<StudentOut[]>(`/teacher/subjects/${subjectId}/students`, {}, token);
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
  onProgress?: (pct: number) => void,
): Promise<RecordingWithReport> {
  const form = new FormData();
  const normalizedType = normalizeMimeType(fileUri, mimeType);
  appendFile(form, 'file', fileUri, normalizedType, 'recording');
  if (chapterName) form.append('chapter_name', chapterName);
  if (description) form.append('description', description);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/teacher/subjects/${subjectId}/recordings`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        notifyUnauthorized();
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as RecordingWithReport);
        } catch {
          reject(new ApiError('Invalid response from server', xhr.status));
        }
      } else {
        reject(new ApiError(`Upload failed (${xhr.status})`, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network request failed', 0));
    xhr.ontimeout = () => reject(new ApiError('Upload timed out', 0));
    xhr.timeout = 10 * 60 * 1000; // 10 min for large files

    xhr.send(form);
  });
}

export async function getTeacherRecordingReport(token: string, recordingId: number) {
  return request<LLMReportOut>(`/teacher/recordings/${recordingId}/report`, {}, token);
}

export async function retryRecording(token: string, recordingId: number) {
  return request<RecordingWithReport>(`/teacher/recordings/${recordingId}/retry`, { method: 'POST' }, token);
}

export async function updateTeacherMe(
  token: string,
  payload: { name?: string | null },
) {
  return request<TeacherOut>(
    '/teacher/me',
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export async function uploadTeacherProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  appendFile(form, 'file', imageUri, mimeType, 'teacher_profile');
  return request<TeacherOut>('/teacher/profile-image', { method: 'POST', body: form, headers: {} }, token);
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

export async function getSchoolSubjectStudents(token: string, subjectId: number) {
  return request<StudentOut[]>(`/school/subjects/${subjectId}/students`, {}, token);
}

export async function getStudentMe(token: string) {
  return request<StudentProfileOut>('/student/me', {}, token);
}

export async function updateStudentMe(
  token: string,
  payload: { name?: string | null; mobile_number?: string | null },
) {
  return request<StudentProfileOut>(
    '/student/me',
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export async function uploadStudentProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  appendFile(form, 'file', imageUri, mimeType, 'student_profile');
  return request<StudentProfileOut>('/student/profile-image', { method: 'POST', body: form, headers: {} }, token);
}

export async function getStudentSubjects(token: string, classId: number) {
  return request<SubjectOut[]>(`/student/classes/${classId}/subjects`, {}, token);
}

export async function getStudentSubjectRecordings(token: string, subjectId: number) {
  return request<RecordingWithReport[]>(`/student/subjects/${subjectId}/recordings`, {}, token);
}

export async function uploadSchoolAdminProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  appendFile(form, 'file', imageUri, mimeType, 'school_admin_profile');
  return request<SchoolAdminProfileOut>('/school/profile-image', { method: 'POST', body: form, headers: {} }, token);
}

export async function uploadSchoolLogo(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  appendFile(form, 'file', imageUri, mimeType, 'school_logo');
  return request<SchoolOut>('/school/logo', { method: 'POST', body: form, headers: {} }, token);
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
