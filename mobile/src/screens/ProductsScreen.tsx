import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  RefreshControl
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Session, Product, User, StockAdjustment, ProductAvailability, Order, TabKey } from "../constants/types";
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
const placeholderImage = require("../../assets/placeholder.png");

type SelectedProductImage = {
  uri: string;
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size?: number;
};

function readFileAsBase64(fileUri: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve(value.includes(",") ? value.split(",")[1] : value);
      };
      reader.onerror = () => reject(new Error("Could not read selected image"));
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
}

export function ProductsScreen({
  session,
  onNavigate,
  addToCart
}: {
  session: Session;
  onNavigate?: (tab: TabKey) => void;
  addToCart?: (product: Product, quantity: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadOrderOptions();
    } catch {
      // Quiet fail
    } finally {
      setRefreshing(false);
    }
  }

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
  const [selectedProductImage, setSelectedProductImage] = useState<SelectedProductImage | null>(null);
  const [stockProductId, setStockProductId] = useState("");
  const [stockAdjustmentType, setStockAdjustmentType] = useState<StockAdjustment["type"]>("ADD");
  const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState("1");
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState("");
  const [orderCustomerId, setOrderCustomerId] = useState(session.user.role === "CUSTOMER" ? session.user.id : "");
  const [orderProductId, setOrderProductId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

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
      if (session.user.role === "CUSTOMER") {
        const [productResult, orderResult] = await Promise.all([
          apiRequest<{ products: Product[] }>("/products", {
            headers: { Authorization: `Bearer ${session.token}` }
          }),
          apiRequest<{ orders: Order[] }>("/orders", {
            headers: { Authorization: `Bearer ${session.token}` }
          })
        ]);
        setProducts(productResult.products);
        setCustomerOrders(orderResult.orders);
      } else {
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
      }
    } catch (error) {
      Alert.alert("Options", error instanceof Error ? error.message : "Could not load options");
    } finally {
      setLoading(false);
    }
  }

  async function createProduct() {
    try {
      setLoading(true);
      const result = await apiRequest<{ product: Product }>("/products", {
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
      let finalProduct = result.product;
      if (selectedProductImage) {
        finalProduct = await uploadProductImage(result.product.id, selectedProductImage);
      }
      resetProductForm();
      await loadProducts();
      setSelectedProduct(finalProduct);
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
      if (selectedProductImage) {
        await uploadProductImage(editingProductId, selectedProductImage);
      }
      resetProductForm();
      await loadProducts();
      Alert.alert("Product updated", "Catalog details are updated.");
    } catch (error) {
      Alert.alert("Update product", error instanceof Error ? error.message : "Could not update product");
    } finally {
      setLoading(false);
    }
  }

  async function selectProductImageFile(): Promise<SelectedProductImage | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true
      });

      if (result.canceled) return null;
      const asset = result.assets[0];
      const mimeType = asset.mimeType;
      if (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp") {
        Alert.alert("Product image", "Choose a JPEG, PNG, or WebP image.");
        return null;
      }
      if (asset.size && asset.size > 3 * 1024 * 1024) {
        Alert.alert("Product image", "Product image must be under 3 MB.");
        return null;
      }

      return {
        uri: asset.uri,
        name: asset.name || "product-image",
        mimeType,
        size: asset.size
      };
    } catch (error) {
      Alert.alert("Product image", error instanceof Error ? error.message : "Could not select image");
      return null;
    }
  }

  async function pickProductImage() {
    const image = await selectProductImageFile();
    if (!image) return;
    setSelectedProductImage(image);
    setProductImageUrl("");
  }

  async function uploadImageForProduct(product: Product) {
    const image = await selectProductImageFile();
    if (!image) return;

    try {
      setLoading(true);
      await uploadProductImage(product.id, image);
      await loadProducts();
      Alert.alert("Product image", `${product.name} image updated.`);
    } catch (error) {
      Alert.alert("Product image", error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setLoading(false);
    }
  }

  async function uploadProductImage(productId: string, image: SelectedProductImage): Promise<Product> {
    const base64 = await readFileAsBase64(image.uri);
    const result = await apiRequest<{ product: Product; imageUrl: string }>(`/admin/products/${productId}/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        fileName: image.name,
        mimeType: image.mimeType,
        base64
      })
    });
    setProductImageUrl(result.imageUrl);
    return result.product;
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
    setSelectedProductImage(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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
    setSelectedProductImage(null);
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
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.brand700]}
          tintColor={colors.brand700}
        />
      }
    >
      <SectionHeader title="Product catalog" />
      {session.user.role === "ADMIN" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingProductId ? "Edit product" : "Add product"}</Text>
          <Input label="Product name" value={productName} onChangeText={setProductName} />
          <Text style={styles.inputLabel}>Category</Text>
          <OptionList
            items={defaultCategories.filter((category) => category !== "All").map((category) => ({ id: category }))}
            selectedId={productCategory}
            emptyText="No categories configured."
            onSelect={setProductCategory}
            renderLabel={(category) => category.id}
          />
          <View style={styles.imageUploadBox}>
            <View style={styles.imageUploadTextBlock}>
              <Text style={styles.inputLabel}>Upload image</Text>
              <Text style={styles.mutedText}>
                {selectedProductImage ? selectedProductImage.name : "Browse for a JPEG, PNG, or WebP file under 3 MB."}
              </Text>
            </View>
            <Pressable style={styles.adminActionButton} onPress={pickProductImage}>
              <Text style={styles.adminActionText}>Browse</Text>
            </Pressable>
          </View>
          {selectedProductImage ? (
            <Pressable style={styles.secondaryButton} onPress={() => setSelectedProductImage(null)}>
              <Text style={styles.secondaryButtonText}>Remove selected image</Text>
            </Pressable>
          ) : null}
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
            emptyText="Pull down to load products."
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
      {session.user.role === "ADMIN" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create order</Text>
          <Text style={styles.mutedText}>Customer login is required. Level 2 or Admin can also place an order for a customer.</Text>
          <Text style={styles.inputLabel}>Customer</Text>
          <OptionList
            items={users.filter((user) => user.role === "CUSTOMER")}
            selectedId={orderCustomerId}
            emptyText="Pull down to load customers."
            onSelect={setOrderCustomerId}
            renderLabel={(user) => `${user.name} - ${user.phone}`}
          />
          <Text style={styles.inputLabel}>Product</Text>
          <OptionList
            items={products}
            selectedId={orderProductId}
            emptyText="Pull down to load products."
            onSelect={setOrderProductId}
            renderLabel={(product) => `${product.name} - ${formatMoney(product.price)}`}
          />
          <Input label="Quantity" value={orderQuantity} onChangeText={setOrderQuantity} keyboardType="numeric" />
          <Text style={styles.orderTotalText}>Auto amount: {formatMoney(orderTotal)}</Text>
          <PrimaryButton label="Create order" onPress={createOrder} loading={loading} />
        </View>
      )}
      <CategoryRail
        categories={catalogCategories(products)}
        selectedCategory={selectedCategory}
        onSelect={(category) => {
          setSelectedCategory(category);
          setSelectedProduct(null);
        }}
      />
      {selectedProduct ? (
        <ProductDetailCard
          product={selectedProduct}
          session={session}
          users={users}
          onClose={() => setSelectedProduct(null)}
          onNavigate={onNavigate}
          addToCart={addToCart}
        />
      ) : null}
      {loading && <ActivityIndicator color={colors.brand600} />}
      {products.length === 0 && !loading ? (
        <EmptyState title="No products yet" text="Admin can add products from the backend. Catalog will appear here." />
      ) : (
        visibleProducts.map((product) => (
          <View key={product.id}>
            <ProductListCard
              product={product}
              onView={() => setSelectedProduct(product)}
              onSelect={() => {
                if (addToCart) {
                  addToCart(product, 1);
                  Alert.alert("Added to Cart", `${product.name} has been added to your shopping cart.`);
                }
              }}
            />
            {session.user.role === "ADMIN" ? (
              <View style={styles.adminProductActions}>
                <Pressable style={styles.adminActionButton} onPress={() => editProduct(product)}>
                  <Text style={styles.adminActionText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.adminActionButton} onPress={() => uploadImageForProduct(product)}>
                  <Text style={styles.adminActionText}>Upload image</Text>
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

function ProductDetailCard({
  product,
  session,
  onClose,
  onNavigate,
  addToCart
}: {
  product: Product;
  session: Session;
  users?: User[];
  onClose: () => void;
  onNavigate?: (tab: any) => void;
  addToCart?: (product: Product, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);

  const isAvailable = product.availability === "AVAILABLE";
  const hasStock = typeof product.stock === "number" ? product.stock > 0 : true;
  const orderTotal = Number(product.price) * quantity;
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
        <ScrollView
          maximumZoomScale={3.0}
          minimumZoomScale={1.0}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
        >
          {product.imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.detailImage}
              resizeMode="contain"
              onError={(e) => {
                console.log("Detail image failed to load:", imageUri, e.nativeEvent.error);
                setImageError(true);
              }}
            />
          ) : (
            <Image source={placeholderImage} style={styles.detailFallbackImage} resizeMode="contain" />
          )}
        </ScrollView>
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

            <View style={styles.detailActionsRow}>
              <Pressable
                style={styles.addToCartBtnDetail}
                onPress={() => {
                  if (addToCart) {
                    addToCart(product, quantity);
                    Alert.alert("Added to Cart", `${quantity}x ${product.name} added to cart!`);
                    onClose();
                  }
                }}
              >
                <Text style={styles.addToCartBtnDetailText}>Add to Cart</Text>
              </Pressable>

              <Pressable
                style={styles.buyNowBtnDetail}
                onPress={() => {
                  if (addToCart) {
                    addToCart(product, quantity);
                    onClose();
                    if (onNavigate) {
                      onNavigate("cart");
                    }
                  }
                }}
              >
                <Text style={styles.buyNowBtnDetailText}>Buy Now — {formatMoney(orderTotal)}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={[styles.availabilityText, { color: colors.danger, textAlign: "center", marginVertical: 10 }]}>
            {!isAvailable ? "Coming Soon / Unavailable" : "Out of Stock"}
          </Text>
        )}
      </View>
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
  const [imageError, setImageError] = useState(false);
  const imageUri = mediaUrl(product.imageUrl);

  return (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        {product.imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImageInner}
            onError={(e) => {
              console.log("List image failed to load:", imageUri, e.nativeEvent.error);
              setImageError(true);
            }}
          />
        ) : (
          <Image source={placeholderImage} style={styles.productLogoFallback} resizeMode="contain" />
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
              <Text style={styles.smallActionText}>View Details</Text>
            </Pressable>
          ) : null}
          {onSelect ? (
            <Pressable style={[styles.smallAction, { backgroundColor: colors.brand700 }]} onPress={onSelect}>
              <Text style={[styles.smallActionText, { color: colors.white }]}>Add to Cart</Text>
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
  imageUploadBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  imageUploadTextBlock: {
    flex: 1
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
    height: 120,
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
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
    paddingHorizontal: 4,
    width: "100%"
  },
  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  stepUnit: {
    alignItems: "center",
    zIndex: 2
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5
  },
  stepCircleActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  stepCircleInactive: {
    backgroundColor: colors.white,
    borderColor: colors.slate200
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: "800"
  },
  stepCircleTextActive: {
    color: colors.white
  },
  stepCircleTextInactive: {
    color: colors.slate500
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    position: "absolute",
    top: 24,
    width: 60,
    textAlign: "center"
  },
  stepLabelActive: {
    color: colors.brand800
  },
  stepLabelInactive: {
    color: colors.slate500
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginHorizontal: -12,
    marginTop: -12,
    zIndex: 1
  },
  stepLineActive: {
    backgroundColor: colors.brand500
  },
  stepLineInactive: {
    backgroundColor: colors.slate200
  },
  holderInfoText: {
    fontSize: 12,
    color: colors.brand800,
    fontWeight: "700",
    backgroundColor: colors.brand50,
    padding: 8,
    borderRadius: 6,
    marginVertical: 10,
    lineHeight: 16
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  badgePending: {
    backgroundColor: "#fffbeb",
    color: "#b45309"
  },
  badgeReceived: {
    backgroundColor: "#f0fdf4",
    color: "#15803d"
  },
  handoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
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
  detailActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  addToCartBtnDetail: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brand700,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  addToCartBtnDetailText: {
    color: colors.brand700,
    fontSize: 14,
    fontWeight: "900"
  },
  buyNowBtnDetail: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brand700,
    alignItems: "center",
    justifyContent: "center"
  },
  buyNowBtnDetailText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  }
});

function OrderPipelineStepper({ status }: { status: string }) {
  const orderStatuses = [
    "CREATED",
    "MONEY_COLLECTED_BY_LEVEL_2",
    "MONEY_TRANSFERRED_TO_LEVEL_1",
    "MONEY_TRANSFERRED_TO_MANAGER",
    "MONEY_RECEIVED_BY_COMPANY",
    "PRODUCT_RELEASED_BY_COMPANY",
    "PRODUCT_RECEIVED_BY_MANAGER",
    "PRODUCT_RECEIVED_BY_LEVEL_1",
    "PRODUCT_RECEIVED_BY_LEVEL_2",
    "DELIVERED_TO_CUSTOMER"
  ];
  
  const currentIdx = orderStatuses.indexOf(status);
  
  const steps = [
    { label: "Ordered", active: currentIdx >= 0 },
    { label: "Paid", active: currentIdx >= 4 },
    { label: "Shipped", active: currentIdx >= 5 },
    { label: "Delivered", active: currentIdx >= 9 }
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, idx) => (
        <View key={step.label} style={styles.stepWrapper}>
          <View style={styles.stepUnit}>
            <View style={[styles.stepCircle, step.active ? styles.stepCircleActive : styles.stepCircleInactive]}>
              <Text style={[styles.stepCircleText, step.active ? styles.stepCircleTextActive : styles.stepCircleTextInactive]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step.active ? styles.stepLabelActive : styles.stepLabelInactive]}>
              {step.label}
            </Text>
          </View>
          {idx < steps.length - 1 && (
            <View style={[styles.stepLine, steps[idx + 1].active ? styles.stepLineActive : styles.stepLineInactive]} />
          )}
        </View>
      ))}
    </View>
  );
}
