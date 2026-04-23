import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { BillingCard } from "../../components/cards/BillingCard.tsx";
import { DollarSign, Wallet, FileText, FileSpreadsheet } from "lucide-react";
import { ROUTES } from "../../constants/routes";

interface BillingJob {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  amount: string;
  jobCount: string;
}

const FinanceBillingDashboard = () => {
  const navigate = useNavigate();
  const [jobs] = useState<BillingJob[]>([
    {
      id: "1",
      vehicleNumber: "KA-05-EF-9012",
      vehicleModel: "Maruti swift",
      amount: "5,782",
      jobCount: "2 Jobs",
    },
    {
      id: "2",
      vehicleNumber: "DL-03-GH-3456",
      vehicleModel: "Hyundai Creta",
      amount: "10,148",
      jobCount: "3 Jobs",
    },
  ]);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
        <StatCard
          title="Pending bill"
          value="02"
          icon={
            <DollarSign
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#FF4F31]"
              strokeWidth={2}
            />
          }
        />
        <StatCard
          title="Today's Collection"
          value="45,600"
          icon={
            <Wallet
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#00BF06]"
              strokeWidth={2}
            />
          }
        />
        <StatCard
          title="Invoices generated"
          value="08"
          icon={
            <FileText
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#0061FF]"
              strokeWidth={2}
            />
          }
        />
        <StatCard
          title="Average Invoice value"
          value="5,700"
          icon={
            <FileSpreadsheet
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#333]"
              strokeWidth={2}
            />
          }
        />
      </div>

      {/* Ready for Billing Section */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#333] mb-0.5 sm:mb-1">
          Ready for Billing
        </h2>
        <p className="text-[13px] sm:text-[14px] text-[#999]">
          Vehicles that have passed post-service QC
        </p>
      </div>

      {/* Billing Cards */}
      <div className="space-y-3 sm:space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() =>
              navigate(
                `${ROUTES.FINANCE_BILLING_DASHBOARD}/invoice/${job.id}`
              )
            }
            className="cursor-pointer"
          >
            <BillingCard
              vehicleNumber={job.vehicleNumber}
              vehicleModel={job.vehicleModel}
              amount={job.amount}
              jobCount={job.jobCount}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default FinanceBillingDashboard;
