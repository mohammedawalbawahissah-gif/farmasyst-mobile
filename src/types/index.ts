// ── Enums ─────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'farmer' | 'investor' | 'consumer' | 'admin'
  | 'monitoring_officer' | 'vet' | 'input_dealer';

export type CreditType = 'funding' | 'inputs' | 'training';
export type CreditStatus =
  | 'draft' | 'submitted' | 'under_review' | 'scored'
  | 'matched' | 'approved' | 'disbursed' | 'rejected' | 'withdrawn';
export type AgreementStatus =
  | 'pending_signature' | 'active' | 'completed' | 'defaulted' | 'cancelled';
export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type VerificationStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthTokens { access: string; refresh: string; }

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  profile_photo: string | null;
  language: 'en' | 'dag';
  date_joined: string;
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export interface FarmerProfile {
  id: number;
  user: User;
  ghana_card_number: string;
  ghana_card_photo: string | null;
  district: string;
  region: string;
  community: string;
  gps_address: string;
  years_of_farming: number;
  verification_status: VerificationStatus;
  credit_score: string;
  credit_score_updated_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorProfile {
  id: number;
  user: User;
  organisation: string;
  investor_type: 'bank' | 'off_taker' | 'restaurant' | 'aggregator' | 'ngo';
  registration_number: string;
  max_investment_amount: string;
  preferred_credit_types: CreditType[];
  preferred_regions: string[];
  is_kyc_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ── Farms ─────────────────────────────────────────────────────────────────────
export interface Farm {
  id: string;
  owner: string;
  owner_name: string;
  name: string;
  flock_type: string;
  flock_size: number;
  region: string;
  district: string;
  community: string;
  gps_address: string;
  farm_size_acres: string | null;
  has_water_source: boolean;
  has_electricity: boolean;
  monitoring_officer: string | null;
  monitoring_officer_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FarmActivityLog {
  id: string;
  farm: string;
  date: string;
  broiler_count: number;
  layer_count: number;
  guinea_fowl_count: number;
  turkey_count: number;
  duck_count: number;
  day_old_chick_count: number;
  flock_count: number;
  eggs_in_incubation: number;
  eggs_set_today: number;
  chicks_hatched: number;
  mortality: number;
  feed_kg: string;
  eggs_collected: number;
  medication_given: string;
  notes: string;
  logged_by: string | null;
  created_at: string;
}

export interface FarmAuditReport {
  id: string;
  farm: string;
  farm_name: string;
  auditor: string | null;
  auditor_name: string | null;
  visit_date: string;
  outcome: 'satisfactory' | 'concerns' | 'unsatisfactory';
  flock_verified: number;
  infrastructure_score: number;
  management_score: number;
  biosecurity_score: number;
  summary: string;
  created_at: string;
}

// ── Credit ────────────────────────────────────────────────────────────────────
export interface CreditApplication {
  id: string;
  reference: string;
  farmer: string | User;
  farmer_name: string;
  farm: string | null;
  credit_type: CreditType;
  amount_requested: string | null;
  repayment_period_months: number | null;
  purpose: string;
  input_details: string;
  status: CreditStatus;
  credit_score_at_submission: string | null;
  reviewer: string | null;
  reviewer_notes: string;
  rejection_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  matched_investor: string | null;
  created_at: string;
  updated_at: string;
  documents: ApplicationDocument[];
}

export interface ApplicationDocument {
  id: string;
  doc_type: 'ghana_card' | 'farm_cert' | 'farm_photo' | 'season_record' | 'other';
  file: string;
  original_name: string;
  uploaded_at: string;
}

export interface CreditAgreement {
  id: string;
  reference: string;
  application: string;
  investor: string;
  investor_name: string;
  farmer: string;
  farmer_name: string;
  credit_type: CreditType;
  amount: string;
  repayment_period_months: number;
  interest_rate: string;
  status: AgreementStatus;
  contract_document: string | null;
  farmer_signed_at: string | null;
  investor_signed_at: string | null;
  disbursed_at: string | null;
  completed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// ── Payments ──────────────────────────────────────────────────────────────────
export interface RepaymentSchedule {
  id: string;
  agreement: string;
  installment_number: number;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  status: 'upcoming' | 'due' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
}

export interface Disbursement {
  id: string;
  reference: string;
  agreement: string;
  amount: string;
  method: 'momo' | 'paystack' | 'cash' | 'in_kind';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  notes: string;
  processed_at: string | null;
  created_at: string;
}

export interface DisbursementRequest {
  id: string;
  reference: string;
  agreement: string;
  agreement_reference: string;
  requested_by: string;
  requested_by_name: string;
  farmer_name: string;
  amount: string;
  method: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  created_at: string;
}

// ── Marketplace ───────────────────────────────────────────────────────────────
export interface Produce {
  id: string;
  farm: string;
  farm_name: string;
  seller: string;
  seller_name: string;
  produce_type: string;
  name: string;
  description: string;
  price: string;
  unit: 'kg' | 'tray' | 'bird' | 'crate' | 'bag';
  quantity_available: string;
  min_order: string;
  egg_size: string | null;
  photo: string | null;
  status: 'active' | 'sold_out' | 'paused' | 'removed';
  accepts_momo: boolean;
  accepts_card: boolean;
  accepts_bank_transfer: boolean;
  accepts_cod: boolean;
  is_organic: boolean;
  avg_rating: string;
  total_orders: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  produce: string;
  produce_name: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
}

export interface Order {
  id: string;
  reference: string;
  buyer: string;
  buyer_name: string;
  status: OrderStatus;
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string;
  delivery_date: string | null;
  payment_method: string;
  total_amount: string;
  notes: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// ── Training ──────────────────────────────────────────────────────────────────
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  module_type: 'video' | 'pdf' | 'webinar' | 'quiz';
  level: 'beginner' | 'intermediate' | 'advanced';
  topic_tags: string[];
  file: string | null;
  video_url: string;
  duration_minutes: number | null;
  is_published: boolean;
  is_free: boolean;
  created_at: string;
}

export interface TrainingEnrolment {
  id: string;
  farmer: string;
  module: string;
  module_title: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  notif_type: string;
  title: string;
  body: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: Record<string, string>;
  created_at: string;
}

// ── Vet ───────────────────────────────────────────────────────────────────────
export interface VetService {
  id: string;
  vet: string;
  vet_name: string;
  vet_clinic: string;
  service_name: string;
  service_type: 'vaccination' | 'diagnosis' | 'treatment' | 'consultation' | 'farm_visit' | 'other';
  description: string;
  price: string;
  duration_minutes: number;
  is_mobile: boolean;
  region: string;
  is_active: boolean;
}

export interface VetBooking {
  id: string;
  reference: string;
  farmer: string;
  farmer_name: string;
  vet: string;
  vet_name: string;
  farm: string | null;
  farm_name: string | null;
  service: string | null;
  service_name: string;
  booking_date: string;
  visit_type: 'on_farm' | 'clinic' | 'telemedicine';
  issue_description: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

// ── Inputs ────────────────────────────────────────────────────────────────────
export interface FarmInput {
  id: string;
  dealer: string;
  dealer_name: string;
  name: string;
  input_type: 'feed' | 'vaccine' | 'medication' | 'equipment' | 'supplement' | 'disinfectant' | 'other';
  brand: string;
  description: string;
  unit: string;
  price: string;
  quantity_available: number;
  min_order_quantity: number;
  region: string;
  is_available: boolean;
}

// ── Paginated wrapper ─────────────────────────────────────────────────────────
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
