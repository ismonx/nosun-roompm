// PMS V6.0 Core Types

export interface Room {
  id: string;
  name_zh: string;
  name_en: string;
  category: string;
  photos: string[];
  standard_capacity: number;
  max_capacity: number;
  extra_guest_fee: number;
  base_price: number;
  promo_price: number;
  sort_order: number;
}

export interface Booking {
  id: string; // key: date_roomId
  customer_name: string;
  phone: string;
  note: string;
  status: 'pending' | 'deposit' | 'full';
  extra_guests: number;
  total_price: number;
  is_whole_house: boolean;
  date: string;
  room_id: string;
  created_at: string;
  updated_at?: string;
}

export interface PricingRule {
  id: string;
  rule_name: string;
  room_id: string | 'all';
  start_date: string;
  end_date: string;
  price: number;
  promo_price: number;
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  discount: number;
  expiry_date: string;
  created_at?: string;
}

export interface AppSettings {
  vendor_id: string;
  hostel_name: string;
  hostel_name_en: string;
  home_title_zh: string;
  home_title_en: string;
  home_subtitle_zh: string;
  home_subtitle_en: string;
  active_theme: string;
  density: 'compact' | 'standard' | 'relaxed';
  referral_switch: boolean;
  referral_msg_zh: string;
  referral_msg_en: string;
  line_oa_id: string;
  admin_password: string;
  login_title: string;
}

export type ThemeId = 'forest' | 'surf' | 'sunset';
