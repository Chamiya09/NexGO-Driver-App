import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import RefreshableScrollView from '@/components/RefreshableScrollView';

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function AuthShell({ eyebrow, title, subtitle, children }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RefreshableScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.authWrap}>
            <View style={styles.brandHeader}>
              <View style={styles.logoMark}>
                <Ionicons name="car-sport" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandName}>NexGO</Text>
                <Text style={styles.brandCaption}>Driver</Text>
              </View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.content}>{children}</View>
          </View>
        </RefreshableScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  keyboardWrap: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 24,
  },
  authWrap: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
    shadowColor: '#005D5D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  brandName: {
    color: '#123532',
    fontSize: 18,
    fontWeight: '900',
  },
  brandCaption: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eyebrow: {
    color: '#008080',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#123532',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 9,
    maxWidth: 300,
    textAlign: 'center',
  },
  content: {
    gap: 14,
  },
});
