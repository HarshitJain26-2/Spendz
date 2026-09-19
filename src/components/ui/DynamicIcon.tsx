import React from 'react';
import {
  Wallet,
  Banknote,
  Building2,
  CreditCard,
  Folder,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  GraduationCap,
  Heart,
  Plane,
  Gift,
  Apple,
  Home,
  Laptop,
  TrendingUp,
  RotateCcw,
  Plus,
  MoreHorizontal,
  Dumbbell,
  Sparkles,
  Coffee,
  Film,
  Fuel,
  Pill,
  Briefcase,
  Music,
  Smile,
  type LucideProps,
} from 'lucide-react-native';

const iconMap: Record<string, React.FC<LucideProps>> = {
  Wallet,
  Banknote,
  Building2,
  CreditCard,
  Folder,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  GraduationCap,
  Heart,
  Plane,
  Gift,
  Apple,
  Home,
  Laptop,
  TrendingUp,
  RotateCcw,
  Plus,
  MoreHorizontal,
  Dumbbell,
  Sparkles,
  Coffee,
  Film,
  Fuel,
  Pill,
  Briefcase,
  Music,
  Smile,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    return <MoreHorizontal {...props} />;
  }
  return <IconComponent {...props} />;
};
