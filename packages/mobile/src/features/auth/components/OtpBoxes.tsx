import { useRef } from "react";
import { Pressable, Text, TextInput, View, type TextInput as TextInputType } from "react-native";
import { useThemedStyles } from "@bainder/ui";
import { buildAuthStyles } from "../auth.styles";

export function OtpBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useThemedStyles(buildAuthStyles);
  const inputRef = useRef<TextInputType | null>(null);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Verification code"
        value={value}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
        style={styles.otpInput}
        caretHidden
      />
      {digits.map((digit, index) => {
        const active = index === Math.min(value.length, 5);
        return (
          <View key={index} style={[styles.otpBox, active ? styles.otpBoxActive : null]}>
            {digit.trim() ? (
              <Text style={styles.otpDigit}>{digit}</Text>
            ) : active ? (
              <View style={styles.otpCaret} />
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
}
