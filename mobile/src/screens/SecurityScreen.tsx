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

export function SecurityScreen({ session }: { session: Session }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Password", "Enter both current password and new password.");
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
