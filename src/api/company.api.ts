import api from './axios';

// Frontend abstraction for company operations. Thin data layer only — no
// business logic. The backend never returns interface_code, so this shape
// intentionally has none; the FE only ever knows companyId (+ display fields).
export interface Company {
  id: string;
  code: string;
  name: string;
}

/**
 * GET /api/companies — active companies for the company selector.
 * Throws on network/HTTP failure so callers can distinguish "backend
 * unavailable" (fall back to legacy options) from "backend returned an empty
 * list" (valid response). An empty array is a valid, successful result.
 */
export const getCompanies = async (): Promise<Company[]> => {
  const { data } = await api.get('/companies');
  return data?.data ?? [];
};
