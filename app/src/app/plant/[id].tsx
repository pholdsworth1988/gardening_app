import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { PLANTS, plantById } from '@/data/plants';
import { colors, radius, space, type } from '@/theme';

// Screen 5: Plant details
export default function PlantDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = plantById(id);

  if (!p) {
    return (
      <View style={styles.page}>
        <Text style={type.body}>We don't have details for this plant yet.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const alternatives = PLANTS.filter(
    (o) => o.id !== p.id && o.sun.some((s) => p.sun.includes(s)) && Math.abs(o.spreadM - p.spreadM) <= 0.6,
  ).slice(0, 3);

  const facts: [string, string][] = [
    ['Type', p.type],
    ['Mature size', `${p.heightM.toFixed(1)} m tall, ${p.spreadM.toFixed(1)} m wide`],
    ['Plant apart', `${p.spacingM.toFixed(2)} m`],
    ['Light', p.sun.join(' or ')],
    ['Water', p.water],
    ['Flowers', p.flowering],
  ];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: p.commonName }} />
      <View style={[styles.swatch, { backgroundColor: p.colour }]}>
        <Text style={styles.swatchText}>{p.commonName}</Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={type.title}>{p.commonName}</Text>
        <Text style={[type.body, { fontStyle: 'italic', color: colors.muted }]}>{p.latinName}</Text>
      </View>

      <Card style={{ gap: space.sm }}>
        {facts.map(([k, v]) => (
          <View key={k} style={styles.fact}>
            <Text style={[type.small, { width: 110 }]}>{k}</Text>
            <Text style={[type.body, { flex: 1 }]}>{v}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Text style={type.label}>Tip</Text>
        <Text style={type.body}>{p.note}</Text>
      </Card>

      {alternatives.length > 0 && (
        <Card style={{ gap: space.sm }}>
          <Text style={type.label}>Similar plants</Text>
          {alternatives.map((a) => (
            <Text key={a.id} style={[type.body, { color: colors.hedge }]} onPress={() => router.push(`/plant/${a.id}`)}>
              {a.commonName}
            </Text>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  swatch: { height: 140, borderRadius: radius.lg, justifyContent: 'flex-end', padding: space.lg },
  swatchText: { color: '#fff', fontSize: 15, fontWeight: '600', opacity: 0.9 },
  fact: { flexDirection: 'row', gap: space.md },
});
