import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const teal = '#008080';

type DocumentStatus = 'approved' | 'review' | 'missing';

type DriverDocument = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: DocumentStatus;
  updatedAt: string;
};

const initialDocuments: DriverDocument[] = [
  {
    id: 'license',
    title: 'Driver License',
    subtitle: 'Front and back images of your valid license',
    icon: 'id-card-outline',
    status: 'approved',
    updatedAt: 'Updated Apr 21, 2026',
  },
  {
    id: 'insurance',
    title: 'Vehicle Insurance',
    subtitle: 'Active insurance document for your registered car',
    icon: 'shield-checkmark-outline',
    status: 'review',
    updatedAt: 'Submitted Apr 22, 2026',
  },
  {
    id: 'registration',
    title: 'Vehicle Registration',
    subtitle: 'Registration certificate matching your license plate',
    icon: 'document-text-outline',
    status: 'missing',
    updatedAt: 'Required before approval',
  },
];

const statusMeta = {
  approved: {
    label: 'APPROVED',
    color: '#157A62',
    backgroundColor: '#E9F8EF',
    icon: 'checkmark-circle-outline' as const,
  },
  review: {
    label: 'IN REVIEW',
    color: '#9A6B00',
    backgroundColor: '#FFF7E0',
    icon: 'time-outline' as const,
  },
  missing: {
    label: 'MISSING',
    color: '#C13B3B',
    backgroundColor: '#FFF4F4',
    icon: 'alert-circle-outline' as const,
  },
};

export default function DriverDocumentUploadsScreen() {
  const [documents, setDocuments] = useState(initialDocuments);

  const requiredCount = documents.length;
  const completeCount = documents.filter((document) => document.status === 'approved').length;

  const handleUpload = (documentId: string) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? {
              ...document,
              status: 'review',
              updatedAt: 'Submitted just now',
            }
          : document
      )
    );
    Alert.alert('Document submitted', 'This placeholder marks the document as submitted for review.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#102A28" />
          </Pressable>
          <Text style={styles.topBarTitle}>Document Uploads</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="documents-outline" size={26} color={teal} />
            </View>

            <View style={styles.heroIdentity}>
              <Text style={styles.heroName}>Driver verification</Text>
              <Text style={styles.heroSubline}>
                {completeCount} of {requiredCount} documents approved
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completeCount / requiredCount) * 100}%` }]} />
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={15} color={teal} />
            <Text style={styles.heroBadgeText}>Verification required</Text>
          </View>

          <Text style={styles.heroHint}>Upload clear, readable documents so NexGO can keep driver approvals moving.</Text>
        </View>

        <Text style={styles.sectionTitle}>REQUIRED DOCUMENTS</Text>

        {documents.map((document) => (
          <DocumentCard key={document.id} document={document} onUpload={() => handleUpload(document.id)} />
        ))}

        <Text style={styles.sectionTitle}>UPLOAD GUIDELINES</Text>

        <View style={styles.groupCard}>
          <GuidelineRow icon="camera-outline" text="Use a bright photo where every corner of the document is visible." />
          <GuidelineRow icon="scan-outline" text="Avoid blur, glare, cropped IDs, or screenshots from messaging apps." />
          <GuidelineRow icon="lock-closed-outline" text="Your documents are used only for driver verification and safety checks." />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DocumentCard({ document, onUpload }: { document: DriverDocument; onUpload: () => void }) {
  const meta = statusMeta[document.status];
  const actionLabel = document.status === 'missing' ? 'Upload' : 'Replace';

  return (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View style={styles.documentLeft}>
          <View style={styles.documentIconWrap}>
            <Ionicons name={document.icon} size={21} color={teal} />
          </View>

          <View style={styles.documentTextWrap}>
            <Text style={styles.documentTitle}>{document.title}</Text>
            <Text style={styles.documentSubtitle}>{document.subtitle}</Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: meta.backgroundColor }]}>
          <Ionicons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.inlineDivider} />

      <View style={styles.documentFooter}>
        <Text style={styles.updatedText}>{document.updatedAt}</Text>
        <Pressable style={styles.uploadButton} onPress={onUpload}>
          <Ionicons name="cloud-upload-outline" size={15} color={teal} />
          <Text style={styles.uploadButtonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GuidelineRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.guidelineRow}>
      <View style={styles.guidelineIconWrap}>
        <Ionicons name={icon} size={17} color={teal} />
      </View>
      <Text style={styles.guidelineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  topBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#102A28',
    fontSize: 17,
    fontWeight: '900',
  },
  topBarSpacer: {
    width: 38,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIdentity: {
    flex: 1,
  },
  heroName: {
    color: '#102A28',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubline: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9E9E6',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: teal,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F5F3',
  },
  heroBadgeText: {
    color: teal,
    fontSize: 12,
    fontWeight: '700',
  },
  heroHint: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  documentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  documentLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 11,
  },
  documentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTextWrap: {
    flex: 1,
  },
  documentTitle: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  documentSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  statusPill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 11,
  },
  documentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  updatedText: {
    flex: 1,
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  uploadButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '800',
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  guidelineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineText: {
    flex: 1,
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});
