import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/api';

// Super Admin screens
import { AdminCreateSchoolScreen } from '../screens/AdminCreateSchoolScreen';
import { AdminSchoolDetailScreen } from '../screens/AdminSchoolDetailScreen';
import { SchoolsScreen } from '../screens/SchoolsScreen';

// School Admin screens
import { SchoolAdminClassDetailScreen } from '../screens/SchoolAdminClassDetailScreen';
import { SchoolAdminClassesScreen } from '../screens/SchoolAdminClassesScreen';
import { SchoolAdminTeachersScreen } from '../screens/SchoolAdminTeachersScreen';
import { SchoolAdminStudentsScreen } from '../screens/SchoolAdminStudentsScreen';
import { SchoolAdminProfileScreen } from '../screens/SchoolAdminProfileScreen';

// Auth screens
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';

// Student screens
import { StudentHomeScreen } from '../screens/StudentHomeScreen';
import { StudentProfileScreen } from '../screens/StudentProfileScreen';
import { StudentSubjectDetailScreen } from '../screens/StudentSubjectDetailScreen';

// Teacher screens
import { TeacherProfileScreen } from '../screens/TeacherProfileScreen';
import { TeacherRecordingReportScreen } from '../screens/TeacherRecordingReportScreen';
import { TeacherSubjectDetailScreen } from '../screens/TeacherSubjectDetailScreen';
import { TeacherSubjectsScreen } from '../screens/TeacherSubjectsScreen';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  // Super Admin
  AdminSchools: undefined;
  AdminCreateSchool: undefined;
  AdminSchoolDetail: { schoolId: number };
  // School Admin
  SchoolAdminClasses: undefined;
  SchoolAdminClassDetail: { classId: number; className: string };
  SchoolAdminTeachers: undefined;
  SchoolAdminStudents: undefined;
  SchoolAdminProfile: undefined;
  // Teacher
  TeacherSubjects: undefined;
  TeacherSubjectDetail: { subjectId: number; subjectName: string };
  TeacherRecordingReport: { recordingId: number; subjectName: string };
  TeacherProfile: undefined;
  // Student
  StudentHome: undefined;
  StudentSubjectDetail: { subjectId: number; subjectName: string };
  StudentProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function roleHome(role: UserRole): keyof RootStackParamList {
  switch (role) {
    case 'admin':       return 'AdminSchools';
    case 'school_admin': return 'SchoolAdminClasses';
    case 'teacher':     return 'TeacherSubjects';
    case 'student':     return 'StudentHome';
    default:            return 'Login';
  }
}

export function AppNavigator() {
  const { session } = useAuth();
  const initialRoute = session ? roleHome(session.role) : 'Login';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF9F9' },
        animation: 'slide_from_right',
      }}
    >
      {!session ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : session.role === 'admin' ? (
        <>
          <Stack.Screen name="AdminSchools" component={SchoolsScreen} />
          <Stack.Screen name="AdminCreateSchool" component={AdminCreateSchoolScreen} />
          <Stack.Screen name="AdminSchoolDetail" component={AdminSchoolDetailScreen} />
        </>
      ) : session.role === 'school_admin' ? (
        <>
          <Stack.Screen name="SchoolAdminClasses" component={SchoolAdminClassesScreen} />
          <Stack.Screen name="SchoolAdminClassDetail" component={SchoolAdminClassDetailScreen} />
          <Stack.Screen name="SchoolAdminTeachers" component={SchoolAdminTeachersScreen} />
          <Stack.Screen name="SchoolAdminStudents" component={SchoolAdminStudentsScreen} />
          <Stack.Screen name="SchoolAdminProfile" component={SchoolAdminProfileScreen} />
        </>
      ) : session.role === 'teacher' ? (
        <>
          <Stack.Screen name="TeacherSubjects" component={TeacherSubjectsScreen} />
          <Stack.Screen name="TeacherSubjectDetail" component={TeacherSubjectDetailScreen} />
          <Stack.Screen name="TeacherRecordingReport" component={TeacherRecordingReportScreen} />
          <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
          <Stack.Screen name="StudentSubjectDetail" component={StudentSubjectDetailScreen} />
          <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
