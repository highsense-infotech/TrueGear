// Make → Series (model) → Model code, from the same catalogue as Create
// Appointment's new-vehicle step (vehicle.api: listMakes / listModelsByMake /
// listModelCodes — model codes come from Evolve 28 and are cached by the
// backend). Used for each vehicle line on New Purchase Order.

import { useEffect, useState } from "react";
import type { VehicleMake, VehicleModel, VehicleModelCode } from "../../../api/vehicle.api";
import { Field, SelectInput } from "./ui";
import { loadCodes, loadModels } from "./vehicleCatalogue";

export interface CatalogueChoice {
  makeId: string;
  make: string;
  modelId: string;
  series: string;
  modelCode: string;
  model: string; // Evolve model description (or the series when it has no codes)
  year?: number;
}

const codeLabel = (c: VehicleModelCode) =>
  `${c.code}${c.description ? ` — ${c.description}` : ""}${c.modelYear ? ` (${c.modelYear})` : ""}`;

export function VehicleCataloguePicker({
  idPrefix, makes, value, onChange, error,
}: {
  idPrefix: string;
  makes: VehicleMake[];
  value: Partial<CatalogueChoice>;
  onChange: (v: Partial<CatalogueChoice>) => void;
  error?: string;
}) {
  const [models, setModels] = useState<VehicleModel[] | null>(null);
  const [codes, setCodes] = useState<VehicleModelCode[] | null>(null);

  useEffect(() => {
    let live = true;
    if (value.makeId) loadModels(value.makeId).then((m) => live && setModels(m));
    return () => {
      live = false;
    };
  }, [value.makeId]);

  useEffect(() => {
    let live = true;
    if (value.modelId) {
      loadCodes(value.modelId).then((list) => {
        if (!live) return;
        setCodes(list);
        // Same as Create Appointment: a series with exactly one code selects it.
        if (list.length === 1 && !value.modelCode) {
          const c = list[0];
          onChange({ ...value, modelCode: c.code, model: c.description || value.series, year: c.modelYear ?? undefined });
        }
        // A series with no codes in Evolve still makes a valid line.
        if (list.length === 0 && !value.modelCode && value.series) onChange({ ...value, modelCode: value.series, model: value.series });
      });
    }
    return () => {
      live = false;
    };
    // onChange/value change every render; only a new series should refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.modelId]);

  const pickMake = (makeId: string) => {
    const mk = makes.find((m) => m.id === makeId);
    setModels(null);
    setCodes(null);
    onChange({ makeId, make: mk?.name ?? "", modelId: "", series: "", modelCode: "", model: "", year: undefined });
  };
  const pickModel = (modelId: string) => {
    const md = models?.find((m) => m.id === modelId);
    setCodes(null);
    onChange({ ...value, modelId, series: md?.name ?? "", modelCode: "", model: "", year: undefined });
  };
  const pickCode = (code: string) => {
    const c = codes?.find((x) => x.code === code);
    onChange({ ...value, modelCode: code, model: c?.description || value.series || code, year: c?.modelYear ?? undefined });
  };

  const noCodes = codes !== null && codes.length === 0;
  return (
    <>
      <Field label="Make" required error={!value.makeId ? error : undefined} htmlFor={`${idPrefix}-make`}>
        <SelectInput id={`${idPrefix}-make`} value={value.makeId ?? ""} onChange={(e) => pickMake(e.target.value)} error={!!error && !value.makeId}
          placeholder="Select make" options={makes.map((m) => ({ value: m.id, label: m.name }))} />
      </Field>
      <Field label="Model (series)" required error={value.makeId && !value.modelId ? error : undefined} htmlFor={`${idPrefix}-series`}>
        <SelectInput id={`${idPrefix}-series`} value={value.modelId ?? ""} onChange={(e) => pickModel(e.target.value)} disabled={!value.makeId || models === null}
          error={!!error && !!value.makeId && !value.modelId}
          placeholder={!value.makeId ? "Select a make first" : models === null ? "Loading…" : models.length ? "Select model" : "No models for this make"}
          options={(models ?? []).map((m) => ({ value: m.id, label: m.name }))} />
      </Field>
      <Field label="Model code" required={!noCodes} className="md:col-span-2" hint={noCodes ? "Evolve has no model codes for this series — the series is used." : undefined}
        error={value.modelId && !value.modelCode ? error : undefined} htmlFor={`${idPrefix}-code`}>
        <SelectInput id={`${idPrefix}-code`} value={noCodes ? "" : value.modelCode ?? ""} onChange={(e) => pickCode(e.target.value)}
          disabled={!value.modelId || codes === null || noCodes} error={!!error && !!value.modelId && !value.modelCode}
          placeholder={!value.modelId ? "Select a model first" : codes === null ? "Loading model codes from Evolve…" : noCodes ? "No model codes" : "Select model code"}
          options={(codes ?? []).map((c) => ({ value: c.code, label: codeLabel(c) }))} />
      </Field>
    </>
  );
}
