import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
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
import { Image } from 'expo-image';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { ZoomableDocumentView } from '@/components/ZoomableDocumentView';
import { type DriverDocument as SavedDriverDocument, useDriverAuth } from '@/context/driver-auth-context';
import {
  captureDriverDocumentImage,
  pickDriverImage,
  pickDriverPdf,
  type PickedDriverDocument,
} from '@/src/utils/documentPicker';
import { uploadFileToCloudinary } from '@/src/utils/fileUpload';

const teal = '#008080';
const PDF_PREVIEW_PAGE_LIMIT = 8;

type DocumentStatus = 'approved' | 'review' | 'missing' | 'rejected';
type DriverDocumentType = 'license' | 'insurance' | 'registration';

type UploadDocument = {
  id: DriverDocumentType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: DocumentStatus;
  updatedAt: string;
  fileUrl?: string;
  rejectionReason?: string;
};

const documentDefinitions = [
  {
    id: 'license',
    title: 'Driver License',
    subtitle: 'Front and back images of your valid license',
    icon: 'id-card-outline',
  },
  {
    id: 'insurance',
    title: 'Vehicle Insurance',
    subtitle: 'Active insurance document for your registered car',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'registration',
    title: 'Vehicle Registration',
    subtitle: 'Registration certificate matching your license plate',
    icon: 'document-text-outline',
  },
] as const;

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
  rejected: {
    label: 'REJECTED',
    color: '#C13B3B',
    backgroundColor: '#FFF4F4',
    icon: 'close-circle-outline' as const,
  },
};

const isPdfUrl = (url?: string) =>
  Boolean(url && (/\.pdf($|[?#])/i.test(url) || /\/upload\/.+\.(pdf|PDF)([?#].*)?$/i.test(url)));

const buildCloudinaryPdfPageUrl = (url: string, page: number) => {
  if (!url.includes('/upload/')) {
    return null;
  }

  const [baseUrl, query = ''] = url.split('?');
  const transformedBase = (
    /\/(?:image|raw)\/upload\//.test(baseUrl)
      ? baseUrl.replace(/\/(?:image|raw)\/upload\//, `/image/upload/pg_${page},f_jpg,q_auto,w_1400/`)
      : baseUrl.replace('/upload/', `/upload/pg_${page},f_jpg,q_auto,w_1400/`)
  ).replace(/\.pdf$/i, '.jpg');

  return query ? `${transformedBase}?${query}` : transformedBase;
};

const buildPdfPreviewPages = (url: string) =>
  Array.from({ length: PDF_PREVIEW_PAGE_LIMIT }, (_, index) => index + 1)
    .map((page) => ({ page, uri: buildCloudinaryPdfPageUrl(url, page) }))
    .filter((item): item is { page: number; uri: string } => Boolean(item.uri));

const buildDocumentsFromDriver = (savedDocuments: SavedDriverDocument[] = []) =>
  documentDefinitions.map((document) => {
    const savedDocument = savedDocuments.find((item) => item.documentType === document.id);

    if (!savedDocument) {
      return {
        ...document,
        status: 'missing' as const,
        updatedAt: 'Required before approval',
      };
    }

    const submittedLabel = savedDocument.submittedAt
      ? `Submitted ${new Date(savedDocument.submittedAt).toLocaleDateString()}`
      : 'Submitted for review';
    const approvedLabel = savedDocument.reviewedAt
      ? `Approved ${new Date(savedDocument.reviewedAt).toLocaleDateString()}`
      : submittedLabel;
    const rejectedLabel = savedDocument.reviewedAt
      ? `Rejected ${new Date(savedDocument.reviewedAt).toLocaleDateString()}`
      : submittedLabel;

    return {
      ...document,
      status: savedDocument.status,
      updatedAt:
        savedDocument.status === 'approved'
          ? approvedLabel
          : savedDocument.status === 'rejected'
            ? rejectedLabel
            : savedDocument.status === 'review'
              ? submittedLabel
              : 'Required before approval',
      fileUrl: savedDocument.fileUrl,
      rejectionReason: savedDocument.rejectionReason,
    };
  });

export default function DriverDocumentUploadsScreen() {
  const { driver, updateDocument, refreshDriver } = useDriverAuth();
  const [uploadingDocumentId, setUploadingDocumentId] = useState<DriverDocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<UploadDocument | null>(null);
  const documents = useMemo(() => buildDocumentsFromDriver(driver?.documents), [driver?.documents]);

  const requiredCount = documents.length;
  const completeCount = documents.filter((document) => document.status === 'approved').length;

  const submitPickedDocument = async (documentId: DriverDocumentType, pickedDocument: PickedDriverDocument | null) => {
    if (!pickedDocument) {
      return;
    }

    setUploadingDocumentId(documentId);

    try {
      const fileUrl = await uploadFileToCloudinary(pickedDocument);
      await updateDocument(documentId, fileUrl);
      Alert.alert('Document submitted', 'This document has been saved and submitted for review.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit document.';
      Alert.alert('Upload failed', message);
    } finally {
      setUploadingDocumentId(null);
    }
  };

  const handleUpload = async (documentId: DriverDocumentType) => {
    Alert.alert('Upload document', 'Choose how you want to add this document.', [
      {
        text: 'Upload PDF',
        onPress: async () => {
          const pickedDocument = await pickDriverPdf();
          await submitPickedDocument(documentId, pickedDocument);
        },
      },
      {
        text: 'Upload Image',
        onPress: async () => {
          const pickedDocument = await pickDriverImage();
          await submitPickedDocument(documentId, pickedDocument);
        },
      },
      {
        text: 'Use Camera',
        onPress: async () => {
          const pickedDocument = await captureDriverDocumentImage();
          await submitPickedDocument(documentId, pickedDocument);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleViewDocument = (document: UploadDocument) => {
    if (!document.fileUrl) {
      Alert.alert('No document found', 'Upload this document before trying to view it.');
      return;
    }

    setPreviewDocument(document);
  };

  const handleOpenDocumentLink = async (fileUrl?: string) => {
    if (!fileUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (!canOpen) {
        throw new Error('This document link cannot be opened on this device.');
      }

      await Linking.openURL(fileUrl);
    } catch (error) {
      Alert.alert('Unable to open document', error instanceof Error ? error.message : 'Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RefreshableScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onRefreshPage={refreshDriver}>
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
          <DocumentCard
            key={document.id}
            document={document}
            isUploading={uploadingDocumentId === document.id}
            onUpload={() => handleUpload(document.id)}
            onView={() => handleViewDocument(document)}
          />
        ))}

        <Text style={styles.sectionTitle}>UPLOAD GUIDELINES</Text>

        <View style={styles.groupCard}>
          <GuidelineRow icon="camera-outline" text="Use a bright photo where every corner of the document is visible." />
          <GuidelineRow icon="scan-outline" text="Avoid blur, glare, cropped IDs, or screenshots from messaging apps." />
          <GuidelineRow icon="lock-closed-outline" text="Your documents are used only for driver verification and safety checks." />
        </View>
      </RefreshableScrollView>

      <DocumentPreviewModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onOpenExternal={handleOpenDocumentLink}
      />
    </SafeAreaView>
  );
}

function DocumentCard({
  document,
  isUploading,
  onUpload,
  onView,
}: {
  document: UploadDocument;
  isUploading: boolean;
  onUpload: () => void;
  onView: () => void;
}) {
  const meta = statusMeta[document.status];
  const actionLabel = document.status === 'missing' ? 'Upload' : 'Replace';
  const hasDocumentFile = Boolean(document.fileUrl);

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
        <View style={styles.updatedWrap}>
          <Text style={styles.updatedText}>{document.updatedAt}</Text>
          {document.status === 'rejected' && document.rejectionReason ? (
            <Text style={styles.rejectionText}>{document.rejectionReason}</Text>
          ) : null}
        </View>
        <View style={styles.documentActionRow}>
          {hasDocumentFile ? (
            <Pressable style={styles.viewButton} onPress={onView}>
              <Ionicons name="eye-outline" size={15} color="#102A28" />
              <Text style={styles.viewButtonText}>View</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={onUpload}
            disabled={isUploading}
          >
            <Ionicons name="cloud-upload-outline" size={15} color={teal} />
            <Text style={styles.uploadButtonText}>{isUploading ? 'Uploading' : actionLabel}</Text>
          </Pressable>
        </View>
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

function DocumentPreviewModal({
  document,
  onClose,
  onOpenExternal,
}: {
  document: UploadDocument | null;
  onClose: () => void;
  onOpenExternal: (fileUrl?: string) => void;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [failedPages, setFailedPages] = useState<number[]>([]);

  React.useEffect(() => {
    if (!document?.fileUrl) return;

    setLoadedPages(0);
    setFailedPages([]);
    setPdfLoading(isPdfUrl(document.fileUrl));
  }, [document?.fileUrl]);

  const fileUrl = document?.fileUrl;
  const pdfPages = fileUrl && isPdfUrl(fileUrl) ? buildPdfPreviewPages(fileUrl) : [];
  const isPdf = Boolean(fileUrl && isPdfUrl(fileUrl));
  const hasPdfPreview = pdfPages.length > 0;

  return (
    <Modal visible={Boolean(document)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <View style={styles.previewModalCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderText}>
              <Text style={styles.previewEyebrow}>DOCUMENT PREVIEW</Text>
              <Text style={styles.previewTitle}>{document?.title || 'Driver Document'}</Text>
              <Text style={styles.previewSubtitle}>{document?.updatedAt || 'Uploaded document'}</Text>
            </View>
            <Pressable style={styles.previewCloseButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#102A28" />
            </Pressable>
          </View>

          <View style={styles.previewBody}>
            {fileUrl ? (
              isPdf ? (
                <View style={styles.pdfPreviewWrap}>
                  {hasPdfPreview ? (
                    <ScrollView style={styles.pdfPageScroll} contentContainerStyle={styles.pdfPageScrollContent}>
                      {pdfPages.map((page) => {
                        const isFailed = failedPages.includes(page.page);

                        if (isFailed) return null;

                        return (
                          <View key={`${page.uri}-${page.page}`} style={styles.pdfPageCard}>
                            <Text style={styles.pdfPageLabel}>Page {page.page}</Text>
                            <ZoomableDocumentView>
                              <Image
                                source={{ uri: page.uri }}
                                style={styles.pdfPageImage}
                                contentFit="contain"
                                onLoad={() => {
                                  setLoadedPages((count) => {
                                    const nextCount = count + 1;
                                    if (nextCount > 0) setPdfLoading(false);
                                    return nextCount;
                                  });
                                }}
                                onError={() => {
                                  setFailedPages((current) => {
                                    if (current.includes(page.page)) return current;
                                    const next = [...current, page.page];
                                    if (next.length >= pdfPages.length && loadedPages === 0) {
                                      setPdfLoading(false);
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </ZoomableDocumentView>
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <PreviewEmptyState
                      icon="document-text-outline"
                      title="PDF preview unavailable"
                      text="This PDF cannot be converted into an in-app preview."
                    />
                  )}

                  {pdfLoading ? (
                    <View style={styles.pdfLoadingOverlay}>
                      <ActivityIndicator size="small" color={teal} />
                      <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <ZoomableDocumentView style={styles.imagePreview}>
                  <Image source={{ uri: fileUrl }} style={styles.imagePreview} contentFit="contain" />
                </ZoomableDocumentView>
              )
            ) : (
              <PreviewEmptyState
                icon="cloud-offline-outline"
                title="No document found"
                text="Upload this document before trying to preview it."
              />
            )}
          </View>

          <View style={styles.previewFooter}>
            <Text style={styles.previewHint} numberOfLines={2}>
              {isPdf && hasPdfPreview
                ? loadedPages > 0
                  ? `${loadedPages} page${loadedPages === 1 ? '' : 's'} loaded.`
                  : 'Generating preview...'
                : 'Preview shown from your uploaded document.'}
            </Text>
            <Pressable style={styles.openExternalButton} onPress={() => onOpenExternal(fileUrl)}>
              <Ionicons name="open-outline" size={15} color="#FFFFFF" />
              <Text style={styles.openExternalButtonText}>Open</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PreviewEmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.previewEmptyState}>
      <View style={styles.previewEmptyIcon}>
        <Ionicons name={icon} size={26} color={teal} />
      </View>
      <Text style={styles.previewEmptyTitle}>{title}</Text>
      <Text style={styles.previewEmptyText}>{text}</Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  updatedWrap: {
    flex: 1,
    gap: 4,
  },
  updatedText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectionText: {
    color: '#C13B3B',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  documentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  viewButtonText: {
    color: '#102A28',
    fontSize: 12,
    fontWeight: '800',
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
  uploadButtonDisabled: {
    opacity: 0.6,
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
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 21, 19, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  previewModalCard: {
    flex: 1,
    maxHeight: 720,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EFED',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  previewEyebrow: {
    color: teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  previewTitle: {
    color: '#102A28',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  previewSubtitle: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  previewCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewBody: {
    flex: 1,
    backgroundColor: '#F7FBFA',
    padding: 12,
  },
  imagePreview: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
  },
  pdfPreviewWrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pdfPageScroll: {
    flex: 1,
  },
  pdfPageScrollContent: {
    padding: 12,
    gap: 12,
  },
  pdfPageCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
  },
  pdfPageLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '800',
  },
  pdfPageImage: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#F7FBFA',
  },
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247, 251, 250, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfLoadingText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '800',
  },
  previewEmptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#E7F5F3',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewEmptyTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 5,
    textAlign: 'center',
  },
  previewEmptyText: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewFooter: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E3EFED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewHint: {
    flex: 1,
    color: '#617C79',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  openExternalButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: teal,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openExternalButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
