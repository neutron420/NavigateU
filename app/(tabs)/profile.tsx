import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getCurrentUser, signOut } from "@/services/auth";
import { getUserProfile, type UserProfile } from "@/services/firestore";

interface ProfileMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value?: string;
}

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  student: "school-outline",
  faculty: "book-outline",
  staff: "briefcase-outline",
  visitor: "person-outline",
};

const ROLE_COLORS: Record<string, string> = {
  student: "#3B82F6",
  faculty: "#10B981",
  staff: "#6366F1",
  visitor: "#F59E0B",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      }
    } catch (e) {
      console.log("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Build personal info based on role
  const getPersonalInfo = (): ProfileMenuItem[] => {
    if (!profile) return [];

    const items: ProfileMenuItem[] = [];

    if (profile.regNumber) {
      items.push({
        id: "reg",
        label: "Reg. Number",
        icon: "id-card-outline",
        color: "#3B82F6",
        value: profile.regNumber,
      });
    }
    if (profile.employeeId) {
      items.push({
        id: "empId",
        label: "Faculty ID",
        icon: "id-card-outline",
        color: "#3B82F6",
        value: profile.employeeId,
      });
    }
    if (profile.staffId) {
      items.push({
        id: "staffId",
        label: "Staff ID",
        icon: "id-card-outline",
        color: "#3B82F6",
        value: profile.staffId,
      });
    }
    items.push({
      id: "email",
      label: "Email",
      icon: "mail-outline",
      color: "#10B981",
      value: profile.email,
    });
    if (profile.phone) {
      items.push({
        id: "phone",
        label: "Phone",
        icon: "call-outline",
        color: "#8B5CF6",
        value: profile.phone,
      });
    }
    if (profile.department || profile.stream) {
      items.push({
        id: "dept",
        label: profile.role === "student" ? "Stream" : "Department",
        icon: "library-outline",
        color: "#F59E0B",
        value: profile.stream || profile.department || profile.section,
      });
    }
    if (profile.section && profile.role === "staff") {
      items.push({
        id: "section",
        label: "Section",
        icon: "grid-outline",
        color: "#F59E0B",
        value: profile.section,
      });
    }
    if (profile.academicYear) {
      items.push({
        id: "year",
        label: "Academic Year",
        icon: "calendar-outline",
        color: "#EF4444",
        value: profile.academicYear,
      });
    }

    return items;
  };

  const displayName =
    profile?.displayName || getCurrentUser()?.displayName || "User";
  const roleColor = ROLE_COLORS[profile?.role || "student"] || "#3B82F6";
  const roleIcon = ROLE_ICONS[profile?.role || "student"] || "person-outline";
  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "User";

  const settingsItems: ProfileMenuItem[] = [
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-outline",
      color: "#3B82F6",
    },
    {
      id: "language",
      label: "Language",
      icon: "language-outline",
      color: "#10B981",
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: "color-palette-outline",
      color: "#8B5CF6",
    },
    {
      id: "privacy",
      label: "Privacy & Security",
      icon: "shield-checkmark-outline",
      color: "#F59E0B",
    },
    {
      id: "help",
      label: "Help & Support",
      icon: "help-circle-outline",
      color: "#64748B",
    },
    {
      id: "about",
      label: "About NavigateU",
      icon: "information-circle-outline",
      color: "#94A3B8",
    },
  ];

  const handleSettingPress = (id: string) => {
    Alert.alert(
      "Coming Soon",
      "This feature will be available in a future update.",
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            // App will reset on next launch
          } catch (e) {
            console.log("Logout error", e);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const personalInfo = getPersonalInfo();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {displayName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <View
            style={[styles.roleBadge, { backgroundColor: roleColor + "15" }]}
          >
            <Ionicons name={roleIcon} size={14} color={roleColor} />
            <Text style={[styles.roleText, { color: roleColor }]}>
              {roleLabel}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color="#3B82F6" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            {personalInfo.map((item, index) => (
              <View key={item.id}>
                <View style={styles.infoRow}>
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
                {index < personalInfo.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            {settingsItems.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => handleSettingPress(item.id)}
                  activeOpacity={0.6}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
                {index < settingsItems.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.versionText}>NavigateU v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Header */
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Avatar Card */
  avatarCard: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#3B82F6",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3B82F6",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginBottom: 14,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#FFFFFF",
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },

  /* Sections */
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },

  /* Info Rows */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 52,
  },

  /* Setting Rows */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
  },

  /* Logout */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },

  /* Version */
  versionText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    color: "#CBD5E1",
  },
});
