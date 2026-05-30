import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { Session, User, Role, MemberApplication } from "../constants/types";
import { apiRequest, formatRole } from "../services/api";
import { colors } from "../constants/theme";
import {
  Input,
  OptionList,
  PrimaryButton,
  SectionHeader,
  ListItem
} from "../components/UI/FormControls";
import {
  defaultCreateRole,
  createRoleOptions,
  getSponsorOptions,
  betaEligibilityLabel
} from "../constants/guides";

export function NetworkScreen({ session }: { session: Session }) {
  const [downline, setDownline] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [role, setRole] = useState<Role>(defaultCreateRole(session.user.role));
  const [sponsorId, setSponsorId] = useState("");

  async function loadNetwork() {
    try {
      setLoading(true);
      const [networkResult, userResult] = await Promise.all([
        apiRequest<{ downline: User[] }>("/users/me/network", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ users: User[] }>("/users/options", {
          headers: { Authorization: `Bearer ${session.token}` }
        })
      ]);
      setDownline(networkResult.downline);
      setUsers(userResult.users);
    } catch (error) {
      Alert.alert("Network", error instanceof Error ? error.message : "Could not load network");
    } finally {
      setLoading(false);
    }
  }

  async function createDownline() {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Full Name is required");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Validation Error", "A valid 10-digit Phone number is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Validation Error", "A valid Email address is required");
      return;
    }
    if (session.user.role !== "ADMIN") {
      if (!aadhaarNumber.trim() || aadhaarNumber.trim().length < 12) {
        Alert.alert("Validation Error", "A valid 12-digit Aadhaar number is required");
        return;
      }
      if (!privacyConsentAccepted) {
        Alert.alert("Privacy consent required", "Please accept the privacy consent before submitting Aadhaar details.");
        return;
      }
    } else {
      if (!password.trim() || password.trim().length < 6) {
        Alert.alert("Validation Error", "Password must be at least 6 characters");
        return;
      }
      if (role !== "MANAGER" && !sponsorId) {
        Alert.alert("Validation Error", "Sponsor selection is required");
        return;
      }
    }

    try {
      setLoading(true);
      let adminCreateEmailResult: { emailSent?: boolean; emailReason?: string } | null = null;
      if (session.user.role === "ADMIN") {
        adminCreateEmailResult = await apiRequest<{ user: User; emailSent?: boolean; emailReason?: string }>("/users", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({
            name,
            phone,
            email: email || undefined,
            password,
            role,
            sponsorId: role === "MANAGER" ? undefined : sponsorId
          })
        });
      } else {
        await apiRequest<{ application: MemberApplication }>("/applications", {
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            email: email || undefined,
            requestedRole: role,
            sponsorPhone: session.user.phone,
            aadhaarNumber: aadhaarNumber || undefined,
            privacyConsentAccepted: true
          })
        });
      }
      setName("");
      setPhone("");
      setEmail("");
      setAadhaarNumber("");
      setPrivacyConsentAccepted(false);
      setSponsorId("");
      await loadNetwork();
      Alert.alert(
        session.user.role === "ADMIN" ? "Created" : "Application submitted",
        session.user.role === "ADMIN"
          ? [
              "User created successfully",
              `Email: ${adminCreateEmailResult?.emailSent ? "Sent" : "Not sent"}`,
              adminCreateEmailResult?.emailSent ? "" : `Reason: ${adminCreateEmailResult?.emailReason ?? "Unknown email error"}`
            ].filter(Boolean).join("\n")
          : "Company Admin will review the details and create login after approval."
      );
    } catch (error) {
      Alert.alert(session.user.role === "ADMIN" ? "Create user" : "Submit application", error instanceof Error ? error.message : "Could not save details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNetwork();
  }, []);

  if (session.user.role === "CUSTOMER") {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer profile</Text>
          <Text style={styles.mutedText}>Product orders and payment status will appear here.</Text>
        </View>
      </ScrollView>
    );
  }

  const allowedRoles = createRoleOptions(session.user.role);
  const sponsorOptions = getSponsorOptions(role, users);
  const currentUserOption = users.find((user) => user.id === session.user.id);
  const selfBetaEligibility = currentUserOption?.betaManagerEligibility;
  const isBetaLockedForManager =
    role === "BETA_MANAGER" &&
    session.user.role === "MANAGER" &&
    !selfBetaEligibility?.canCreateBetaManager;
  const createDisabled = loading || isBetaLockedForManager;
  const betaProgressText = selfBetaEligibility
    ? `${selfBetaEligibility.confirmedCustomers}/${selfBetaEligibility.requiredCustomers} confirmed customers`
    : "Tap Refresh to check customer progress";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Network" action="Refresh" onAction={loadNetwork} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{session.user.role === "ADMIN" ? "Create user" : "Submit member application"}</Text>
        <Text style={styles.mutedText}>
          {session.user.role === "ADMIN"
            ? "Admin can create active users directly."
            : "The new person will be sent to Company Admin for approval. Login is created only after approval."}
        </Text>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        {session.user.role === "ADMIN" ? (
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        ) : (
          <>
            <Input label="Aadhaar number" value={aadhaarNumber} onChangeText={setAadhaarNumber} keyboardType="numeric" />
            <Text style={styles.mutedText}>No Aadhaar image upload is needed.</Text>
            <Pressable
              style={styles.consentRow}
              onPress={() => setPrivacyConsentAccepted((value) => !value)}
            >
              <View style={[styles.consentBox, privacyConsentAccepted && styles.consentBoxChecked]}>
                <Text style={styles.consentCheck}>{privacyConsentAccepted ? "✓" : ""}</Text>
              </View>
              <Text style={styles.consentText}>
                I confirm this applicant has consented to Kerala Ayurvedh collecting and using Aadhaar number only for identity verification, application review, fraud prevention, and legal compliance. Images are not collected.
              </Text>
            </Pressable>
          </>
        )}
        <View style={styles.segmentRow}>
          {allowedRoles.map((option: Role) => (
            <Pressable
              key={option}
              style={[styles.segment, role === option && styles.segmentActive]}
              onPress={() => setRole(option)}
            >
              <Text style={[styles.segmentText, role === option && styles.segmentTextActive]}>{formatRole(option)}</Text>
            </Pressable>
          ))}
        </View>
        {session.user.role === "ADMIN" && role !== "MANAGER" && (
          <>
            <Text style={styles.inputLabel}>Sponsor</Text>
            <OptionList
              items={sponsorOptions}
              selectedId={sponsorId}
              emptyText={role === "BETA_MANAGER" ? "No eligible Manager has completed 216 confirmed customers yet." : "Tap Refresh to load possible sponsors."}
              onSelect={setSponsorId}
              renderLabel={(user: any) => `${user.name} - ${formatRole(user.role)} - ${user.phone}${role === "BETA_MANAGER" ? ` - ${betaEligibilityLabel(user)}` : ""}`}
            />
          </>
        )}
        {role === "BETA_MANAGER" && session.user.role === "MANAGER" ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{selfBetaEligibility?.canCreateBetaManager ? "Beta Manager unlocked" : "Beta Manager locked"}</Text>
            <Text style={styles.infoText}>
              {selfBetaEligibility?.hasBetaManager
                ? "You already have a Beta Manager."
                : `You can add a Beta Manager after completing 216 confirmed customers. Current progress: ${betaProgressText}.`}
            </Text>
          </View>
        ) : null}
        <PrimaryButton label={session.user.role === "ADMIN" ? "Create user" : "Submit for Admin approval"} onPress={createDownline} loading={loading} disabled={createDisabled} />
      </View>
 
      {loading && <ActivityIndicator color={colors.brand600} />}
      {downline.map((user) => (
        <ListItem key={user.id} title={user.name} subtitle={`${formatRole(user.role)} - ${user.phone}`} right={user.status} />
      ))}
    </ScrollView>
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
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  segment: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 10,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  segmentText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.white
  },
  infoBox: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 12
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 4
  },
  infoText: {
    fontSize: 14,
    color: colors.slate700
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 12
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  consentBoxChecked: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  consentCheck: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  },
  consentText: {
    flex: 1,
    color: colors.slate700,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  }
});
