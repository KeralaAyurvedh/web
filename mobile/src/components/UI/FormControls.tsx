import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../../constants/theme";
import { User } from "../../constants/types";

export function Input(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "phone-pad" | "numeric" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  placeholder?: string;
  maxLength?: number;
}) {
  const [hidePassword, setHidePassword] = useState(!!props.secureTextEntry);
  const isPassword = !!props.secureTextEntry;

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{props.label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          secureTextEntry={isPassword ? hidePassword : false}
          keyboardType={props.keyboardType ?? "default"}
          autoCapitalize={props.autoCapitalize ?? (isPassword ? "none" : undefined)}
          autoCorrect={isPassword ? false : undefined}
          textContentType={isPassword ? "password" : undefined}
          style={[styles.input, isPassword && styles.passwordInput]}
          placeholderTextColor={colors.slate500}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
        />
        {isPassword && (
          <Pressable
            style={styles.visibilityToggle}
            onPress={() => setHidePassword(!hidePassword)}
            hitSlop={8}
          >
            <Text style={styles.visibilityToggleText}>{hidePassword ? "Show" : "Hide"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function TextArea({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.textArea]}
        placeholderTextColor={colors.slate500}
      />
    </View>
  );
}

export function OptionList<T extends { id: string }>(props: {
  items: T[];
  selectedId: string;
  emptyText: string;
  onSelect: (id: string) => void;
  renderLabel: (item: T) => string;
}) {
  if (props.items.length === 0) {
    return <Text style={styles.optionEmpty}>{props.emptyText}</Text>;
  }

  return (
    <View style={styles.optionList}>
      {props.items.map((item) => {
        const selected = item.id === props.selectedId;
        return (
          <Pressable
            key={item.id}
            style={[styles.optionItem, selected && styles.optionItemActive]}
            onPress={() => props.onSelect(item.id)}
          >
            <Text style={[styles.optionText, selected && styles.optionTextActive]}>{props.renderLabel(item)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primaryButton, disabled && styles.primaryButtonDisabled, pressed && !disabled && styles.pressed]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable style={styles.textButton} onPress={onAction}>
          <Text style={styles.textButtonLabel}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricCard({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={[styles.metricCard, full && styles.metricCardFull]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function FlowItem({ index, text }: { index: string; text: string }) {
  return (
    <View style={styles.flowItem}>
      <View style={styles.flowIndex}>
        <Text style={styles.flowIndexText}>{index}</Text>
      </View>
      <Text style={styles.flowText}>{text}</Text>
    </View>
  );
}

export function ListItem({ title, subtitle, right }: { title: string; subtitle: string; right?: string }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listText}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listSubtitle}>{subtitle}</Text>
      </View>
      {right ? <Text style={styles.listRight}>{right}</Text> : null}
    </View>
  );
}

export function TreeUserRow({ user, depth }: { user: User; depth: number }) {
  return (
    <View style={[styles.treeRow, { marginLeft: Math.min(depth, 4) * 14 }]}>
      <View style={styles.treeDot} />
      <View style={styles.treeTextWrap}>
        <Text style={styles.treeName}>{user.name}</Text>
        <Text style={styles.treeMeta}>{user.role.replace("_", " ")} - {user.phone} - {user.status}</Text>
      </View>
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
    width: "100%"
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  inputWrapper: {
    position: "relative",
    width: "100%"
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
    fontSize: 16,
    color: colors.slate900,
    backgroundColor: colors.white
  },
  passwordInput: {
    paddingRight: 74
  },
  visibilityToggle: {
    position: "absolute",
    right: 8,
    top: 5,
    minWidth: 56,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand100
  },
  visibilityToggleText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "800"
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  optionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    width: "100%"
  },
  optionItem: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white
  },
  optionItemActive: {
    borderColor: colors.brand500,
    backgroundColor: colors.brand50
  },
  optionText: {
    fontSize: 14,
    color: colors.slate700,
    fontWeight: "500"
  },
  optionTextActive: {
    color: colors.brand700,
    fontWeight: "600"
  },
  optionEmpty: {
    fontSize: 14,
    color: colors.slate500,
    fontStyle: "italic",
    marginBottom: 16
  },
  primaryButton: {
    backgroundColor: colors.brand500,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8
  },
  primaryButtonDisabled: {
    backgroundColor: colors.slate200
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.8
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate900
  },
  textButton: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  textButtonLabel: {
    color: colors.brand600,
    fontSize: 14,
    fontWeight: "600"
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14
  },
  metricCardFull: {
    flex: undefined
  },
  metricLabel: {
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "700"
  },
  metricValue: {
    color: colors.brand700,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 6
  },
  flowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12
  },
  flowIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center"
  },
  flowIndexText: {
    color: colors.brand700,
    fontWeight: "900",
    fontSize: 12
  },
  flowText: {
    color: colors.slate700,
    fontSize: 14,
    fontWeight: "700",
    flex: 1
  },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8
  },
  listText: {
    flex: 1
  },
  listTitle: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 15
  },
  listSubtitle: {
    color: colors.slate500,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18
  },
  listRight: {
    color: colors.brand700,
    fontWeight: "900",
    fontSize: 12
  },
  treeRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  treeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand600
  },
  treeTextWrap: {
    flex: 1
  },
  treeName: {
    color: colors.slate900,
    fontSize: 14,
    fontWeight: "900"
  },
  treeMeta: {
    color: colors.slate500,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: 18,
    alignItems: "center",
    width: "100%",
    marginVertical: 12
  },
  emptyTitle: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 16
  },
  emptyText: {
    color: colors.slate500,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20
  }
});
