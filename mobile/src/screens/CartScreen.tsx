import React, { useState, useEffect } from "react";
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
import { Session, Product, User, TabKey } from "../constants/types";
import { colors } from "../constants/theme";
import { apiRequest, formatMoney, mediaUrl } from "../services/api";
import { Input, OptionList, PrimaryButton, SectionHeader, EmptyState } from "../components/UI/FormControls";

const logoImage = require("../../assets/logo.png");

export function CartScreen({
  session,
  cart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  onNavigate
}: {
  session: Session;
  cart: Array<{ product: Product; quantity: number }>;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  onNavigate: (tab: TabKey) => void;
}) {
  const [downlines, setDownlines] = useState<User[]>([]);
  const [orderFor, setOrderFor] = useState<"MYSELF" | "TEAM">("MYSELF");
  const [downlineSearch, setDownlineSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"CART" | "SUMMARY">("CART");

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const isAgent = session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN";

  async function loadDownline() {
    if (!isAgent) return;
    try {
      setLoading(true);
      const result = await apiRequest<{ downline: User[] }>("/users/me/network", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setDownlines(result.downline ?? []);
    } catch (error) {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDownline();
  }, []);

  const filteredDownlines = downlines.filter(u => {
    const s = downlineSearch.trim().toLowerCase();
    return u.name.toLowerCase().includes(s) || u.phone.includes(s);
  });

  async function handleConfirmOrder() {
    const targetCustomerId = isAgent && orderFor === "TEAM" ? selectedCustomerId : session.user.id;
    if (isAgent && orderFor === "TEAM" && !selectedCustomerId) {
      Alert.alert("Error", "Please select a team member before placing the order.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Error", "Please enter a delivery / shipping address.");
      return;
    }

    try {
      setLoading(true);

      // Store upline details inside notes for transparency (Section B)
      let notes = `Delivery Address: ${address}`;
      if (isAgent && orderFor === "TEAM") {
        const selectedUser = downlines.find(u => u.id === selectedCustomerId);
        notes = `Placed by upline ${session.user.name} (${session.user.role}) on behalf of direct downline ${selectedUser?.name || "Unknown"} (${selectedUser?.phone || "N/A"}).\nDelivery Address: ${address}`;
      } else if (isAgent && orderFor === "MYSELF") {
        notes = `Placed by upline ${session.user.name} (${session.user.role}) for themselves.\nDelivery Address: ${address}`;
      }

      await apiRequest<{ order: any }>("/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          customerId: targetCustomerId,
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          notes
        })
      });

      clearCart();
      setCheckoutStep("CART");
      setAddress("");
      setSelectedCustomerId("");
      setOrderFor("MYSELF");
      setDownlineSearch("");
      Alert.alert("Order Placed Successfully", "Your order has been created. Please proceed to make payment.");
      onNavigate("payments");
    } catch (error) {
      Alert.alert("Order Placement Failed", error instanceof Error ? error.message : "Could not create order");
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState title="Your Cart is Empty" text="Explore our premium range of wellness products and add them to your cart." />
        <PrimaryButton label="Shop Now" onPress={() => onNavigate("products")} />
      </View>
    );
  }

  if (checkoutStep === "SUMMARY") {
    const selectedCustomer = downlines.find(u => u.id === selectedCustomerId);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Order Summary" action="Back to Cart" onAction={() => setCheckoutStep("CART")} />
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Details</Text>
          {cart.map(item => (
            <View key={item.product.id} style={styles.summaryItemRow}>
              <Text style={styles.summaryItemText}>
                {item.product.name} (x{item.quantity})
              </Text>
              <Text style={styles.summaryItemPrice}>
                {formatMoney(Number(item.product.price) * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalVal}>{formatMoney(subtotal)}</Text>
          </View>
        </View>

        {isAgent && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order For</Text>
            {orderFor === "MYSELF" ? (
              <Text style={styles.detailText}>Myself ({session.user.name})</Text>
            ) : (
              <>
                <Text style={styles.detailText}>Name: {selectedCustomer?.name}</Text>
                <Text style={styles.detailText}>Phone: {selectedCustomer?.phone}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipping Address</Text>
          <Text style={styles.detailText}>{address}</Text>
        </View>

        <PrimaryButton label="Confirm Order" onPress={handleConfirmOrder} loading={loading} />
      </ScrollView>
    );
  }

  return (
    <CartList
      cart={cart}
      isAgent={isAgent}
      loading={loading}
      orderFor={orderFor}
      setOrderFor={setOrderFor}
      selectedCustomerId={selectedCustomerId}
      setSelectedCustomerId={setSelectedCustomerId}
      downlineSearch={downlineSearch}
      setDownlineSearch={setDownlineSearch}
      filteredDownlines={filteredDownlines}
      downlines={downlines}
      address={address}
      setAddress={setAddress}
      subtotal={subtotal}
      updateCartQuantity={updateCartQuantity}
      removeFromCart={removeFromCart}
      clearCart={clearCart}
      setCheckoutStep={setCheckoutStep}
    />
  );
}

// Inner helper component for Cart listing
function CartList({
  cart,
  isAgent,
  loading,
  orderFor,
  setOrderFor,
  selectedCustomerId,
  setSelectedCustomerId,
  downlineSearch,
  setDownlineSearch,
  filteredDownlines,
  downlines,
  address,
  setAddress,
  subtotal,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  setCheckoutStep
}: {
  cart: Array<{ product: Product; quantity: number }>;
  isAgent: boolean;
  loading: boolean;
  orderFor: "MYSELF" | "TEAM";
  setOrderFor: (val: "MYSELF" | "TEAM") => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (val: string) => void;
  downlineSearch: string;
  setDownlineSearch: (val: string) => void;
  filteredDownlines: User[];
  downlines: User[];
  address: string;
  setAddress: (val: string) => void;
  subtotal: number;
  updateCartQuantity: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setCheckoutStep: (val: "CART" | "SUMMARY") => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Shopping Cart" action="Clear" onAction={clearCart} />
      
      {cart.map(item => (
        <CartItemCard
          key={item.product.id}
          item={item}
          updateCartQuantity={updateCartQuantity}
          removeFromCart={removeFromCart}
        />
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checkout Information</Text>
        {isAgent && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>Who is this order for?</Text>
            <View style={styles.orderForContainer}>
              <Pressable
                style={[styles.orderForButton, orderFor === "MYSELF" && styles.orderForActive]}
                onPress={() => {
                  setOrderFor("MYSELF");
                  setSelectedCustomerId("");
                }}
              >
                <Text style={[styles.orderForText, orderFor === "MYSELF" && styles.orderForTextActive]}>Myself</Text>
              </Pressable>
              <Pressable
                style={[styles.orderForButton, orderFor === "TEAM" && styles.orderForActive]}
                onPress={() => {
                  setOrderFor("TEAM");
                  setSelectedCustomerId("");
                }}
              >
                <Text style={[styles.orderForText, orderFor === "TEAM" && styles.orderForTextActive]}>A team member</Text>
              </Pressable>
            </View>

            {orderFor === "TEAM" && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Select Direct Downline Member</Text>
                {loading && <ActivityIndicator color={colors.brand600} style={{ marginVertical: 6 }} />}
                <Input
                  label="Search team member"
                  placeholder="Search downline by name or phone..."
                  value={downlineSearch}
                  onChangeText={setDownlineSearch}
                />
                <OptionList
                  items={filteredDownlines}
                  selectedId={selectedCustomerId}
                  emptyText={downlines.length === 0 ? "No direct downline members found." : "No matching team members."}
                  onSelect={setSelectedCustomerId}
                  renderLabel={user => `${user.name} - ${user.phone}`}
                />
              </View>
            )}
          </View>
        )}

        <Input
          label="Shipping / Delivery Address"
          placeholder="Enter full shipping address with pincode"
          value={address}
          onChangeText={setAddress}
        />

        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalVal}>{formatMoney(subtotal)}</Text>
        </View>
      </View>

      <PrimaryButton
        label="Proceed to Order Summary"
        onPress={() => {
          if (isAgent && orderFor === "TEAM" && !selectedCustomerId) {
            Alert.alert("Error", "Please select a team member first.");
            return;
          }
          if (!address.trim()) {
            Alert.alert("Error", "Please enter shipping address first.");
            return;
          }
          setCheckoutStep("SUMMARY");
        }}
      />
    </ScrollView>
  );
}

// Inner helper component for Cart Item Cards with Image load safeguards
function CartItemCard({
  item,
  updateCartQuantity,
  removeFromCart
}: {
  item: { product: Product; quantity: number };
  updateCartQuantity: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUri = mediaUrl(item.product.imageUrl);

  return (
    <View style={styles.cartItemCard}>
      <View style={styles.itemImageWrap}>
        {item.product.imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.itemImage}
            onError={(e) => {
              console.log("Cart thumbnail failed to load:", imageUri, e.nativeEvent.error);
              setImageError(true);
            }}
          />
        ) : (
          <Image source={logoImage} style={styles.fallbackImage} resizeMode="contain" />
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>{formatMoney(item.product.price)} / unit</Text>

        <View style={styles.qtyRow}>
          <View style={styles.qtyPicker}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => updateCartQuantity(item.product.id, Math.max(1, item.quantity - 1))}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </Pressable>
            <Text style={styles.qtyVal}>{item.quantity}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>

          <Pressable style={styles.removeBtn} onPress={() => removeFromCart(item.product.id)}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </Pressable>
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
  center: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  cartItemCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 12,
    gap: 12
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  itemImage: {
    width: "100%",
    height: "100%"
  },
  fallbackImage: {
    width: "70%",
    height: "70%"
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between"
  },
  itemName: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand800,
    marginTop: 2
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },
  qtyPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingHorizontal: 4,
    height: 32
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate700
  },
  qtyVal: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate900
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff1f0",
    borderWidth: 1,
    borderColor: "#ffccc7"
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900"
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 4
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 12
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.slate900
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.brand600
  },
  summaryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  summaryItemText: {
    fontSize: 14,
    color: colors.slate700,
    fontWeight: "700"
  },
  summaryItemPrice: {
    fontSize: 14,
    color: colors.slate900,
    fontWeight: "800"
  },
  detailText: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    fontWeight: "800",
    marginBottom: 4
  },
  orderForContainer: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 6
  },
  orderForButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  orderForActive: {
    backgroundColor: colors.brand800,
    borderColor: colors.brand800
  },
  orderForText: {
    color: colors.slate700,
    fontSize: 13,
    fontWeight: "800"
  },
  orderForTextActive: {
    color: colors.white,
    fontWeight: "900"
  }
});
