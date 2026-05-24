import React, { useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Pressable,
  Image,
  Text,
  Modal,
  Platform,
  Alert,
  StatusBar as NativeStatusBar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Role, TabKey, Session } from "./src/constants/types";
import { colors } from "./src/constants/theme";
import {
  canAccessTab,
  safeDefaultTab,
  visiblePrimaryTabs,
  buildFirstTimeGuideSteps,
  firstTimeGuideKey
} from "./src/constants/guides";

// Import Screens
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ProductsScreen } from "./src/screens/ProductsScreen";
import { NetworkScreen } from "./src/screens/NetworkScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { MlmTreeScreen } from "./src/screens/MlmTreeScreen";
import { CommissionsScreen } from "./src/screens/CommissionsScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SecurityScreen } from "./src/screens/SecurityScreen";
import { HelpScreen } from "./src/screens/HelpScreen";

const logoImage = require("./assets/logo.png");

function confirmAction(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm }
  ]);
}

function Header({
  onMenuPress,
  onSearchPress,
  onCartPress,
  onLogout
}: {
  onMenuPress: () => void;
  onSearchPress: () => void;
  onCartPress: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerIconButton} onPress={onMenuPress}>
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>
      <View style={styles.headerBrand}>
        <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
        <View>
          <Text style={styles.headerBrandName}>Kerala</Text>
          <Text style={styles.headerBrandSubName}>Ayurvedh</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={styles.headerCircleButton} onPress={onSearchPress}>
          <View style={styles.headerSearchCircle} />
          <View style={styles.headerSearchHandle} />
        </Pressable>
        <Pressable style={styles.headerCircleButton} onPress={onCartPress}>
          <View style={styles.cartBasket} />
          <View style={styles.cartHandle} />
        </Pressable>
        <Pressable style={styles.profileIconButton} onPress={onLogout}>
          <View style={styles.profileHead} />
          <View style={styles.profileBody} />
        </Pressable>
      </View>
    </View>
  );
}

function AppMenu({
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
    ...(role !== "CUSTOMER" ? [
      { key: "network" as TabKey, label: "Network" },
      { key: "tree" as TabKey, label: "Downline" },
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

function BottomNavigation({
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

function FirstTimeGuideModal({
  visible,
  role,
  onClose
}: {
  visible: boolean;
  role: Role;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => buildFirstTimeGuideSteps(role), [role]);
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.guideLayer}>
        <View style={styles.guideCard}>
          <View style={styles.guideTopRow}>
            <Text style={styles.guideSmallText}>Kerala Ayurvedh</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.guideSkipText}>Skip</Text>
            </Pressable>
          </View>
          <View style={styles.guideIcon}>
            <Text style={styles.guideIconText}>{step.icon}</Text>
          </View>
          <Text style={styles.guideTitle}>{step.title}</Text>
          <Text style={styles.guideText}>{step.text}</Text>
          <View style={styles.guideDots}>
            {steps.map((_, dotIndex) => (
              <View key={dotIndex} style={[styles.guideDot, dotIndex === index && styles.guideDotActive]} />
            ))}
          </View>
          <View style={styles.guideActions}>
            <Pressable
              style={[styles.guideSecondaryButton, index === 0 && styles.primaryButtonDisabled]}
              disabled={index === 0}
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <Text style={styles.guideSecondaryText}>Back</Text>
            </Pressable>
            <Pressable
              style={styles.guidePrimaryButton}
              onPress={() => {
                if (isLast) {
                  onClose();
                  return;
                }
                setIndex((current) => Math.min(steps.length - 1, current + 1));
              }}
            >
              <Text style={styles.guidePrimaryText}>{isLast ? "Finish" : "Next"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function handleSession(nextSession: Session) {
    setSession(nextSession);
    setActiveTab("dashboard");
    try {
      const seen = await AsyncStorage.getItem(firstTimeGuideKey(nextSession.user.id));
      setShowGuide(seen !== "true");
    } catch {
      setShowGuide(true);
    }
  }

  async function closeGuide() {
    if (session) {
      await AsyncStorage.setItem(firstTimeGuideKey(session.user.id), "true").catch(() => undefined);
    }
    setShowGuide(false);
  }

  function openGuideAgain() {
    setShowGuide(true);
  }

  function navigate(tab: TabKey) {
    setActiveTab(safeDefaultTab(session?.user.role ?? "CUSTOMER", tab));
  }

  useEffect(() => {
    if (session && !canAccessTab(session.user.role, activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, session?.user.role]);

  if (!session) {
    return <LoginScreen onLogin={handleSession} />;
  }

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar style="dark" />
      <Header
        onMenuPress={() => setMenuOpen((open) => !open)}
        onSearchPress={() => navigate("dashboard")}
        onCartPress={() => navigate("products")}
        onLogout={() => {
          confirmAction("Logout", "Do you want to logout from this session?", () => {
            setMenuOpen(false);
            setSession(null);
          });
        }}
      />
      <View style={styles.screen}>
        {activeTab === "dashboard" && <DashboardScreen session={session} onNavigate={navigate} />}
        {activeTab === "products" && <ProductsScreen session={session} />}
        {activeTab === "network" && <NetworkScreen session={session} />}
        {activeTab === "more" && (
          <MoreScreen
            session={session}
            onNavigate={navigate}
            onLogout={() => {
              confirmAction("Logout", "Do you want to logout from this session?", () => {
                setMenuOpen(false);
                setSession(null);
              });
            }}
          />
        )}
        {activeTab === "admin" && <AdminScreen session={session} onSessionUpdate={setSession} />}
        {activeTab === "tree" && <MlmTreeScreen session={session} />}
        {activeTab === "commissions" && <CommissionsScreen session={session} />}
        {activeTab === "payments" && <PaymentsScreen session={session} />}
        {activeTab === "profile" && <ProfileScreen session={session} />}
        {activeTab === "security" && <SecurityScreen session={session} onSessionUpdate={setSession} />}
        {activeTab === "help" && (
          <HelpScreen session={session} onNavigate={navigate} onShowGuide={openGuideAgain} />
        )}
      </View>
      <BottomNavigation role={session.user.role} activeTab={activeTab} onChange={navigate} />
      <AppMenu
        activeTab={activeTab}
        role={session.user.role}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onChange={(tab) => {
          navigate(tab);
          setMenuOpen(false);
        }}
      />
      <FirstTimeGuideModal visible={showGuide} role={session.user.role} onClose={closeGuide} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#f7fbf6",
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight && NativeStatusBar.currentHeight > 0 ? NativeStatusBar.currentHeight : 32) : 0
  },
  screen: {
    flex: 1
  },
  pressed: {
    opacity: 0.8
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "#e9efe8",
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  menuLine: {
    width: 17,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.brand800
  },
  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 8
  },
  headerLogo: {
    width: 42,
    height: 42
  },
  headerBrandName: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18
  },
  headerBrandSubName: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  headerCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center"
  },
  headerSearchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.brand800,
    transform: [{ translateX: -2 }, { translateY: -2 }]
  },
  headerSearchHandle: {
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.brand800,
    transform: [{ rotate: "45deg" }, { translateX: 5 }, { translateY: -1 }]
  },
  cartBasket: {
    width: 17,
    height: 13,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.brand800,
    transform: [{ translateY: 3 }]
  },
  cartHandle: {
    width: 13,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.brand800,
    transform: [{ translateY: -10 }]
  },
  profileIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand700,
    alignItems: "center",
    justifyContent: "center"
  },
  profileHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
    marginBottom: 2
  },
  profileBody: {
    width: 22,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.white
  },
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
  },
  bottomNavShell: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#e7eee7",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
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
  },
  guideLayer: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  guideCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 30,
    backgroundColor: colors.white,
    padding: 20,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  guideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  guideSmallText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  guideSkipText: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: "900"
  },
  guideIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: colors.brand800,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 24
  },
  guideIconText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900"
  },
  guideTitle: {
    color: colors.slate900,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 20
  },
  guideText: {
    color: colors.slate700,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10
  },
  guideDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22
  },
  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate200
  },
  guideDotActive: {
    width: 22,
    backgroundColor: colors.brand700
  },
  guideActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24
  },
  guideSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center"
  },
  guideSecondaryText: {
    color: colors.slate700,
    fontWeight: "900"
  },
  guidePrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand700,
    alignItems: "center",
    justifyContent: "center"
  },
  guidePrimaryText: {
    color: colors.white,
    fontWeight: "900"
  },
  primaryButtonDisabled: {
    backgroundColor: colors.slate200
  }
});
