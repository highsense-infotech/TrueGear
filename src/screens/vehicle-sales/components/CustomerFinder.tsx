// "Search Existing" customer step for Vehicle Sales, matching Create
// Appointment: search by phone number (in the company picked above both tabs
// with CompanyPicker), and select a result. Searches, in order: customers already in Vehicle Sales,
// Evolve CRM (02 Customer_VehicleLookup via /appointments/irm-search, which
// also saves the Evolve customer into the TrueGear customer master), then the
// TrueGear customer database.

import { useEffect, useRef, useState } from "react";
import { Search, Phone, Loader2, Check, Car } from "lucide-react";
import { irmCustomerSearch, searchInternalCustomers, type IrmCustomerResult } from "../../../api/appointment.api";
import { getCompanies, type Company } from "../../../api/company.api";
import type { Customer } from "../data/mock";
import { Badge, Card, Field, Notice, SelectInput, SmallButton } from "./ui";

// Legacy company list (Evolve InterfaceCode), used only if /companies fails —
// the same fallback Create Appointment uses.
const COMPANY_OPTIONS = [
  { label: "10EC", value: "95112-AGLT-10EC" },
  { label: "20EC", value: "95112-AGLT-20EC" },
];

export interface FoundCustomer {
  source: "Vehicle Sales" | "Evolve" | "TrueGear";
  key: string;
  name: string;
  type: Customer["type"];
  phone: string;
  email: string;
  city: string;
  regNumber?: string;
  custSequenceId?: string;
  crmReferenceNo?: string;
  truegearCustomerId?: string;
  salesCustomerId?: string; // already a Vehicle Sales customer
  vehicle?: { registration: string; make: string; model: string; year: number };
}

const digits = (s: string) => s.replace(/\D/g, "");
const fullName = (c: { companyName?: string | null; firstName?: string | null; lastName?: string | null }) =>
  c.companyName?.trim() || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

function fromIrm(r: IrmCustomerResult, source: FoundCustomer["source"]): FoundCustomer {
  const v = r.vehicle;
  return {
    source,
    key: `${source}:${r.custSequenceId || r.localCustomerId || r.crmReferenceNo}:${v?.registrationNumber ?? ""}`,
    name: fullName(r),
    type: r.companyName?.trim() || r.customerType === "C" ? "Company" : "Individual",
    phone: r.phone ?? "",
    email: r.email ?? "",
    city: r.city ?? "",
    custSequenceId: r.custSequenceId || undefined,
    crmReferenceNo: r.crmReferenceNo || undefined,
    truegearCustomerId: r.localCustomerId ?? undefined,
    vehicle: v?.registrationNumber
      ? { registration: v.registrationNumber.toUpperCase(), make: v.brand ?? "", model: v.model ?? "", year: Number(v.year) || 0 }
      : undefined,
  };
}

/** The company an enquiry belongs to: a /companies id, or — when that list is
 *  unavailable — a legacy Evolve interface code. */
export interface SalesCompany { companyId?: string; interfaceCode?: string; name: string }

// Company selector shared by "Search Existing" and "+ Add New".
export function CompanyPicker({ value, onChange, error }: { value: SalesCompany | null; onChange: (c: SalesCompany | null) => void; error?: string }) {
  const [companies, setCompanies] = useState<Company[] | null | undefined>(undefined); // null = backend list unavailable

  useEffect(() => {
    let live = true;
    getCompanies()
      .then((list) => live && setCompanies(list))
      .catch(() => live && setCompanies(null));
    return () => {
      live = false;
    };
  }, []);

  const options = companies
    ? companies.map((c) => ({ value: c.id, label: c.name || c.code }))
    : COMPANY_OPTIONS;
  const current = value?.companyId ?? value?.interfaceCode ?? "";
  const change = (v: string) => {
    if (!v) return onChange(null);
    const label = options.find((o) => o.value === v)?.label ?? v;
    onChange(companies ? { companyId: v, name: label } : { interfaceCode: v, name: label });
  };

  return (
    <Field label="Company" required error={error} htmlFor="cf-company">
      <SelectInput id="cf-company" value={current} onChange={(e) => change(e.target.value)} error={!!error}
        placeholder={companies === undefined ? "Loading companies…" : "Select company…"} options={options} />
    </Field>
  );
}

export function CustomerFinder({
  company, salesCustomers, selected, onSelect, onAddNew,
}: {
  /** Picked above the tabs; remount (key) when it changes to clear results. */
  company: SalesCompany | null;
  salesCustomers: Customer[];
  selected: FoundCustomer | null;
  onSelect: (c: FoundCustomer) => void;
  onAddNew: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<null | "crm" | "internal">(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FoundCustomer[] | null>(null);
  const gen = useRef(0);

  const companyChosen = !!company;

  const search = async () => {
    const p = phone.trim();
    if (!p) return;
    const my = ++gen.current;
    const stale = () => gen.current !== my;
    setError(null);
    setResults(null);

    // 1. Customers already in Vehicle Sales with this phone number.
    const local: FoundCustomer[] = salesCustomers
      .filter((c) => digits(c.phone).length >= 9 && digits(c.phone).endsWith(digits(p).slice(-9)))
      .map((c) => ({
        source: "Vehicle Sales" as const, key: `vs:${c.id}`, name: c.name, type: c.type, phone: c.phone, email: c.email, city: c.city,
        regNumber: c.regNumber, custSequenceId: c.custSequenceId, crmReferenceNo: c.crmReferenceNo, truegearCustomerId: c.truegearCustomerId, salesCustomerId: c.id,
      }));

    // 2. Evolve CRM. A refusal or outage is reported but never stops step 3.
    let external: FoundCustomer[] = [];
    setStep("crm");
    try {
      const res = await irmCustomerSearch({ phone: p, ...(company?.companyId ? { companyId: company.companyId } : { interfaceCode: company?.interfaceCode }) });
      if (stale()) return;
      external = (res.data ?? []).map((r) => fromIrm(r, "Evolve"));
      if (!external.length && res.meta?.outcome === "UNAVAILABLE") {
        setError("Evolve is unavailable right now — showing TrueGear matches only.");
      }
    } catch (err) {
      if (stale()) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 403
        ? "Evolve search was refused for your role (needs CRM / Enquiry › View) — showing TrueGear matches only."
        : "Evolve could not be searched — showing TrueGear matches only.");
    }

    // 3. The TrueGear customer database, when Evolve found nobody.
    if (!external.length) {
      setStep("internal");
      try {
        const internal = await searchInternalCustomers({ phone: p });
        if (stale()) return;
        external = internal.map((c) => fromIrm({
          localCustomerId: c.id, crmReferenceNo: c.crmReferenceNo, custSequenceId: c.custSequenceId, firstName: c.firstName, lastName: c.lastName,
          companyName: c.companyName ?? "", customerType: c.customerType, idNumber: "", phone: c.contactNumber ?? "", email: c.primaryEmail ?? "",
          address: "", city: "", postalCode: "", country: "",
          vehicle: c.vehicleRegistration ? { registrationNumber: c.vehicleRegistration, brand: c.vehicleBrand ?? "", model: c.vehicleModel ?? "", year: "" } as IrmCustomerResult["vehicle"] : null,
        }, "TrueGear"));
      } catch {
        // searchInternalCustomers already returns [] on failure.
      }
    }
    if (!stale()) setStep(null);
    // A customer already in Vehicle Sales wins over the same Evolve customer.
    const known = new Set(local.map((c) => c.custSequenceId).filter(Boolean));
    setResults([...local, ...external.filter((c) => !c.custSequenceId || !known.has(c.custSequenceId))]);
  };

  const onKey = (e: React.KeyboardEvent) => e.key === "Enter" && void search();
  const inputCls = "w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4f31] text-[#333]";

  return (
    <Card title="Search customer" icon={Search} subtitle="Search Evolve CRM and TrueGear by the customer's phone number">
      <div>
        <label htmlFor="cf-phone" className="block text-[13px] font-medium text-[#333] mb-1.5">Phone number</label>
        <div className="relative">
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input id="cf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={onKey} placeholder="+27 60 000 0000" className={inputCls} autoFocus />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void search()}
        disabled={step !== null || !companyChosen || digits(phone).length < 9}
        className="mt-4 w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-[#ff4f31] to-[#fe2b73] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {step ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {step === "crm" ? "Searching CRM…" : step === "internal" ? "Searching TrueGear…" : "Search customer"}
      </button>
      {!companyChosen && <p className="text-[11px] text-[#999] mt-1.5">Select the company above to search.</p>}
      {error && <Notice tone="warning" className="mt-3">{error}</Notice>}

      {results && (
        <div className="mt-5 space-y-3">
          {results.length > 0 ? (
            <>
              <p className="text-[13px] font-semibold text-[#333]">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
              {results.map((c) => {
                const isSel = selected?.key === c.key;
                const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={c.key} className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${isSel ? "border-[#ff4f31] bg-[#ff4f31]/5" : "border-[#e5e7eb]"}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 text-[12px] font-bold text-[#999]">{initials}</div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#333] flex items-center gap-2 flex-wrap">
                          {c.name}
                          <Badge tone={c.source === "Evolve" ? "blue" : c.source === "Vehicle Sales" ? "green" : "gray"}>{c.source}</Badge>
                          <Badge tone="gray">{c.type}</Badge>
                        </p>
                        {c.phone && <p className="text-[12px] text-[#999]">{c.phone}</p>}
                        {c.email && <p className="text-[12px] text-[#999]">{c.email}</p>}
                        {c.vehicle && <p className="text-[12px] text-[#999] flex items-center gap-1"><Car size={12} /> {c.vehicle.registration}{c.vehicle.make ? ` — ${c.vehicle.make} ${c.vehicle.model} ${c.vehicle.year || ""}`.trimEnd() : ""}</p>}
                        {c.custSequenceId && <p className="text-[11px] text-[#bbb]">Evolve {c.custSequenceId}</p>}
                      </div>
                    </div>
                    {isSel ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-white bg-green-600 rounded-lg shrink-0"><Check size={12} /> Selected</span>
                    ) : (
                      <SmallButton onClick={() => onSelect(c)} className="shrink-0 text-[#ff4f31]! border-[#ff4f31]!">Select</SmallButton>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-[13px] font-medium text-[#333]">No customer found</p>
              <p className="text-[12px] text-[#999]">Searched Vehicle Sales, Evolve CRM and TrueGear — no match.</p>
              <button type="button" onClick={onAddNew} className="mt-1 px-4 py-2 text-[13px] font-medium text-white bg-linear-to-b from-[#ff4f31] to-[#fe2b73] rounded-lg hover:opacity-90 cursor-pointer">
                + Create new customer
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
