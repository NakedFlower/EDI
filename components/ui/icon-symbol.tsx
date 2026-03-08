// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Tab icons
  "house.fill": "home",
  "lightbulb.fill": "lightbulb",
  "person.2.fill": "people",
  "person.fill": "person",
  // Navigation & actions
  "plus": "add",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "paperplane.fill": "send",
  "pencil": "edit",
  "trash.fill": "delete",
  "xmark": "close",
  "magnifyingglass": "search",
  "lock.fill": "lock",
  "globe": "public",
  "clock.fill": "history",
  "bubble.left.fill": "chat-bubble",
  "ellipsis": "more-horiz",
  "checkmark": "check",
  "arrow.up.circle.fill": "arrow-upward",
  "sparkles": "auto-awesome",
  "doc.text.fill": "description",
  "person.crop.circle": "account-circle",
  "gearshape.fill": "settings",
  "moon.fill": "dark-mode",
  "info.circle.fill": "info",
  "arrow.right.square.fill": "logout",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
