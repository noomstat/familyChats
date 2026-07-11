import React, { useRef, useState } from 'react';
import { Pressable, StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { semantic, fontFamily, fontSize, control, radius, shadow } from '../../theme';

export interface InputProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'defaultValue'
    | 'placeholder'
    | 'onChangeText'
    | 'onSubmitEditing'
    | 'secureTextEntry'
    | 'keyboardType'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'autoComplete'
    | 'textContentType'
    | 'returnKeyType'
    | 'maxLength'
  > {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** FamilyChats Input — text field with optional leading/trailing adornments. Rounded well on paper; coral focus ring. */
export function Input({
  value,
  defaultValue,
  placeholder,
  leading,
  trailing,
  size = 'md',
  invalid = false,
  disabled = false,
  onChangeText,
  onSubmitEditing,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  returnKeyType,
  maxLength,
  style,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const h = { sm: control.sm, md: control.md, lg: control.lg }[size];
  const borderColor = invalid ? semantic.danger : focused ? semantic.brand : semantic.borderDefault;

  return (
    // The whole pill focuses the field: the native TextInput's touch target is
    // only as tall as its text line, so on iOS taps landing on the pill's
    // padding or the leading icon would otherwise do nothing (no keyboard).
    <Pressable
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
      accessible={false}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: h,
          paddingHorizontal: 14,
          backgroundColor: disabled ? semantic.surfaceSunk : semantic.surfaceCard,
          borderWidth: 1.5,
          borderColor,
          borderRadius: radius.full,
          opacity: disabled ? 0.6 : 1,
          ...(focused ? shadow.xs : {}),
        },
        style,
      ]}
    >
      {leading && <View>{leading}</View>}
      <TextInput
        ref={inputRef}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        editable={!disabled}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        maxLength={maxLength}
        placeholderTextColor={semantic.textFaint}
        style={{
          flex: 1,
          alignSelf: 'stretch',
          minWidth: 0,
          fontFamily: fontFamily.body,
          fontSize: fontSize.bodyMd,
          color: semantic.textStrong,
          padding: 0,
        }}
      />
      {trailing && <View>{trailing}</View>}
    </Pressable>
  );
}
