import React, { useState } from "react";
import { ScrollView, View, Text, Alert, StyleSheet } from "react-native";
import { Session } from "../constants/types";
import { colors } from "../constants/theme";
import { apiRequest } from "../services/api";
import { Input, PrimaryButton, SectionHeader } from "../components/UI/FormControls";

function confirmAction(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm }
  ]);
}

function validateStrongPassword(password: string) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
    return "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }
  return "";
}

export function SecurityScreen({
  session,
  onSessionUpdate
}: {
  session: Session;
  onSessionUpdate?: (session: Session) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loginIdPassword, setLoginIdPassword] = useState("");
  const [newLoginId, setNewLoginId] = useState(session.user.phone);
  const [loading, setLoading] = useState(false);
  async function changePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Password", "Enter both current password and new password.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Password", "New password cannot be the same as your current password. Please choose a new password.");
      return;
    }
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      Alert.alert("Password", passwordError);
      return;
    }

    try {
      setLoading(true);
      await apiRequest<{ ok: boolean }>("/auth/change-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password changed", "Use the new password next time you login.");
    } catch (error) {
      Alert.alert("Password", error instanceof Error ? error.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  async function changeLoginId() {
    if (session.user.role !== "ADMIN") {
      Alert.alert("Login ID", "Only Admin can change the login ID.");
      return;
    }
    if (!loginIdPassword || !newLoginId.trim()) {
      Alert.alert("Login ID", "Enter current password and the new login phone number.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<{ ok: boolean; user: Session["user"] }>("/auth/change-login-id", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword: loginIdPassword, newPhone: newLoginId })
      });
      const updatedSession = { ...session, user: { ...session.user, phone: result.user.phone } };
      onSessionUpdate?.(updatedSession);
      setLoginIdPassword("");
      setNewLoginId(result.user.phone);
      Alert.alert("Login ID changed", "Use the new phone number the next time you login.");
    } catch (error) {
      Alert.alert("Login ID", error instanceof Error ? error.message : "Could not change login ID");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Security" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change password</Text>
        <Text style={styles.mutedText}>
          Use your current password and set a new secure password. The new password must have at least 8 characters, uppercase, lowercase, number, and special character.
        </Text>
        <Input
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <PrimaryButton
          label="Change password"
          onPress={() =>
            confirmAction(
              "Change password",
              "After this, use the new password for future logins.",
              changePassword
            )
          }
          loading={loading}
        />
      </View>
      {session.user.role === "ADMIN" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change admin login ID</Text>
          <Text style={styles.mutedText}>
            Only Admin can change the login phone number. This is the phone number used on the login screen.
          </Text>
          <Input
            label="Current password"
            value={loginIdPassword}
            onChangeText={setLoginIdPassword}
            secureTextEntry
          />
          <Input
            label="New login phone"
            value={newLoginId}
            onChangeText={setNewLoginId}
            keyboardType="phone-pad"
          />
          <PrimaryButton
            label="Change login ID"
            onPress={() =>
              confirmAction(
                "Change admin login ID",
                "After this, use the new phone number for future admin logins.",
                changeLoginId
              )
            }
            loading={loading}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16
  },
  cardTitle: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 12
  },
  mutedText: {
    color: colors.slate500,
    lineHeight: 20,
    marginBottom: 12
  }
});
