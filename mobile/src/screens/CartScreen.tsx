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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"CART" | "SUMMARY">("CART");

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const isAgent = session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN";

  async function loadCustomers() {
    if (!isAgent) return;
    try {
      setLoading(true);
      const result = await apiRequest<{ users: User[] }>("/users/options", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setUsers(result.users);
    } catch (error) {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleConfirmOrder() {
    if (isAgent && !selectedCustomerId) {
      Alert.alert("Error", "Please select a customer before placing the order.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Error", "Please enter a delivery / shipping address.");
      return;
    }

    try {
      setLoading(true);
      const customerId = isAgent ? selectedCustomerId : session.user.id;
      const notes = `Delivery Address: ${address}`;

      await apiRequest<{ order: any }>("/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          customerId,
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
    const selectedCustomer = users.find(u => u.id === selectedCustomerId);
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
            <Text style={styles.cardTitle}>Customer Selected</Text>
            <Text style={styles.detailText}>Name: {selectedCustomer?.name}</Text>
            <Text style={styles.detailText}>Phone: {selectedCustomer?.phone}</Text>
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
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Shopping Cart" action="Clear" onAction={clearCart} />
      
      {cart.map(item => (
        <View key={item.product.id} style={styles.cartItemCard}>
          <View style={styles.itemImageWrap}>
            {item.product.imageUrl ? (
              <Image source={{ uri: mediaUrl(item.product.imageUrl) }} style={styles.itemImage} />
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
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checkout Information</Text>
        {isAgent && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>Select Customer</Text>
            {loading && <ActivityIndicator color={colors.brand600} />}
            <OptionList
              items={users.filter(user => user.role === "CUSTOMER")}
              selectedId={selectedCustomerId}
              emptyText="Loading customers..."
              onSelect={setSelectedCustomerId}
              renderLabel={user => `${user.name} - ${user.phone}`}
            />
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
          if (isAgent && !selectedCustomerId) {
            Alert.alert("Error", "Please select a customer first.");
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
  }
});
