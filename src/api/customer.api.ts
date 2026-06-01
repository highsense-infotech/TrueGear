import api from "./axios";
import type { ApiResponse } from "./types";

export interface CustomerSearchItem {
  id: string;
  crmReferenceNo: string;
  custSequenceId: string;
  customerType: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  primaryEmail: string;
  activeCustomer: boolean;
  contactNumber: string | null;
}

export const searchCustomers = async (q: string): Promise<ApiResponse<CustomerSearchItem[]>> => {
  const { data } = await api.get("/customers/search", { params: { q } });
  return data;
};

export interface CustomerContactPayload {
  contactType: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateCustomerPayload {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  primaryEmail?: string;
  crmReferenceNo?: string;
  custSequenceId?: string;
  customerType?: string;
  activeCustomer?: boolean;
  leadType?: string;
  leadSource?: string;
  contacts?: CustomerContactPayload[];
}

export const createCustomer = async (
  payload: CreateCustomerPayload
): Promise<ApiResponse<CustomerSearchItem>> => {
  const { data } = await api.post("/customers", payload);
  return data;
};

// ─── IRM Sync ────────────────────────────────────────────────────────────────

export interface IrmSyncData {
  synced: boolean;
  local: boolean;
  irmData: {
    CustomerDetail: Record<string, string>;
    CustomerProfile: Record<string, string>;
    Vehicles: Record<string, string>;
    AccountsReceivable: Record<string, string | number | boolean>;
  } | null;
  updated?: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    primaryEmail: string | null;
  };
}

export const syncCustomerFromIrm = async (
  customerId: string
): Promise<ApiResponse<IrmSyncData>> => {
  const { data } = await api.post(`/customers/${customerId}/irm-sync`);
  return data;
};

// ─── Get Customer Details ─────────────────────────────────────────────────────

export interface CustomerContact {
  id: string;
  contactType: string;
  countryCode: string | null;
  contactNumber: string | null;
}

export interface CustomerAddress {
  id: string;
  addressType: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

export interface CustomerFullDetail {
  id: string;
  crmReferenceNo: string;
  custSequenceId: string;
  customerType: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  primaryEmail: string | null;
  activeCustomer: boolean;
  notes: string | null;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  profile: Record<string, unknown> | null;
}

export const getCustomerDetails = async (
  customerId: string
): Promise<ApiResponse<CustomerFullDetail>> => {
  const { data } = await api.get(`/customers/${customerId}`);
  return data;
};

// ─── Lookup by CustSequenceID ─────────────────────────────────────────────────

export interface CustomerLookupData {
  source: "irm" | "local" | "not_found";
  irmData: {
    CustomerDetail: Record<string, string>;
    CustomerProfile: Record<string, string>;
    Vehicles: Record<string, string>;
    AccountsReceivable: Record<string, string | number | boolean>;
  } | null;
  localData: (CustomerFullDetail & { fullName: string }) | null;
}

export const lookupCustomerBySequence = async (
  custSequenceId: string
): Promise<ApiResponse<CustomerLookupData>> => {
  const { data } = await api.get("/customers/lookup", { params: { custSequenceId } });
  return data;
};

// ─── Add / Update Internal Notes ─────────────────────────────────────────────

export const addCustomerNote = async (
  customerId: string,
  notes: string
): Promise<ApiResponse<{ id: string; notes: string | null }>> => {
  const { data } = await api.patch(`/customers/${customerId}/notes`, { notes });
  return data;
};
