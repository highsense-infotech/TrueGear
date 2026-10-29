import api from "./axios";
import type { ApiResponse } from "./types";

export type V360EventFamily =
  | "GATE_IN"
  | "QC_IN"
  | "JOB_CARD"
  | "APPROVAL"
  | "WORK"
  | "STATUS"
  | "QC_OUT"
  | "WASH"
  | "INVOICE"
  | "PAYMENT"
  | "WARRANTY"
  | "GATE_OUT"
  | "PART_REQUEST"
  | "PART_PRICED"
  | "PART_DISPATCHED"
  | "MODIFICATION"
  | "REWORK"
  | "ASSIGNMENT";

export interface V360Event {
  at: string;
  actor: string | null;
  family: V360EventFamily;
  summary: string;
  refType: string | null;
  refId: string | null;
}

export interface V360Visit {
  checkInId: string;
  receivingNo: string | null;
  arrivedAt: string;
  releasedAt: string | null;
  roStatus: string | null;
  odometerIn: number;
  odometerOut: number | null;
  totalSpend: number | null;
  currency: string | null;
  entryPhotos: string[];
  qcInspection: { id: string; overallStatus: string | null; completedAt: string | null } | null;
  jobCard: {
    id: string;
    status: string;
    serviceType: string | null;
    totalEstimate: string | null;
    currencyCode: string | null;
  } | null;
  events: V360Event[];
}

export interface V360SearchHit {
  id: string;
  registrationNumber: string | null;
  brand: string | null;
  model: string | null;
  vin: string | null;
  customerId: string | null;
  customerName: string | null;
  lastVisitAt: string | null;
  lastRoStatus: string | null;
}

export interface V360Timeline {
  vehicle: {
    id: string;
    registrationNumber: string | null;
    brand: string | null;
    model: string | null;
    vin: string | null;
    status: string | null;
  };
  customer: { id: string; name: string | null; email: string | null } | null;
  currentCheckIn:
    | {
        id: string;
        roStatus: string | null;
        roStatusAt: string | null;
        arrivedAt: string;
        bay: { number: string | null; location: string | null } | null;
      }
    | null;
  summary: { visitCount: number; lifetimeSpend: number; currency: string | null };
  visits: V360Visit[];
  warranty: { open: any[]; all: any[] };
  invoices: any[];
  insights: {
    repeatFaults: { description: string; occurrences: number; lastSeenAt: string }[];
    spendByVisit: { checkInId: string; arrivedAt: string; total: number }[];
    outstandingBalance: number;
  };
}

export const searchV360 = async (q: string): Promise<ApiResponse<V360SearchHit[]>> => {
  const { data } = await api.get(`/vehicle-360/search`, { params: { q } });
  return data;
};

export const getV360Timeline = async (vehicleId: string): Promise<ApiResponse<V360Timeline>> => {
  const { data } = await api.get(`/vehicle-360/${vehicleId}`);
  return data;
};
