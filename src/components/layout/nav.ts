import { DollarSign, LayoutDashboard, Lightbulb, Settings, Video, type LucideIcon } from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/settings', label: 'Settings', icon: Settings },
];
