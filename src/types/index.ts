export type UserRole = 'farmer' | 'investor' | 'consumer' | 'admin' | 'monitoring_officer' | 'vet' | 'input_dealer';
export type CreditType = 'direct_financing' | 'farm_inputs' | 'structured_training' | 'mixed' | 'funding' | 'inputs' | 'training';
export type FlockType = 'broilers' | 'layers' | 'guinea_fowl' | 'turkey' | 'duck' | 'geese' | 'ostrich' | 'local_birds' | 'day_old_chicks' | 'hatchery' | 'poultry_and_hatchery' | 'meat_processing' | 'mixed';

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
  language: string;
  date_joined: string;
  credit_score?: string;
}

export interface FarmerProfile {
  id: number; user: User;
  ghana_card_number: string; ghana_card_photo: string | null;
  district: string; region: string; community: string; gps_address: string;
  years_of_farming: number;
  verification_status: 'pending' | 'submitted' | 'verified' | 'rejected';
  credit_score: string; credit_score_updated_at: string | null;
  notes: string; created_at: string; updated_at: string;
}

export interface InvestorProfile {
  id: number; user: User;
  organisation: string;
  investor_type: string;
  registration_number: string;
  max_investment_amount: string;
  preferred_credit_types: string[];
  preferred_regions: string[];
  is_kyc_verified: boolean;
  created_at: string; updated_at: string;
}

export interface VetProfile {
  id: number; user: User;
  license_number: string; specialisation: string; clinic_name: string;
  region: string; district: string; phone: string;
  is_available: boolean; consultation_fee: string; services_offered: string;
  approval_status: 'pending' | 'approved' | 'suspended';
  approved_by: string | null; created_at: string; updated_at: string;
}

export interface VetService {
  id: string; vet: string; vet_name: string; vet_clinic: string;
  service_name: string;
  service_type: 'vaccination' | 'diagnosis' | 'treatment' | 'consultation' | 'farm_visit' | 'other';
  description: string; price: string; duration_minutes: number;
  is_mobile: boolean; region: string; is_active: boolean; created_at: string;
}

export interface VetBooking {
  id: string; reference: string;
  farmer: string; farmer_name: string;
  vet: string; vet_name: string;
  farm: string | null; farm_name: string | null;
  service: string | null; service_name: string;
  booking_date: string;
  visit_type: 'on_farm' | 'clinic' | 'telemedicine';
  issue_description: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  fee: string; vet_notes: string; created_at: string;
}

export interface InputDealerProfile {
  id: number; user: User;
  business_name: string; registration_number: string;
  region: string; district: string; address: string; phone: string;
  product_categories: string[];
  approval_status: 'pending' | 'approved' | 'suspended';
  approved_by: string | null; created_at: string; updated_at: string;
}

export interface FarmInput {
  id: string; dealer: string; dealer_name: string; dealer_phone: string; business_name: string;
  name: string;
  input_type: 'feed' | 'vaccine' | 'medication' | 'equipment' | 'supplement' | 'disinfectant' | 'other';
  brand: string; description: string; unit: string; price: string;
  quantity_available: number; min_order_quantity: number;
  region: string; is_available: boolean; photo: string | null; created_at: string;
}

export interface Farm {
  id: string; owner: string; owner_name?: string;
  monitoring_officer: string | null; monitoring_officer_name: string | null;
  name: string; flock_type: string; flock_size: number;
  region: string; district: string; community: string; gps_address: string;
  farm_size_acres: string | null;
  has_water_source: boolean; has_electricity: boolean;
  registration_cert: string | null; farm_photo: string | null;
  is_active: boolean; created_at: string; updated_at: string;
}

export interface FarmActivityLog {
  id: string; farm: string; date: string;
  flock_count: number; mortality: number; feed_kg: string;
  eggs_collected: number; medication_given: string; notes: string;
  logged_by: string | null; created_at: string;
  broiler_count?: number; layer_count?: number; guinea_fowl_count?: number;
  turkey_count?: number; duck_count?: number; geese_count?: number;
  ostrich_count?: number; day_old_chick_count?: number;
  local_cock_count?: number; local_hen_count?: number;
  eggs_in_incubation?: number; eggs_set_today?: number; chicks_hatched?: number;
  hatch_rejects?: number; chicks_sold?: number;
  birds_received?: number; birds_processed?: number; carcass_weight_kg?: number;
  units_packaged?: number; cold_storage_units?: number;
}

export interface FarmAuditReport {
  id: string; farm: string; farm_name?: string; auditor: string | null; auditor_name?: string; visit_date: string;
  outcome: 'satisfactory' | 'concerns' | 'unsatisfactory';
  flock_verified: number;
  infrastructure_score: number; management_score: number; biosecurity_score: number;
  report_document: string | null; summary: string; created_at: string;
}

export type ApplicationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'scored'
  | 'matched' | 'approved' | 'disbursed' | 'rejected' | 'withdrawn';

export interface CreditApplication {
  id: string; reference: string;
  farmer: User | string; farm: string | null;
  credit_type: string;
  amount_requested: string | null; repayment_period_months: number | null;
  purpose: string; input_details: string;
  status: ApplicationStatus;
  credit_score_at_submission: string | null;
  reviewer: User | string | null; reviewer_notes: string; rejection_reason: string;
  submitted_at: string | null; reviewed_at: string | null; approved_at: string | null;
  matched_investor: string | null; created_at: string; updated_at: string;
}

export type AgreementStatus = 'pending_signature' | 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface CreditAgreement {
  id: string; reference: string; application: string;
  investor: User | string; farmer: User | string;
  credit_type: string; amount: string;
  repayment_period_months: number; interest_rate: string;
  status: AgreementStatus; contract_document: string | null;
  farmer_signed_at: string | null; investor_signed_at: string | null;
  disbursed_at: string | null; completed_at: string | null;
  start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
}

export interface RepaymentSchedule {
  id: string; agreement: string; installment_number: number;
  due_date: string; amount_due: string; amount_paid: string;
  status: 'upcoming' | 'due' | 'pending' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
}

export interface Disbursement {
  id: string; reference: string; agreement: string;
  amount: string; method: string; status: string;
  disbursed_by: string; gateway_ref: string; created_at: string;
}

export interface DisbursementRequest {
  id: string; reference: string;
  agreement: string; agreement_reference: string;
  requested_by: string; requested_by_name: string;
  reviewed_by: string | null; reviewed_by_name: string | null;
  farmer_name: string; amount: string; method: string; note: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null; rejection_reason: string;
  disbursement: string | null; created_at: string; updated_at: string;
}

export interface TrainingModule {
  id: string; title: string; description: string;
  module_type: 'video' | 'pdf' | 'webinar' | 'workshop';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number; is_free: boolean; is_published: boolean;
  thumbnail: string | null; video_url: string | null; document: string | null; file?: string;
  created_by: string; created_at: string;
}

export interface TrainingEnrolment {
  id: string; module: string; farmer: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  progress_pct: number; enrolled_at: string; completed_at: string | null;
}

export interface Produce {
  id: string; seller: string; farm: string; name: string;
  produce_type: string;
  quantity: number; quantity_available?: number; unit: string; price: string;
  description: string; status: 'active' | 'sold_out' | 'paused' | 'removed';
  is_organic: boolean;
  egg_size?: 'small' | 'medium' | 'large' | 'jumbo' | null;
  avg_rating: string; farm_name: string; farm_region: string; created_at: string;
  photo?: string | null;
  contact_phone?: string | null;
  accepts_momo?: boolean;
  accepts_hubtel_momo?: boolean;
  accepts_card?: boolean;
  accepts_bank_transfer?: boolean;
  accepts_cod?: boolean;
  accepts_instant_payment?: boolean;
  accepts_cash_on_delivery?: boolean;
}

export interface Order {
  id: string; buyer: string; buyer_name?: string;
  reference?: string;
  produce?: string; produce_name?: string;
  quantity?: number; unit?: string;
  items?: { id: string; produce: string; produce_name: string; quantity: number; unit_price: string }[];
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  delivery_type: 'pickup' | 'delivery'; delivery_address: string;
  total_amount: string;
  payment_method: string;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  notes: string; created_at: string;
}

export interface Notification {
  id: string;
  recipient: string;
  notification_type: string;
  notif_type?: string;
  title: string;
  message: string;
  body?: string;
  is_read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  related_object_type?: string;
  related_object_id?: string;
  created_at: string;
}

export interface ProjectFarmerEntry {
  id: string; project: string;
  farmer_account: string | null;
  full_name: string; phone: string; ghana_card_number: string;
  district: string; region: string; community: string;
  farm_name: string; flock_type: string;
  flock_size: number; farm_size_acres: string; amount_requested: string; notes: string;
  created_at: string;
}

export interface ProjectApplication {
  id: string; reference: string;
  investor: string; investor_name: string;
  project_name: string; organisation: string;
  credit_type: string;
  total_amount_requested: string | null;
  repayment_period_months: number | null;
  purpose: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'withdrawn';
  farmer_count: number;
  farmer_entries: ProjectFarmerEntry[];
  submitted_at: string | null; reviewed_at: string | null;
  reviewer_notes: string; rejection_reason: string;
  created_at: string; updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function displayName(val: User | string | null | undefined): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.full_name || `${val.first_name} ${val.last_name}`.trim() || val.email;
}

export function userId(val: User | string | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.id;
}
