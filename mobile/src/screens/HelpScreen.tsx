import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Pressable,
  Modal,
  Linking,
  StyleSheet
} from "react-native";
import {
  Role,
  TabKey,
  HelpTopic,
  BackendHelpTopic,
  HelpGuide,
  HelpStep,
  Session
} from "../constants/types";
import { colors } from "../constants/theme";
import { apiRequest } from "../services/api";
import {
  helpGuides,
  commonHelpTopics,
  filterHelpTopicsForRole,
  backendTopicToHelpTopic,
  canAccessTab
} from "../constants/guides";
import { PrimaryButton } from "../components/UI/FormControls";

export function HelpScreen({
  session,
  onNavigate,
  onShowGuide
}: {
  session: Session;
  onNavigate: (tab: TabKey) => void;
  onShowGuide: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [dynamicTopics, setDynamicTopics] = useState<BackendHelpTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicError, setTopicError] = useState("");
  
  const guide = helpGuides[session.user.role];
  const isAdmin = session.user.role === "ADMIN";
  const visibleGuides = isAdmin ? Object.values(helpGuides) : [guide];
  
  const helpTopics = filterHelpTopicsForRole(
    dynamicTopics.length > 0
      ? dynamicTopics.map(backendTopicToHelpTopic)
      : commonHelpTopics,
    session.user.role
  );
  
  const term = search.trim().toLowerCase();
  const filteredTopics = helpTopics.filter((topic) => {
    if (!term) return true;
    return `${topic.title} ${topic.text} ${topic.keywords.join(" ")}`
      .toLowerCase()
      .includes(term);
  });

  const quickButtons: Array<{ label: string; route: TabKey }> = [
    { label: "My Work", route: "help" as TabKey },
    { label: "Products", route: "products" as TabKey },
    { label: "Network", route: "network" as TabKey },
    { label: "Payments", route: "payments" as TabKey },
    { label: "Earnings", route: "commissions" as TabKey },
    { label: "Support", route: "help" as TabKey },
    ...(isAdmin
      ? [
          { label: "Admin Work", route: "admin" as TabKey },
          { label: "Applications", route: "admin" as TabKey },
          { label: "Orders", route: "admin" as TabKey },
          { label: "Stock", route: "products" as TabKey },
          { label: "Reports", route: "admin" as TabKey },
          { label: "System Monitor", route: "admin" as TabKey }
        ]
      : [])
  ].filter((item) => canAccessTab(session.user.role, item.route));

  async function loadHelpTopics() {
    try {
      setLoadingTopics(true);
      setTopicError("");
      const result = await apiRequest<{ topics: BackendHelpTopic[] }>("/help-topics", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setDynamicTopics(result.topics);
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : "Could not load help topics");
    } finally {
      setLoadingTopics(false);
    }
  }

  useEffect(() => {
    loadHelpTopics();
  }, []);

  return (
    <>
      <ScrollView contentContainerStyle={styles.helpContent}>
        <View style={styles.helpHeroCard}>
          <View style={styles.helpHeroTop}>
            <View style={styles.helpHeroIcon}>
              <Text style={styles.helpHeroIconText}>?</Text>
            </View>
            <View style={styles.helpHeroTextWrap}>
              <Text style={styles.helpTitle}>Help</Text>
              <Text style={styles.helpSubtitle}>Learn how to use your app step by step.</Text>
            </View>
          </View>
          <View style={styles.helpRoleBadge}>
            <Text style={styles.helpRoleText}>
              You are using this app as: {session.user.role.replace("_", " ")}
            </Text>
          </View>
        </View>

        <View style={styles.helpSearchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search help"
            placeholderTextColor={colors.slate500}
            style={styles.helpSearchInput}
          />
          <Text style={styles.helpSearchIcon}>?</Text>
        </View>

        <View>
          <Text style={styles.moreSectionTitle}>Quick Help</Text>
          <View style={styles.helpQuickGrid}>
            {quickButtons.map((item) => (
              <Pressable
                key={`${item.label}-${item.route}`}
                style={styles.helpQuickButton}
                onPress={() => onNavigate(item.route)}
              >
                <Text style={styles.helpQuickText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <WhatNextCard guide={guide} onNavigate={onNavigate} />
        <RoleGuideCard guide={guide} onNavigate={onNavigate} primary />

        {isAdmin ? (
          <View>
            <Text style={styles.moreSectionTitle}>All Role Guides</Text>
            {visibleGuides
              .filter((item) => item.role !== guide.role)
              .map((item) => (
                <RoleGuideCard key={item.role} guide={item} onNavigate={onNavigate} compact />
              ))}
          </View>
        ) : null}

        <View>
          <Text style={styles.moreSectionTitle}>Common Questions</Text>
          {loadingTopics ? <ActivityIndicator color={colors.brand600} /> : null}
          {topicError ? <Text style={styles.mutedText}>Using built-in Help. {topicError}</Text> : null}
          {filteredTopics.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.mutedText}>
                No help topic found. Try products, payment, commission, tree or order.
              </Text>
            </View>
          ) : (
            filteredTopics.map((topic) => (
              <Pressable
                key={topic.id}
                style={styles.helpTopicCard}
                onPress={() => setSelectedTopic(topic)}
              >
                <View style={styles.helpTopicIcon}>
                  <Text style={styles.helpTopicIconText}>?</Text>
                </View>
                <View style={styles.helpTopicText}>
                  <Text style={styles.helpTopicTitle}>{topic.title}</Text>
                  <Text style={styles.helpTopicDescription}>{topic.text}</Text>
                </View>
                <Text style={styles.moreArrow}>{">"}</Text>
              </Pressable>
            ))
          )}
        </View>

        {isAdmin ? (
          <View style={styles.helpManagerCard}>
            <Text style={styles.cardTitle}>Help Manager</Text>
            <Text style={styles.mutedText}>
              Admin-editable help topics can be added later. Current Help is ready as simple
              built-in guidance.
            </Text>
          </View>
        ) : null}

        <View style={styles.helpSupportCard}>
          <Text style={styles.cardTitle}>Need help?</Text>
          <Text style={styles.mutedText}>
            Contact Kerala Ayurvedh support by email (Mon-Sat, 9:00 AM - 6:00 PM).
          </Text>

          <View style={styles.supportButtonsContainer}>
            <Pressable
              style={[styles.supportButton, { backgroundColor: "#EA4335" }]}
              onPress={() =>
                Linking.openURL(
                  "mailto:support@keralaayurvedh.com?subject=Kerala%20Ayurvedh%20App%20Support"
                )
              }
            >
              <Text style={styles.supportButtonText}>Email</Text>
            </Pressable>
          </View>

          <Pressable style={styles.helpStepButton} onPress={onShowGuide}>
            <Text style={styles.helpStepButtonText}>Show app guide again</Text>
          </Pressable>
        </View>
      </ScrollView>

      <HelpTopicModal
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onNavigate={onNavigate}
      />
    </>
  );
}

function WhatNextCard({ guide, onNavigate }: { guide: HelpGuide; onNavigate: (tab: TabKey) => void }) {
  return (
    <View style={styles.whatNextCard}>
      <Text style={styles.whatNextTitle}>What should I do now?</Text>
      <Text style={styles.whatNextText}>{guide.message}</Text>
      {guide.nextActions.map((step) => (
        <HelpStepCard
          key={`${guide.role}-${step.title}`}
          step={step}
          onNavigate={onNavigate}
          compact
        />
      ))}
    </View>
  );
}

function RoleGuideCard({
  guide,
  onNavigate,
  primary,
  compact
}: {
  guide: HelpGuide;
  onNavigate: (tab: TabKey) => void;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.roleGuideCard, primary && styles.roleGuideCardPrimary]}>
      <View style={styles.roleGuideHeader}>
        <View style={styles.roleGuideIcon}>
          <Text style={styles.roleGuideIconText}>{guide.role.slice(0, 1)}</Text>
        </View>
        <View style={styles.roleGuideTitleWrap}>
          <Text style={styles.roleGuideTitle}>{guide.title}</Text>
          <Text style={styles.roleGuideMessage}>{guide.message}</Text>
        </View>
      </View>
      {(compact ? guide.steps.slice(0, 3) : guide.steps).map((step) => (
        <HelpStepCard
          key={`${guide.role}-${step.title}`}
          step={step}
          onNavigate={onNavigate}
          compact={compact}
        />
      ))}
    </View>
  );
}

function HelpStepCard({
  step,
  onNavigate,
  compact
}: {
  step: HelpStep;
  onNavigate: (tab: TabKey) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.helpStepCard}>
      <View style={styles.helpStepNumber}>
        <Text style={styles.helpStepNumberText}>{step.icon}</Text>
      </View>
      <View style={styles.helpStepBody}>
        <Text style={styles.helpStepTitle}>{step.title}</Text>
        <Text style={styles.helpStepText}>{step.text}</Text>
        {!compact && step.route && step.action ? (
          <Pressable style={styles.helpStepButton} onPress={() => onNavigate(step.route!)}>
            <Text style={styles.helpStepButtonText}>{step.action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function HelpTopicModal({
  topic,
  onClose,
  onNavigate
}: {
  topic: HelpTopic | null;
  onClose: () => void;
  onNavigate: (tab: TabKey) => void;
}) {
  return (
    <Modal visible={!!topic} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.memberModalLayer}>
        <Pressable style={styles.memberModalScrim} onPress={onClose} />
        <View style={styles.memberDetailSheet}>
          <View style={styles.memberDetailHandle} />
          {topic ? (
            <>
              <View style={styles.productDetailHeader}>
                <Text style={styles.productDetailTitle}>{topic.title}</Text>
                <Pressable style={styles.detailCloseButton} onPress={onClose}>
                  <Text style={styles.detailCloseText}>Close</Text>
                </Pressable>
              </View>
              <Text style={styles.detailText}>{topic.text}</Text>
              <Text style={styles.detailSectionTitle}>Steps</Text>
              {topic.steps.map((step, index) => (
                <View key={`${topic.id}-${step}`} style={styles.helpModalStep}>
                  <View style={styles.helpStepNumber}>
                    <Text style={styles.helpStepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.helpModalStepText}>{step}</Text>
                </View>
              ))}
              {topic.route && topic.action ? (
                <PrimaryButton
                  label={topic.action}
                  onPress={() => {
                    onClose();
                    onNavigate(topic.route!);
                  }}
                />
              ) : null}
              <Text style={styles.helpSupportNote}>
                If you are still confused, email support@keralaayurvedh.com with your User ID and screenshots.
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helpContent: {
    padding: 16,
    paddingBottom: 38,
    gap: 16
  },
  helpHeroCard: {
    backgroundColor: colors.brand900,
    borderRadius: 28,
    padding: 18,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6
  },
  helpHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  helpHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  helpHeroIconText: {
    color: colors.brand800,
    fontSize: 28,
    fontWeight: "900"
  },
  helpHeroTextWrap: {
    flex: 1
  },
  helpTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900"
  },
  helpSubtitle: {
    color: "#d8f3de",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 4
  },
  helpRoleBadge: {
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16
  },
  helpRoleText: {
    color: colors.brand800,
    fontSize: 12,
    fontWeight: "900"
  },
  helpSearchBox: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#dfe9df",
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3
  },
  helpSearchInput: {
    flex: 1,
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "800"
  },
  helpSearchIcon: {
    color: colors.brand700,
    fontSize: 18,
    fontWeight: "900"
  },
  moreSectionTitle: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "900"
  },
  helpQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 10
  },
  helpQuickButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand100,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  helpQuickText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "900"
  },
  whatNextCard: {
    borderRadius: 24,
    backgroundColor: "#f0fbf3",
    borderWidth: 1,
    borderColor: colors.brand100,
    padding: 14
  },
  whatNextTitle: {
    color: colors.brand900,
    fontSize: 20,
    fontWeight: "900"
  },
  whatNextText: {
    color: colors.slate700,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 6
  },
  roleGuideCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 14,
    marginTop: 10,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2
  },
  roleGuideCardPrimary: {
    marginTop: 0,
    borderColor: colors.brand100
  },
  roleGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10
  },
  roleGuideIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.brand700,
    alignItems: "center",
    justifyContent: "center"
  },
  roleGuideIconText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900"
  },
  roleGuideTitleWrap: {
    flex: 1
  },
  roleGuideTitle: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "900"
  },
  roleGuideMessage: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 3
  },
  helpStepCard: {
    flexDirection: "row",
    gap: 11,
    borderRadius: 18,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 12,
    marginTop: 9
  },
  helpStepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center"
  },
  helpStepNumberText: {
    color: colors.brand800,
    fontSize: 12,
    fontWeight: "900"
  },
  helpStepBody: {
    flex: 1
  },
  helpStepTitle: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "900"
  },
  helpStepText: {
    color: colors.slate700,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
    fontWeight: "700"
  },
  helpStepButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.brand700,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9
  },
  helpStepButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900"
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16
  },
  mutedText: {
    color: colors.slate500,
    lineHeight: 20,
    marginBottom: 12
  },
  helpTopicCard: {
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10
  },
  helpTopicIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center"
  },
  helpTopicIconText: {
    color: colors.brand700,
    fontSize: 18,
    fontWeight: "900"
  },
  helpTopicText: {
    flex: 1
  },
  helpTopicTitle: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "900"
  },
  helpTopicDescription: {
    color: colors.slate500,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3
  },
  moreArrow: {
    color: colors.slate500,
    fontSize: 24,
    fontWeight: "900"
  },
  helpManagerCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand100,
    padding: 14,
    marginTop: 16
  },
  cardTitle: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 12
  },
  helpSupportCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#e7eee7",
    padding: 16,
    marginTop: 16
  },
  supportButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 12
  },
  supportButton: {
    flex: 1,
    minWidth: 90,
    minHeight: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  supportButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  helpSupportNote: {
    color: colors.brand700,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 12
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
  },
  productDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  productDetailTitle: {
    flex: 1,
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "900"
  },
  detailCloseButton: {
    borderRadius: 8,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  detailCloseText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "900"
  },
  detailText: {
    color: colors.slate700,
    lineHeight: 20,
    marginTop: 5
  },
  detailSectionTitle: {
    color: colors.slate900,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 14
  },
  helpModalStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7
  },
  helpModalStepText: {
    flex: 1,
    color: colors.slate700,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  }
});
