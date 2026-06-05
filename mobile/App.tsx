import React, { useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  ScrollView,
  StatusBar as NativeStatusBar,
  BackHandler,
  Modal,
  Text,
  Pressable
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { TabKey, Session, Product, User } from "./src/constants/types";
import { colors } from "./src/constants/theme";
import {
  canAccessTab,
  safeDefaultTab,
  firstTimeGuideKey,
  commonHelpTopics
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
import { CartScreen } from "./src/screens/CartScreen";
import { MyOrdersScreen } from "./src/screens/MyOrdersScreen";

// Import Components
import { Header } from "./src/components/layout/Header";
import { BottomNavigation } from "./src/components/layout/BottomNavigation";
import { AppMenu } from "./src/components/modals/AppMenu";
import { FirstTimeGuideModal } from "./src/components/modals/FirstTimeGuideModal";

import { apiRequest } from "./src/services/api";

function confirmAction(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm }
  ]);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [selectedHelpTopicId, setSelectedHelpTopicId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  // Global Cart State
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);

  function addToCart(product: Product, quantity: number = 1) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  }

  function clearCart() {
    setCart([]);
  }

  // Global search states
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  async function checkAppUpdates() {
    try {
      const result = await apiRequest<{ updateAvailable: boolean; updateMessage: string }>("/auth/app-update-status");
      setUpdateAvailable(result.updateAvailable);
      setUpdateMessage(result.updateMessage);
    } catch {
      // Silent error
    }
  }

  useEffect(() => {
    checkAppUpdates();
    const interval = setInterval(checkAppUpdates, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Persistent Login session restoration
  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = await AsyncStorage.getItem("user_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.token && parsed.user) {
            setSession(parsed);

            // Sync user profile details on launch
            try {
              const res = await apiRequest<{ user: User }>("/users/me", {
                headers: { Authorization: `Bearer ${parsed.token}` }
              });
              if (res && res.user) {
                const updatedSession = { ...parsed, user: res.user };
                setSession(updatedSession);
                await AsyncStorage.setItem("user_session", JSON.stringify(updatedSession));
              }
            } catch (syncErr) {
              console.log("App launch session profile sync failed:", syncErr);
            }
          }
        }
      } catch {
        // Silent fail
      }
    }
    restoreSession();
  }, []);

  async function handleSession(nextSession: Session | null) {
    setSession(nextSession);
    setActiveTab("dashboard");
    if (nextSession) {
      try {
        await AsyncStorage.setItem("user_session", JSON.stringify(nextSession));
      } catch {}
    } else {
      try {
        await AsyncStorage.removeItem("user_session");
      } catch {}
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    setSession(null);
    try {
      await AsyncStorage.removeItem("user_session");
    } catch {}
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

  function navigate(tab: TabKey, params?: { helpTopicId?: string }) {
    setActiveTab(safeDefaultTab(session?.user.role ?? "CUSTOMER", tab));
    if (params?.helpTopicId) {
      setSelectedHelpTopicId(params.helpTopicId);
    } else {
      setSelectedHelpTopicId(null);
    }
  }

  useEffect(() => {
    if (session && !canAccessTab(session.user.role, activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, session?.user.role]);

  useEffect(() => {
    const handleBackPress = () => {
      if (!session) {
        return false;
      }
      if (activeTab !== "dashboard") {
        navigate("dashboard");
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => {
      subscription.remove();
    };
  }, [session, activeTab]);

  // Global Search fuzzy matching engine
  const searchResults = useMemo(() => {
    const term = globalSearchQuery.trim().toLowerCase();
    if (!term) return [];

    const navs = [
      { title: "Home / Dashboard", subtitle: "Go to your home screen", icon: "🏠", keywords: ["home", "dashboard", "main", "welcome"], tab: "dashboard" as TabKey },
      { title: "Ayurvedic Products Catalog", subtitle: "View natural formulations and place orders", icon: "🌱", keywords: ["product", "catalog", "order", "buy", "gastric", "allergy", "powder", "cream", "checkout"], tab: "products" as TabKey },
      { title: "Payments / UPI deep link", subtitle: "Manage your payment handovers and enter UTR reference ID", icon: "💳", keywords: ["payment", "pay", "upi", "handover", "utr", "txn", "reference", "checkout"], tab: "payments" as TabKey },
      { title: "Profile / Employee ID", subtitle: "View your user role, status and upgrade application", icon: "👤", keywords: ["profile", "account", "sponsor", "upgrade", "become partner", "aadhaar", "details", "employee id"], tab: "profile" as TabKey },
      { title: "Help & Support Center", subtitle: "Step-by-step guides, FAQs, and support email", icon: "❓", keywords: ["help", "support", "faq", "guide", "tutorial", "contact", "email"], tab: "help" as TabKey },
      { title: "Security Settings", subtitle: "Change your login password securely", icon: "🔒", keywords: ["security", "password", "lock", "change password"], tab: "security" as TabKey }
    ];

    if (session?.user.role !== "CUSTOMER") {
      navs.push(
        { title: "Network List", subtitle: "Manage and onboard representatives", icon: "👥", keywords: ["network", "members", "agent", "onboard", "add customer", "add representative"], tab: "network" as TabKey },
        { title: "Genealogy Structure Tree", subtitle: "Open your business network hierarchy view", icon: "🌿", keywords: ["tree", "structure", "genealogy", "downline structure", "representative structure"], tab: "tree" as TabKey },
        { title: "Commissions & Earnings", subtitle: "Check commission rates and matrix targets progress", icon: "💰", keywords: ["commission", "earnings", "ledger", "passive", "matrix"], tab: "commissions" as TabKey }
      );
    }

    if (session?.user.role === "ADMIN") {
      navs.push(
        { title: "Company Admin Console", subtitle: "System monitor, applications, order approvals & stock control", icon: "🛠️", keywords: ["admin", "company", "applications", "adjust stock", "audit", "system"], tab: "admin" as TabKey }
      );
    }

    const matchingNavs = navs.filter(nav =>
      nav.title.toLowerCase().includes(term) ||
      nav.keywords.some(kw => kw.toLowerCase().includes(term))
    );

    const matchingGuides = commonHelpTopics
      .filter(guide =>
        guide.title.toLowerCase().includes(term) ||
        guide.keywords.some(kw => kw.toLowerCase().includes(term)) ||
        guide.text.toLowerCase().includes(term)
      )
      .map(guide => ({
        title: guide.title,
        subtitle: `Guide: ${guide.text.slice(0, 60)}...`,
        icon: "💡",
        tab: "help" as TabKey
      }));

    return [...matchingNavs, ...matchingGuides];
  }, [globalSearchQuery, session?.user.role]);

  if (!session) {
    return <LoginScreen onLogin={handleSession} />;
  }

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar style="dark" />
      <Header
        onMenuPress={() => setMenuOpen((open) => !open)}
        onSearchPress={() => setSearchModalVisible(true)}
        onCartPress={() => navigate("cart")}
        onLogout={() => {
          confirmAction("Logout", "Do you want to logout from this session?", handleLogout);
        }}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
      />
      <View style={styles.screen}>
        {activeTab === "dashboard" && <DashboardScreen session={session} onNavigate={navigate} />}
        {activeTab === "products" && <ProductsScreen session={session} onNavigate={navigate} addToCart={addToCart} />}
        {activeTab === "cart" && (
          <CartScreen
            session={session}
            cart={cart}
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            onNavigate={navigate}
          />
        )}
        {activeTab === "my-orders" && <MyOrdersScreen session={session} />}
        {activeTab === "network" && <NetworkScreen session={session} />}
        {activeTab === "more" && (
          <MoreScreen
            session={session}
            onNavigate={navigate}
            onLogout={() => {
              confirmAction("Logout", "Do you want to logout from this session?", handleLogout);
            }}
          />
        )}
        {activeTab === "admin" && <AdminScreen session={session} onSessionUpdate={setSession} />}
        {activeTab === "tree" && <MlmTreeScreen session={session} />}
        {activeTab === "commissions" && <CommissionsScreen session={session} />}
        {activeTab === "payments" && <PaymentsScreen session={session} />}
        {activeTab === "profile" && <ProfileScreen session={session} onSessionUpdate={setSession} />}
        {activeTab === "security" && <SecurityScreen session={session} onSessionUpdate={setSession} />}
        {activeTab === "help" && (
          <HelpScreen
            session={session}
            onNavigate={navigate}
            onShowGuide={openGuideAgain}
            onOpenSearch={() => setSearchModalVisible(true)}
            initialTopicId={selectedHelpTopicId}
            onClearInitialTopicId={() => setSelectedHelpTopicId(null)}
          />
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

      <FirstTimeGuideModal
        visible={showGuide}
        role={session.user.role}
        onClose={closeGuide}
      />

      {/* Global Search Modal */}
      <Modal visible={searchModalVisible} animationType="slide" transparent={false} onRequestClose={() => setSearchModalVisible(false)}>
        <SafeAreaView style={styles.searchModalRoot}>
          <View style={styles.searchModalHeader}>
            <TextInput
              style={styles.searchModalInput}
              placeholder="Search for products, help, payments, profile..."
              placeholderTextColor={colors.slate500}
              value={globalSearchQuery}
              onChangeText={setGlobalSearchQuery}
              autoFocus
            />
            <Pressable style={styles.searchCloseButton} onPress={() => { setSearchModalVisible(false); setGlobalSearchQuery(""); }}>
              <Text style={styles.searchCloseText}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.searchResultsContainer} keyboardShouldPersistTaps="handled">
            {searchResults.length === 0 ? (
              <View style={styles.searchEmptyState}>
                <Text style={styles.searchEmptyText}>
                  {globalSearchQuery ? "No results found." : "Type keywords to search throughout the app."}
                </Text>
              </View>
            ) : (
              searchResults.map((result, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.searchResultRow, pressed && styles.pressed]}
                  onPress={() => {
                    setSearchModalVisible(false);
                    setGlobalSearchQuery("");
                    navigate(result.tab);
                  }}
                >
                  <View style={styles.searchResultIconBox}>
                    <Text style={styles.searchResultIcon}>{result.icon || "🧭"}</Text>
                  </View>
                  <View style={styles.searchResultTextBox}>
                    <Text style={styles.searchResultTitle}>{result.title}</Text>
                    <Text style={styles.searchResultSubtitle}>{result.subtitle}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      <Modal visible={updateAvailable} transparent={true} animationType="slide" onRequestClose={() => {}}>
        <View style={styles.updateOverlay}>
          <View style={styles.updateCard}>
            <View style={styles.updateIconContainer}>
              <Text style={styles.updateIconText}>📢</Text>
            </View>
            <Text style={styles.updateTitle}>New Update Available!</Text>
            <Text style={styles.updateText}>{updateMessage || "Please download the fresh updated version to continue."}</Text>
            <Text style={styles.updateSubtext}>Please close the application and download the fresh updated version to get access to all new features and security patches.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#f7fbf6",
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight && NativeStatusBar.currentHeight > 0 ? NativeStatusBar.currentHeight : 32) : 0,
    paddingBottom: Platform.OS === "ios" ? 20 : 0
  },
  screen: {
    flex: 1
  },
  pressed: {
    opacity: 0.8
  },
  updateOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 51, 20, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  updateCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  updateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  updateIconText: {
    fontSize: 32
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 10,
    textAlign: "center"
  },
  updateText: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12
  },
  updateSubtext: {
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 16,
    textAlign: "center"
  },
  searchModalRoot: {
    flex: 1,
    backgroundColor: colors.slate50,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 36 : 10
  },
  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  searchModalInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900
  },
  searchCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  searchCloseText: {
    color: colors.brand700,
    fontSize: 15,
    fontWeight: "900"
  },
  searchResultsContainer: {
    paddingBottom: 40
  },
  searchEmptyState: {
    paddingVertical: 40,
    alignItems: "center"
  },
  searchEmptyText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7eee7",
    marginBottom: 10,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1
  },
  searchResultIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center"
  },
  searchResultIcon: {
    fontSize: 18
  },
  searchResultTextBox: {
    flex: 1
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.slate900
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: "700"
  }
});
