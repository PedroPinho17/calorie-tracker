import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, IconButton } from '@/components/ui';
import { ApiError, foodByBarcode } from '@/lib/api';
import { useDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { radius, space, useColors } from '@/lib/theme';

/** EAN-8, EAN-13, UPC-A, UPC-E: só dígitos. Outros conteúdos (QR com links, etc.) são ignorados. */
const BARCODE = /^\d{8,14}$/;

type State = { kind: 'scanning' } | { kind: 'looking' } | { kind: 'notFound'; code: string } | { kind: 'error'; message: string };

/** Lê o código de barras de um produto e adiciona-o à refeição (parâmetro then: 'meal' | 'back'). */
export default function ScanScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t, errorMessage } = useI18n();
  const draft = useDraft();
  const { then } = useLocalSearchParams<{ then?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ kind: 'scanning' });
  // A câmara dispara o mesmo código várias vezes por segundo: trata só o primeiro.
  const busy = useRef(false);

  async function onScanned(data: string) {
    if (busy.current || !BARCODE.test(data)) return;
    busy.current = true;
    setState({ kind: 'looking' });
    try {
      draft.addFood(await foodByBarcode(data), 100);
      if (then === 'meal') router.replace('/meal');
      else router.back();
    } catch (err) {
      setState(
        err instanceof ApiError && err.status === 404
          ? { kind: 'notFound', code: data }
          : { kind: 'error', message: errorMessage(err) },
      );
    }
  }

  function scanAgain() {
    busy.current = false;
    setState({ kind: 'scanning' });
  }

  const close = (
    <View style={[styles.closeWrap, { top: insets.top + space.sm }]}>
      <IconButton icon="close" label={t.app.cancel} color="#fff" onPress={() => router.back()} />
    </View>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={40} color={c.muted} />
        <Text style={[styles.message, { color: c.text }]}>{t.scan.permission}</Text>
        <Button title={t.scan.allow} icon="camera" onPress={requestPermission} />
        <Button variant="ghost" title={t.app.cancel} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={state.kind === 'scanning' ? ({ data }) => void onScanned(data) : undefined}
      />

      {/* Moldura de leitura */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>{t.scan.hint}</Text>
      </View>

      {close}

      {state.kind !== 'scanning' && (
        <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + space.lg }]}>
          {state.kind === 'looking' ? (
            <View style={styles.row}>
              <ActivityIndicator color={c.primary} />
              <Text style={{ color: c.text, fontSize: 15 }}>{t.scan.looking}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.message, { color: c.text }]}>
                {state.kind === 'notFound' ? t.scan.notFound(state.code) : state.message}
              </Text>
              <Button
                icon="search-outline"
                title={t.scan.searchInstead}
                onPress={() => router.replace({ pathname: '/search', params: { then: then ?? 'back' } })}
              />
              <Button variant="secondary" icon="barcode-outline" title={t.scan.again} onPress={scanAgain} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  closeWrap: {
    position: 'absolute',
    left: space.md,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  frame: {
    width: '78%',
    aspectRatio: 1.6,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.xl,
    gap: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
});
