import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
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

const academicYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const streams = [
  "Computer Science",
  "Information Technology",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Electronics & Communication",
  "Chemical Engineering",
  "Biotechnology",
  "Other",
];

export interface StudentFormData {
  regNumber: string;
  academicYear: string;
  stream: string;
  phone: string;
  email: string;
  password: string;
}

interface StudentRegistrationScreenProps {
  onSubmit: (data: StudentFormData) => void;
  onBack: () => void;
}

export default function StudentRegistrationScreen({
  onSubmit,
  onBack,
}: StudentRegistrationScreenProps) {
  const [regNumber, setRegNumber] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [stream, setStream] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showStreamPicker, setShowStreamPicker] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
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

  const handleSubmit = () => {
    onSubmit({ regNumber, academicYear, stream, phone, email, password });
  };

  const isFormValid =
    regNumber.length === 10 &&
    academicYear !== "" &&
    stream !== "" &&
    phone.length >= 10 &&
    email.includes("@") &&
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
        {/* Background decorations */}
        <View style={styles.bgDecor1} />
        <View style={styles.bgDecor2} />

        {/* Back Button */}
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
            {
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <View style={styles.headerIconContainer}>
            <Ionicons name="school-outline" size={28} color="#3B82F6" />
          </View>
          <Text style={styles.heading}>Student Registration</Text>
          <Text style={styles.subheading}>
            Fill in your details to get started
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View
          style={[
            styles.form,
            {
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          {/* Registration Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>University Registration Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="id-card-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. 230XXXXXXX"
                placeholderTextColor="#CBD5E1"
                value={regNumber}
                onChangeText={(text) =>
                  setRegNumber(text.replace(/[^0-9]/g, "").slice(0, 10))
                }
                keyboardType="number-pad"
                maxLength={10}
              />
              {regNumber.length === 10 && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
            <Text style={styles.hint}>10-digit registration number</Text>
          </View>

          {/* Academic Year Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Year</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => {
                setShowYearPicker(!showYearPicker);
                setShowStreamPicker(false);
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.dropdownText,
                  !academicYear && styles.placeholderText,
                ]}
              >
                {academicYear || "Select your year"}
              </Text>
              <Ionicons
                name={showYearPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
            {showYearPicker && (
              <View style={styles.pickerDropdown}>
                {academicYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerOption,
                      academicYear === year && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setAcademicYear(year);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        academicYear === year &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                    {academicYear === year && (
                      <Ionicons name="checkmark" size={18} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Stream Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stream</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => {
                setShowStreamPicker(!showStreamPicker);
                setShowYearPicker(false);
              }}
            >
              <Ionicons
                name="library-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <Text
                style={[styles.dropdownText, !stream && styles.placeholderText]}
              >
                {stream || "Select your stream"}
              </Text>
              <Ionicons
                name={showStreamPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
            {showStreamPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  style={styles.pickerScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {streams.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.pickerOption,
                        stream === s && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setStream(s);
                        setShowStreamPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          stream === s && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {s}
                      </Text>
                      {stream === s && (
                        <Ionicons name="checkmark" size={18} color="#3B82F6" />
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

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>University Email ID</Text>
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
            <Text style={styles.hint}>At least 6 characters</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Create Account</Text>
          </TouchableOpacity>

          {/* Footer hint */}
          <Text style={styles.footerText}>
            By creating an account, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFCFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },

  // Background
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
    bottom: -20,
    left: -40,
  },

  // Back button
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

  // Header
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#3B82F6",
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
  subheading: {
    fontSize: 14,
    color: "#94A3B8",
    letterSpacing: 0.2,
  },

  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 4,
    letterSpacing: 0.2,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    padding: 0,
  },
  hint: {
    fontSize: 12,
    color: "#CBD5E1",
    marginLeft: 4,
  },

  // Dropdown
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
  },
  placeholderText: {
    color: "#CBD5E1",
  },
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
  pickerScroll: {
    maxHeight: 220,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  pickerOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  pickerOptionText: {
    fontSize: 15,
    color: "#475569",
  },
  pickerOptionTextSelected: {
    color: "#3B82F6",
    fontWeight: "600",
  },

  // Submit
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Footer
  footerText: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.1,
  },
});
