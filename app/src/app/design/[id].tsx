import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import GardenSvg, { type Mode } from '@/components/GardenSvg';
import { Button, Card, Chip, SampleBanner } from '@/components/ui';
import { plantById } from '@/data/plants';
import { useStore } from '@/data/store';
import { colors, space, type } from '@/theme';

const MAX_W = 560;

// Screen 3: Your design (concept picture and measured plan)
export default function Design() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getGarden } = useStore();
  const garden = getGarden(id);
  const [mode, setMode] = useState<Mode>('concept');
  const { width } = useWindowDimensions();
  const drawW = Math.min(width, MAX_W) - space.lg * 2;

  if (!garden) {
    return (
      <View style={styles.page}>
        <Text style={type.body}>This garden isn't here any more.</Text>
        <Button title="Back to my gardens" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: garden.title }} />
      <View style={styles.tabs}>
        <Chip label="Concept" selected={mode === 'concept'} onPress={() => setMode('concept')} />
        <Chip label="Technical plan" selected={mode === 'plan'} onPress={() => setMode('plan')} />
      </View>

      <View style={styles.drawing}>
        <GardenSvg garden={garden} width={drawW} mode={mode} annotate={mode === 'plan'} />
      </View>
      {mode === 'concept' && (
        <SampleBanner text="Concept preview. The full app will paint a realistic picture from this plan with an image AI." />
      )}

      <Button title="Edit plan" onPress={() => router.push(`/edit/${garden.id}`)} />

      <Card style={{ gap: space.sm }}>
        <Text style={type.label}>Plant schedule</Text>
        {garden.plants.map((p, i) => {
          const info = plantById(p.plantId);
          if (!info) return null;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => router.push(`/plant/${info.id}`)}
              style={({ pressed }) => [styles.plantRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[type.body, styles.num]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={type.body}>{info.commonName}</Text>
                <Text style={[type.small, { fontStyle: 'italic' }]}>{info.latinName}</Text>
              </View>
              <Text style={[type.small, styles.tabular]}>× {p.quantity}</Text>
              <Text style={[type.small, styles.tabular, { width: 52, textAlign: 'right' }]}>{info.spreadM.toFixed(1)} m</Text>
            </Pressable>
          );
        })}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Text style={type.label}>Notes</Text>
        {garden.assumptions.map((a, i) => (
          <Text key={i} style={type.small}>{i + 1}. {a}</Text>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  tabs: { flexDirection: 'row', gap: space.sm },
  drawing: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  num: { width: 22, color: colors.muted, fontVariant: ['tabular-nums'] },
  tabular: { fontVariant: ['tabular-nums'] },
});
