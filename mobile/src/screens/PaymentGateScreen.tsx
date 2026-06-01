import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Clipboard,
  Alert,
  Pressable,
  ActivityIndicator,
  Linking
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { colors } from "../constants/theme";
import { apiRequest } from "../services/api";
import { Input, PrimaryButton } from "../components/UI/FormControls";

// Configure UPI ID & Fee
const UPI_ID = "keralaayurvedh@upi";
const FEE_AMOUNT = 299;

export function PaymentGateScreen({
  applicantData,
  role,
  addedByUserId,
  sessionToken,
  onSuccess,
  onCancel
}: {
  applicantData: any;
  role: string;
  addedByUserId?: string | null;
  sessionToken?: string | null;
  onSuccess: (verificationId: string) => void;
  onCancel: () => void;
}) {
  const [transactionId, setTransactionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    mimeType: string;
    base64: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      if (file.size && file.size > maxSizeBytes) {
        Alert.alert("Error", "Please select a screenshot below 5 MB.");
        return;
      }

      const fileObj = new File(file.uri);
      const base64 = await fileObj.base64();

      setSelectedFile({
        name: file.name ?? `screenshot-${Date.now()}`,
        mimeType: file.mimeType ?? "image/jpeg",
        base64
      });
    } catch (err) {
      Alert.alert("File Error", "Could not load selected image.");
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const requestBody = {
        applicantData,
        role,
        transactionId: transactionId.trim() || null,
        screenshot: selectedFile,
        addedByUserId: addedByUserId || null
      };

      const result = await apiRequest<{ ok: boolean; message: string; verificationId: string }>(
        "/payments/submit",
        {
          method: "POST",
          headers: sessionToken
            ? { Authorization: `Bearer ${sessionToken}` }
            : {},
          body: JSON.stringify(requestBody)
        }
      );

      Alert.alert("Payment intent submitted", result.message);
      onSuccess(result.verificationId);
    } catch (error) {
      Alert.alert("Submission Failed", error instanceof Error ? error.message : "Could not submit payment info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.brandTitle}>Kerala Ayurvedh</Text>
        <View style={styles.divider} />

        {/* Promo text */}
        <Text style={styles.subtext}>
          Make ₹{FEE_AMOUNT} payment and become a{"\n"}Kerala Ayurvedh Representative
        </Text>
        <View style={styles.divider} />

        {/* Pay via UPI Info */}
        <Text style={styles.paymentMethodTitle}>Pay via UPI</Text>
        <View style={styles.upiRow}>
          <Text style={styles.upiText}>UPI ID: {UPI_ID}</Text>
          <Pressable style={styles.copyButton} onPress={handleCopy}>
            <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.upiAppButton,
            pressed && styles.upiAppButtonPressed
          ]}
          onPress={async () => {
            const upiUrl = "upi://pay?pa=keralaayurvedh@upi&pn=Kerala%20Ayurvedh&am=299&cu=INR";
            try {
              const supported = await Linking.canOpenURL(upiUrl);
              if (supported) {
                await Linking.openURL(upiUrl);
              } else {
                Alert.alert(
                  "UPI App Not Found",
                  "We could not detect any installed UPI applications (GPay, PhonePe, Paytm) on your device. Please copy the UPI ID and pay manually."
                );
              }
            } catch (err) {
              Alert.alert("Error", "An error occurred while launching your UPI app. Please try manual payment.");
            }
          }}
        >
          <Text style={styles.upiAppButtonText}>Pay via UPI App (GPay/PhonePe/Paytm)</Text>
        </Pressable>

        <View style={styles.subdivider} />

        {/* Action guidelines */}
        <Text style={styles.instructionTitle}>After paying, enter your UTR / Transaction ID below:</Text>
        
        {/* Transaction ID input */}
        <Input
          label="Transaction Reference ID (UTR / Txn ID) - Optional"
          placeholder="Optional — helps speed up verification"
          value={transactionId}
          onChangeText={setTransactionId}
        />

        {/* Screenshot picker */}
        <Text style={styles.inputLabel}>Upload Payment Screenshot - Optional</Text>
        <View style={styles.pickerRow}>
          <Pressable style={styles.pickerButton} onPress={handleFilePick}>
            <Text style={styles.pickerButtonText}>
              {selectedFile ? "Change Screenshot" : "Attach Screenshot"}
            </Text>
          </Pressable>
          <Text style={styles.pickerMutedHint}>
            {selectedFile ? selectedFile.name : "Optional — attach if you want faster approval"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand600} style={{ marginVertical: 12 }} />
        ) : (
          <PrimaryButton label="Submit for Verification" onPress={handleSubmit} />
        )}

        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel & Go Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: "center",
    backgroundColor: colors.slate50,
    width: "100%",
    height: "100%"
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.brand700,
    textAlign: "center",
    letterSpacing: 2
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: 12
  },
  subtext: {
    fontSize: 16,
    color: colors.slate700,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "800"
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
    marginBottom: 6
  },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12
  },
  upiText: {
    color: colors.slate700,
    fontWeight: "800",
    fontSize: 14
  },
  copyButton: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  copyButtonText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "800"
  },
  subdivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 16
  },
  instructionTitle: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "700",
    marginBottom: 10,
    lineHeight: 18
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    width: "100%"
  },
  pickerButton: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pickerButtonText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "700"
  },
  pickerMutedHint: {
    flex: 1,
    color: colors.slate500,
    fontSize: 11,
    lineHeight: 14
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10
  },
  cancelButtonText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "600"
  },
  upiAppButton: {
    backgroundColor: colors.brand600,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: colors.brand600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  upiAppButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  upiAppButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5
  }
});
