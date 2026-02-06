import { Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import "react-native-reanimated";

import FacultyRegistrationScreen from "@/components/faculty-registration-screen";
import RoleSelectionScreen, {
  type UserRole,
} from "@/components/role-selection-screen";
import SplashScreen from "@/components/splash-screen";
import StaffRegistrationScreen from "@/components/staff-registration-screen";
import StudentRegistrationScreen from "@/components/student-registration-screen";
import VisitorInfoScreen from "@/components/visitor-info-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { onAuthChange, signUp } from "@/services/auth";
import { saveUserProfile } from "@/services/firestore";

export const unstable_settings = {
  anchor: "(tabs)",
};

type AppScreen =
  | "splash"
  | "loading"
  | "role-selection"
  | "student-registration"
  | "faculty-registration"
  | "staff-registration"
  | "visitor-info"
  | "main";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("splash");
  const [, setUserRole] = useState<UserRole | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Preload Ionicons font so icons appear instantly
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  // ── Check if user is already logged in ──
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (user) {
        // User is already logged in — skip straight to main
        setCurrentScreen("main");
      }
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAFCFF",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (currentScreen === "splash") {
    return (
      <>
        <StatusBar style="dark" />
        <SplashScreen
          onFinish={() => {
            // Auth already resolved while splash was showing → go to main
            if (authChecked) {
              // onAuthChange already set "main" if a user exists,
              // so if we're still on splash it means no user → role-selection
              setCurrentScreen("role-selection");
            } else {
              // Auth hasn't resolved yet → show loading spinner
              setCurrentScreen("loading");
            }
          }}
        />
      </>
    );
  }

  // Show loading while checking auth after splash
  if (currentScreen === "loading") {
    if (authChecked) {
      // Auth check completed while we were waiting
      setCurrentScreen("role-selection");
    }
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAFCFF",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (currentScreen === "role-selection") {
    return (
      <>
        <StatusBar style="dark" />
        <RoleSelectionScreen
          onRoleSelect={(role) => {
            setUserRole(role);
            switch (role) {
              case "student":
                setCurrentScreen("student-registration");
                break;
              case "faculty":
                setCurrentScreen("faculty-registration");
                break;
              case "staff":
                setCurrentScreen("staff-registration");
                break;
              case "visitor":
                setCurrentScreen("visitor-info");
                break;
            }
          }}
        />
      </>
    );
  }

  if (currentScreen === "student-registration") {
    return (
      <>
        <StatusBar style="dark" />
        {isRegistering && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 999,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <StudentRegistrationScreen
          onSubmit={async (data) => {
            setIsRegistering(true);
            try {
              const user = await signUp(
                data.email,
                data.password,
                `Student-${data.regNumber}`,
              );
              await saveUserProfile(user.uid, {
                role: "student",
                email: data.email,
                displayName: `Student-${data.regNumber}`,
                phone: data.phone,
                regNumber: data.regNumber,
                academicYear: data.academicYear,
                stream: data.stream,
              });
              setCurrentScreen("main");
            } catch (error: any) {
              Alert.alert(
                "Registration Failed",
                error.message || "Something went wrong. Please try again.",
              );
            } finally {
              setIsRegistering(false);
            }
          }}
          onBack={() => setCurrentScreen("role-selection")}
        />
      </>
    );
  }

  if (currentScreen === "faculty-registration") {
    return (
      <>
        <StatusBar style="dark" />
        {isRegistering && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 999,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <FacultyRegistrationScreen
          onSubmit={async (data) => {
            setIsRegistering(true);
            try {
              const user = await signUp(
                data.email,
                data.password,
                data.fullName,
              );
              await saveUserProfile(user.uid, {
                role: "faculty",
                email: data.email,
                displayName: data.fullName,
                phone: data.phone,
                employeeId: data.facultyId,
                department: data.department,
              });
              setCurrentScreen("main");
            } catch (error: any) {
              Alert.alert(
                "Registration Failed",
                error.message || "Something went wrong. Please try again.",
              );
            } finally {
              setIsRegistering(false);
            }
          }}
          onBack={() => setCurrentScreen("role-selection")}
        />
      </>
    );
  }

  if (currentScreen === "staff-registration") {
    return (
      <>
        <StatusBar style="dark" />
        {isRegistering && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 999,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <StaffRegistrationScreen
          onSubmit={async (data) => {
            setIsRegistering(true);
            try {
              const email =
                data.email || `${data.staffId.toLowerCase()}@navigateu.app`;
              const user = await signUp(email, data.password, data.fullName);
              await saveUserProfile(user.uid, {
                role: "staff",
                email,
                displayName: data.fullName,
                phone: data.phone,
                staffId: data.staffId,
                section: data.department,
              });
              setCurrentScreen("main");
            } catch (error: any) {
              Alert.alert(
                "Registration Failed",
                error.message || "Something went wrong. Please try again.",
              );
            } finally {
              setIsRegistering(false);
            }
          }}
          onBack={() => setCurrentScreen("role-selection")}
        />
      </>
    );
  }

  if (currentScreen === "visitor-info") {
    return (
      <>
        <StatusBar style="dark" />
        <VisitorInfoScreen
          onContinue={() => setCurrentScreen("main")}
          onBack={() => setCurrentScreen("role-selection")}
        />
      </>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
