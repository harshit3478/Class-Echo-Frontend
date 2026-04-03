import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/api';
import { AdminCreateSchoolScreen } from '../screens/AdminCreateSchoolScreen';
import { AdminSchoolDetailScreen } from '../screens/AdminSchoolDetailScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SchoolAdminHomeScreen } from '../screens/SchoolAdminHomeScreen';
import { SchoolsScreen } from '../screens/SchoolsScreen';
import { StudentExploreScreen } from '../screens/StudentExploreScreen';
import { TeacherSubjectDetailScreen } from '../screens/TeacherSubjectDetailScreen';
import { TeacherSubjectsScreen } from '../screens/TeacherSubjectsScreen';
import { SignupScreen } from '../screens/SignupScreen';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  AdminSchools: undefined;
  AdminCreateSchool: undefined;
  AdminSchoolDetail: { schoolId: number };
  SchoolAdminHome: undefined;
  TeacherSubjects: undefined;
  TeacherSubjectDetail: { subjectId: number };
  StudentExplore: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function roleHome(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'AdminSchools';
    case 'school_admin':
      return 'SchoolAdminHome';
    case 'teacher':
      return 'TeacherSubjects';
    case 'student':
      return 'StudentExplore';
    default:
      return 'Login';
  }
}

export function AppNavigator() {
  const { session } = useAuth();
  const initialRoute = session ? roleHome(session.role) : 'Login';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#faf9f9',
        },
      }}
      initialRouteName={initialRoute}
    >
      {!session ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : session.role === 'admin' ? (
        <>
          <Stack.Screen name="AdminSchools" component={SchoolsScreen} />
          <Stack.Screen
            name="AdminCreateSchool"
            component={AdminCreateSchoolScreen}
          />
          <Stack.Screen
            name="AdminSchoolDetail"
            component={AdminSchoolDetailScreen}
          />
        </>
      ) : session.role === 'school_admin' ? (
        <Stack.Screen name="SchoolAdminHome" component={SchoolAdminHomeScreen} />
      ) : session.role === 'teacher' ? (
        <>
          <Stack.Screen
            name="TeacherSubjects"
            component={TeacherSubjectsScreen}
          />
          <Stack.Screen
            name="TeacherSubjectDetail"
            component={TeacherSubjectDetailScreen}
          />
        </>
      ) : (
        <Stack.Screen name="StudentExplore" component={StudentExploreScreen} />
      )}
    </Stack.Navigator>
  );
}
