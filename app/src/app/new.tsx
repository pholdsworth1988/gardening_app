import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, SampleBanner } from '@/components/ui';
import { makeLayoutFromSketch } from '@/data/sample';
import { useStore } from '@/data/store';
import type { Aspect } from '@/data/types';
import { colors, radius, space, type } from '@/theme';

const ASPECTS: Aspect[] = ['North', 'East', 'South', 'West'];

// Screen 2: New garden
export default function NewGarden() {
  const router = useRouter();
  const { saveGarden } = useStore();
  const [sketchUri, setSketchUri] = useState<string | null>(null);
  const [title, setTitle] = useState('My garden');
  const [width, setWidth] = useState('8');
  const [depth, setDepth] = useState('12');
  const [aspect, setAspect] = useState<Aspect>('South');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (useCamera: boolean) => {
    setError(null);
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Hedge needs the camera to photograph your sketch. You can allow it in Settings, or choose a photo instead.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const res = useCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) setSketchUri(res.assets[0].uri);
    } catch {
      setError("Couldn't open the camera here. Choose a photo instead.");
    }
  };

  const w = parseFloat(width);
  const d = parseFloat(depth);
  const sizeOk = w >= 2 && w <= 60 && d >= 2 && d <= 60;

  const create = () => {
    if (!sizeOk) {
      setError('Enter a width and depth between 2 and 60 metres.');
      return;
    }
    setWorking(true);
    // Stand-in for the Claude API call: wait briefly, then use the sample layout at this size.
    setTimeout(() => {
      const id = `g${Date.now()}`;
      saveGarden(makeLayoutFromSketch({ id, title: title.trim() || 'My garden', widthM: w, depthM: d, aspect, sketchUri }));
      setWorking(false);
      router.replace(`/design/${id}`);
    }, 1800);
  };

  if (working) {
    return (
      <View style={[styles.page, { justifyContent: 'center', alignItems: 'center', gap: space.lg }]}>
        <ActivityIndicator size="large" color={colors.hedge} />
        <Text style={type.heading}>Reading your sketch</Text>
        <Text style={[type.small, { textAlign: 'center', maxWidth: 280 }]}>
          Finding beds, paths and plants, and measuring them against your garden size.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={type.label}>1. Your sketch</Text>
        {sketchUri ? (
          <Image source={{ uri: sketchUri }} style={styles.sketch} resizeMode="cover" accessibilityLabel="Your sketch" />
        ) : (
          <View style={[styles.sketch, styles.sketchEmpty]}>
            <Text style={[type.small, { textAlign: 'center' }]}>Draw your garden on paper, with beds, paths and anything you want to keep.</Text>
          </View>
        )}
        <View style={styles.row}>
          <Button title="Take photo" onPress={() => pick(true)} style={{ flex: 1 }} variant="secondary" />
          <Button title="Choose photo" onPress={() => pick(false)} style={{ flex: 1 }} variant="secondary" />
        </View>

        <Text style={type.label}>2. About the garden</Text>
        <Field label="Name">
          <TextInput value={title} onChangeText={setTitle} style={styles.input} />
        </Field>
        <View style={styles.row}>
          <Field label="Width (m)" style={{ flex: 1 }}>
            <TextInput value={width} onChangeText={setWidth} keyboardType="decimal-pad" style={styles.input} />
          </Field>
          <Field label="Depth (m)" style={{ flex: 1 }}>
            <TextInput value={depth} onChangeText={setDepth} keyboardType="decimal-pad" style={styles.input} />
          </Field>
        </View>
        <Field label="Which way does it face?">
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {ASPECTS.map((a) => <Chip key={a} label={a} selected={aspect === a} onPress={() => setAspect(a)} />)}
          </View>
        </Field>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <SampleBanner text="Proof of concept: this uses a sample layout at your size instead of reading the sketch." />
        <Button title="Create my design" onPress={create} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ gap: space.xs }, style]}>
      <Text style={type.small}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  row: { flexDirection: 'row', gap: space.sm },
  sketch: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface },
  sketchEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: colors.ink },
});
