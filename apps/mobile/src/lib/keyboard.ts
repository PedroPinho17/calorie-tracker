import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado visível (0 quando está fechado).
 *
 * No Android em modo edge-to-edge (o padrão do Expo), o ecrã não encolhe quando o teclado
 * abre e o KeyboardAvoidingView não ajuda. Os ecrãs com formulários somam esta altura ao
 * fundo do ScrollView, para poderem fazer scroll até ao campo ativo.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
