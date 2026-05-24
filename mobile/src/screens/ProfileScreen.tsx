import React from "react";
import { ScrollView, View, Text, StyleSheet, Clipboard, Alert, Pressable } from "react-native";
import { Session } from "../constants/types";
import { colors } from "../constants/theme";
import { SectionHeader } from "../components/UI/FormControls";
import { formatRole } from "../services/api";

function SystemInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.systemInfoRow}>
      <Text style={styles.systemInfoLabel}>{label}</Text>
      <Text style={styles.systemInfoValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen({ session }: { session: Session }) {
  const displayRole = formatRole(session.user.role);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Profile" />
      <View style={styles.card}>
        <View style={styles.moreProfileCardCompact}>
          <View style={styles.moreAvatar}>
            <Text style={styles.moreAvatarText}>{session.user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.moreProfileText}>
            <Text style={styles.profileName}>{session.user.name}</Text>
            <Text style={styles.profileMeta}>
              {displayRole} - {session.user.status}
            </Text>
          </View>
        </View>
        <SystemInfoRow label="Phone" value={session.user.phone} />
        <SystemInfoRow label="Role" value={displayRole} />
        <SystemInfoRow label="Status" value={session.user.status} />
        {session.user.role !== "CUSTOMER" ? (
          <View style={styles.systemInfoRow}>
            <Text style={styles.systemInfoLabel}>Referral code</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.systemInfoValue}>{session.user.referralCode}</Text>
              <Pressable
                onPress={() => {
                  Clipboard.setString(session.user.referralCode);
                  Alert.alert("Copied", "Referral code copied to clipboard!");
                }}
                style={({ pressed }) => [
                  styles.copyButton,
                  { opacity: pressed ? 0.6 : 1 }
                ]}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  moreProfileCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10
  },
  moreAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center"
  },
  moreAvatarText: {
    color: colors.brand800,
    fontSize: 24,
    fontWeight: "900"
  },
  moreProfileText: {
    flex: 1
  },
  profileName: {
    color: colors.slate900,
    fontSize: 20,
    fontWeight: "900"
  },
  profileMeta: {
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  systemInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    paddingVertical: 9
  },
  systemInfoLabel: {
    flex: 1,
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "800"
  },
  systemInfoValue: {
    flex: 1.3,
    color: colors.slate900,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
  },
  copyButton: {
    backgroundColor: colors.brand100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8
  },
  copyButtonText: {
    color: colors.brand800,
    fontSize: 10,
    fontWeight: "900"
  }
});
