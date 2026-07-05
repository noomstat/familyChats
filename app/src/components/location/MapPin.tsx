import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily, shadow } from '../../theme';
import { Icon } from '../core/Icon';

export interface MapPinProps {
  src?: string;
  label?: string;
  icon?: string;
  size?: number;
  color?: string;
  live?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Rally MapPin — the coral teardrop marker. Holds an avatar image, initials,
 * or an icon. This is the brand's most recognizable shape.
 */
export function MapPin({ src, label, icon, size = 44, color = semantic.brand, live = false, style }: MapPinProps) {
  const inner = size - 8;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!live) return;
    anim.setValue(0);
    const loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [live, anim]);

  const scale = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.4, 1.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.35, 0, 0] });
  const pulseSize = size * 1.5;

  return (
    <View style={[{ width: size, height: size * 1.32 }, style]}>
      {live && (
        <Animated.View
          style={{
            position: 'absolute',
            left: size / 2 - pulseSize / 2,
            top: size / 2 - pulseSize / 2,
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            backgroundColor: semantic.live,
            opacity,
            transform: [{ scale }],
          }}
        />
      )}
      {/* teardrop */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          backgroundColor: color,
          borderTopLeftRadius: size / 2,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          borderBottomLeftRadius: 0,
          borderWidth: 3,
          borderColor: colors.white,
          transform: [{ rotate: '45deg' }],
          ...shadow.pin,
        }}
      />
      {/* inner content (counter-rotated) */}
      <View
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: src ? colors.white : 'rgba(255,255,255,0.18)',
        }}
      >
        {src ? (
          <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
        ) : icon ? (
          <Icon name={icon} size={inner * 0.55} color={colors.white} />
        ) : (
          <Text style={{ color: colors.white, fontFamily: fontFamily.displayBold, fontSize: inner * 0.42 }}>{label}</Text>
        )}
      </View>
    </View>
  );
}
