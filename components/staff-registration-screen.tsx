import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const departments = [
  "Administration",
  "Library",
  "Security",
  "Maintenance",
  "Accounts",
  "IT Support",
  "Housekeeping",
  "Transport",
  "Examination Cell",
  "Other",
];

export interface StaffFormData {
  fullName: string;
  staffId: string;
  department: string;
  phone: string;
  email: string;
  password: string;
}

interface StaffRegistrationScreenProps {
  onSubmit: (data: StaffFormData) => void;
  onBack: () => void;
}

export default function StaffRegistrationScreen({
  onSubmit,
  onBack,
}: StaffRegistrationScreenProps) {
  const [fullName, setFullName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFormValid =
    fullName.trim().length >= 2 &&
    staffId.trim().length >= 3 &&
    department !== "" &&
    phone.length === 10 &&
    password.length >= 6;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bgDecor1} />
        <View style={styles.bgDecor2} />

        {/* Back */}
        <Animated.View style={{ opacity: fadeIn }}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color="#64748B" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <View style={styles.headerIconContainer}>
            <Ionicons name="briefcase-outline" size={28} color="#6366F1" />
          </View>
          <Text style={styles.heading}>Staff Registration</Text>
          <Text style={styles.subheading}>
            Fill in your details to get started
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View
          style={[
            styles.form,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#CBD5E1"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              {fullName.trim().length >= 2 && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
          </View>

          {/* Staff ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Staff ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="id-card-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your staff ID"
                placeholderTextColor="#CBD5E1"
                value={staffId}
                onChangeText={setStaffId}
                autoCapitalize="characters"
              />
              {staffId.trim().length >= 3 && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
          </View>

          {/* Department Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department / Role</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowDeptPicker(!showDeptPicker)}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.dropdownText,
                  !department && styles.placeholderText,
                ]}
              >
                {department || "Select your department"}
              </Text>
              <Ionicons
                name={showDeptPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
            {showDeptPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  style={styles.pickerScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.pickerOption,
                        department === d && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setDepartment(d);
                        setShowDeptPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          department === d && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {d}
                      </Text>
                      {department === d && (
                        <Ionicons name="checkmark" size={18} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#CBD5E1"
                value={phone}
                onChangeText={(text) =>
                  setPhone(text.replace(/[^0-9]/g, "").slice(0, 10))
                }
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phone.length === 10 && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
          </View>

          {/* Email (optional) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email ID</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="yourname@university.edu"
                placeholderTextColor="#CBD5E1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {email.includes("@") && email.includes(".") && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="#CBD5E1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid && styles.submitButtonDisabled,
            ]}
            onPress={() =>
              onSubmit({
                fullName,
                staffId,
                department,
                phone,
                email,
                password,
              })
            }
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Create Account</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By creating an account, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFCFF" },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  bgDecor1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    top: -40,
    right: -60,
  },
  bgDecor2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(16, 185, 129, 0.04)",
    bottom: -20,
    left: -40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    color: "#64748B",
    marginLeft: 6,
    fontWeight: "500",
  },
  header: { alignItems: "center", marginBottom: 32 },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subheading: { fontSize: 14, color: "#94A3B8", letterSpacing: 0.2 },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  optionalBadge: {
    fontSize: 11,
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1E293B", padding: 0 },
  dropdownText: { flex: 1, fontSize: 15, color: "#1E293B" },
  placeholderText: { color: "#CBD5E1" },
  pickerDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pickerScroll: { maxHeight: 220 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  pickerOptionSelected: { backgroundColor: "#EEF2FF" },
  pickerOptionText: { fontSize: 15, color: "#475569" },
  pickerOptionTextSelected: { color: "#6366F1", fontWeight: "600" },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: "#A5B4FC", shadowOpacity: 0.1 },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.1,
  },
});
