import React from "react";
import { Alert, ScrollView, View, Text, Pressable, StyleSheet, Image } from "react-native";
import * as Updates from "expo-updates";
import { Session, TabKey, MoreMenuItem } from "../constants/types";
import { colors } from "../constants/theme";
import { canAccessTab } from "../constants/guides";
import { formatRole } from "../services/api";

const logoImage = require("../../assets/logo.png");

export function MoreScreen({
  session,
  onNavigate,
  onLogout
}: {
  session: Session;
  onNavigate: (tab: TabKey) => void;
  onLogout: () => void;
}) {
  async function checkForAppUpdate() {
    try {
      if (__DEV__) {
        Alert.alert("App update", "Updates are checked in the installed app, not in development mode.");
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        Alert.alert("App update", "You are already using the latest available version.");
        return;
      }

      await Updates.fetchUpdateAsync();
      Alert.alert("App update", "Update downloaded. Restart now to apply it?", [
        { text: "Later", style: "cancel" },
        { text: "Restart", onPress: () => Updates.reloadAsync() }
      ]);
    } catch (error) {
      Alert.alert("App update", error instanceof Error ? error.message : "Could not check for updates.");
    }
  }

  const moreMenuItems: MoreMenuItem[] = [
    { key: "admin", title: "Company Admin", description: "Manage users, products, orders, reports and system monitor", icon: "A", adminOnly: true },
    { key: "tree", title: "Structure", description: "Open the representative network structure", icon: "T" },
    { key: "commissions", title: "Earnings", description: "View commission ledger and earning status", icon: "E" },
    { key: "payments", title: "Payments", description: "Record and track money handovers", icon: "P" },
    { key: "help", title: "Help", description: "Learn what to do step by step", icon: "H" },
    { key: "profile", title: "Profile", description: "View your account, role and employee details", icon: "U" },
    { key: "security", title: "Security", description: session.user.role === "ADMIN" ? "Change admin login ID and password" : "Change your login password", icon: "S" },
    { key: "update", title: "Check for app update", description: "Download the latest app changes without reinstalling", icon: "V" },
    { key: "logout", title: "Logout", description: "Sign out from this device", icon: "X", danger: true }
  ];
  
  const menuItems = moreMenuItems.filter((item) => {
    if (item.key === "logout" || item.key === "update") return true;
    if (item.adminOnly && session.user.role !== "ADMIN") return false;
    return canAccessTab(session.user.role, item.key);
  });

  return (
    <ScrollView contentContainerStyle={styles.moreContent}>
      <View style={styles.moreProfileCard}>
        <View style={styles.moreAvatar}>
          <Text style={styles.moreAvatarText}>{session.user.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.moreProfileText}>
          <Text style={styles.moreName}>{session.user.name}</Text>
          <Text style={styles.moreMeta}>
            {session.user.role === "ADMIN" ? `${formatRole(session.user.role)} - ` : ""}{session.user.status}
          </Text>
          {session.user.role !== "CUSTOMER" ? (
            <Text style={styles.moreReferral}>Employee ID: {session.user.referralCode}</Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.moreSectionTitle}>Menu</Text>
      <View style={styles.moreMenuList}>
        {menuItems.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.moreMenuItem, pressed && styles.pressed]}
            onPress={() => {
              if (item.key === "logout") {
                onLogout();
                return;
              }
              if (item.key === "update") {
                checkForAppUpdate();
                return;
              }
              onNavigate(item.key);
            }}
          >
            <View style={[styles.moreMenuIcon, item.danger && styles.moreMenuIconDanger]}>
              {item.key === "admin" ? (
                <Image source={logoImage} style={styles.menuLogoImage} resizeMode="contain" />
              ) : (
                <Text style={[styles.moreMenuIconText, item.danger && styles.moreMenuIconTextDanger]}>
                  {item.icon}
                </Text>
              )}
            </View>
            <View style={styles.moreMenuText}>
              <Text style={[styles.moreMenuTitle, item.danger && styles.moreMenuTitleDanger]}>
                {item.title}
              </Text>
              <Text style={styles.moreMenuDescription}>{item.description}</Text>
            </View>
            <Text style={styles.moreArrow}>{">"}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8
  },
  moreContent: {
    padding: 16,
    paddingBottom: 34,
    gap: 16
  },
  moreProfileCard: {
    backgroundColor: colors.brand900,
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 6
  },
  moreAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.white,
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
  moreName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900"
  },
  moreMeta: {
    color: "#d8f3de",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  moreReferral: {
    color: colors.brand100,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6
  },
  moreSectionTitle: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "900"
  },
  moreMenuList: {
    gap: 10
  },
  moreMenuItem: {
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2
  },
  moreMenuIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  menuLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: "hidden"
  },
  moreMenuIconDanger: {
    backgroundColor: "#fff1f0",
    borderColor: "#ffd8d3"
  },
  moreMenuIconText: {
    color: colors.brand700,
    fontSize: 14,
    fontWeight: "900"
  },
  moreMenuIconTextDanger: {
    color: colors.danger
  },
  moreMenuText: {
    flex: 1
  },
  moreMenuTitle: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "900"
  },
  moreMenuTitleDanger: {
    color: colors.danger
  },
  moreMenuDescription: {
    color: colors.slate500,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    fontWeight: "700"
  },
  moreArrow: {
    color: colors.slate500,
    fontSize: 24,
    fontWeight: "900"
  }
});
