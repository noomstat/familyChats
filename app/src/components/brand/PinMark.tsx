import React from 'react';
import { Text, View } from 'react-native';
import { colors, fontFamily, shadow } from '../../theme';

/** Small coral pin-R lockup used next to the "FamilyChats" wordmark in headers. */
export function PinMark({ size = 30 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          backgroundColor: colors.coral500,
          borderTopLeftRadius: size / 2,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          borderBottomLeftRadius: 0,
          borderWidth: 2.5,
          borderColor: colors.white,
          transform: [{ rotate: '45deg' }],
          ...shadow.pin,
        }}
      />
      <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.white, fontFamily: fontFamily.display, fontSize: size * 0.48 }}>R</Text>
      </View>
    </View>
  );
}
