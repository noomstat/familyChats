import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

export type PresenceState = 'live' | 'online' | 'away' | 'offline';

export interface PresenceDotProps {
  state?: PresenceState;
  size?: number;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
}

const COLORS: Record<PresenceState, string> = {
  live: colors.ping500,
  online: colors.ping500,
  away: colors.amber500,
  offline: colors.ink300,
};

/** Rally PresenceDot — pulsing status dot. `state="live"` pulses green. */
export function PresenceDot({ state = 'online', size = 10, pulse, style }: PresenceDotProps) {
  const c = COLORS[state] ?? COLORS.offline;
  const doPulse = pulse ?? state === 'live';
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!doPulse) return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [doPulse, anim]);

  const scale = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.4, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0, 0] });

  return (
    <View style={[{ width: size, height: size }, style]}>
      {doPulse && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c,
            transform: [{ scale }],
            opacity,
          }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c }} />
    </View>
  );
}
