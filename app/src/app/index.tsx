import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import GardenSvg from '@/components/GardenSvg';
import { Button } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, radius, space, type } from '@/theme';

// Screen 1: My gardens
export default function MyGardens() {
  const router = useRouter();
  const { gardens } = useStore();
  const { width } = useWindowDimensions();
  const thumbW = 88;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={type.title}>My gardens</Text>
        <Text style={type.small}>Turn a sketch of your garden into a plan you can build.</Text>
      </View>
      <FlatList
        data={gardens}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}
        ListEmptyComponent={
          <Text style={[type.body, { color: colors.muted }]}>No gardens yet. Start with a photo of your sketch.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/design/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.thumb}>
              <View style={{ marginLeft: -36, marginTop: -30 }}>
                <GardenSvg garden={item} width={thumbW + 50} mode="concept" showNumbers={false} thumbnail />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.heading}>{item.title}</Text>
              <Text style={type.small}>
                {item.widthM} × {item.depthM} m · {item.plants.length} plants · faces {item.aspect.toLowerCase()}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
          </Pressable>
        )}
      />
      <Button title="New garden" onPress={() => router.push('/new')} style={{ marginBottom: space.lg, maxWidth: width }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: space.lg, gap: space.lg },
  header: { gap: space.xs, paddingTop: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md,
  },
  thumb: { width: 88, height: 88, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: '#f3f0e6' },
});
