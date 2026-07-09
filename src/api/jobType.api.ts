import api from './axios';
import type { ApiResponse } from './types';

// Evolve Job Type (RO <JobType>) — populated from the backend job_types lookup
// cache. Until the Evolve lookup sync is implemented (blocked on client info),
// the list is empty and the Create Job Card screen shows "No Job Types
// configured." No values are hardcoded on the frontend.
export interface JobTypeItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export const listJobTypes = async (): Promise<ApiResponse<JobTypeItem[]>> => {
  const { data } = await api.get('/job-types');
  return data;
};
