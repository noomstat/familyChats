import React from 'react';
import {
  MapPin,
  Navigation,
  Send,
  Users,
  Plus,
  Search,
  Bell,
  Flag,
  Mic,
  Smile,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Receipt,
  Utensils,
  BedDouble,
  Car,
  Backpack,
  CornerDownLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheckBig,
  Signal,
  Wifi,
  BatteryFull,
  MessageCircle,
  Map,
  User,
  Lock,
  type LucideIcon,
} from 'lucide-react-native';

// Rally uses Lucide (https://lucide.dev) as its icon set — rounded, 2px
// stroke, matching Rally's friendly geometry. Substituted in the original
// design system because no brand icon set was provided. This registry
// covers every glyph referenced by the Rally app screens.
const REGISTRY: Record<string, LucideIcon> = {
  'map-pin': MapPin,
  navigation: Navigation,
  send: Send,
  users: Users,
  plus: Plus,
  search: Search,
  bell: Bell,
  flag: Flag,
  mic: Mic,
  smile: Smile,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  x: X,
  'share-2': Share2,
  receipt: Receipt,
  utensils: Utensils,
  'bed-double': BedDouble,
  car: Car,
  backpack: Backpack,
  'corner-down-left': CornerDownLeft,
  'arrow-down-left': ArrowDownLeft,
  'arrow-up-right': ArrowUpRight,
  'check-circle-2': CircleCheckBig,
  signal: Signal,
  wifi: Wifi,
  'battery-full': BatteryFull,
  'message-circle': MessageCircle,
  map: Map,
  user: User,
  lock: Lock,
};

export type IconName = keyof typeof REGISTRY;

export interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/** Rally Icon — thin wrapper over Lucide, the brand's icon set. */
export function Icon({ name, size = 20, strokeWidth = 2, color = '#443C34' }: IconProps) {
  const Glyph = REGISTRY[name];
  if (!Glyph) return null;
  return <Glyph size={size} strokeWidth={strokeWidth} color={color} />;
}
