import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { colors, semantic, radius, shadow } from '../../theme';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  tone?: 'brand' | 'live';
  style?: StyleProp<ViewStyle>;
}

const WIDTH = 48;
const HEIGHT = 28;
const KNOB = 22;
const PAD = 3;

/** Rally Switch — toggle. Coral when on (or green for location toggles via tone="live"). */
export function Switch({ checked = false, onChange, disabled = false, tone = 'brand', style }: SwitchProps) {
  const onColor = tone === 'live' ? semantic.live : semantic.brand;
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: checked ? 1 : 0, useNativeDriver: true, bounciness: 10 }).start();
  }, [checked, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, WIDTH - KNOB - PAD * 2] });

  return (
    <Pressable
      disabled={disabled}
      onPress={() => !disabled && onChange && onChange(!checked)}
      style={[
        {
          width: WIDTH,
          height: HEIGHT,
          padding: PAD,
          borderRadius: radius.full,
          backgroundColor: checked ? onColor : colors.ink200,
          opacity: disabled ? 0.5 : 1,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: colors.white,
          transform: [{ translateX }],
          ...shadow.sm,
        }}
      />
    </Pressable>
  );
}
