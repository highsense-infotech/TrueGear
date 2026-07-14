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
  franchiseSeqId: string;
  sdNumber: string;
  franchiseLabel: string | null;
  serviceDeptLabel: string | null;
  isActive: boolean;
}

// Default scope=labeled → only active, fully-labeled pairs (the dropdown source).
export const listFranchiseServiceDepts = async (): Promise<ApiResponse<FranchiseServiceDeptItem[]>> => {
  const { data } = await api.get('/franchise-service-depts');
  return data;
};
