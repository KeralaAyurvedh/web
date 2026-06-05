import React from "react";
import { View, StyleSheet, Pressable, Image, Text, Platform, StatusBar as NativeStatusBar } from "react-native";
import { colors } from "../../constants/theme";

const logoImage = require("../../../assets/logo.png");

export function Header({
  onMenuPress,
  onSearchPress,
  onCartPress,
  onLogout,
  cartCount
}: {
  onMenuPress: () => void;
  onSearchPress: () => void;
  onCartPress: () => void;
  onLogout: () => void;
  cartCount: number;
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
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.profileIconButton} onPress={onLogout}>
          <View style={styles.profileHead} />
          <View style={styles.profileBody} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cartBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: colors.danger ?? "#ef4444",
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center"
  },
  cartBadgeText: {
    color: colors.white ?? "#ffffff",
    fontSize: 10,
    fontWeight: "bold"
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
  }
});
