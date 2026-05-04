import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useResponsiveLayout } from '@/lib/responsive';

const teal = '#008080';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon = destructive ? 'alert-circle-outline' : 'shield-checkmark-outline',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const responsive = useResponsiveLayout();
  const actionColor = destructive ? '#C13B3B' : teal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { padding: responsive.modalPadding }]}>
        <View style={[styles.card, { padding: responsive.cardPadding }]}>
          <View style={[styles.iconWrap, { backgroundColor: destructive ? '#FFF4F4' : '#E7F5F3' }]}>
            <Ionicons name={icon} size={25} color={actionColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={[styles.actions, responsive.isTinyPhone ? styles.actionsStacked : null]}>
            <Pressable style={[styles.button, styles.cancelButton]} disabled={loading} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton, { backgroundColor: actionColor }, loading ? styles.disabled : null]}
              disabled={loading}
              onPress={onConfirm}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 21, 19, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#102A28',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionsStacked: {
    flexDirection: 'column-reverse',
  },
  button: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
  },
  confirmButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cancelText: {
    color: '#617C79',
    fontSize: 13,
    fontWeight: '900',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.72,
  },
});
