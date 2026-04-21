import api from "./axios";

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

export interface CustomerSearchResponse {
  status: boolean;
  message: string;
  data: CustomerSearchItem[];
}

export const searchCustomers = async (
  q: string
): Promise<CustomerSearchResponse> => {
  const { data } = await api.get("/customers/search", { params: { q } });
  return data;
};

export interface CustomerContactPayload {
  contactType: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateCustomerPayload {
  firstName: string;
  lastName: string;
  primaryEmail?: string;
  crmReferenceNo?: string;
  custSequenceId?: string;
  customerType?: string;
  activeCustomer?: boolean;
  leadType?: string;
  leadSource?: string;
  contacts?: CustomerContactPayload[];
}

export interface CreateCustomerResponse {
  status: boolean;
  message: string;
  data: CustomerSearchItem;
}

export const createCustomer = async (
  payload: CreateCustomerPayload
): Promise<CreateCustomerResponse> => {
  const { data } = await api.post("/customers", payload);
  return data;
};

// ─── IRM Sync ────────────────────────────────────────────────────────────────

export interface IrmSyncResponse {
  status: boolean;
  message: string;
  data: {
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
  };
}

export const syncCustomerFromIrm = async (
  customerId: string
): Promise<IrmSyncResponse> => {
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

export interface CustomerDetailResponse {
  status: boolean;
  message: string;
  data: CustomerFullDetail;
}

export const getCustomerDetails = async (
  customerId: string
): Promise<CustomerDetailResponse> => {
  const { data } = await api.get(`/customers/${customerId}`);
  return data;
};

// ─── Lookup by CustSequenceID ─────────────────────────────────────────────────

export interface CustomerLookupResponse {
  status: boolean;
  message: string;
  data: {
    source: "irm" | "local" | "not_found";
    irmData: {
      CustomerDetail: Record<string, string>;
      CustomerProfile: Record<string, string>;
      Vehicles: Record<string, string>;
      AccountsReceivable: Record<string, string | number | boolean>;
    } | null;
    localData: (CustomerFullDetail & { fullName: string }) | null;
  };
}

export const lookupCustomerBySequence = async (
  custSequenceId: string
): Promise<CustomerLookupResponse> => {
  const { data } = await api.get("/customers/lookup", { params: { custSequenceId } });
  return data;
};

// ─── Add / Update Internal Notes ─────────────────────────────────────────────

export interface AddNoteResponse {
  status: boolean;
  message: string;
  data: { id: string; notes: string | null };
}

export const addCustomerNote = async (
  customerId: string,
  notes: string
): Promise<AddNoteResponse> => {
  const { data } = await api.patch(`/customers/${customerId}/notes`, { notes });
  return data;
};
