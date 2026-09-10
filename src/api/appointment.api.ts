import api from './axios';
import type { ApiResponse } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlotInfo {
  time:     string;
  booked:   number;
  capacity: number;
  status:   'available' | 'limited' | 'full' | 'closed';
}

// ─── Bay & Time-Slot scheduling ──────────────────────────────────────────────
export type BayAvailabilityStatus =
  | 'AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'FULLY_BOOKED'
  | 'OUT_OF_SERVICE';

export interface BayTimeWindow {
  start: string; // "HH:MM"
  end:   string; // "HH:MM"
}

export interface BayAvailabilityInfo {
  id:        string;
  bayNo:     string;
  category:  string | null;
  location:  string | null;
  status:    BayAvailabilityStatus;
  available: BayTimeWindow[];
  /** Occupied windows, one per booking, each naming who holds it. */
  blocked:   Array<BayTimeWindow & { reason: 'BOOKED'; bookingRef?: string | null; vehicleReg?: string | null }>;
}

export interface BayAvailabilityData {
  date:                 string;
  operating:            BayTimeWindow;
  slotIntervalMinutes:  number;
  bays:                 BayAvailabilityInfo[];
}

export interface VehicleListItem {
  id:                 string;
  brand:              string;
  model:              string;
  manufacturingYear:  number;
  registrationNumber: string | null;
  vin:                string | null;
  fuelType:           string | null;
  transmissionType:   string | null;
  odometerLast:       number;
  status:             string;
}

export interface ServiceAdvisorUser {
  id:       string;
  username: string;
  email:    string;
  // Evolve SANumber this advisor is mapped to (null = unmapped → RO falls back).
  evolveSaNumber?: number | null;
}

export interface CreateAppointmentPayload {
  companyId?:               string;
  customerId?:              string;
  vehicleId?:               string;
  serviceAdvisorId?:        string;
  serviceType:              string;
  complaints:               string[];
  estimatedDurationMinutes: number;
  appointmentDate:          string;
  appointmentTime:          string;
  bayId?:                   string;
  pickupRequired:           boolean;
  pickupAddress?:           string;
  internalNotes?:           string;
  sendWhatsApp:             boolean;
  sendEmail:                boolean;
  newCustomer?: {
    // 'I' = individual, 'C' = company. Decides which name the backend requires
    // (companyName vs first + last) and what lands in customers.customer_type.
    customerType:    "I" | "C";
    firstName:       string;
    lastName:        string;
    companyName?:    string;
    // idNumber for an individual, regNo (company registration number) for a company.
    idNumber?:       string;
    regNo?:          string;
    // Individual only — a company has neither.
    title?:          string;
    initial?:        string;
    contactNumber:   string;
    primaryEmail?:   string;
    address?:        string;
    crmReferenceNo?: string;
    custSequenceId?: string;
  };
  newVehicle?: {
    brand:              string;
    model:              string;
    manufacturingYear:  number;
    registrationNumber: string;
    vin:                string;
    fuelType?:          string;
    transmissionType?:  string;
    odometerLast?:      number;
    engineNumber?:      string;
    seriesDescription?: string;
    modelDescription?:  string;
    modelCode?:         string;
    extColour?:         string;
    registrationDate?:  string;
    sellingDate?:       string;
  };
}

export interface AppointmentRecord {
  id:                       string;
  bookingRef:               string;
  customerId:               string | null;
  vehicleId:                string | null;
  serviceAdvisorId:         string | null;
  serviceType:              string;
  complaints:               string[];
  estimatedDurationMinutes: number;
  appointmentDate:          string;
  appointmentTime:          string;
  /** Physical bay held by this appointment; null for capacity-slot bookings. */
  bayId:                    string | null;
  pickupRequired:           boolean;
  pickupAddress:            string | null;
  internalNotes:            string | null;
  status:                   string;
  createdAt?:               string | null;
  hasActiveJobCard?:        boolean;
  customerFirstName?:       string | null;
  customerLastName?:        string | null;
  customerCompanyName?:     string | null;
  vehicleBrand?:            string | null;
  vehicleModel?:            string | null;
  vehicleYear?:             number | null;
  vehicleReg?:              string | null;
  vehicleVin?:              string | null;
  advisorUsername?:         string | null;
  /** Username of whoever booked the appointment (appointments.created_by). */
  createdByName?:           string | null;
  rescheduleCount?:        number;
}

export interface AppointmentStats {
  todayTotal:     number;
  todayConfirmed: number;
  todayCancelled: number;
}

export interface AppointmentListData {
  data:       AppointmentRecord[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  stats:      AppointmentStats;
}

export interface VehiclesByCustomerData {
  data:  VehicleListItem[];
  pagination: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getSlotAvailability = async (
  date: string,
): Promise<ApiResponse<{ date: string; slots: SlotInfo[] }>> => {
  const { data } = await api.get('/appointments/slots', { params: { date } });
  return data;
};

// Per-bay, duration-aware availability for a date. `excludeAppointmentId` omits
// an appointment from its own occupation when editing/rescheduling.
export const getBayAvailability = async (
  date: string,
  excludeAppointmentId?: string,
): Promise<ApiResponse<BayAvailabilityData>> => {
  const { data } = await api.get('/appointments/bay-availability', {
    params: { date, ...(excludeAppointmentId ? { excludeAppointmentId } : {}) },
  });
  return data;
};

// ─── Foreman bay reallocation / displacement swap (Model A) ────────────────────
export interface BayAlternativeInfo {
  id: string;
  bayNo: string;
  category: string | null;
  location: string | null;
  capabilities: string[];
  isActive: boolean;
  /** Free for THIS appointment's full [start, end) interval. */
  fitsInterval: boolean;
  /** The appointment currently occupying this bay during the interval (if any). */
  occupiedBy: {
    appointmentId: string;
    vehicleReg: string | null;
    appointmentTime: string;
    endTime: string;
  } | null;
  available: BayTimeWindow[];
}

export interface BayAlternativesData {
  appointment: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    endTime: string;
    estimatedDurationMinutes: number;
    currentBayId: string | null;
    currentBayNo: string | null;
    vehicleReg: string | null;
    vehicleName: string | null;
  };
  operating: BayTimeWindow;
  bays: BayAlternativeInfo[];
}

export interface ReallocateBayResult {
  mode: 'MOVE' | 'SWAP';
  appointment: { id: string; fromBayId: string | null; toBayId: string };
  displaced: { id: string; fromBayId: string | null; toBayId: string } | null;
}

// Bays with fit/occupancy for an appointment's interval (used to pick a target,
// and — for a detected occupant — to list its replacement bays via the same call).
export const getAppointmentBayAlternatives = async (
  appointmentId: string,
  excludeBayIds?: string[],
): Promise<ApiResponse<BayAlternativesData>> => {
  const { data } = await api.get(`/appointments/${appointmentId}/bay-alternatives`, {
    params: excludeBayIds && excludeBayIds.length ? { excludeBayIds: excludeBayIds.join(',') } : undefined,
  });
  return data;
};

// Atomic bay move/swap. `replacementBayId` is required only when the target is occupied.
export const reallocateAppointmentBay = async (
  appointmentId: string,
  payload: { targetBayId: string; replacementBayId?: string },
): Promise<ApiResponse<ReallocateBayResult>> => {
  const { data } = await api.post(`/appointments/${appointmentId}/reallocate-bay`, payload);
  return data;
};

export const getVehiclesByCustomer = async (
  customerId: string,
  opts: { page?: number; limit?: number; search?: string } = {},
): Promise<ApiResponse<VehiclesByCustomerData>> => {
  const { page = 1, limit = 10, search } = opts;
  const params: Record<string, string | number> = {
    customerId,
    includeAll: 'true',
    page,
    limit,
  };
  // BE's `vin` param does ILIKE on both VIN and registration_number — exactly
  // what we want for a unified search box.
  if (search && search.trim()) params.vin = search.trim();
  const { data } = await api.get('/vehicles', { params });
  return data;
};

export const listServiceAdvisors = async (): Promise<ServiceAdvisorUser[]> => {
  try {
    const { data } = await api.get('/user-management/users', {
      params: { roleSlug: 'service-advisor' },
    });
    return data?.data ?? [];
  } catch {
    return [];
  }
};

export const createAppointment = async (
  payload: CreateAppointmentPayload,
): Promise<ApiResponse<AppointmentRecord>> => {
  const { data } = await api.post('/appointments', payload);
  return data;
};

export const listAppointments = async (params?: {
  date?:             string;
  dateFrom?:         string;
  dateTo?:           string;
  status?:           string;
  serviceAdvisorId?: string;
  customerId?:       string;
  search?:           string;
  page?:             number;
  limit?:            number;
}): Promise<ApiResponse<AppointmentListData>> => {
  const { data } = await api.get('/appointments', { params });
  return data;
};

export const updateAppointmentStatus = async (
  id:                 string,
  status:             string,
  cancellationReason?: string,
): Promise<ApiResponse<AppointmentRecord>> => {
  const { data } = await api.patch(`/appointments/${id}/status`, {
    status,
    ...(cancellationReason ? { cancellationReason } : {}),
  });
  return data;
};

export interface ReschedulePayload {
  newDate: string;
  newTime: string;
  reason?: string;
  /**
   * Move the appointment to a different bay as part of the reschedule.
   * Omit to keep the current bay (previous behaviour).
   */
  bayId?: string;
  /**
   * New estimated workshop time. Omit to keep the stored duration. When sent,
   * the server validates the bay interval against THIS value and persists it —
   * so it must be the same duration the picker used to filter slots.
   */
  estimatedDurationMinutes?: number;
}

export const rescheduleAppointment = async (
  id: string,
  payload: ReschedulePayload,
): Promise<ApiResponse<AppointmentRecord>> => {
  const { data } = await api.patch(`/appointments/${id}/reschedule`, payload);
  return data;
};

export const getAppointmentByVehicle = async (
  vehicleId: string,
): Promise<ApiResponse<AppointmentRecord | null>> => {
  const { data } = await api.get(`/appointments/vehicle/${vehicleId}`);
  return data;
};

// ─── IRM Customer Search ──────────────────────────────────────────────────────

export interface IrmVehicleResult {
  registrationNumber: string;
  vin:                string;
  brand:              string;
  model:              string;
  series:             string;
  year:               string;
  engineNumber:       string;
  colour:             string;
  fuelType:           string;
  transmissionType:   string;
  modelDescription:   string;
  registrationDate:   string;
  sellingDate:        string;
}

export interface IrmCustomerResult {
  localCustomerId: string | null;
  crmReferenceNo:  string;
  custSequenceId:  string;
  firstName:       string;
  lastName:        string;
  companyName:     string;
  customerType:    string;
  idNumber:        string;
  phone:           string;
  email:           string;
  address:         string;
  city:            string;
  postalCode:      string;
  country:         string;
  vehicle:         IrmVehicleResult | null;
}

export interface InternalCustomer {
  id:                  string;
  crmReferenceNo:      string;
  custSequenceId:      string;
  customerType:        string;
  firstName:           string;
  lastName:            string;
  companyName:         string | null;
  primaryEmail:        string | null;
  contactNumber:       string | null;
  vehicleRegistration: string | null;
  vehicleBrand:        string | null;
  vehicleModel:        string | null;
}

export const searchInternalCustomers = async (params: {
  q?:     string;
  phone?: string;
}): Promise<InternalCustomer[]> => {
  try {
    const { data } = await api.get('/customers/search', { params });
    return data?.data ?? [];
  } catch {
    return [];
  }
};

// Phase 1 search outcome, carried in the additive `meta` sibling. Optional so
// the FE still compiles/works against a backend that predates the meta field.
export type IrmSearchOutcome = 'FOUND' | 'NOT_FOUND' | 'UNAVAILABLE' | 'SWITCH_COMPANY';
export interface IrmSearchMeta {
  outcome: IrmSearchOutcome;
  // The selected company's public CODE (e.g. '10EC'), or null. Never the Evolve
  // InterfaceCode — the backend does not expose that to the FE.
  company: string | null;
  source:  string;
  // Present only when outcome === 'SWITCH_COMPANY': the company that actually
  // owns this vehicle (public code only), so the FE can offer to switch to it.
  ownedByCompany?: { code: string };
}
export type IrmSearchResponse = ApiResponse<IrmCustomerResult[]> & { meta?: IrmSearchMeta };

export const irmCustomerSearch = async (params: {
  phone?: string;
  reg?:   string;
  vin?:   string;
  companyId?: string;
  interfaceCode?: string;
}): Promise<IrmSearchResponse> => {
  const { data } = await api.get('/appointments/irm-search', { params });
  return data;
};

export const linkAppointmentToCheckIn = async (
  appointmentId: string,
  checkInId:     string,
): Promise<ApiResponse<AppointmentRecord>> => {
  const { data } = await api.patch(`/appointments/${appointmentId}/check-in`, { checkInId });
  return data;
};

// ─── Today's Appointments (Gate Entry quick-pick) ────────────────────────────
export interface TodaysAppointment {
  id:                       string;
  bookingRef:               string | null;
  appointmentTime:          string;
  serviceType:              string;
  status:                   string;
  estimatedDurationMinutes: number | null;
  vehicleId:                string | null;
  registrationNumber:       string | null;
  vin:                      string | null;
  brand:                    string | null;
  model:                    string | null;
  manufacturingYear:        number | null;
  customerId:               string | null;
  customerName:             string | null;
  customerPhone:            string | null;
  hasActiveCheckIn:         boolean;
}

export const listTodaysAppointmentsForGate = async (): Promise<ApiResponse<TodaysAppointment[]>> => {
  const { data } = await api.get('/appointments/today/gate-entry');
  return data;
};
