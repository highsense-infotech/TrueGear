import api from './axios';
import type { ApiResponse } from './types';

// Evolve Franchise / Service-Dept pairs (RO <FranchiseSeqID> / <ServiceDept>).
// Populated from the backend franchise_service_departments cache (numeric pairs
// synced from Evolve) once an admin has labeled them. The Create Job Card screen
// shows two dependent dropdowns: Franchise (franchiseLabel) → Service Dept
// (serviceDeptLabel). The selected row `id` is stored on the job card. No values
// are hardcoded on the frontend.
export interface FranchiseServiceDeptItem {
  id: string;
  // Company (dealership) the pair belongs to. null = unscoped legacy row,
  // visible to every company until a per-company sync supersedes it.
  companyId: string | null;
  franchiseSeqId: string;
  sdNumber: string;
  franchiseLabel: string | null;
  serviceDeptLabel: string | null;
  isActive: boolean;
}

// Default scope=labeled → only active, fully-labeled pairs (the dropdown source).
//
// `companyId` scopes the list to one dealership. Evolve answers the franchise
// lookup per InterfaceCode, so the pairs belong to a single company — pass the
// company the RO will be posted to (the VEHICLE's owning company, which the
// vehicle-detail response resolves) or the advisor can pick 10EC franchises for
// a 20EC repair order. Omitted → unfiltered, the previous behaviour.
export const listFranchiseServiceDepts = async (
  companyId?: string,
): Promise<ApiResponse<FranchiseServiceDeptItem[]>> => {
  const { data } = await api.get('/franchise-service-depts', {
    params: companyId ? { companyId } : undefined,
  });
  return data;
};
