// Loaders for the Make → Series → Model code catalogue (kept out of
// VehicleCataloguePicker.tsx so that file only exports components).

import { useEffect, useState } from "react";
import { listMakes, listModelsByMake, listModelCodes, type VehicleMake, type VehicleModel, type VehicleModelCode } from "../../../api/vehicle.api";

// Shared across lines and re-renders: each list is fetched once per page.
let makesPromise: Promise<VehicleMake[]> | null = null;
const modelsCache = new Map<string, Promise<VehicleModel[]>>();
const codesCache = new Map<string, Promise<VehicleModelCode[]>>();

const loadMakes = () => {
  makesPromise ??= listMakes().then((r) => r.data ?? []).catch((err) => {
    makesPromise = null;
    throw err;
  });
  return makesPromise;
};
export const loadModels = (makeId: string) => {
  if (!modelsCache.has(makeId)) modelsCache.set(makeId, listModelsByMake(makeId).then((r) => r.data ?? []).catch(() => []));
  return modelsCache.get(makeId)!;
};
export const loadCodes = (modelId: string) => {
  if (!codesCache.has(modelId)) codesCache.set(modelId, listModelCodes(modelId).then((r) => r.data ?? []).catch(() => []));
  return codesCache.get(modelId)!;
};

/** Loads the makes once; null while loading, [] if the catalogue can't be read. */
export function useCatalogueMakes(): { makes: VehicleMake[] | null; failed: boolean } {
  const [state, setState] = useState<{ makes: VehicleMake[] | null; failed: boolean }>({ makes: null, failed: false });
  useEffect(() => {
    let live = true;
    loadMakes()
      .then((makes) => live && setState({ makes, failed: false }))
      .catch(() => live && setState({ makes: [], failed: true }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

