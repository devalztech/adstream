import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Wallet,
  Receipt,
  CreditCard,
  Bell,
  Settings,
  Globe,
  LayoutGrid,
  DollarSign,
  Banknote,
  Users,
  ShieldCheck,
} from 'lucide-react';
import type { Role } from '@/types/api';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The single source of truth for sidebar links per role. Both the
 * desktop Sidebar and the MobileNav drawer read from this — adding a
 * page to one automatically adds it to the other.
 *
 * Admin nav deliberately does not include a separate "Advertisers" /
 * "Publishers" / "Fraud" page — the backend has no distinct endpoints
 * for those (see INTEGRATION_MAP.md): /admin/users?role= already covers
 * advertiser/publisher listing, and there's no fraud-detection endpoint
 * to back a Fraud page. Building those pages would mean fabricating
 * data, which the spec explicitly prohibits.
 */
export const NAV_ITEMS: Record<Extract<Role, 'advertiser' | 'publisher' | 'admin'>, NavItem[]> = {
  advertiser: [
    { label: 'Dashboard', href: '/advertiser/dashboard', icon: LayoutDashboard },
    { label: 'Campaigns', href: '/advertiser/campaigns', icon: Megaphone },
    { label: 'Analytics', href: '/advertiser/analytics', icon: BarChart3 },
    { label: 'Wallet', href: '/advertiser/wallet', icon: Wallet },
    { label: 'Transactions', href: '/advertiser/transactions', icon: Receipt },
    { label: 'Payments', href: '/advertiser/payments', icon: CreditCard },
    { label: 'Notifications', href: '/advertiser/notifications', icon: Bell },
    { label: 'Settings', href: '/advertiser/settings', icon: Settings },
  ],
  publisher: [
    { label: 'Dashboard', href: '/publisher/dashboard', icon: LayoutDashboard },
    { label: 'Websites', href: '/publisher/websites', icon: Globe },
    { label: 'Ad Units', href: '/publisher/ad-units', icon: LayoutGrid },
    { label: 'Earnings', href: '/publisher/earnings', icon: DollarSign },
    { label: 'Withdrawals', href: '/publisher/withdrawals', icon: Banknote },
    { label: 'Analytics', href: '/publisher/analytics', icon: BarChart3 },
    { label: 'Notifications', href: '/publisher/notifications', icon: Bell },
    { label: 'Settings', href: '/publisher/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
    { label: 'Websites', href: '/admin/websites', icon: Globe },
    { label: 'Withdrawals', href: '/admin/withdrawals', icon: Banknote },
    { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    { label: 'Settings', href: '/admin/settings', icon: ShieldCheck },
  ],
};
