import React, { useState, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  StyleSheet,
  Modal
} from "react-native";
import {
  Session,
  Product,
  Matrix,
  RoleDashboardStats,
  Role,
  TabKey,
  CountAmountRow
} from "../constants/types";
import { apiRequest, formatMoney, mediaUrl, formatRole } from "../services/api";
import { colors } from "../constants/theme";
import {
  defaultCategories,
  catalogCategories,
  trustCards,
  wellnessHighlights,
  customerReviews,
  commonHelpTopics
} from "../constants/guides";
import { SectionHeader, Input, TextArea, OptionList, PrimaryButton } from "../components/UI/FormControls";

const logoImage = require("../../assets/logo.png");
const placeholderImage = require("../../assets/placeholder.png");
const bannerImages = [
  require("../../assets/banner1.jpeg"),
  require("../../assets/banner2.jpeg"),
  require("../../assets/banner3.png")
];

export function DashboardScreen({ session, onNavigate }: { session: Session; onNavigate: (tab: TabKey, params?: { helpTopicId?: string }) => void }) {
  const name = session.user.name?.trim();
  const firstName = name ? name.split(" ")[0] : "User";
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [roleDashboard, setRoleDashboard] = useState<RoleDashboardStats | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [productError, setProductError] = useState("");
  const { width } = useWindowDimensions();
  const useTwoColumns = width >= 380;

  const liveSearchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const results: Array<{
      type: "product" | "help" | "page";
      icon: string;
      title: string;
      category: string;
      product?: Product;
      tab?: TabKey;
      helpTopicId?: string;
    }> = [];

    // 1. Products
    products.forEach((product) => {
      if (
        product.name.toLowerCase().includes(term) ||
        (product.description && product.description.toLowerCase().includes(term)) ||
        (product.shortDescription && product.shortDescription.toLowerCase().includes(term))
      ) {
        results.push({
          type: "product",
          icon: "🛒",
          title: product.name,
          category: `Product - ${product.category || "General"}`,
          product
        });
      }
    });

    // 2. Help Topics
    commonHelpTopics.forEach((topic) => {
      if (
        topic.title.toLowerCase().includes(term) ||
        topic.text.toLowerCase().includes(term) ||
        topic.keywords.some((kw) => kw.toLowerCase().includes(term))
      ) {
        results.push({
          type: "help",
          icon: "💡",
          title: topic.title,
          category: "Help Topic",
          helpTopicId: topic.id
        });
      }
    });

    // 3. Payments
    if ("payments".includes(term) || "pay".includes(term) || "handover".includes(term)) {
      results.push({
        type: "page",
        icon: "💳",
        title: "Payments",
        category: "Page",
        tab: "payments"
      });
    }

    // 4. Profile
    if ("profile".includes(term) || "account".includes(term) || "employee".includes(term)) {
      const isCustomer = session.user.role === "CUSTOMER";
      const isProfileUnlocked = !isCustomer || session.user.profileUnlocked;
      if (isProfileUnlocked) {
        results.push({
          type: "page",
          icon: "👤",
          title: "Profile",
          category: "Page",
          tab: "profile"
        });
      }
    }

    // 5. My Orders
    if ("orders".includes(term) || "my orders".includes(term) || "order".includes(term) || "status".includes(term) || "history".includes(term)) {
      results.push({
        type: "page",
        icon: "📦",
        title: "My Orders",
        category: "Page",
        tab: "my-orders"
      });
    }

    return results;
  }, [search, products, commonHelpTopics, session.user.role, session.user.profileUnlocked]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = selectedCategory === "All" || product.category === selectedCategory;
      const textMatches = !term || `${product.name} ${product.category} ${product.description} ${product.shortDescription}`.toLowerCase().includes(term);
      return categoryMatches && textMatches;
    });
  }, [products, search, selectedCategory]);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setProductError("");
      const result = await apiRequest<{ products: Product[] }>("/products", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setProducts(result.products);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Could not load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadMatrices() {
    try {
      setLoadingMatrix(true);
      const result = await apiRequest<{ matrices: Matrix[] }>("/matrix", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setMatrices(result.matrices);
    } catch (error) {
      Alert.alert("Matrix", error instanceof Error ? error.message : "Could not load matrix");
    } finally {
      setLoadingMatrix(false);
    }
  }

  async function loadRoleDashboard() {
    try {
      setLoadingDashboard(true);
      const result = await apiRequest<{ dashboard: RoleDashboardStats }>("/users/me/dashboard", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setRoleDashboard(result.dashboard);
    } catch {
      setRoleDashboard(null);
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    loadProducts();
    loadRoleDashboard();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.homeContent}>
      <View style={styles.announcementStrip}>
        <Text style={styles.announcementText}>Authentic Ayurvedh Wellness Products</Text>
      </View>

      <View style={styles.homeWelcome}>
        <View>
          <Text style={styles.homeGreeting}>Hi, {firstName}</Text>
          <Text style={styles.homeMeta}>Welcome back to Kerala Ayurvedh</Text>
        </View>
        {session.user.role === "ADMIN" && (
          <View style={styles.homeRoleBadge}>
            <Text style={styles.homeRoleBadgeText}>{formatRole(session.user.role)}</Text>
          </View>
        )}
      </View>

      <RoleDashboardSummary role={session.user.role} stats={roleDashboard} loading={loadingDashboard} onNavigate={onNavigate} />

      <View style={{ position: "relative", zIndex: 999 }}>
        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search wellness products, pages, help..."
            placeholderTextColor={colors.slate500}
            style={styles.searchInput}
          />
          <Text style={{ fontSize: 16, color: colors.slate500 }}>🔍</Text>
        </View>
        {search.trim().length > 0 && (
          <View style={styles.searchResultsContainer}>
            <ScrollView style={{ maxHeight: 250 }} keyboardShouldPersistTaps="handled">
              {liveSearchResults.length === 0 ? (
                <View style={styles.searchResultItem}>
                  <Text style={styles.searchResultTextEmpty}>No matches found</Text>
                </View>
              ) : (
                liveSearchResults.map((item, index) => (
                  <Pressable
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearch("");
                      if (item.type === "product" && item.product) {
                        setSelectedProduct(item.product);
                      } else if (item.type === "page" && item.tab) {
                        onNavigate(item.tab);
                      } else if (item.type === "help" && item.helpTopicId) {
                        onNavigate("help", { helpTopicId: item.helpTopicId });
                      }
                    }}
                  >
                    <Text style={styles.searchResultIcon}>{item.icon}</Text>
                    <View style={styles.searchResultTextContainer}>
                      <Text style={styles.searchResultTitle}>{item.title}</Text>
                      <Text style={styles.searchResultSubtitle}>{item.category}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      <BrandIntro />

      <CategoryRail
        categories={catalogCategories(products)}
        selectedCategory={selectedCategory}
        onSelect={(category) => {
          setSelectedCategory(category);
          setSelectedProduct(null);
        }}
      />

      <SectionHeader title="Featured Products" action={loadingProducts ? "Loading" : "Refresh"} onAction={loadProducts} />
      {selectedProduct ? (
        <ProductDetailCard
          product={selectedProduct}
          session={session}
          onNavigate={onNavigate}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
      {productError ? <ErrorState message={productError} onRetry={loadProducts} /> : null}
      {loadingProducts && products.length === 0 ? (
        <ProductLoadingGrid />
      ) : visibleProducts.length === 0 && !loadingProducts ? (
        <PremiumProductEmptyState isAdmin={session.user.role === "ADMIN"} onAddProduct={() => onNavigate("products")} />
      ) : (
        <View style={[styles.homeProductGrid, !useTwoColumns && styles.homeProductGridSingle]}>
          {visibleProducts.map((product) => (
            <HomeProductCard key={product.id} product={product} onView={() => setSelectedProduct(product)} />
          ))}
        </View>
      )}

      <TrustPrinciples />
      <WellnessHighlight />
      <CustomerReviews />

      <BusinessQuickLinks session={session} onNavigate={onNavigate} />

      {(session.user.role === "ADMIN" || session.user.role === "MANAGER" || session.user.role === "BETA_MANAGER") && (
        <View style={styles.homeBusinessCard}>
          <SectionHeader title="Beta matrix progress" action="Refresh" onAction={loadMatrices} />
          {loadingMatrix && <ActivityIndicator color={colors.brand600} />}
          {matrices.length === 0 && !loadingMatrix ? (
            <Text style={styles.mutedText}>No Beta Matrix found for this account yet.</Text>
          ) : (
            matrices.map((matrix) => (
              <View key={matrix.id} style={styles.matrixBox}>
                <Text style={styles.listTitle}>{matrix.betaManager?.name ?? "Beta Manager"}</Text>
                <Text style={styles.listSubtitle}>
                  {matrix.confirmedCustomers} / {matrix.requiredCustomers} confirmed customers
                </Text>
                <Text style={styles.productPrice}>Completion: {formatMoney(matrix.completionAmount)}</Text>
                <Text style={styles.listRight}>{matrix.status}</Text>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.homeFooter}>
        <Text style={styles.footerSupport}>Support: support@keralaayurvedh.com</Text>
        <Text style={styles.footerText}>Kerala Ayurvedh mobile app v0.1</Text>
        <Text style={styles.footerText}>Copyright Kerala Ayurvedh. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

function RoleDashboardSummary({ role, stats, loading, onNavigate }: { role: Role; stats: RoleDashboardStats | null; loading: boolean; onNavigate: (tab: TabKey) => void }) {
  const liveMetrics = (fallback: Array<{ label: string; value: string }>) => {
    if (!stats) return fallback;

    if (role === "ADMIN") {
      return [
        { label: "Orders", value: String(stats.orders) },
        { label: "Payments", value: String(stats.pendingHandovers) },
        { label: "Commission", value: formatMoney(stats.approvedCommissionTotal) }
      ];
    }

    if (role === "MANAGER" || role === "BETA_MANAGER") {
      return [
        { label: "Team", value: String(stats.activeDirectDownline) },
        { label: "Matrix", value: stats.matrix ? `${stats.matrix.confirmedCustomers}/${stats.matrix.requiredCustomers}` : "Not started" },
        { label: "Earnings", value: formatMoney(stats.approvedCommissionTotal) }
      ];
    }

    if (role === "LEVEL_1" || role === "LEVEL_2") {
      return [
        { label: "Team", value: String(stats.activeDirectDownline) },
        { label: "Payments", value: String(stats.pendingHandovers) },
        { label: "Earnings", value: formatMoney(stats.approvedCommissionTotal) }
      ];
    }

    return [
      { label: "Orders", value: String(stats.orders) },
      { label: "Pending", value: String(stats.pendingOrders) },
      { label: "Payments", value: String(stats.pendingHandovers) }
    ];
  };

  const content: Record<Role, { title: string; text: string; metrics: Array<{ label: string; value: string }>; actions: Array<{ label: string; tab: TabKey }> }> = {
    ADMIN: {
      title: "Company control center",
      text: "Review applications, payments, stock, commissions and system health.",
      metrics: [
        { label: "Users", value: "Manage" },
        { label: "Payments", value: "Verify" },
        { label: "Reports", value: "Review" }
      ],
      actions: [
        { label: "Open Admin", tab: "admin" },
        { label: "Shop Products", tab: "products" },
        { label: "Payments", tab: "payments" }
      ]
    },
    MANAGER: {
      title: "Manager dashboard",
      text: "Add Representative applications, track your network and complete 216 confirmed customers to unlock Beta Manager.",
      metrics: [
        { label: "Next", value: "Representative" },
        { label: "Target", value: "216" },
        { label: "Earnings", value: "Track" }
      ],
      actions: [
        { label: "Shop Products", tab: "products" },
        { label: "Add Representative", tab: "network" },
        { label: "Structure", tab: "tree" }
      ]
    },
    BETA_MANAGER: {
      title: "Beta Manager dashboard",
      text: "Build your matrix through Representative members. Track confirmed customer progress.",
      metrics: [
        { label: "Representatives", value: "Recruit" },
        { label: "Target", value: "216" },
        { label: "Payout", value: "108K" }
      ],
      actions: [
        { label: "Shop Products", tab: "products" },
        { label: "Add Representative", tab: "network" },
        { label: "Structure", tab: "tree" }
      ]
    },
    LEVEL_1: {
      title: "Representative Advisor dashboard",
      text: "Expand your advisory team by recruiting Representative agents and coordinating manual payments.",
      metrics: [
        { label: "Recruit", value: "Direct" },
        { label: "Handovers", value: "Process" },
        { label: "Passives", value: "500" }
      ],
      actions: [
        { label: "Shop Products", tab: "products" },
        { label: "Add Agent", tab: "network" },
        { label: "Structure", tab: "tree" }
      ]
    },
    LEVEL_2: {
      title: "Representative",
      text: "Onboard new Customers, record product orders, collect cash/UPI, and submit handovers.",
      metrics: [
        { label: "Customers", value: "Sell" },
        { label: "Direct", value: "1000" },
        { label: "Handovers", value: "Send" }
      ],
      actions: [
        { label: "Shop Products", tab: "products" },
        { label: "Onboard Cust", tab: "network" },
        { label: "Payments", tab: "payments" }
      ]
    },
    CUSTOMER: {
      title: "Wellness journey dashboard",
      text: "Browse authentic weight management powders, place wellness orders, and check your status.",
      metrics: [
        { label: "Products", value: "View" },
        { label: "Orders", value: "Track" },
        { label: "UPI/Cash", value: "Pay" }
      ],
      actions: [
        { label: "Shop Products", tab: "products" },
        { label: "Payments", tab: "payments" },
        { label: "Support FAQ", tab: "help" }
      ]
    }
  };

  const current = content[role];
  const metricsToShow = liveMetrics(current.metrics);

  return (
    <View style={styles.summaryBox}>
      {loading ? (
        <ActivityIndicator color={colors.brand600} style={styles.summaryLoading} />
      ) : (
        <>
          <Text style={styles.summaryTitle}>{current.title}</Text>
          <Text style={styles.summaryText}>{current.text}</Text>
          <View style={styles.metricsGrid}>
            {metricsToShow.map((m, idx) => (
              <View key={idx} style={styles.metricItem}>
                <Text style={styles.metricVal}>{m.value}</Text>
                <Text style={styles.metricLbl}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryActions}>
            {current.actions.map((act) => (
              <Pressable key={act.label} style={styles.summaryButton} onPress={() => onNavigate(act.tab)}>
                <Text style={styles.summaryButtonText}>{act.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function PromoSlideshow() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % bannerImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.sliderWrap}>
      <Image source={bannerImages[slide]} style={styles.sliderImage as any} resizeMode="cover" />
      <View style={styles.sliderOverlay}>
        <Text style={styles.sliderBadge}>SEASONAL OFFER</Text>
        <Text style={styles.sliderTitle}>Natural Weight Management Support</Text>
        <Text style={styles.sliderSubtitle}>Discover authentic, daily Ayurvedic formulations</Text>
        <View style={styles.sliderDots}>
          {bannerImages.map((_, idx) => (
            <View key={idx} style={[styles.sliderDot, slide === idx && styles.sliderDotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function BrandIntro() {
  return (
    <View style={styles.brandIntro}>
      <Text style={styles.brandIntroTitle}>Why Choose Kerala Ayurvedh?</Text>
      <Text style={styles.brandIntroText}>
        We craft our weight loss powders and wellness supplements using traditional methodology combined with modern quality checks. Each product is formulated to support natural vitality, daily balance, and holistic wellness routines.
      </Text>
    </View>
  );
}

function HomeProductCard({ product, onView }: { product: Product; onView: () => void }) {
  const [imageError, setImageError] = useState(false);
  const imageUri = mediaUrl(product.imageUrl);

  return (
    <Pressable style={styles.homeProductCard} onPress={onView}>
      <View style={styles.homeProductImageWrap}>
        {product.imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.homeProductImage as any}
            onError={(e) => {
              console.log("Home featured product image failed to load:", imageUri, e.nativeEvent.error);
              setImageError(true);
            }}
          />
        ) : (
          <Image source={placeholderImage} style={styles.homeProductFallbackImage as any} resizeMode="contain" />
        )}
      </View>
      <View style={styles.homeProductInfo}>
        <Text style={styles.homeProductName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.homeProductCategory}>{product.category}</Text>
        <Text style={styles.homeProductPrice}>{formatMoney(product.price)}</Text>
        <Text style={styles.homeProductStatus}>{product.availability.replaceAll("_", " ")}</Text>
      </View>
    </Pressable>
  );
}

function ProductLoadingGrid() {
  return (
    <View style={styles.loadingGrid}>
      <ActivityIndicator size="large" color={colors.brand600} />
      <Text style={styles.loadingText}>Loading wellness catalog...</Text>
    </View>
  );
}

function PremiumProductEmptyState({ isAdmin, onAddProduct }: { isAdmin: boolean; onAddProduct: () => void }) {
  return (
    <View style={styles.emptyStateBox}>
      <Text style={styles.emptyStateTitle}>No Products Found</Text>
      <Text style={styles.emptyStateText}>
        {isAdmin
          ? "There are currently no products in the database. Open the product catalog page to add the first wellness item."
          : "There are no products matching your search criteria. Check back later or contact your sponsor agent."}
      </Text>
      {isAdmin ? (
        <Pressable style={styles.emptyStateBtn} onPress={onAddProduct}>
          <Text style={styles.emptyStateBtnText}>Add Product</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TrustPrinciples() {
  return (
    <View style={styles.trustContainer}>
      <Text style={styles.trustHeader}>Our Core Principles</Text>
      {trustCards.map((card, idx) => (
        <View key={idx} style={styles.trustCard}>
          <View style={styles.trustIconBox}>
            <Text style={styles.trustIcon}>{card.icon}</Text>
          </View>
          <Text style={styles.trustTitle}>{card.title}</Text>
        </View>
      ))}
    </View>
  );
}

function WellnessHighlight() {
  return (
    <View style={styles.wellnessBox}>
      <Text style={styles.wellnessTitle}>100% Ayurvedic Care</Text>
      <View style={styles.wellnessGrid}>
        {wellnessHighlights.map((hl, idx) => (
          <View key={idx} style={styles.wellnessHighlightItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.wellnessHighlightText}>{hl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CustomerReviews() {
  return (
    <View style={styles.reviewsBox}>
      <Text style={styles.reviewsHeader}>Distributor & Customer Stories</Text>
      {customerReviews.map((rev, idx) => (
        <View key={idx} style={styles.reviewCard}>
          <Text style={styles.reviewText}>"{rev.text}"</Text>
          <Text style={styles.reviewAuthor}>
            - {rev.name}, <Text style={styles.reviewLocation}>{rev.location}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

function BusinessQuickLinks({ session, onNavigate }: { session: Session; onNavigate: (tab: TabKey) => void }) {
  if (session.user.role === "CUSTOMER") return null;

  return (
    <View style={styles.quickLinksBox}>
      <Text style={styles.quickLinksHeader}>Business Tools</Text>
      <View style={styles.quickLinksGrid}>
        <Pressable style={styles.quickLinkItem} onPress={() => onNavigate("network")}>
          <Text style={styles.quickLinkLabel}>Onboard Members</Text>
        </Pressable>
        <Pressable style={styles.quickLinkItem} onPress={() => onNavigate("tree")}>
          <Text style={styles.quickLinkLabel}>Genealogy Tree</Text>
        </Pressable>
        <Pressable style={styles.quickLinkItem} onPress={() => onNavigate("commissions")}>
          <Text style={styles.quickLinkLabel}>Ledger & Earnings</Text>
        </Pressable>
        {session.user.role === "ADMIN" ? (
          <Pressable style={styles.quickLinkItem} onPress={() => onNavigate("admin")}>
            <Text style={styles.quickLinkLabel}>Admin Console</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CategoryRail({
  categories,
  selectedCategory,
  onSelect
}: {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}) {
  return (
    <View style={styles.categoryRailContainer}>
      <Text style={styles.categoryTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
        {categories.map((category) => {
          const selected = category === selectedCategory;
          return (
            <Pressable
              key={category}
              style={[styles.categoryChip, selected && styles.categoryChipActive]}
              onPress={() => onSelect(category)}
            >
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProductDetailCard({
  product,
  session,
  onNavigate,
  onClose
}: {
  product: Product;
  session: Session;
  onNavigate: (tab: TabKey) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCustomer = session.user.role === "CUSTOMER";
  const isAvailable = product.availability === "AVAILABLE";
  const hasStock = typeof product.stock === "number" ? product.stock > 0 : true;

  const orderTotal = Number(product.price) * quantity;

  async function handleProceedToPayment() {
    try {
      setPlacingOrder(true);
      await apiRequest<{ order: any }>("/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          customerId: session.user.id,
          items: [
            {
              productId: product.id,
              quantity: quantity
            }
          ]
        })
      });
      setShowSummary(false);
      onClose();
      Alert.alert("Order Placed Successfully", "Please proceed to make payment for your order.");
      onNavigate("payments");
    } catch (error) {
      Alert.alert("Order Placement Failed", error instanceof Error ? error.message : "Could not create order");
    } finally {
      setPlacingOrder(false);
    }
  }

  const imageUri = mediaUrl(product.imageUrl);

  return (
    <View style={styles.productDetailCard}>
      <View style={styles.productDetailHeader}>
        <Text style={styles.productDetailTitle}>{product.name}</Text>
        <Pressable style={styles.detailCloseButton} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.detailImageWrap}>
        {product.imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.detailImage as any}
            onError={(e) => {
              console.log("Details image failed to load:", imageUri, e.nativeEvent.error);
              setImageError(true);
            }}
          />
        ) : (
          <Image source={placeholderImage} style={styles.detailFallbackImage as any} resizeMode="contain" />
        )}
      </View>
      <Text style={styles.productCategoryText}>{product.category}</Text>
      <Text style={styles.productPrice}>{formatMoney(product.price)}</Text>
      <Text style={styles.availabilityText}>{product.availability.replaceAll("_", " ")}</Text>
      <Text style={styles.detailLine}>Size: {product.size || "Not added"}</Text>
      {typeof product.stock === "number" ? <Text style={styles.detailLine}>Stock: {product.stock}</Text> : null}
      <Text style={styles.detailSectionTitle}>Description</Text>
      <Text style={styles.detailText}>{product.fullDescription || product.description}</Text>
      <Text style={styles.detailSectionTitle}>Usage</Text>
      <Text style={styles.detailText}>{product.usageInstructions || "Usage instructions will be added by Admin."}</Text>
      <Text style={styles.detailSectionTitle}>Benefits</Text>
      <Text style={styles.detailText}>{product.benefits || "Benefits will be added by Admin."}</Text>

      {isCustomer && (
        <View style={styles.checkoutContainer}>
          {isAvailable && hasStock ? (
            <>
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <View style={styles.quantityPicker}>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Text style={styles.quantityBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => setQuantity((q) => Math.min(typeof product.stock === "number" ? product.stock : 99, q + 1))}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={styles.buyNowBtn}
                onPress={() => setShowSummary(true)}
              >
                <Text style={styles.buyNowBtnText}>Buy Now — {formatMoney(orderTotal)}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.availabilityText, { color: colors.danger, textAlign: "center", marginVertical: 10 }]}>
              {!isAvailable ? "Coming Soon / Unavailable" : "Out of Stock"}
            </Text>
          )}
        </View>
      )}

      <Modal visible={showSummary} transparent={true} animationType="fade" onRequestClose={() => setShowSummary(false)}>
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Product</Text>
              <Text style={styles.summaryRowVal}>{product.name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Quantity</Text>
              <Text style={styles.summaryRowVal}>{quantity}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Price</Text>
              <Text style={styles.summaryRowVal}>{formatMoney(product.price)} / unit</Text>
            </View>

            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.slate100, marginTop: 8, paddingTop: 8 }]}>
              <Text style={[styles.summaryRowLabel, { color: colors.slate900 }]}>Total Amount</Text>
              <Text style={[styles.summaryRowVal, { color: colors.brand600, fontSize: 16 }]}>{formatMoney(orderTotal)}</Text>
            </View>

            <View style={styles.summaryActionsRow}>
              <Pressable
                style={styles.summaryCancelBtn}
                onPress={() => setShowSummary(false)}
                disabled={placingOrder}
              >
                <Text style={styles.summaryCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.summaryConfirmBtn}
                onPress={handleProceedToPayment}
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.summaryConfirmBtnText}>Confirm Order</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>Error: {message}</Text>
      <Pressable style={styles.errorBtn} onPress={onRetry}>
        <Text style={styles.errorBtnText}>Retry Loading</Text>
      </Pressable>
    </View>
  );
}



const styles = StyleSheet.create({
  homeContent: {
    paddingBottom: 40,
    backgroundColor: colors.slate50
  },
  announcementStrip: {
    backgroundColor: colors.brand600,
    paddingVertical: 6,
    alignItems: "center"
  },
  announcementText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1
  },
  homeWelcome: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  homeGreeting: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.slate900
  },
  homeMeta: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2
  },
  homeRoleBadge: {
    backgroundColor: colors.brand100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  homeRoleBadgeText: {
    fontSize: 11,
    color: colors.brand700,
    fontWeight: "700"
  },
  summaryBox: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  summaryLoading: {
    paddingVertical: 30
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900
  },
  summaryText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 6,
    lineHeight: 18
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate100
  },
  metricItem: {
    alignItems: "center",
    flex: 1
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.brand600
  },
  metricLbl: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 4,
    fontWeight: "600"
  },
  summaryActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16
  },
  summaryButton: {
    flex: 1,
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center"
  },
  summaryButtonText: {
    fontSize: 12,
    color: colors.brand700,
    fontWeight: "700"
  },
  searchRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate900,
    paddingVertical: 10
  },
  searchIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate500
  },
  searchHandle: {
    width: 2,
    height: 6,
    backgroundColor: colors.slate500,
    transform: [{ rotate: "-45deg" }],
    marginTop: -2,
    marginLeft: 8
  },
  sliderWrap: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative"
  },
  sliderImage: {
    width: "100%",
    height: "100%"
  },
  sliderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 51, 20, 0.65)",
    padding: 16,
    justifyContent: "center"
  },
  sliderBadge: {
    color: colors.brand200,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4
  },
  sliderTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    maxWidth: "80%"
  },
  sliderSubtitle: {
    color: colors.slate200,
    fontSize: 12,
    marginTop: 4
  },
  sliderDots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 12,
    left: 16,
    gap: 6
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)"
  },
  sliderDotActive: {
    backgroundColor: colors.white,
    width: 14
  },
  brandIntro: {
    paddingHorizontal: 16,
    marginTop: 20
  },
  brandIntroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900
  },
  brandIntroText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 6,
    lineHeight: 18
  },
  categoryRailContainer: {
    marginTop: 20
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    paddingHorizontal: 16,
    marginBottom: 8
  },
  categoryRail: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4
  },
  categoryChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  categoryChipActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "600"
  },
  categoryChipTextActive: {
    color: colors.white
  },
  homeProductGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 8
  },
  homeProductGridSingle: {
    flexDirection: "column"
  },
  homeProductCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2
  },
  homeProductImageWrap: {
    height: 100,
    backgroundColor: colors.slate50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  homeProductImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  homeProductFallbackImage: {
    width: 60,
    height: 60,
    opacity: 0.15
  },
  homeProductInfo: {
    marginTop: 8
  },
  homeProductName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900
  },
  homeProductCategory: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2
  },
  homeProductPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brand600,
    marginTop: 4
  },
  homeProductStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate500,
    marginTop: 2,
    textTransform: "uppercase"
  },
  loadingGrid: {
    paddingVertical: 40,
    alignItems: "center"
  },
  loadingText: {
    fontSize: 14,
    color: colors.slate500,
    marginTop: 8
  },
  emptyStateBox: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.slate100
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 6
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12
  },
  emptyStateBtn: {
    backgroundColor: colors.brand500,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  emptyStateBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600"
  },
  trustContainer: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  trustHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 12
  },
  trustCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate100
  },
  trustIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  trustIcon: {
    color: colors.brand600,
    fontWeight: "700",
    fontSize: 12
  },
  trustTitle: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "600",
    flex: 1
  },
  wellnessBox: {
    backgroundColor: colors.brand900,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 20
  },
  wellnessTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16
  },
  wellnessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  wellnessHighlightItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "47%"
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand200,
    marginRight: 8
  },
  wellnessHighlightText: {
    color: colors.brand100,
    fontSize: 12,
    fontWeight: "600"
  },
  reviewsBox: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  reviewsHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 12
  },
  reviewCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate100
  },
  reviewText: {
    fontSize: 13,
    color: colors.slate700,
    fontStyle: "italic",
    lineHeight: 18
  },
  reviewAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 6,
    textAlign: "right"
  },
  reviewLocation: {
    color: colors.slate500,
    fontWeight: "500"
  },
  quickLinksBox: {
    marginHorizontal: 16,
    marginTop: 24
  },
  quickLinksHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 12
  },
  quickLinksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quickLinkItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  quickLinkLabel: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "600"
  },
  homeBusinessCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100
  },
  mutedText: {
    fontSize: 13,
    color: colors.slate500,
    fontStyle: "italic",
    marginTop: 8
  },
  matrixBox: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    position: "relative"
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900
  },
  listSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brand600,
    marginTop: 4
  },
  listRight: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand600,
    textTransform: "uppercase"
  },
  homeFooter: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 24
  },
  footerSupport: {
    fontSize: 13,
    color: colors.slate500,
    fontWeight: "600"
  },
  footerText: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 4
  },
  productDetailCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  productDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  productDetailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
    flex: 1
  },
  detailCloseButton: {
    padding: 4
  },
  detailCloseText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 14
  },
  detailImageWrap: {
    height: 150,
    backgroundColor: colors.slate50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12
  },
  detailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  detailFallbackImage: {
    width: 80,
    height: 80,
    opacity: 0.15
  },
  productCategoryText: {
    fontSize: 12,
    color: colors.slate500,
    textTransform: "uppercase",
    fontWeight: "600"
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand600,
    marginTop: 4,
    textTransform: "uppercase"
  },
  detailLine: {
    fontSize: 13,
    color: colors.slate700,
    marginTop: 4
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 12,
    marginBottom: 4
  },
  detailText: {
    fontSize: 13,
    color: colors.slate500,
    lineHeight: 18
  },
  errorBox: {
    backgroundColor: "rgba(180, 35, 24, 0.05)",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: "center"
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "600"
  },
  errorBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8
  },
  errorBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600"
  },
  upgradeCard: {
    backgroundColor: colors.white,
    borderColor: colors.brand200,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  upgradeCardPending: {
    borderColor: colors.brand500,
    backgroundColor: colors.slate50
  },
  upgradeTitle: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6
  },
  upgradeText: {
    color: colors.slate700,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12
  },
  highlightRole: {
    color: colors.brand600,
    fontWeight: "800"
  },
  upgradeActionBtn: {
    backgroundColor: colors.brand600,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  upgradeActionBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700"
  },
  pendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4
  },
  pendingBadgeText: {
    color: colors.brand800,
    fontSize: 11,
    fontWeight: "800"
  },
  modalOverlay: {
    position: "absolute",
    top: -500,
    bottom: -500,
    left: -100,
    right: -100,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxHeight: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalScroll: {
    flexGrow: 1
  },
  modalTitle: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center"
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  modalHelpText: {
    fontSize: 11,
    color: colors.slate500,
    marginBottom: 16,
    lineHeight: 16,
    textAlign: "center"
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
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6
  },
  modalCloseBtnText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "600"
  },
  checkoutContainer: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginTop: 16
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate700
  },
  quantityPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center"
  },
  quantityBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.brand800
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    minWidth: 20,
    textAlign: "center"
  },
  buyNowBtn: {
    backgroundColor: colors.brand700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8
  },
  buyNowBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  },
  summaryOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  summaryCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8
  },
  summaryCardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 14,
    textAlign: "center"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6
  },
  summaryRowLabel: {
    fontSize: 13,
    color: colors.slate500,
    fontWeight: "700"
  },
  summaryRowVal: {
    fontSize: 13,
    color: colors.slate900,
    fontWeight: "800",
    textAlign: "right"
  },
  summaryActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16
  },
  summaryCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    backgroundColor: colors.slate50
  },
  summaryCancelBtnText: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: "700"
  },
  summaryConfirmBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand800,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryConfirmBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900"
  },
  searchResultsContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    maxHeight: 250,
    overflow: "hidden"
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100
  },
  searchResultIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: "center"
  },
  searchResultTextContainer: {
    flex: 1
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900
  },
  searchResultSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate500,
    marginTop: 2
  },
  searchResultTextEmpty: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate500,
    textAlign: "center",
    width: "100%",
    paddingVertical: 12
  }
});
