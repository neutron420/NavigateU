import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export type UserRole = "student" | "faculty" | "staff" | "visitor";

interface RoleSelectionScreenProps {
  onRoleSelect: (role: UserRole) => void;
}

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const roles: RoleOption[] = [
  {
    id: "student",
    label: "Student",
    description: "Enrolled at the university",
    icon: "school-outline",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
  },
  {
    id: "faculty",
    label: "Faculty",
    description: "Professor or instructor",
    icon: "book-outline",
    color: "#10B981",
    bgColor: "#ECFDF5",
  },
  {
    id: "staff",
    label: "Staff",
    description: "University employee",
    icon: "briefcase-outline",
    color: "#6366F1",
    bgColor: "#EEF2FF",
  },
  {
    id: "visitor",
    label: "Visitor",
    description: "Guest or prospective student",
    icon: "person-outline",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
  },
];

export default function RoleSelectionScreen({
  onRoleSelect,
}: RoleSelectionScreenProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  const card0Opacity = useRef(new Animated.Value(0)).current;
  const card0TranslateY = useRef(new Animated.Value(30)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1TranslateY = useRef(new Animated.Value(30)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2TranslateY = useRef(new Animated.Value(30)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;
  const card3TranslateY = useRef(new Animated.Value(30)).current;

  const cardAnimations = [
    { opacity: card0Opacity, translateY: card0TranslateY },
    { opacity: card1Opacity, translateY: card1TranslateY },
    { opacity: card2Opacity, translateY: card2TranslateY },
    { opacity: card3Opacity, translateY: card3TranslateY },
  ];

  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered card animations
    cardAnimations.forEach((anim, index) => {
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: 300 + index * 120,
          useNativeDriver: true,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          delay: 300 + index * 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = (role: UserRole, index: number) => {
    // Quick press feedback animation
    const anim = cardAnimations[index];
    Animated.sequence([
      Animated.timing(anim.opacity, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRoleSelect(role);
    });
  };

  return (
    <View style={styles.container}>
      {/* Decorative background elements */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />
      <View style={styles.bgDecor3} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        <View style={styles.headerIconContainer}>
          <Ionicons name="business-outline" size={30} color="#3B82F6" />
        </View>
        <Text style={styles.heading}>Who are you?</Text>
        <Text style={styles.subheading}>
          Select your role to personalize{"\n"}your campus experience
        </Text>
      </Animated.View>

      {/* Role Cards */}
      <View style={styles.cardsContainer}>
        {roles.map((role, index) => (
          <Animated.View
            key={role.id}
            style={{
              opacity: cardAnimations[index].opacity,
              transform: [{ translateY: cardAnimations[index].translateY }],
            }}
          >
            <TouchableOpacity
              style={[styles.card, { borderColor: role.color + "20" }]}
              onPress={() => handlePress(role.id, index)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: role.bgColor },
                ]}
              >
                <Ionicons name={role.icon} size={26} color={role.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: "#1E293B" }]}>
                  {role.label}
                </Text>
                <Text style={styles.cardDescription}>{role.description}</Text>
              </View>
              <View style={[styles.arrow, { backgroundColor: role.bgColor }]}>
                <Ionicons name="chevron-forward" size={18} color={role.color} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: fadeIn }]}>
        <Text style={styles.footerText}>
          You can change this later in settings
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFCFF",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 50,
  },

  // Background decorations
  bgDecor1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    top: -40,
    right: -60,
  },
  bgDecor2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(16, 185, 129, 0.04)",
    bottom: 80,
    left: -40,
  },
  bgDecor3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    top: "45%",
    right: -20,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subheading: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  // Cards
  cardsContainer: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: "#94A3B8",
    letterSpacing: 0.1,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
  },
  footerText: {
    fontSize: 13,
    color: "#CBD5E1",
    letterSpacing: 0.2,
  },
});
