import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, space, type } from '@/theme';

export function Button({ title, onPress, variant = 'primary', disabled, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && { backgroundColor: colors.hedge },
        variant === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
        variant === 'danger' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.hedge, borderColor: colors.hedge }]}
    >
      <Text style={{ color: selected ? '#fff' : colors.ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SampleBanner({ text }: { text: string }) {
  return (
    <View style={styles.banner}>
      <Text style={[type.small, { color: colors.hedge }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.md, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '600' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  banner: { backgroundColor: colors.hedgeSoft, borderRadius: radius.sm, paddingVertical: space.sm, paddingHorizontal: space.md },
});
