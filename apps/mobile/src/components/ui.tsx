import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radius, space, useColors } from '@/lib/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Peças de interface partilhadas, com o mesmo aspeto da web (cartões brancos, verde primário). */

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[styles.sectionLabel, { color: c.muted }]}>{children}</Text>;
}

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  icon,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.primary, fg: c.primaryFg, border: c.primary },
    secondary: { bg: c.card, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.muted, border: 'transparent' },
    destructive: { bg: c.destructiveSoft, fg: c.destructive, border: 'transparent' },
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'lg' ? 20 : 17} color={palette.fg} />
      ) : null}
      <Text style={[styles.buttonText, size === 'lg' && styles.buttonTextLg, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Botão só com ícone (área de toque de 44 pt, como recomendam as guidelines). */
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: c.mutedBg }, disabled && { opacity: 0.35 }]}
    >
      <Ionicons name={icon} size={20} color={color ?? c.text} />
    </Pressable>
  );
}

export type InputRef = React.ComponentRef<typeof TextInput>;

type FieldProps = TextInputProps & {
  ref?: React.Ref<InputRef>;
  label: string;
  /** Esconde o rótulo visível (continua a ser lido pelo leitor de ecrã). */
  labelHidden?: boolean;
  icon: IconName;
  invalid?: boolean;
  trailing?: React.ReactNode;
};

export function TextField({ label, labelHidden, icon, invalid, trailing, style, ref, ...props }: FieldProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!labelHidden && <Text style={[styles.label, { color: c.text }]}>{label}</Text>}
      <View
        style={[
          styles.field,
          {
            backgroundColor: focused ? c.card : c.mutedBg,
            borderColor: invalid ? c.destructive : focused ? c.primary : c.border,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={c.muted} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {trailing}
      </View>
    </View>
  );
}

/** Campo de password com o "olho" para mostrar/esconder. */
export function PasswordField({
  showLabel,
  hideLabel,
  ref,
  ...props
}: Omit<FieldProps, 'icon' | 'trailing' | 'secureTextEntry'> & { showLabel: string; hideLabel: string }) {
  const c = useColors();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      icon="lock-closed-outline"
      secureTextEntry={!visible}
      // Com a password à vista, o teclado do Android sugeria-a e aprendia-a.
      // 'visible-password' desliga as sugestões e a aprendizagem do teclado.
      keyboardType={visible && Platform.OS === 'android' ? 'visible-password' : 'default'}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          hitSlop={10}
          onPress={() => setVisible((v) => !v)}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.muted} />
        </Pressable>
      }
      {...props}
    />
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View accessibilityRole="alert" style={[styles.errorBox, { backgroundColor: c.destructiveSoft }]}>
      <Text style={{ color: c.destructive, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

/** Seletor de opções lado a lado (ex.: Entrar / Criar conta, tipo de refeição). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.mutedBg }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: c.card }]]}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: selected ? '600' : '500', color: selected ? c.text : c.muted }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  sectionLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4, marginBottom: -4 },
  button: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonLg: { minHeight: 52 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextLg: { fontSize: 16 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '500' },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  errorBox: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 6 },
  segmentSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
