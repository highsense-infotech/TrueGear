import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Search, ShieldCheck, CheckCircle2, Camera, Loader2 } from "lucide-react";
import Button from "../../components/common/Button";
import {
  listActiveGatePassesPaginated,
  lookupGatePass,
  redeemGatePass,
  uploadGatePassLicencePhoto,
  type GatePass,
  type GatePassListItem,
} from "../../api/gatePass.api";
import { Pagination } from "../../components/common/Pagination";

export default function GatePassScan() {
  const [code, setCode] = useState("");
  const [pass, setPass] = useState<GatePass | null>(null);
  const [active, setActive] = useState<GatePassListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [odo, setOdo] = useState("");
  const [driver, setDriver] = useState("");
  // Driver's-licence photo captured at the gate.
  const [licencePath, setLicencePath] = useState("");
  const [licencePreview, setLicencePreview] = useState("");
  const [uploadingLicence, setUploadingLicence] = useState(false);
  const licenceInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchActive = async () => {
    const res = await listActiveGatePassesPaginated({ page, limit: pageSize });
    if (res.success && res.data) {
      setActive(res.data.data);
      setTotal(res.data.pagination?.total ?? res.data.data.length);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    }
  };
  useEffect(() => { fetchActive(); /* eslint-disable-next-line */ }, [page, pageSize]);

  const search = async (codeOverride?: string) => {
    const c = (codeOverride ?? code).trim();
    if (!c) return;
    setLoading(true);
    setPass(null);
    try {
      const res = await lookupGatePass(c);
      if (res.success && res.data) {
        setPass(res.data);
        setOdo("");
        setDriver("");
        setLicencePath("");
        setLicencePreview("");
        setNotes("");
      } else {
        toast.error(res.error?.message ?? "Gate pass not found");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const onLicencePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploadingLicence(true);
    try {
      const res = await uploadGatePassLicencePhoto(file);
      if (res.success && res.data) {
        setLicencePath(res.data.path);
        setLicencePreview(res.data.url);
      } else {
        toast.error(res.error?.message ?? "Upload failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Upload failed");
    } finally {
      setUploadingLicence(false);
    }
  };

  const redeem = async () => {
    if (!pass) return;
    const odoN = odo ? Number(odo) : undefined;
    if (odo && (isNaN(odoN!) || odoN! < 0)) return toast.error("Invalid odometer");
    if (!licencePath) return toast.error("Driver's licence photo is required");
    setBusy(true);
    try {
      const res = await redeemGatePass(pass.code, {
        odometerOut: odoN,
        driverOutName: driver.trim() || undefined,
        driverOutLicenceImageUrl: licencePath,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        toast.success("Vehicle released");
        setPass(null);
        setCode("");
        await fetchActive();
      } else {
        toast.error(res.error?.message ?? "Failed to redeem");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to redeem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="text-[#0061FF]" size={20} />
        <h2 className="text-[18px] font-semibold text-[#333]">Gate Release</h2>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); search(); }}
        className="bg-white border border-[#e5e7eb] rounded-xl p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-[#999]" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter / scan gate-pass code (e.g. GP-00042)"
          className="flex-1 text-[14px] outline-none bg-transparent"
        />
        <Button variant="gradient" type="submit" disabled={loading}>
          {loading ? "Looking up..." : "Lookup"}
        </Button>
      </form>

      {pass && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[20px] font-bold text-[#ff4f31] tracking-wide">{pass.code}</p>
              <p className="text-[13px] text-[#333] font-semibold mt-1">
                {(pass.vehicle.registrationNumber ?? "—").toUpperCase()} · {pass.vehicle.brand} {pass.vehicle.model}
              </p>
              <p className="text-[12px] text-[#666]">
                {pass.customer.name ?? ""} {pass.customer.email ? `· ${pass.customer.email}` : ""}
              </p>
              {pass.invoice && (
                <p className="text-[11px] text-[#999] mt-0.5">
                  Invoice {pass.invoice.invoiceNo} · {pass.invoice.currencyCode} {Number(pass.invoice.totalAmount).toFixed(2)} ({pass.invoice.status})
                </p>
              )}
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${pass.status === "ACTIVE" ? "bg-amber-100 text-amber-700" : pass.status === "REDEEMED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {pass.status}
            </span>
          </div>

          {pass.status === "ACTIVE" ? (
            <div className="mt-4 border-t border-[#f5f5f5] pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[12px] text-[#999]">Odometer out (km)</label>
                <input
                  type="number"
                  min="0"
                  value={odo}
                  onChange={(e) => setOdo(e.target.value)}
                  className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#999]">Driver name</label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#999]">
                  Driver's licence photo <span className="text-red-500">*</span>
                </label>
                <input
                  ref={licenceInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onLicencePhoto}
                  className="hidden"
                />
                {licencePreview ? (
                  <div className="mt-1 flex items-center gap-2">
                    <img
                      src={licencePreview}
                      alt="Driver's licence"
                      className="h-10 w-16 object-cover rounded-md border border-[#e5e7eb]"
                    />
                    <button
                      type="button"
                      onClick={() => licenceInputRef.current?.click()}
                      disabled={uploadingLicence}
                      className="text-[12px] text-[#ff4f31] underline"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => licenceInputRef.current?.click()}
                    disabled={uploadingLicence}
                    className="mt-1 w-full h-10 border border-dashed border-[#e5e7eb] rounded-md px-2 text-[13px] text-[#666] flex items-center justify-center gap-1.5 hover:border-[#ff4f31]"
                  >
                    {uploadingLicence ? (
                      <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><Camera size={14} /> Take / upload photo</>
                    )}
                  </button>
                )}
              </div>
              <Button variant="gradient" onClick={redeem} disabled={busy}>
                <CheckCircle2 size={16} className="mr-1" />
                {busy ? "Releasing..." : "Release vehicle"}
              </Button>
              <div className="md:col-span-3">
                <label className="text-[12px] text-[#999]">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything to record"
                  className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31]"
                />
              </div>
            </div>
          ) : pass.status === "REDEEMED" ? (
            <p className="mt-3 text-[12px] text-[#666]">
              Already redeemed{pass.redeemedAt ? ` on ${new Date(pass.redeemedAt).toLocaleString()}` : ""}.
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-red-600">This gate pass was voided.</p>
          )}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[#333]">Active passes</h3>
        <span className="text-[11px] text-[#999]">{total}</span>
      </div>
      {active.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 text-center text-[13px] text-[#999]">
          No active gate passes.
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <button
              key={p.id}
              onClick={() => { setCode(p.code); search(p.code); }}
              className="w-full text-left bg-white border border-[#e5e7eb] rounded-xl p-3 hover:bg-[#fafafa] transition flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#ff4f31]">{p.code}</p>
                <p className="text-[12px] text-[#666]">
                  {(p.vehicle.registrationNumber ?? "—").toUpperCase()} · {p.vehicle.brand} {p.vehicle.model}
                  {p.customerName ? ` · ${p.customerName}` : ""}
                </p>
              </div>
              <span className="text-[11px] text-[#999]">{new Date(p.generatedAt).toLocaleString()}</span>
            </button>
          ))}

          {total > 0 && (
            <div className="mt-3 pt-2 border-t border-[#f0f0f0]">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                onItemsPerPageChange={(l) => {
                  setPageSize(l);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
