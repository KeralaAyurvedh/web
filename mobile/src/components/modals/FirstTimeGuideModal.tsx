import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, Text, Modal } from "react-native";
import { colors } from "../../constants/theme";
import { Role } from "../../constants/types";
import { buildFirstTimeGuideSteps } from "../../constants/guides";

export function FirstTimeGuideModal({
  visible,
  role,
  onClose
}: {
  visible: boolean;
  role: Role;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => buildFirstTimeGuideSteps(role), [role]);
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.guideLayer}>
        <View style={styles.guideCard}>
          <View style={styles.guideTopRow}>
            <Text style={styles.guideSmallText}>Kerala Ayurvedh</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.guideSkipText}>Skip</Text>
            </Pressable>
          </View>
          <View style={styles.guideIcon}>
            <Text style={styles.guideIconText}>{step.icon}</Text>
          </View>
          <Text style={styles.guideTitle}>{step.title}</Text>
          <Text style={styles.guideText}>{step.text}</Text>
          <View style={styles.guideDots}>
            {steps.map((_, dotIndex) => (
              <View key={dotIndex} style={[styles.guideDot, dotIndex === index && styles.guideDotActive]} />
            ))}
          </View>
          <View style={styles.guideActions}>
            <Pressable
              style={[styles.guideSecondaryButton, index === 0 && styles.primaryButtonDisabled]}
              disabled={index === 0}
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <Text style={styles.guideSecondaryText}>Back</Text>
            </Pressable>
            <Pressable
              style={styles.guidePrimaryButton}
              onPress={() => {
                if (isLast) {
                  onClose();
                  return;
                }
                setIndex((current) => Math.min(steps.length - 1, current + 1));
              }}
            >
              <Text style={styles.guidePrimaryText}>{isLast ? "Finish" : "Next"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  guideLayer: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  guideCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 30,
    backgroundColor: colors.white,
    padding: 20,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  guideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  guideSmallText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  guideSkipText: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: "900"
  },
  guideIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: colors.brand800,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 24
  },
  guideIconText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900"
  },
  guideTitle: {
    color: colors.slate900,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 20
  },
  guideText: {
    color: colors.slate700,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10
  },
  guideDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22
  },
  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate200
  },
  guideDotActive: {
    width: 22,
    backgroundColor: colors.brand700
  },
  guideActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24
  },
  guideSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center"
  },
  guideSecondaryText: {
    color: colors.slate700,
    fontWeight: "900"
  },
  guidePrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand700,
    alignItems: "center",
    justifyContent: "center"
  },
  guidePrimaryText: {
    color: colors.white,
    fontWeight: "900"
  },
  primaryButtonDisabled: {
    backgroundColor: colors.slate200
  }
});
