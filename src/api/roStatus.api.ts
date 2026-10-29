import api from './axios';
import type { ApiResponse } from './types';

/**
 * Evolve RO Status (RO <ROStatus>) — populated from the backend ro_statuses
 * lookup cache, which master-data sync fills from Evolve's
 * IRM_GetLookupDropdownTables. Nothing is hardcoded here: the list is
 * per-dealer master data and differs between companies.
 *
 * `code` is the ROStatus TEXT ("Wait Parts") — exactly what Evolve expects
 * back in <ROStatus>. `statusType` is the letter it expects in <ROStatusType>;
 * it is returned for display only. The client sends back the CODE alone, and
 * the server re-reads statusType from the same cache row at push time so the
 * pair can never drift apart.
 */
export interface RoStatusItem {
  id: string;
  code: string;
  name: string;
  statusType: string | null;
}

export const listRoStatuses = async (): Promise<ApiResponse<RoStatusItem[]>> => {
  const { data } = await api.get('/ro-statuses');
  return data;
};
