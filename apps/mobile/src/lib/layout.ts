import { useWindowDimensions } from 'react-native';
import { space } from './theme';

/** Largura máxima do conteúdo: em tablets o conteúdo fica centrado em vez de esticado. */
export const MAX_CONTENT_WIDTH = 640;

/** Margem lateral: 16 no telemóvel; em ecrãs largos, o que for preciso para centrar a coluna. */
export function useGutter() {
  const { width } = useWindowDimensions();
  return Math.max(space.lg, (width - MAX_CONTENT_WIDTH) / 2);
}
