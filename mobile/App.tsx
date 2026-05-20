import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const role = 'AGENT';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kerala Ayurvedh</Text>
        <Text style={styles.headerSubtitle}>Partner App</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'DASHBOARD' && styles.activeTab]}
          onPress={() => setActiveTab('DASHBOARD')}
        >
          <Text style={[styles.tabText, activeTab === 'DASHBOARD' && styles.activeTabText]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'PRODUCTS' && styles.activeTab]}
          onPress={() => setActiveTab('PRODUCTS')}
        >
          <Text style={[styles.tabText, activeTab === 'PRODUCTS' && styles.activeTabText]}>Products</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'DASHBOARD' ? (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back!</Text>
              <Text style={styles.cardSubtitle}>Your referral code: KERALA2026</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Direct Recruits</Text>
                <Text style={styles.statValue}>4</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Earnings</Text>
                <Text style={styles.statValue}>₹4,250</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Commissions</Text>
            <View style={styles.listCard}>
              <View style={styles.listItem}>
                <View>
                  <Text style={styles.itemName}>John Doe</Text>
                  <Text style={styles.itemType}>Recruitment</Text>
                </View>
                <Text style={styles.itemAmount}>₹1,000</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.listItem}>
                <View>
                  <Text style={styles.itemName}>Alice Smith</Text>
                  <Text style={styles.itemType}>Recruitment (Level 2)</Text>
                </View>
                <Text style={styles.itemAmount}>₹500</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.listItem}>
                <View>
                  <Text style={styles.itemName}>Team Sales</Text>
                  <Text style={styles.itemType}>Product Sale (10%)</Text>
                </View>
                <Text style={styles.itemAmount}>₹250</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Product Catalog</Text>
            
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productImageText}>Image</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>SlimAyur Power</Text>
                <Text style={styles.productPrice}>₹2,499</Text>
                <TouchableOpacity style={styles.buyButton}>
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productImageText}>Image</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>GlowRadiance Scrub</Text>
                <Text style={styles.productPrice}>₹1,299</Text>
                <TouchableOpacity style={styles.buyButton}>
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#166534', // brand-800
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BBF7D0', // brand-200
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#166534',
  },
  tabText: {
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#166534',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: 'white',
    flex: 0.48,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#166534',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 10,
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  itemName: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  itemType: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 2,
  },
  itemAmount: {
    fontWeight: 'bold',
    color: '#166534',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 15,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  productImagePlaceholder: {
    width: 100,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  productInfo: {
    padding: 15,
    flex: 1,
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#0F172A',
  },
  productPrice: {
    fontSize: 14,
    color: '#166534',
    fontWeight: 'bold',
    marginTop: 5,
  },
  buyButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
