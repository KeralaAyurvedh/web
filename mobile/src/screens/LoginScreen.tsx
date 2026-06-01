import React, { useState } from "react";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  Image,
  StatusBar as NativeStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Role, Session, MemberApplication, ApplicationStatusResult } from "../constants/types";
import { apiRequest, formatRole } from "../services/api";
import { colors } from "../constants/theme";
import { Input, OptionList, PrimaryButton } from "../components/UI/FormControls";
import { PaymentGateScreen } from "./PaymentGateScreen";

const logoImage = require("../../assets/logo.png");

function validateStrongPassword(password: string) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }
  return "";
}

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showApplication, setShowApplication] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [paymentApplicantData, setPaymentApplicantData] = useState<any>(null);

  // Application fields
  const [appName, setAppName] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appEmail, setAppEmail] = useState("");
  const [appReferralCode, setAppReferralCode] = useState("");
  const [resolvedSponsor, setResolvedSponsor] = useState<{ name: string; role: string; determinedRole: string } | null>(null);
  const [sponsorError, setSponsorError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [appAadhaar, setAppAadhaar] = useState("");
  const [appPrivacyConsentAccepted, setAppPrivacyConsentAccepted] = useState(false);
  const [statusPhone, setStatusPhone] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatusResult | null>(null);

  // Forgot password fields
  const [resetPhone, setResetPhone] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);

  async function lookupSponsor(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 3) {
      setResolvedSponsor(null);
      setSponsorError("");
      return;
    }

    try {
      setLookupLoading(true);
      const res = await apiRequest<{ name: string; role: string; determinedRole: string }>(`/auth/resolve-referral/${trimmed}`, {
        method: "GET"
      });
      setResolvedSponsor(res);
      setSponsorError("");
    } catch (err) {
      setResolvedSponsor(null);
      setSponsorError(err instanceof Error ? err.message : "Sponsor lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleLogin() {
    try {
      setLoading(true);
      const result = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password })
      });
      onLogin(result);
    } catch (error: any) {
      if (error.message === "Payment under verification") {
        Alert.alert(
          "Payment under verification",
          "Your ₹299 registration payment is currently under review by our company administrators. This usually takes 1-2 hours. Please check back later."
        );
      } else if (error.message?.startsWith("Payment rejected")) {
        Alert.alert(
          "Payment Rejected",
          `${error.message}\n\nYou can click 'Apply for login' and resubmit your details with a valid transaction reference.`
        );
      } else {
        Alert.alert("Login failed", error instanceof Error ? error.message : "Please try again");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitApplication() {
    if (!appName.trim()) {
      Alert.alert("Validation Error", "Full Name is required");
      return;
    }
    if (!appPhone.trim() || appPhone.trim().length < 10) {
      Alert.alert("Validation Error", "A valid 10-digit Phone number is required");
      return;
    }
    if (!appEmail.trim() || !appEmail.includes("@")) {
      Alert.alert("Validation Error", "A valid Email address is required");
      return;
    }
    if (!appReferralCode.trim()) {
      Alert.alert("Validation Error", "Sponsor Referral Code is required");
      return;
    }
    if (!resolvedSponsor) {
      Alert.alert("Validation Error", "Please enter a valid Sponsor Referral Code and wait for it to be verified");
      return;
    }
    if (!appAadhaar.trim() || appAadhaar.trim().length < 12) {
      Alert.alert("Validation Error", "A valid 12-digit Aadhaar number is required");
      return;
    }
    if (!appPrivacyConsentAccepted) {
      Alert.alert("Privacy consent required", "Please accept the privacy consent before submitting Aadhaar details.");
      return;
    }

    setPaymentApplicantData({
      name: appName,
      phone: appPhone,
      email: appEmail,
      sponsorReferralCode: appReferralCode || undefined,
      aadhaarNumber: appAadhaar || undefined,
      privacyConsentAccepted: true
    });
    setShowPaymentGate(true);
  }

  async function checkApplicationStatus() {
    try {
      setLoading(true);
      const result = await apiRequest<{ application: ApplicationStatusResult }>("/applications/status", {
        method: "POST",
        body: JSON.stringify({ phone: statusPhone || appPhone || phone })
      });
      setApplicationStatus(result.application);
    } catch (error) {
      Alert.alert("Application status", error instanceof Error ? error.message : "Could not check application");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp() {
    if (!resetPhone || !resetEmail) {
      Alert.alert("Error", "Please fill in both phone number and registered email");
      return;
    }
    try {
      setLoading(true);
      const res = await apiRequest<{ ok: boolean; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ phone: resetPhone, email: resetEmail })
      });
      setOtpSent(true);
      Alert.alert("Code Sent", res.message);
    } catch (error) {
      Alert.alert("Reset Request Failed", error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndReset() {
    if (!resetOtp || !resetNewPassword) {
      Alert.alert("Error", "Please enter the verification code and set a new password");
      return;
    }
    const passwordError = validateStrongPassword(resetNewPassword);
    if (passwordError) {
      Alert.alert("Password", passwordError);
      return;
    }
    try {
      setLoading(true);
      await apiRequest<{ ok: boolean; message: string }>("/auth/reset-password-otp", {
        method: "POST",
        body: JSON.stringify({
          phone: resetPhone,
          otp: resetOtp,
          newPassword: resetNewPassword
        })
      });
      Alert.alert("Success", "Password reset successfully. Logging you in...", [
        {
          text: "OK",
          onPress: async () => {
            // Auto login after reset
            try {
              const result = await apiRequest<Session>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ phone: resetPhone, password: resetNewPassword })
              });
              onLogin(result);
            } catch {
              // If auto-login fails, return to normal login screen
              setPhone(resetPhone);
              setPassword(resetNewPassword);
              setShowForgotPassword(false);
              setOtpSent(false);
              setResetOtp("");
              setResetNewPassword("");
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert("Reset Failed", error instanceof Error ? error.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginRoot}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 40} style={styles.loginKeyboard}>
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.loginPanel}>
            <View style={styles.panelHeader}>
              <Image source={logoImage} style={styles.panelLogo} resizeMode="cover" />
              <Text style={styles.panelBrandName}>Kerala Ayurvedh</Text>
            </View>

            {showForgotPassword ? (
              <>
                <Text style={styles.cardTitle}>Reset Password</Text>
                {!otpSent ? (
                  <>
                    <Input label="Registered Phone" value={resetPhone} onChangeText={setResetPhone} keyboardType="phone-pad" />
                    <Input label="Registered Email" value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" />
                    <PrimaryButton label="Send Verification Code" onPress={handleRequestOtp} loading={loading} />
                  </>
                ) : (
                  <>
                    <Text style={styles.infoText}>We sent a verification code to {resetEmail}</Text>
                    <Input label="Enter 6-digit Code" value={resetOtp} onChangeText={setResetOtp} keyboardType="numeric" />
                    <Input label="New Password" value={resetNewPassword} onChangeText={setResetNewPassword} secureTextEntry />
                    <Text style={styles.mutedText}>
                      Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                    </Text>
                    <PrimaryButton label="Reset Password" onPress={handleVerifyAndReset} loading={loading} />
                  </>
                )}
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setOtpSent(false);
                    setResetOtp("");
                    setResetNewPassword("");
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Back to login</Text>
                </Pressable>
              </>
            ) : showPaymentGate ? (
              <PaymentGateScreen
                applicantData={paymentApplicantData}
                role={resolvedSponsor?.determinedRole || "CUSTOMER"}
                onSuccess={(verificationId) => {
                  setShowPaymentGate(false);
                  setShowApplication(false);
                  setAppName("");
                  setAppPhone("");
                  setAppEmail("");
                  setAppReferralCode("");
                  setResolvedSponsor(null);
                  setAppAadhaar("");
                  setAppPrivacyConsentAccepted(false);
                  setStatusPhone(appPhone);
                  // Check status to show details
                  setLoading(true);
                  apiRequest<{ application: ApplicationStatusResult }>("/applications/status", {
                    method: "POST",
                    body: JSON.stringify({ phone: appPhone })
                  })
                    .then((res) => {
                      setApplicationStatus(res.application);
                    })
                    .catch(() => {})
                    .finally(() => setLoading(false));
                }}
                onCancel={() => {
                  setShowPaymentGate(false);
                }}
              />
            ) : showApplication ? (
              <>
                <Text style={styles.cardTitle}>Apply for login</Text>
                <Input label="Name" value={appName} onChangeText={setAppName} />
                <Input label="Phone" value={appPhone} onChangeText={setAppPhone} keyboardType="phone-pad" />
                <Input label="Email" value={appEmail} onChangeText={setAppEmail} keyboardType="email-address" />
                
                <Input
                  label="Sponsor Referral Code"
                  value={appReferralCode}
                  onChangeText={(val) => {
                    setAppReferralCode(val);
                    lookupSponsor(val);
                  }}
                  autoCapitalize="characters"
                />
                {lookupLoading ? (
                  <Text style={styles.lookupPendingText}>Checking referral code...</Text>
                ) : sponsorError ? (
                  <Text style={styles.lookupErrorText}>{sponsorError}</Text>
                ) : resolvedSponsor ? (
                  <View style={styles.sponsorBox}>
                    <Text style={styles.sponsorName}>
                      Sponsor: {resolvedSponsor.name} ({formatRole(resolvedSponsor.role)})
                    </Text>
                    <Text style={styles.sponsorRoleNote}>
                      You will be registered as: <Text style={styles.highlightRole}>{formatRole(resolvedSponsor.determinedRole)}</Text>
                    </Text>
                  </View>
                ) : null}

                <Input label="Aadhaar number" value={appAadhaar} onChangeText={setAppAadhaar} keyboardType="numeric" />
                <Pressable
                  style={styles.privacyConsentRow}
                  onPress={() => setAppPrivacyConsentAccepted((value) => !value)}
                >
                  <View style={[styles.privacyConsentBox, appPrivacyConsentAccepted && styles.privacyConsentBoxChecked]}>
                    <Text style={styles.privacyConsentCheck}>{appPrivacyConsentAccepted ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.privacyConsentText}>
                    I consent to Kerala Ayurvedh collecting and using Aadhaar number only for identity verification, application review, fraud prevention, and legal compliance.
                  </Text>
                </Pressable>
                <PrimaryButton
                  label="Submit application"
                  onPress={submitApplication}
                  loading={loading}
                  disabled={!resolvedSponsor}
                />
                <View style={styles.spacer} />
                <Input label="Check status by phone" value={statusPhone} onChangeText={setStatusPhone} keyboardType="phone-pad" />
                <PrimaryButton label="Check application status" onPress={checkApplicationStatus} loading={loading} />
                {applicationStatus ? (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>{applicationStatus.name} - {applicationStatus.status}</Text>
                    <Text style={styles.infoText}>
                      {formatRole(applicationStatus.requestedRole)}
                      {applicationStatus.rejectionReason ? ` - ${applicationStatus.rejectionReason}` : ""}
                    </Text>
                  </View>
                ) : null}
                <Pressable style={styles.secondaryButton} onPress={() => setShowApplication(false)}>
                  <Text style={styles.secondaryButtonText}>Back to login</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
                <PrimaryButton label="Sign in" onPress={handleLogin} loading={loading} />
                
                <Pressable style={styles.forgotButton} onPress={() => setShowForgotPassword(true)}>
                  <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => setShowApplication(true)}>
                  <Text style={styles.secondaryButtonText}>Apply for login</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    backgroundColor: colors.slate900,
    paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0
  },
  loginKeyboard: {
    flex: 1
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  loginHero: {
    alignItems: "center",
    marginBottom: 32
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.brand500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  logoInitial: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800"
  },
  brandName: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4
  },
  brandSubName: {
    color: colors.brand200,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 6,
    marginBottom: 12
  },
  loginTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8
  },
  loginCopy: {
    color: colors.slate500,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  },
  loginPanel: {
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 24,
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  panelHeader: {
    alignItems: "center",
    marginBottom: 20
  },
  panelLogo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.slate100,
    marginBottom: 10
  },
  panelBrandName: {
    color: colors.slate900,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "capitalize",
    textAlign: "center"
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 16,
    textAlign: "center"
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 12
  },
  secondaryButtonText: {
    color: colors.brand600,
    fontSize: 16,
    fontWeight: "600"
  },
  forgotButton: {
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 12
  },
  forgotButtonText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "500"
  },
  mutedText: {
    fontSize: 12,
    color: colors.slate500,
    marginBottom: 12,
    lineHeight: 16
  },
  spacer: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 20
  },
  infoBox: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.slate100
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 4
  },
  infoText: {
    color: colors.slate700
  },
  lookupPendingText: {
    color: colors.slate500,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: "600",
    fontStyle: "italic"
  },
  lookupErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: "600"
  },
  sponsorBox: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    padding: 10,
    marginTop: -8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.brand200
  },
  sponsorName: {
    color: colors.slate700,
    fontSize: 13,
    fontWeight: "700"
  },
  sponsorRoleNote: {
    color: colors.slate500,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500"
  },
  highlightRole: {
    color: colors.brand600,
    fontWeight: "800"
  },
  privacyConsentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 12
  },
  privacyConsentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  privacyConsentBoxChecked: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  privacyConsentCheck: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  },
  privacyConsentText: {
    flex: 1,
    color: colors.slate700,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  }
});
