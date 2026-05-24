import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { Session, Commission, User } from "../constants/types";
import { apiRequest, formatMoney } from "../services/api";
import { colors } from "../constants/theme";
import {
  MetricCard,
  ListItem,
  TreeUserRow,
  EmptyState,
  SectionHeader
} from "../components/UI/FormControls";

export function CommissionsScreen({ session }: { session: Session }) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [treeUsers, setTreeUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCommissions() {
    try {
      setLoading(true);
      const path = session.user.role === "ADMIN" ? "/commissions" : "/commissions/me";
      const [commissionResult, treeResult] = await Promise.all([
        apiRequest<{ commissions: Commission[] }>(path, {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ users?: User[]; downline?: User[] }>(session.user.role === "ADMIN" ? "/users" : "/users/me/network", {
          headers: { Authorization: `Bearer ${session.token}` }
        })
      ]);
      setCommissions(commissionResult.commissions);
      setTreeUsers(session.user.role === "ADMIN" ? treeResult.users ?? [] : treeResult.downline ?? []);
    } catch (error) {
      Alert.alert("Commissions", error instanceof Error ? error.message : "Could not load commissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommissions();
  }, []);

  const total = commissions.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Earnings" action="Refresh" onAction={loadCommissions} />
      <MetricCard label="Visible commission total" value={formatMoney(total)} full />
      {loading && <ActivityIndicator color={colors.brand600} />}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Network tree</Text>
        {treeUsers.length === 0 ? (
          <Text style={styles.mutedText}>No network users loaded yet. Tap Refresh after creating users.</Text>
        ) : session.user.role === "ADMIN" ? (
          <NetworkTree users={treeUsers} />
        ) : (
          <View style={styles.treeChildren}>
            {treeUsers.map((user) => (
              <TreeUserRow key={user.id} user={user} depth={0} />
            ))}
          </View>
        )}
      </View>

      {commissions.length === 0 && !loading ? (
        <EmptyState title="No commissions yet" text="Confirmed payment commissions will appear here." />
      ) : (
        commissions.map((item) => (
          <ListItem
            key={item.id}
            title={formatMoney(item.amount)}
            subtitle={`${item.type.replaceAll("_", " ")} - ${item.status}`}
          />
        ))
      )}
    </ScrollView>
  );
}

function NetworkTree({ users }: { users: User[] }) {
  const childrenBySponsor = users.reduce<Record<string, User[]>>((groups, user) => {
    const key = user.sponsorId ?? "ROOT";
    groups[key] = [...(groups[key] ?? []), user];
    return groups;
  }, {});

  const roots = childrenBySponsor.ROOT ?? users.filter((user) => user.role === "MANAGER");

  if (roots.length === 0) {
    return <Text style={styles.mutedText}>No tree roots found yet.</Text>;
  }

  return (
    <View style={styles.treeChildren}>
      {roots.map((user) => (
        <TreeNode key={user.id} user={user} childrenBySponsor={childrenBySponsor} depth={0} visited={{}} />
      ))}
    </View>
  );
}

function TreeNode({
  user,
  childrenBySponsor,
  depth,
  visited
}: {
  user: User;
  childrenBySponsor: Record<string, User[]>;
  depth: number;
  visited: Record<string, boolean>;
}) {
  if (visited[user.id]) {
    return null;
  }

  const nextVisited = { ...visited, [user.id]: true };
  const children = childrenBySponsor[user.id] ?? [];

  return (
    <View>
      <TreeUserRow user={user} depth={depth} />
      {children.length > 0 ? (
        <View style={styles.treeBranch}>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              user={child}
              childrenBySponsor={childrenBySponsor}
              depth={depth + 1}
              visited={nextVisited}
            />
          ))}
        </View>
      ) : null}
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
  treeChildren: {
    gap: 8
  },
  treeBranch: {
    borderLeftWidth: 1,
    borderLeftColor: colors.slate200,
    marginLeft: 9,
    paddingLeft: 6
  }
});
