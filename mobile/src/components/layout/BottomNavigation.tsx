import React from "react";
import { View, StyleSheet, Pressable, Text, Platform } from "react-native";
import { colors } from "../../constants/theme";
import { Role, TabKey } from "../../constants/types";
import { visiblePrimaryTabs } from "../../constants/guides";

export function BottomNavigation({
  role,
  activeTab,
  onChange
}: {
  role: Role;
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const primaryTabs = visiblePrimaryTabs(role);
  const directTabKeys = primaryTabs.filter((tab) => tab.key !== "more").map((tab) => tab.key);
  const activePrimaryTab = directTabKeys.includes(activeTab) ? activeTab : "more";

  return (
    <View style={styles.bottomNavShell}>
      <View style={styles.bottomNav}>
        {primaryTabs.map((tab) => {
          const active = activePrimaryTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [styles.bottomNavItem, active && styles.bottomNavItemActive, pressed && styles.pressed]}
              onPress={() => onChange(tab.key)}
            >
              <View style={[styles.bottomNavIcon, active && styles.bottomNavIconActive]}>
                <Text style={[styles.bottomNavIconText, active && styles.bottomNavIconTextActive]}>{tab.icon}</Text>
              </View>
              <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8
  },
  bottomNavShell: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#e7eee7",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 56,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 14
  },
  bottomNav: {
    minHeight: 64,
    borderRadius: 24,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  bottomNavItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  bottomNavItemActive: {
    backgroundColor: colors.brand50
  },
  bottomNavIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center"
  },
  bottomNavIconActive: {
    backgroundColor: colors.brand700
  },
  bottomNavIconText: {
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "900"
  },
  bottomNavIconTextActive: {
    color: colors.white
  },
  bottomNavLabel: {
    color: colors.slate500,
    fontSize: 11,
    fontWeight: "900"
  },
  bottomNavLabelActive: {
    color: colors.brand700
  }
});
