import { Image } from 'expo-image';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/screen-background';
import { colors, fonts, layout, spacing, typography } from '@/theme';

const GLOWS = [
  { left: '82%', top: '31%' },
  { left: '8%', top: '53%' },
  { left: '19%', top: '16%' },
  { left: '8%', top: '89%' },
  { left: '94%', top: '70%' },
] as const;

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
}>;

export function AuthLayout({ title, footerPrompt, footerAction, onFooterPress, children }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenBackground glows={[...GLOWS]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 62 },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.spacer} />
          <View style={styles.hero}>
            <Image contentFit="contain" source={require('@/assets/icons/logo.svg')} style={styles.logo} accessibilityLabel="Cashen" />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {children}
          <View style={styles.spacer} />
          <Pressable accessibilityRole="link" onPress={onFooterPress} style={styles.footer}>
            <Text style={styles.footerText}>
              {footerPrompt} <Text style={styles.footerLink}>{footerAction}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  spacer: { flex: 1, minHeight: spacing.xxl },
  hero: { alignItems: 'center', gap: 37, marginBottom: 31 },
  logo: { width: 78, height: 49.74 },
  title: { ...typography.displayHero, color: colors.brand, textAlign: 'center' },
  footer: {
    alignSelf: 'center',
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  footerText: { ...typography.bodyLink, color: colors.textInverse },
  footerLink: { fontFamily: fonts.medium, color: colors.brand, textDecorationLine: 'underline' },
});
