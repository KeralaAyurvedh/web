import React from "react";
import { View, StyleSheet, Pressable, Image, Text, Modal } from "react-native";
import { colors } from "../../constants/theme";
import { Role, TabKey } from "../../constants/types";

const logoImage = require("../../../assets/logo.png");

export function AppMenu({
  activeTab,
  role,
  visible,
  onClose,
  onChange
}: {
  activeTab: TabKey;
  role: Role;
  visible: boolean;
  onClose: () => void;
  onChange: (tab: TabKey) => void;
}) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "dashboard", label: "Home" },
    ...(role === "ADMIN" ? [{ key: "admin" as TabKey, label: "Company Admin" }] : []),
    { key: "products", label: "Products" },
    { key: "cart" as TabKey, label: "Shopping Cart" },
    { key: "my-orders" as TabKey, label: "My Orders" },
    ...(role !== "CUSTOMER" ? [
      { key: "network" as TabKey, label: "Network" },
      { key: "tree" as TabKey, label: "Structure" },
      { key: "commissions" as TabKey, label: "Earnings" }
    ] : []),
    { key: "payments", label: "Payments" },
    { key: "profile", label: "Profile" },
    { key: "security", label: "Security" },
    { key: "help", label: "Help" }
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.drawerLayer}>
        <View style={styles.drawerScrim}>
          <Pressable style={styles.drawerDismissArea} onPress={onClose} />
        </View>
        <View style={styles.drawerPanel}>
          <View style={styles.drawerHeader}>
            <Image source={logoImage} style={styles.drawerLogo} resizeMode="contain" />
            <Pressable style={styles.drawerCloseButton} onPress={onClose}>
              <Text style={styles.drawerCloseText}>X</Text>
            </Pressable>
          </View>
          <Text style={styles.drawerTitle}>Kerala Ayurvedh</Text>
          <Text style={styles.drawerSubtitle}>{role === "CUSTOMER" ? "Customer menu" : "Business menu"}</Text>
          <View style={styles.drawerMenuList}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => onChange(tab.key)}
                style={[styles.menuItem, activeTab === tab.key && styles.menuItemActive]}
              >
                <Text style={[styles.menuItemText, activeTab === tab.key && styles.menuItemTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.42)"
  },
  drawerDismissArea: {
    flex: 1
  },
  drawerPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 292,
    backgroundColor: colors.white,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    paddingTop: 22,
    paddingHorizontal: 18,
    shadowColor: colors.slate900,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  drawerLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: "hidden"
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate50
  },
  drawerCloseText: {
    color: colors.slate700,
    fontSize: 14,
    fontWeight: "900"
  },
  drawerTitle: {
    color: colors.slate900,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 18
  },
  drawerSubtitle: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  drawerMenuList: {
    marginTop: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: "hidden"
  },
  menuItem: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    justifyContent: "center"
  },
  menuItemActive: {
    backgroundColor: colors.brand50,
    borderLeftWidth: 5,
    borderLeftColor: colors.brand600
  },
  menuItemText: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "800"
  },
  menuItemTextActive: {
    color: colors.brand700
  }
});
