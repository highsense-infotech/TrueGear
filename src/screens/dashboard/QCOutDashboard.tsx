import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle2, Truck } from 'lucide-react';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';

type VehicleStatus = 'qc_pending' | 'failed' | 'ready';

interface VehicleEntry {
  id: string;
  registration: string;
  model: string;
  serviceType: string;
  techSignOff: string;
  status: VehicleStatus;
  frontImage: string | null;
}

const DUMMY_VEHICLES: VehicleEntry[] = [
  { id: 'v1', registration: 'KA 01 MB 1234', model: 'Toyota Camry',   serviceType: 'General Service + Brake Pad',  techSignOff: '10:00 AM', status: 'qc_pending', frontImage: null },
  { id: 'v2', registration: 'KA 05 HN 7821', model: 'VW Tiguan',      serviceType: 'Engine Overhaul',              techSignOff: '10:15 AM', status: 'qc_pending', frontImage: null },
  { id: 'v3', registration: 'TN 09 AK 3345', model: 'Ford Figo',      serviceType: 'Body Repair + Paint',          techSignOff: '10:30 AM', status: 'failed',     frontImage: null },
  { id: 'v4', registration: 'MH 02 CX 9900', model: 'BMW 7 Series',   serviceType: 'Suspension + Alignment',       techSignOff: '10:45 AM', status: 'qc_pending', frontImage: null },
  { id: 'v5', registration: 'DL 08 RT 5567', model: 'Ford Raptor',    serviceType: 'Transmission Service',         techSignOff: '11:00 AM', status: 'ready',      frontImage: null },
  { id: 'v6', registration: 'KA 03 PL 2210', model: 'Hyundai Creta',  serviceType: 'AC Repair + Gas Refill',       techSignOff: '11:15 AM', status: 'qc_pending', frontImage: null },
  { id: 'v7', registration: 'TN 11 MV 8844', model: 'Mercedes Vito',  serviceType: 'Electrical Diagnostics',       techSignOff: '11:30 AM', status: 'failed',     frontImage: null },
  { id: 'v8', registration: 'AP 07 GH 4412', model: 'Buick Encore',   serviceType: 'Clutch Replacement',           techSignOff: '11:45 AM', status: 'ready',      frontImage: null },
];

const STATUS_BADGE: Record<VehicleStatus, { label: string; className: string }> = {
  qc_pending: { label: 'QC Pending',     className: 'bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]' },
  failed:     { label: 'QC Failed',      className: 'bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]' },
  ready:      { label: 'Ready for Exit', className: 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]' },
};

export default function QCOutDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isIndexRoute = location.pathname === ROUTES.QC_OUT_DASHBOARD;

  const [vehicles] = useState<VehicleEntry[]>(DUMMY_VEHICLES);

  const qcPendingCount = vehicles.filter((v) => v.status === 'qc_pending').length;
  const failedCount    = vehicles.filter((v) => v.status === 'failed').length;
  const readyCount     = vehicles.filter((v) => v.status === 'ready').length;

  const handleStartInspection = (vehicleId: string) => {
    navigate(`${ROUTES.QC_OUT_DASHBOARD}/inspection/${vehicleId}`);
  };

  if (!isIndexRoute) return <Outlet />;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'QC OUT Pending Queue' }]} />

      {/* Stats — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* QC OUT Pending */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-[13px] text-[#999]">QC OUT Pending</p>
            <p className="text-[38px] font-bold text-[#333] leading-tight mt-1">{qcPendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#04c397]/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#04c397]" />
          </div>
        </div>

        {/* Failed QC Today — red card */}
        <div className="bg-[#DE2020] rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.08)]">
          <div>
            <p className="text-[13px] text-white/80">Failed QC Today</p>
            <p className="text-[38px] font-bold text-white leading-tight mt-1">{failedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Ready for Exit */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-[13px] text-[#999]">Ready for Exit</p>
            <p className="text-[38px] font-bold text-[#333] leading-tight mt-1">{readyCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#00C853]/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
          </div>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <h2 className="text-[15px] font-semibold text-[#333]">Vehicles Awaiting Final Inspection</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] sm:text-[14px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] bg-[#fafafa] text-[#999] text-[12px]">
                <th className="text-left px-5 py-3 font-medium">Vehicle Details</th>
                <th className="text-left px-5 py-3 font-medium">Service Type</th>
                <th className="text-left px-5 py-3 font-medium">Tech Sign-off</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-center px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const badge = STATUS_BADGE[vehicle.status];
                return (
                  <tr key={vehicle.id} className="border-b border-[#f9f9f9] hover:bg-[#fafafa] transition-colors">
                    {/* Vehicle Details */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center shrink-0 overflow-hidden">
                          {vehicle.frontImage ? (
                            <img src={vehicle.frontImage} alt={vehicle.model} className="w-full h-full object-cover" />
                          ) : (
                            <Truck className="w-5 h-5 text-[#bfbfbf]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#333]">{vehicle.registration}</p>
                          <p className="text-[12px] text-[#999]">{vehicle.model}</p>
                        </div>
                      </div>
                    </td>

                    {/* Service Type */}
                    <td className="px-5 py-3 text-[#555]">{vehicle.serviceType}</td>

                    {/* Tech Sign-off */}
                    <td className="px-5 py-3">
                      <p className="text-[#333]">{vehicle.techSignOff}</p>
                      <p className="text-[12px] text-[#999]">Today</p>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3 text-right">
                      {vehicle.status !== 'ready' ? (
                        <Button
                          variant="gradient"
                          gradient={{ from: '#04C397', to: '#158E86', direction: 'to-r' }}
                          onClick={() => handleStartInspection(vehicle.id)}
                          className="h-8 px-3 text-[12px] w-full!"
                        >
                          Start Final Inspection
                        </Button>
                      ) : (
                        <span className="text-[#00C853] text-[12px] font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
