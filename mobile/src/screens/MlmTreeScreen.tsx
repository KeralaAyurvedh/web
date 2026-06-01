import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  StyleSheet,
  RefreshControl
} from "react-native";
import { Session, Role, TreePerson, TreeLayoutNode } from "../constants/types";
import { apiRequest, formatRole } from "../services/api";
import { colors } from "../constants/theme";
import { SectionHeader } from "../components/UI/FormControls";

export function MlmTreeScreen({ session }: { session: Session }) {
  const [root, setRoot] = useState<TreePerson | null>(null);
  const [users, setUsers] = useState<TreePerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<TreePerson | null>(null);
  const [zoom, setZoom] = useState(0.65);
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(0.65);
  const [search, setSearch] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [roleFilter, setRoleFilter] = useState<Role | "ALL" | "ACTIVE_ONLY">("ALL");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadTree();
    } catch {
      // Quiet fail
    } finally {
      setRefreshing(false);
    }
  }

  async function loadTree() {
    try {
      setLoading(true);
      setError("");
      const result = await apiRequest<{ root?: TreePerson; users: TreePerson[] }>("/users/tree", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setRoot(result.root ?? null);
      setUsers(result.users);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load tree");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
  }, []);

  const childrenBySponsor = useMemo(() => {
    return users.reduce<Record<string, TreePerson[]>>((groups, user) => {
      const key = user.sponsorId ?? "COMPANY";
      groups[key] = [...(groups[key] ?? []), user];
      return groups;
    }, {});
  }, [users]);

  const treeRoot: TreePerson = root ?? {
    id: session.user.id,
    name: session.user.name,
    phone: session.user.phone,
    role: session.user.role,
    status: session.user.status,
    referralCode: session.user.referralCode
  };

  const enrichedUsers = useMemo(() => {
    const byId = new Map<string, TreePerson>(users.map((user) => [user.id, user]));
    return users.map((user) => ({
      ...user,
      sponsorName: user.sponsorId ? byId.get(user.sponsorId)?.name : treeRoot.id === "COMPANY" ? "Kerala Ayurvedh" : undefined,
      childrenCount: childrenBySponsor[user.id]?.length ?? 0
    }));
  }, [childrenBySponsor, treeRoot.id, users]);

  const enrichedChildrenBySponsor = useMemo(() => {
    return enrichedUsers.reduce<Record<string, TreePerson[]>>((groups, user) => {
      const key = user.sponsorId ?? "COMPANY";
      groups[key] = [...(groups[key] ?? []), user];
      return groups;
    }, {});
  }, [enrichedUsers]);

  const displayRoot: TreePerson = {
    ...treeRoot,
    childrenCount: treeRoot.id === "COMPANY" ? (enrichedChildrenBySponsor.COMPANY ?? []).length : (enrichedChildrenBySponsor[treeRoot.id] ?? []).length
  };

  const stats = useMemo(() => {
    const members = enrichedUsers;
    return {
      total: members.length,
      managers: members.filter((user) => user.role === "MANAGER" || user.role === "BETA_MANAGER").length,
      customers: members.filter((user) => user.role === "CUSTOMER").length,
      active: members.filter((user) => user.status === "ACTIVE").length
    };
  }, [enrichedUsers]);

  const layout = useMemo(() => {
    return buildTreeLayout(displayRoot, enrichedChildrenBySponsor, collapsedIds);
  }, [collapsedIds, displayRoot, enrichedChildrenBySponsor]);

  const searchTerm = search.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!searchTerm) return [];
    return [displayRoot, ...enrichedUsers].filter((person) =>
      `${person.name} ${person.phone ?? ""} ${person.referralCode ?? ""} ${String(person.role)}`.toLowerCase().includes(searchTerm)
    );
  }, [displayRoot, enrichedUsers, searchTerm]);

  const activeMatchId = searchMatches.length > 0 ? searchMatches[matchIndex % searchMatches.length]?.id : undefined;
  const fitZoom = Math.max(0.35, Math.min(1, (width - 36) / Math.max(1, layout.canvasWidth)));
  const scaledCanvasWidth = Math.max(width - 32, layout.canvasWidth * zoom);
  const scaledCanvasHeight = Math.max(520, layout.canvasHeight * zoom);

  function setClampedZoom(nextZoom: number) {
    setZoom(Math.max(0.35, Math.min(1.8, Number(nextZoom.toFixed(2)))));
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectNextMatch(direction: 1 | -1) {
    if (searchMatches.length === 0) return;
    setMatchIndex((current) => (current + direction + searchMatches.length) % searchMatches.length);
  }

  const handleStartShouldSetResponder = (evt: any) => {
    if (evt.nativeEvent.touches.length === 2) {
      return true;
    }
    return false;
  };

  const handleMoveShouldSetResponder = (evt: any) => {
    if (evt.nativeEvent.touches.length === 2) {
      return true;
    }
    return false;
  };

  const handleResponderMove = (evt: any) => {
    const touches = evt.nativeEvent.touches;
    if (touches && touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const dx = touch1.pageX - touch2.pageX;
      const dy = touch1.pageY - touch2.pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (initialDistanceRef.current === null) {
        initialDistanceRef.current = distance;
        initialZoomRef.current = zoom;
      } else {
        const factor = distance / initialDistanceRef.current;
        const newZoom = Math.min(2.0, Math.max(0.2, initialZoomRef.current * factor));
        setClampedZoom(newZoom);
      }
    }
  };

  const handleResponderRelease = () => {
    initialDistanceRef.current = null;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.treeScreenContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.brand700]}
          tintColor={colors.brand700}
        />
      }
    >
      <SectionHeader title="Structure" />

      <View style={styles.treeStatsRow}>
        <TreeStatChip label="Total Members" value={stats.total} />
        <TreeStatChip label="Managers" value={stats.managers} />
        <TreeStatChip label="Customers" value={stats.customers} />
        <TreeStatChip label="Active" value={stats.active} />
      </View>

      <View style={styles.treeToolbarCard}>
        <View style={styles.treeToolbarRow}>
          <Pressable style={styles.treeToolButton} onPress={() => setClampedZoom(zoom + 0.15)}>
            <Text style={styles.treeToolText}>+</Text>
          </Pressable>
          <View style={[styles.treeToolButton, { width: 50, borderWidth: 0, backgroundColor: "transparent" }]}>
            <Text style={styles.treeZoomText}>{Math.round(zoom * 100)}%</Text>
          </View>
          <Pressable style={styles.treeToolButton} onPress={() => setClampedZoom(zoom - 0.15)}>
            <Text style={styles.treeToolText}>-</Text>
          </Pressable>
          <Pressable style={styles.treeToolButtonWide} onPress={() => setClampedZoom(fitZoom)}>
            <Text style={styles.treeToolText}>Fit</Text>
          </Pressable>
          <Pressable style={styles.treeToolButtonWide} onPress={() => setClampedZoom(0.75)}>
            <Text style={styles.treeToolText}>Center</Text>
          </Pressable>
        </View>

        <View style={styles.treeSearchBox}>
          <TextInput
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setMatchIndex(0);
            }}
            placeholder="Search name, phone, referral or role"
            placeholderTextColor={colors.slate500}
            style={styles.treeSearchInput}
          />
          <Text style={styles.treeMatchText}>{searchMatches.length ? `${matchIndex + 1}/${searchMatches.length}` : "0"}</Text>
        </View>
        <View style={styles.treeToolbarRow}>
          <Pressable style={styles.treeToolButtonWide} onPress={() => selectNextMatch(-1)}>
            <Text style={styles.treeToolText}>Prev</Text>
          </Pressable>
          <Pressable style={styles.treeToolButtonWide} onPress={() => selectNextMatch(1)}>
            <Text style={styles.treeToolText}>Next</Text>
          </Pressable>
          <Pressable style={styles.treeToolButtonWide} onPress={() => setCollapsedIds(new Set())}>
            <Text style={styles.treeToolText}>Expand All</Text>
          </Pressable>
          <Pressable style={styles.treeToolButtonWide} onPress={() => setCollapsedIds(new Set(enrichedUsers.filter((user) => (user.childrenCount ?? 0) > 0).map((user) => user.id)))}>
            <Text style={styles.treeToolText}>Collapse</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.treeFilterRail}>
        {["ALL", "MANAGER", "BETA_MANAGER", "LEVEL_1", "LEVEL_2", "CUSTOMER", "ACTIVE_ONLY"].map((filter) => {
          const selected = roleFilter === filter;
          return (
            <Pressable key={filter} style={[styles.treeFilterChip, selected && styles.treeFilterChipActive]} onPress={() => setRoleFilter(filter as Role | "ALL" | "ACTIVE_ONLY")}>
              <Text style={[styles.treeFilterText, selected && styles.treeFilterTextActive]}>
                {filter === "ALL" ? "All" : filter === "ACTIVE_ONLY" ? "Active Only" : formatRole(filter)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? <TreeLoadingState /> : null}
      {error ? <TreeErrorState message={error} onRetry={loadTree} /> : null}
      {!loading && !error && enrichedUsers.length === 0 && displayRoot.id !== "COMPANY" ? <EmptyTreeState /> : null}

      {!error ? (
        <View
          style={styles.treeCanvasFrame}
          onStartShouldSetResponder={handleStartShouldSetResponder}
          onMoveShouldSetResponder={handleMoveShouldSetResponder}
          onResponderMove={handleResponderMove}
          onResponderRelease={handleResponderRelease}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <ScrollView showsVerticalScrollIndicator>
              <View style={[styles.treeScaledCanvas, { width: scaledCanvasWidth, height: scaledCanvasHeight }]}>
                <View
                  style={[
                    styles.treeUnscaledCanvas,
                    {
                      width: layout.canvasWidth,
                      height: layout.canvasHeight,
                      transform: [{ scale: zoom }]
                    }
                  ]}
                >
                  <TreeCanvas
                    layout={layout.root}
                    roleFilter={roleFilter}
                    activeMatchId={activeMatchId}
                    searchTerm={searchTerm}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={toggleCollapse}
                    onSelect={setSelectedPerson}
                  />
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      ) : null}

      <TreeLegend userRole={session.user.role} />
      <TreePersonDetailModal
        person={selectedPerson}
        childCount={selectedPerson ? enrichedChildrenBySponsor[selectedPerson.id]?.length ?? 0 : 0}
        showSponsor={session.user.role === "ADMIN"}
        onClose={() => setSelectedPerson(null)}
      />
    </ScrollView>
  );
}

const TREE_NODE_WIDTH = 176;
const TREE_NODE_HEIGHT = 124;
const TREE_CUSTOMER_HEIGHT = 86;
const TREE_LEVEL_GAP = 118;
const TREE_SIBLING_GAP = 34;
const TREE_PADDING = 44;

function buildTreeLayout(root: TreePerson, childrenBySponsor: Record<string, TreePerson[]>, collapsedIds: Set<string>) {
  function measure(person: TreePerson, depth: number): TreeLayoutNode {
    const rawChildren = collapsedIds.has(person.id) ? [] : childrenBySponsor[person.id] ?? [];
    const children = rawChildren.map((child) => measure(child, depth + 1));
    const subtreeWidth = children.length === 0
      ? TREE_NODE_WIDTH
      : Math.max(TREE_NODE_WIDTH, children.reduce((sum, child) => sum + child.width, 0) + TREE_SIBLING_GAP * (children.length - 1));

    return {
      person,
      x: 0,
      y: depth * (TREE_NODE_HEIGHT + TREE_LEVEL_GAP),
      width: subtreeWidth,
      depth,
      children,
      collapsedChildrenCount: collapsedIds.has(person.id) ? childrenBySponsor[person.id]?.length ?? 0 : 0
    };
  }

  function position(node: TreeLayoutNode, left: number) {
    node.x = left + node.width / 2 - TREE_NODE_WIDTH / 2;
    let childLeft = left;
    for (const child of node.children) {
      position(child, childLeft);
      childLeft += child.width + TREE_SIBLING_GAP;
    }
  }

  const measured = measure(root, 0);
  position(measured, TREE_PADDING);
  const maxDepth = getTreeDepth(measured);

  return {
    root: measured,
    canvasWidth: Math.max(360, measured.width + TREE_PADDING * 2),
    canvasHeight: Math.max(520, (maxDepth + 1) * (TREE_NODE_HEIGHT + TREE_LEVEL_GAP) + TREE_PADDING)
  };
}

function getTreeDepth(node: TreeLayoutNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(node.depth, ...node.children.map(getTreeDepth));
}

function flattenLayout(node: TreeLayoutNode): TreeLayoutNode[] {
  return [node, ...node.children.flatMap(flattenLayout)];
}

function TreeCanvas({
  layout,
  roleFilter,
  activeMatchId,
  searchTerm,
  collapsedIds,
  onToggleCollapse,
  onSelect
}: {
  layout: TreeLayoutNode;
  roleFilter: Role | "ALL" | "ACTIVE_ONLY";
  activeMatchId?: string;
  searchTerm: string;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSelect: (person: TreePerson) => void;
}) {
  const nodes = flattenLayout(layout);

  return (
    <View style={StyleSheet.absoluteFill}>
      {nodes.flatMap((node) => node.children.map((child) => (
        <TreeConnector key={`${node.person.id}-${child.person.id}`} parent={node} child={child} />
      )))}
      {nodes.map((node) => {
        const matchesFilter = treeNodeMatchesFilter(node.person, roleFilter);
        const isSearchMatch = Boolean(searchTerm) && `${node.person.name} ${node.person.phone ?? ""} ${node.person.referralCode ?? ""} ${String(node.person.role)}`.toLowerCase().includes(searchTerm);
        return (
          <TreeNodeCard
            key={node.person.id}
            node={node}
            dimmed={!matchesFilter}
            highlighted={node.person.id === activeMatchId || isSearchMatch}
            collapsed={collapsedIds.has(node.person.id)}
            onToggleCollapse={onToggleCollapse}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

function treeNodeMatchesFilter(person: TreePerson, filter: Role | "ALL" | "ACTIVE_ONLY") {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE_ONLY") return person.status === "ACTIVE" || person.role === "COMPANY";
  return person.role === filter || person.role === "COMPANY";
}

function TreeConnector({ parent, child }: { parent: TreeLayoutNode; child: TreeLayoutNode }) {
  const parentBottomX = parent.x + TREE_NODE_WIDTH / 2;
  const parentBottomY = parent.y + (parent.person.role === "CUSTOMER" ? TREE_CUSTOMER_HEIGHT : TREE_NODE_HEIGHT);
  const childTopX = child.x + TREE_NODE_WIDTH / 2;
  const childTopY = child.y;
  const midY = parentBottomY + (childTopY - parentBottomY) / 2;

  return (
    <>
      <View style={[styles.treeConnectorLine, { left: parentBottomX, top: parentBottomY, width: 2, height: midY - parentBottomY }]} />
      <View style={[styles.treeConnectorLine, { left: Math.min(parentBottomX, childTopX), top: midY, width: Math.abs(childTopX - parentBottomX) + 2, height: 2 }]} />
      <View style={[styles.treeConnectorLine, { left: childTopX, top: midY, width: 2, height: childTopY - midY }]} />
    </>
  );
}

const TreeNodeCard = React.memo(function TreeNodeCard({
  node,
  dimmed,
  highlighted,
  collapsed,
  onToggleCollapse,
  onSelect
}: {
  node: TreeLayoutNode;
  dimmed: boolean;
  highlighted: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onSelect: (person: TreePerson) => void;
}) {
  const person = node.person;
  const hasChildren = (person.childrenCount ?? 0) > 0;
  const isCompany = person.role === "COMPANY";
  const cardHeight = person.role === "CUSTOMER" ? TREE_CUSTOMER_HEIGHT : TREE_NODE_HEIGHT;

  return (
    <Pressable
      style={[
        styles.treeNodeCard,
        roleNodeStyle(person.role),
        statusNodeStyle(person.status),
        isCompany && styles.treeCompanyNode,
        highlighted && styles.treeNodeHighlighted,
        dimmed && styles.treeNodeDimmed,
        { left: node.x, top: node.y, height: cardHeight }
      ]}
      onPress={() => onSelect(person)}
    >
      <View style={styles.treeNodeTopRow}>
        <View style={[styles.treeAvatar, isCompany && styles.treeAvatarCompany]}>
          <Text style={[styles.treeAvatarText, isCompany && styles.treeAvatarTextCompany]}>{initialsForName(person.name)}</Text>
        </View>
        <View style={styles.treeNodeTitleWrap}>
          <Text style={[styles.treeNodeName, isCompany && styles.treeCompanyText]} numberOfLines={2}>{person.name}</Text>
          <Text style={[styles.treeNodeRole, isCompany && styles.treeCompanySubText]} numberOfLines={1}>{isCompany ? "Company" : formatRole(person.role)}</Text>
        </View>
      </View>
      <View style={styles.treeNodeMetaRow}>
        <Text style={[styles.treeStatusBadge, statusBadgeStyle(person.status)]}>{person.status}</Text>
        {person.role === "BETA_MANAGER" ? <Text style={styles.treeBetaBadge}>BETA</Text> : null}
        {hasChildren ? (
          <Pressable style={styles.treeChildrenBadge} onPress={() => onToggleCollapse(person.id)}>
            <Text style={styles.treeChildrenBadgeText}>{collapsed ? "+" : "-"} {person.childrenCount}</Text>
          </Pressable>
        ) : null}
      </View>
      {person.referralCode ? <Text style={[styles.treeReferral, isCompany && styles.treeCompanySubText]} numberOfLines={1}>{person.referralCode}</Text> : null}
      {person.companyPaymentConfirmedAt ? <Text style={styles.treePaymentText}>Payment confirmed</Text> : null}
    </Pressable>
  );
});

function initialsForName(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "K";
}

function roleNodeStyle(role: TreePerson["role"]) {
  if (role === "MANAGER") return styles.treeManagerNode;
  if (role === "BETA_MANAGER") return styles.treeBetaNode;
  if (role === "LEVEL_1") return styles.treeLevelOneNode;
  if (role === "LEVEL_2") return styles.treeLevelTwoNode;
  if (role === "CUSTOMER") return styles.treeCustomerNode;
  return null;
}

function statusNodeStyle(status: string) {
  if (status === "SUSPENDED") return styles.treeSuspendedNode;
  if (status === "TERMINATED") return styles.treeTerminatedNode;
  if (status === "INACTIVE") return styles.treeInactiveNode;
  return null;
}

function statusBadgeStyle(status: string) {
  if (status === "SUSPENDED") return styles.treeStatusSuspended;
  if (status === "TERMINATED") return styles.treeStatusTerminated;
  if (status === "INACTIVE") return styles.treeStatusInactive;
  return styles.treeStatusActive;
}

function TreeStatChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.treeStatChip}>
      <Text style={styles.treeStatValue}>{value}</Text>
      <Text style={styles.treeStatLabel}>{label}</Text>
    </View>
  );
}

function TreeLegend({ userRole }: { userRole: Role }) {
  const items: Array<{ label: string; style: any }> = [];

  if (userRole === "ADMIN" || userRole === "MANAGER" || userRole === "BETA_MANAGER") {
    items.push(
      { label: "Company", style: styles.legendCompany },
      { label: "a3 (Manager)", style: styles.legendManager },
      { label: "a3 (Beta Manager)", style: styles.legendBeta },
      { label: "a2 (Main Pillar)", style: styles.legendLevel },
      { label: "a1 (Downline)", style: styles.legendLevelTwo },
      { label: "Customer", style: styles.legendCustomer }
    );
  } else if (userRole === "LEVEL_1") {
    items.push(
      { label: "a1 (Downline)", style: styles.legendLevelTwo },
      { label: "Customer", style: styles.legendCustomer }
    );
  } else if (userRole === "LEVEL_2") {
    items.push(
      { label: "Customer", style: styles.legendCustomer }
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.treeLegend}>
      <Text style={styles.detailSectionTitle}>Legend</Text>
      <View style={styles.treeLegendGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.treeLegendItem}>
            <View style={[styles.treeLegendDot, item.style]} />
            <Text style={styles.treeLegendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TreeLoadingState() {
  return (
    <View style={styles.treeStateCard}>
      <ActivityIndicator color={colors.brand700} />
      <Text style={styles.treeStateTitle}>Loading business structure</Text>
      <Text style={styles.treeStateText}>Preparing your business network structure.</Text>
    </View>
  );
}

function EmptyTreeState() {
  return (
    <View style={styles.treeStateCard}>
      <Text style={styles.treeStateTitle}>No network members found yet.</Text>
      <Text style={styles.treeStateText}>New members will appear here after approval.</Text>
    </View>
  );
}

function TreeErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.treeStateCard}>
      <Text style={styles.errorTitle}>Unable to load business structure</Text>
      <Text style={styles.treeStateText}>{message}</Text>
      <Pressable style={styles.emptyActionButton} onPress={onRetry}>
        <Text style={styles.emptyActionText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function TreePersonDetailModal({
  person,
  childCount,
  showSponsor,
  onClose
}: {
  person: TreePerson | null;
  childCount: number;
  showSponsor: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={Boolean(person)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.memberModalLayer}>
        <Pressable style={styles.memberModalScrim} onPress={onClose} />
        {person ? (
          <View style={styles.memberDetailSheet}>
            <View style={styles.memberDetailHandle} />
            <View style={styles.productDetailHeader}>
              <View>
                <Text style={styles.productDetailTitle}>{person.name}</Text>
                <Text style={styles.productCategoryText}>{person.role === "COMPANY" ? "Company" : formatRole(person.role)}</Text>
              </View>
              <Pressable style={styles.detailCloseButton} onPress={onClose}>
                <Text style={styles.detailCloseText}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.detailLine}>Status: {person.status}</Text>
            <Text style={styles.detailLine}>Phone: {person.phone ?? "Company root"}</Text>
            <Text style={styles.detailLine}>Referral: {person.referralCode ?? "N/A"}</Text>
            {showSponsor ? <Text style={styles.detailLine}>Sponsor: {person.sponsorName ?? "N/A"}</Text> : null}
            <Text style={styles.detailLine}>Placement: {person.placementType ?? "NORMAL"}</Text>
            <Text style={styles.detailLine}>Direct children: {childCount}</Text>
            {person.role !== "COMPANY" ? (
              <Text style={styles.detailLine}>Payment: {person.companyPaymentConfirmedAt ? "Confirmed" : "Pending"}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  homeSectionKicker: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brand700,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate900,
    letterSpacing: 0.3
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.danger,
    textAlign: "center"
  },
  emptyActionButton: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  emptyActionText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  productDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14
  },
  productDetailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
    maxWidth: "80%"
  },
  productCategoryText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2
  },
  detailCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.slate100
  },
  detailCloseText: {
    fontSize: 11,
    color: colors.slate700,
    fontWeight: "800"
  },
  detailLine: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "700",
    marginBottom: 6
  },
  treeScreenContent: {
    padding: 16,
    paddingBottom: 38,
    gap: 14,
    backgroundColor: "#f7fbf6"
  },
  treeHeroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  treeScreenTitle: {
    color: colors.slate900,
    fontSize: 28,
    fontWeight: "900"
  },
  treeScreenSubtitle: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: "700"
  },
  treeRefreshButton: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.brand700,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  treeRefreshText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900"
  },
  treeStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9
  },
  treeStatChip: {
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 13,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  treeStatValue: {
    color: colors.brand800,
    fontSize: 20,
    fontWeight: "900"
  },
  treeStatLabel: {
    color: colors.slate500,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  treeToolbarCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 12,
    gap: 10,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3
  },
  treeToolbarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8
  },
  treeToolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brand100
  },
  treeToolButtonWide: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.brand100
  },
  treeToolText: {
    color: colors.brand800,
    fontSize: 12,
    fontWeight: "900"
  },
  treeZoomText: {
    color: colors.slate900,
    fontWeight: "900",
    minWidth: 54,
    textAlign: "center"
  },
  treeSearchBox: {
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#dfe9df",
    backgroundColor: colors.slate50,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  treeSearchInput: {
    flex: 1,
    color: colors.slate900,
    fontSize: 13,
    fontWeight: "700"
  },
  treeMatchText: {
    color: colors.brand700,
    fontSize: 11,
    fontWeight: "900"
  },
  treeFilterRail: {
    gap: 8,
    paddingRight: 16
  },
  treeFilterChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#dfe9df",
    alignItems: "center",
    justifyContent: "center"
  },
  treeFilterChipActive: {
    backgroundColor: colors.brand700,
    borderColor: colors.brand700
  },
  treeFilterText: {
    color: colors.slate700,
    fontSize: 11,
    fontWeight: "900"
  },
  treeFilterTextActive: {
    color: colors.white
  },
  treeCanvasFrame: {
    height: 560,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    overflow: "hidden",
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 5
  },
  treeScaledCanvas: {
    backgroundColor: "#fbfdfb"
  },
  treeUnscaledCanvas: {
    position: "relative",
    transformOrigin: "top left"
  },
  treeConnectorLine: {
    position: "absolute",
    backgroundColor: "#b7d5bf",
    borderRadius: 1
  },
  treeNodeCard: {
    position: "absolute",
    width: 176,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand200,
    padding: 11,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4
  },
  treeCompanyNode: {
    backgroundColor: colors.brand800,
    borderColor: colors.brand800
  },
  treeManagerNode: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand600
  },
  treeBetaNode: {
    backgroundColor: "#edfdfa",
    borderColor: "#159a8a"
  },
  treeLevelOneNode: {
    backgroundColor: colors.white,
    borderColor: colors.brand200
  },
  treeLevelTwoNode: {
    backgroundColor: "#fbfdfb",
    borderColor: "#cfe4d3"
  },
  treeCustomerNode: {
    backgroundColor: "#ffffff",
    borderColor: colors.slate200
  },
  treeInactiveNode: {
    opacity: 0.82,
    borderColor: colors.slate200
  },
  treeSuspendedNode: {
    borderColor: "#f59e0b"
  },
  treeTerminatedNode: {
    borderColor: colors.danger,
    opacity: 0.72
  },
  treeNodeHighlighted: {
    borderColor: "#d79c21",
    borderWidth: 2.5
  },
  treeNodeDimmed: {
    opacity: 0.25
  },
  treeNodeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  treeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center"
  },
  treeAvatarCompany: {
    backgroundColor: colors.white
  },
  treeAvatarText: {
    color: colors.brand800,
    fontSize: 12,
    fontWeight: "900"
  },
  treeAvatarTextCompany: {
    color: colors.brand800
  },
  treeNodeTitleWrap: {
    flex: 1
  },
  treeNodeName: {
    color: colors.slate900,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900"
  },
  treeCompanyText: {
    color: colors.white
  },
  treeNodeRole: {
    color: colors.brand700,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3
  },
  treeCompanySubText: {
    color: colors.brand100
  },
  treeNodeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    flexWrap: "wrap"
  },
  treeStatusBadge: {
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: "900"
  },
  treeStatusActive: {
    color: colors.brand800,
    backgroundColor: colors.brand100
  },
  treeStatusInactive: {
    color: colors.slate700,
    backgroundColor: colors.slate200
  },
  treeStatusSuspended: {
    color: "#92400e",
    backgroundColor: "#fef3c7"
  },
  treeStatusTerminated: {
    color: colors.danger,
    backgroundColor: "#fee4e2"
  },
  treeBetaBadge: {
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: "900",
    color: "#0f766e",
    backgroundColor: "#ccfbf1"
  },
  treeChildrenBadge: {
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand200,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  treeChildrenBadgeText: {
    color: colors.brand800,
    fontSize: 9,
    fontWeight: "900"
  },
  treeReferral: {
    color: colors.slate500,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 7
  },
  treePaymentText: {
    color: colors.brand700,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 5
  },
  treeLegend: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 14
  },
  treeLegendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10
  },
  treeLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  treeLegendDot: {
    width: 13,
    height: 13,
    borderRadius: 7
  },
  legendCompany: {
    backgroundColor: colors.brand800
  },
  legendManager: {
    backgroundColor: colors.brand100,
    borderWidth: 1,
    borderColor: colors.brand600
  },
  legendBeta: {
    backgroundColor: "#ccfbf1"
  },
  legendLevel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand200
  },
  legendLevelTwo: {
    backgroundColor: "#fbfdfb",
    borderWidth: 1,
    borderColor: "#cfe4d3"
  },
  legendCustomer: {
    backgroundColor: colors.slate100
  },
  treeLegendText: {
    color: colors.slate700,
    fontSize: 11,
    fontWeight: "800"
  },
  treeStateCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 18,
    alignItems: "center"
  },
  treeStateTitle: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  treeStateText: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
    fontWeight: "700"
  },
  memberModalLayer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  memberModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)"
  },
  memberDetailSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: "#e7eee7"
  },
  memberDetailHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.slate200,
    alignSelf: "center",
    marginBottom: 14
  }
});
