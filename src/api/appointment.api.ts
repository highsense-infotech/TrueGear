import api from './axios';
import type { ApiResponse } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlotInfo {
  time:     string;
  booked:   number;
  capacity: number;
  status:   'available' | 'limited' | 'full' | 'closed';
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
}

export interface CreateAppointmentPayload {
  customerId?:              string;
  vehicleId?:               string;
  serviceAdvisorId?:        string;
  serviceType:              string;
  complaints:               string[];
  estimatedDurationMinutes: number;
  appointmentDate:          string;
  appointmentTime:          string;
  pickupRequired:           boolean;
  pickupAddress?:           string;
  internalNotes?:           string;
  sendWhatsApp:             boolean;
  sendEmail:                boolean;
  newCustomer?: {
    firstName:       string;
    lastName:        string;
    companyName?:    string;
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
  pickupRequired:           boolean;
  pickupAddress:            string | null;
  internalNotes:            string | null;
  status:                   string;
  createdAt?:               string | null;
  hasActiveJobCard?:        boolean;
  customerFirstName?:       string | null;
  customerLastName?:        string | null;
  vehicleBrand?:            string | null;
  vehicleModel?:            string | null;
  vehicleYear?:             number | null;
  vehicleReg?:              string | null;
  vehicleVin?:              string | null;
  advisorUsername?:         string | null;
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
  total: number;
  page:  number;
  limit: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getSlotAvailability = async (
  date: string,
): Promise<ApiResponse<{ date: string; slots: SlotInfo[] }>> => {
  const { data } = await api.get('/appointments/slots', { params: { date } });
  return data;
};

export const getVehiclesByCustomer = async (
  customerId: string,
): Promise<ApiResponse<VehiclesByCustomerData>> => {
  const { data } = await api.get('/vehicles', { params: { customerId, includeAll: 'true' } });
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

export const irmCustomerSearch = async (params: {
  phone?: string;
  reg?:   string;
  vin?:   string;
}): Promise<ApiResponse<IrmCustomerResult[]>> => {
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
