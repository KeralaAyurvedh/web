import React, { useState, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { Session, Product, User, StockAdjustment, ProductAvailability } from "../constants/types";
import { apiRequest, formatMoney, mediaUrl, confirmAction } from "../services/api";
import { colors } from "../constants/theme";
import {
  Input,
  OptionList,
  PrimaryButton,
  SectionHeader,
  EmptyState
} from "../components/UI/FormControls";
import {
  defaultCategories,
  catalogCategories,
  availabilityOptions
} from "../constants/guides";

const logoImage = require("../../assets/logo.png");

export function ProductsScreen({ session }: { session: Session }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Weight Management");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productShortDescription, setProductShortDescription] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productFullDescription, setProductFullDescription] = useState("");
  const [productUsage, setProductUsage] = useState("");
  const [productBenefits, setProductBenefits] = useState("");
  const [productSize, setProductSize] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("0");
  const [productAvailability, setProductAvailability] = useState<ProductAvailability>("AVAILABLE");
  const [stockProductId, setStockProductId] = useState("");
  const [stockAdjustmentType, setStockAdjustmentType] = useState<StockAdjustment["type"]>("ADD");
  const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState("1");
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState("");
  const [orderCustomerId, setOrderCustomerId] = useState(session.user.role === "CUSTOMER" ? session.user.id : "");
  const [orderProductId, setOrderProductId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const orderProduct = products.find((product) => product.id === orderProductId);
  const orderTotal = orderProduct ? Number(orderProduct.price) * Number(orderQuantity || 0) : 0;
  const visibleProducts = useMemo(() => {
    if (selectedCategory === "All") return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  async function loadProducts() {
    try {
      setLoading(true);
      const result = await apiRequest<{ products: Product[] }>("/products", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setProducts(result.products);
    } catch (error) {
      Alert.alert("Products", error instanceof Error ? error.message : "Could not load products");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderOptions() {
    try {
      setLoading(true);
      const [productResult, userResult, adjustmentResult] = await Promise.all([
        apiRequest<{ products: Product[] }>("/products", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ users: User[] }>("/users/options", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        session.user.role === "ADMIN"
          ? apiRequest<{ adjustments: StockAdjustment[] }>("/admin/stock-adjustments", {
              headers: { Authorization: `Bearer ${session.token}` }
            })
          : Promise.resolve({ adjustments: [] })
      ]);
      setProducts(productResult.products);
      setUsers(userResult.users);
      setStockAdjustments(adjustmentResult.adjustments);
    } catch (error) {
      Alert.alert("Options", error instanceof Error ? error.message : "Could not load options");
    } finally {
      setLoading(false);
    }
  }

  async function createProduct() {
    try {
      setLoading(true);
      await apiRequest<{ product: Product }>("/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          name: productName,
          category: productCategory,
          imageUrl: productImageUrl,
          shortDescription: productShortDescription,
          description: productDescription,
          fullDescription: productFullDescription,
          usageInstructions: productUsage,
          benefits: productBenefits,
          size: productSize,
          price: productPrice,
          stock: productStock,
          availability: productAvailability
        })
      });
      resetProductForm();
      await loadProducts();
      Alert.alert("Product created", "The product is now visible in the catalog.");
    } catch (error) {
      Alert.alert("Create product", error instanceof Error ? error.message : "Could not create product");
    } finally {
      setLoading(false);
    }
  }

  async function updateProduct() {
    if (!editingProductId) {
      Alert.alert("Select product", "Tap Edit on a product before updating.");
      return;
    }

    try {
      setLoading(true);
      await apiRequest<{ product: Product }>(`/products/${editingProductId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          name: productName,
          category: productCategory,
          imageUrl: productImageUrl,
          shortDescription: productShortDescription,
          description: productDescription,
          fullDescription: productFullDescription,
          usageInstructions: productUsage,
          benefits: productBenefits,
          size: productSize,
          price: productPrice,
          stock: productStock,
          availability: productAvailability
        })
      });
      resetProductForm();
      await loadProducts();
      Alert.alert("Product updated", "Catalog details are updated.");
    } catch (error) {
      Alert.alert("Update product", error instanceof Error ? error.message : "Could not update product");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateProduct(productId: string) {
    try {
      setLoading(true);
      await apiRequest<{ product: Product }>(`/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      resetProductForm();
      await loadProducts();
      Alert.alert("Product deactivated", "The product is hidden from non-admin users.");
    } catch (error) {
      Alert.alert("Deactivate product", error instanceof Error ? error.message : "Could not deactivate product");
    } finally {
      setLoading(false);
    }
  }

  async function adjustProductStock() {
    if (!stockProductId) {
      Alert.alert("Stock adjustment", "Select a product before adjusting stock.");
      return;
    }

    try {
      setLoading(true);
      await apiRequest<{ product: Product; adjustment: StockAdjustment }>(`/admin/products/${stockProductId}/stock-adjustments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          type: stockAdjustmentType,
          quantity: stockAdjustmentQuantity,
          reason: stockAdjustmentReason
        })
      });
      setStockAdjustmentQuantity("1");
      setStockAdjustmentReason("");
      await loadOrderOptions();
      Alert.alert("Stock updated", "Stock adjustment was recorded.");
    } catch (error) {
      Alert.alert("Stock adjustment", error instanceof Error ? error.message : "Could not adjust stock");
    } finally {
      setLoading(false);
    }
  }

  function requestAdjustProductStock() {
    const selected = products.find((product) => product.id === stockProductId);
    confirmAction("Adjust stock", `${stockAdjustmentType} stock for ${selected?.name ?? "selected product"}?`, adjustProductStock);
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductCategory(product.category);
    setProductImageUrl(product.imageUrl ?? "");
    setProductShortDescription(product.shortDescription);
    setProductDescription(product.description);
    setProductFullDescription(product.fullDescription);
    setProductUsage(product.usageInstructions);
    setProductBenefits(product.benefits);
    setProductSize(product.size);
    setProductPrice(String(product.price));
    setProductStock(String(product.stock ?? 0));
    setProductAvailability(product.availability);
  }

  function resetProductForm() {
    setEditingProductId("");
    setProductName("");
    setProductCategory("Weight Management");
    setProductImageUrl("");
    setProductShortDescription("");
    setProductDescription("");
    setProductFullDescription("");
    setProductUsage("");
    setProductBenefits("");
    setProductSize("");
    setProductPrice("");
    setProductStock("0");
    setProductAvailability("AVAILABLE");
  }

  async function createOrder() {
    try {
      setLoading(true);
      await apiRequest<{ order: unknown }>("/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          customerId: orderCustomerId,
          items: [
            {
              productId: orderProductId,
              quantity: orderQuantity
            }
          ]
        })
      });
      setOrderProductId("");
      setOrderQuantity("1");
      Alert.alert("Order created", "Company payment can be confirmed after money reaches company.");
    } catch (error) {
      Alert.alert("Create order", error instanceof Error ? error.message : "Could not create order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrderOptions();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Product catalog" action="Refresh" onAction={loadOrderOptions} />
      {session.user.role === "ADMIN" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add product</Text>
          <Input label="Product name" value={productName} onChangeText={setProductName} />
          <Text style={styles.inputLabel}>Category</Text>
          <OptionList
            items={defaultCategories.filter((category) => category !== "All").map((category) => ({ id: category }))}
            selectedId={productCategory}
            emptyText="No categories configured."
            onSelect={setProductCategory}
            renderLabel={(category) => category.id}
          />
          <Input label="Image URL" value={productImageUrl} onChangeText={setProductImageUrl} />
          <Input label="Short description" value={productShortDescription} onChangeText={setProductShortDescription} />
          <Input label="Description" value={productDescription} onChangeText={setProductDescription} />
          <Input label="Full description" value={productFullDescription} onChangeText={setProductFullDescription} />
          <Input label="Usage instructions" value={productUsage} onChangeText={setProductUsage} />
          <Input label="Benefits" value={productBenefits} onChangeText={setProductBenefits} />
          <Input label="Weight / size" value={productSize} onChangeText={setProductSize} />
          <Input label="Price" value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" />
          <Input label="Stock" value={productStock} onChangeText={setProductStock} keyboardType="numeric" />
          <Text style={styles.inputLabel}>Availability</Text>
          <OptionList
            items={availabilityOptions.map((availability) => ({ id: availability }))}
            selectedId={productAvailability}
            emptyText="No availability options."
            onSelect={(value) => setProductAvailability(value as ProductAvailability)}
            renderLabel={(availability) => availability.id.replaceAll("_", " ")}
          />
          <PrimaryButton label={editingProductId ? "Update product" : "Create product"} onPress={editingProductId ? updateProduct : createProduct} loading={loading} />
          {editingProductId ? (
            <Pressable style={styles.secondaryButton} onPress={resetProductForm}>
              <Text style={styles.secondaryButtonText}>Cancel edit</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {session.user.role === "ADMIN" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stock adjustment</Text>
          <Text style={styles.inputLabel}>Product</Text>
          <OptionList
            items={products}
            selectedId={stockProductId}
            emptyText="Tap Refresh to load products."
            onSelect={setStockProductId}
            renderLabel={(product) => `${product.name} - Stock ${product.stock ?? 0}`}
          />
          <Text style={styles.inputLabel}>Adjustment type</Text>
          <OptionList
            items={["ADD", "REMOVE", "CORRECTION"].map((type) => ({ id: type }))}
            selectedId={stockAdjustmentType}
            emptyText="No adjustment types."
            onSelect={(value) => setStockAdjustmentType(value as StockAdjustment["type"])}
            renderLabel={(item) => item.id}
          />
          <Input label={stockAdjustmentType === "CORRECTION" ? "Correct stock to" : "Quantity"} value={stockAdjustmentQuantity} onChangeText={setStockAdjustmentQuantity} keyboardType="numeric" />
          <Input label="Reason" value={stockAdjustmentReason} onChangeText={setStockAdjustmentReason} />
          <PrimaryButton label="Record stock adjustment" onPress={requestAdjustProductStock} loading={loading} />

          <Text style={styles.detailSectionTitle}>Recent stock history</Text>
          {stockAdjustments.length === 0 ? (
            <Text style={styles.mutedText}>No stock adjustments yet.</Text>
          ) : (
            stockAdjustments.slice(0, 8).map((adjustment) => (
              <View key={adjustment.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{adjustment.product?.name ?? "Product"} - {adjustment.type}</Text>
                <Text style={styles.listSubtitle}>
                  {adjustment.beforeStock} to {adjustment.afterStock} - Qty {adjustment.quantity}
                </Text>
                <Text style={styles.detailLine}>Reason: {adjustment.reason}</Text>
                <Text style={styles.detailLine}>By: {adjustment.actor?.name ?? "Admin"} - {new Date(adjustment.createdAt).toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create order</Text>
        <Text style={styles.mutedText}>Customer login is required. Level 2 or Admin can also place an order for a customer.</Text>
        <Text style={styles.inputLabel}>Customer</Text>
        <OptionList
          items={users.filter((user) => user.role === "CUSTOMER")}
          selectedId={orderCustomerId}
          emptyText="Tap Refresh to load customers."
          onSelect={setOrderCustomerId}
          renderLabel={(user) => `${user.name} - ${user.phone}`}
        />
        <Text style={styles.inputLabel}>Product</Text>
        <OptionList
          items={products}
          selectedId={orderProductId}
          emptyText="Tap Refresh to load products."
          onSelect={setOrderProductId}
          renderLabel={(product) => `${product.name} - ${formatMoney(product.price)}`}
        />
        <Input label="Quantity" value={orderQuantity} onChangeText={setOrderQuantity} keyboardType="numeric" />
        <Text style={styles.orderTotalText}>Auto amount: {formatMoney(orderTotal)}</Text>
        <PrimaryButton label="Create order" onPress={createOrder} loading={loading} />
      </View>
      <CategoryRail
        categories={catalogCategories(products)}
        selectedCategory={selectedCategory}
        onSelect={(category) => {
          setSelectedCategory(category);
          setSelectedProduct(null);
        }}
      />
      {selectedProduct ? <ProductDetailCard product={selectedProduct} onClose={() => setSelectedProduct(null)} /> : null}
      {loading && <ActivityIndicator color={colors.brand600} />}
      {products.length === 0 && !loading ? (
        <EmptyState title="No products yet" text="Admin can add products from the backend. Catalog will appear here." />
      ) : (
        visibleProducts.map((product) => (
          <View key={product.id}>
            <ProductListCard product={product} onView={() => setSelectedProduct(product)} onSelect={() => setOrderProductId(product.id)} />
            {session.user.role === "ADMIN" ? (
              <View style={styles.adminProductActions}>
                <Pressable style={styles.adminActionButton} onPress={() => editProduct(product)}>
                  <Text style={styles.adminActionText}>Edit</Text>
                </Pressable>
                {product.isActive ? (
                  <Pressable style={styles.adminDangerButton} onPress={() => deactivateProduct(product.id)}>
                    <Text style={styles.adminDangerText}>Deactivate</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.inactiveBadge}>Inactive</Text>
                )}
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
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

function ProductDetailCard({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <View style={styles.productDetailCard}>
      <View style={styles.productDetailHeader}>
        <Text style={styles.productDetailTitle}>{product.name}</Text>
        <Pressable style={styles.detailCloseButton} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.detailImageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: mediaUrl(product.imageUrl) }} style={styles.detailImage} />
        ) : (
          <Image source={logoImage} style={styles.detailFallbackImage} resizeMode="contain" />
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
    </View>
  );
}

function ProductListCard({
  product,
  onSelect,
  onView
}: {
  product: Product;
  onSelect?: () => void;
  onView?: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        {product.imageUrl ? (
          <Image source={{ uri: mediaUrl(product.imageUrl) }} style={styles.productImageInner} />
        ) : (
          <Image source={logoImage} style={styles.productLogoFallback} resizeMode="contain" />
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCategoryText}>{product.category}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{product.shortDescription || product.description}</Text>
        <Text style={styles.productPrice}>{formatMoney(product.price)}</Text>
        <Text style={styles.availabilityText}>{product.availability.replaceAll("_", " ")}</Text>
        <View style={styles.productActions}>
          {onView ? (
            <Pressable style={styles.smallAction} onPress={onView}>
              <Text style={styles.smallActionText}>View</Text>
            </Pressable>
          ) : null}
          {onSelect ? (
            <Pressable style={styles.smallAction} onPress={onSelect}>
              <Text style={styles.smallActionText}>Use for order</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.slate50
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 16
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
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 12,
    marginBottom: 6
  },
  detailLine: {
    fontSize: 13,
    color: colors.slate700,
    marginBottom: 4
  },
  detailText: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    marginBottom: 4
  },
  adminListBlock: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 10
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900
  },
  listSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 4,
    marginBottom: 6
  },
  orderTotalText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.brand800,
    marginTop: 8,
    marginBottom: 12
  },
  adminProductActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -6,
    marginBottom: 10,
    paddingHorizontal: 8
  },
  adminActionButton: {
    borderRadius: 8,
    backgroundColor: colors.brand50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.brand100
  },
  adminActionText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  adminDangerButton: {
    borderRadius: 8,
    backgroundColor: "#fff1f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ffccc7"
  },
  adminDangerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "900"
  },
  inactiveBadge: {
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8
  },
  secondaryButtonText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "600"
  },
  categoryRailContainer: {
    marginVertical: 14
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate900,
    marginBottom: 8
  },
  categoryRail: {
    gap: 8,
    paddingRight: 16
  },
  categoryChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#dfe9df",
    alignItems: "center",
    justifyContent: "center"
  },
  categoryChipActive: {
    backgroundColor: colors.brand700,
    borderColor: colors.brand700
  },
  categoryChipText: {
    color: colors.slate700,
    fontSize: 11,
    fontWeight: "900"
  },
  categoryChipTextActive: {
    color: colors.white
  },
  productCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12
  },
  productImage: {
    width: 94,
    minHeight: 120,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center"
  },
  productImageInner: {
    width: "100%",
    height: "100%"
  },
  productLogoFallback: {
    width: 62,
    height: 62
  },
  productInfo: {
    flex: 1,
    padding: 14
  },
  productName: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 16
  },
  productDescription: {
    color: colors.slate500,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  productCategoryText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  productPrice: {
    color: colors.brand700,
    fontWeight: "900",
    marginTop: 8
  },
  productActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  smallAction: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: colors.brand50,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.brand100
  },
  smallActionText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  availabilityText: {
    alignSelf: "flex-start",
    color: colors.slate700,
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 6
  },
  productDetailCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 16
  },
  productDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  productDetailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900
  },
  detailCloseButton: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  detailCloseText: {
    fontSize: 11,
    color: colors.slate700
  },
  detailImageWrap: {
    height: 180,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden"
  },
  detailImage: {
    width: "100%",
    height: "100%"
  },
  detailFallbackImage: {
    width: 90,
    height: 90
  }
});
