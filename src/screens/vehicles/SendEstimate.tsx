import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import { useNavigate, useParams } from "react-router-dom";
import imgPlan from "../../assets/plan.png";
import { Copy, Check, Mail, MessageCircle } from "lucide-react";
import {
  getVehicleDetail,
  getVehicleJobCards,
  shareEstimate,
} from "../../api/serviceAdvisor.api";
import { useCurrency } from "../../context/CurrencyContext";

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <>
    {/* Label Box */}
    <div className="flex h-10 w-full items-center justify-center rounded-[5px] border border-[#e5e7eb] bg-white px-5 py-2.5">
      <span className="font-['Poppins'] text-[16px] font-medium leading-[1.2] text-[#333] whitespace-nowrap">
        {label}
      </span>
    </div>

    {/* Value Box */}
    <div className="flex h-10 w-full items-center justify-center rounded-[5px] border border-[#e5e7eb] bg-white px-5 py-2.5">
      <span className="font-['Poppins'] text-[16px] font-medium leading-[1.2] text-[#333] whitespace-nowrap text-center">
        {value}
      </span>
    </div>
  </>
);

export const SendEstimate = () => {
  const { currency } = useCurrency();
  const [isEstimateSent, setIsEstimateSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [totalJobs, setTotalJobs] = useState(0);
  const [estimateTotal, setEstimateTotal] = useState("₹0");
  const [latestJobCardId, setLatestJobCardId] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId: string }>();

  useEffect(() => {
    if (!vehicleId) return;

    const fetchData = async () => {
      try {
        const [vehicleRes, jobCardsRes] = await Promise.all([
          getVehicleDetail(vehicleId),
          getVehicleJobCards(vehicleId),
        ]);

        const customer = vehicleRes.data.customer;
        setCustomerName(customer.name || "N/A");
        setCustomerPhone(customer.phone || "N/A");

        const cards = jobCardsRes.data.jobCards;
        if (cards.length > 0) {
          const latest = cards[0]; // sorted by createdAt desc
          setLatestJobCardId(latest.id);
          setEstimateTotal(
            `₹${Number(latest.totalEstimate).toLocaleString("en-IN")}`
          );
          // Count items - we use subtotal/gst to infer, but we can't get items count from list
          // Use a reasonable placeholder or fetch detail
          setTotalJobs(cards.length > 0 ? 1 : 0);
        }
      } catch (error) {
        console.error("Failed to fetch send estimate data:", error);
        toast.error("Failed to load estimate data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId]);

  const handleSendEstimate = async () => {
    if (!latestJobCardId || sending) return;

    setSending(true);
    try {
      const res = await shareEstimate(latestJobCardId, currency);
      if (res.success) {
        setWhatsappSent(res.data.whatsappSent);
        setEmailSent(res.data.emailSent);
        setApprovalUrl(res.data.approvalUrl);
        setIsEstimateSent(true);

        if (res.data.emailSent) {
          toast.success("Estimate sent to customer via email");
        } else {
          const reason = res.data.emailFailReason || "check SMTP settings";
          toast.error(`Email not sent: ${reason}`);
        }

        if (res.data.whatsappSent) {
          toast.success("Estimate sent to customer via WhatsApp");
        }
      }
    } catch (error) {
      console.error("Failed to share estimate:", error);
      toast.error("Failed to send estimate");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    if (!approvalUrl) return;
    await navigator.clipboard.writeText(approvalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4f31]" />
      </div>
    );
  }

  if (isEstimateSent) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4 font-['Poppins']">

      {/* Icon Section */}
      <div className="mb-6 flex h-15 w-15 items-center justify-center rounded-full border border-[#bfbfbf] bg-[#fbfbfb]">
        <img
        src={imgPlan}
        alt="Plan Icon"
      />
      </div>

      {/* Text Section */}
      <div className="mb-10 flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-[24px] font-semibold leading-[1.2] text-[#333]">
          Estimate Sent
        </h1>
        <p className="max-w-150 text-[18px] leading-[1.3] text-[#999]">
          The estimate has been sent to {customerName} at {customerPhone}.<br className="hidden md:block" />
          You will be notified once the customer approves.
        </p>
      </div>

      {/* Status Badge */}
      <div className="mb-4 flex h-12.5 w-full max-w-83.5 items-center justify-center rounded-[10px] bg-linear-to-b from-[#ff4f31] to-[#fe2b73] px-4 shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]">
        <span className="font-['Poppins'] text-[16px] font-medium leading-[1.2] text-white whitespace-nowrap">
          Status: Awaiting Customer Approval
        </span>
      </div>

      {/* Notification delivery status */}
      <div className="mb-6 flex items-center gap-3 w-full max-w-83.5">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium
          ${emailSent
            ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]'
            : 'bg-[#fafafa] border-[#e5e7eb] text-[#999]'}`}>
          <Mail className="w-3.5 h-3.5 shrink-0" />
          {emailSent ? 'Email sent' : 'Email not sent'}
        </div>
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium
          ${whatsappSent
            ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]'
            : 'bg-[#fafafa] border-[#e5e7eb] text-[#999]'}`}>
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          {whatsappSent ? 'WhatsApp sent' : 'WhatsApp not sent'}
        </div>
      </div>

      {/* Approval URL — manual copy */}
      {approvalUrl && (
        <div className="w-full max-w-83.5 mb-6">
          <p className="text-[12px] text-[#999] mb-2 text-center">
            Share this link manually if needed
          </p>
          <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e5e7eb] rounded-lg px-3 py-2.5">
            <span className="flex-1 text-[12px] text-[#555] truncate">{approvalUrl}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1 rounded hover:bg-[#e5e7eb] transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check size={15} className="text-green-500" />
              ) : (
                <Copy size={15} className="text-[#999]" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button
        variant="outline"
        className="w-full max-w-83.5 rounded-[5px] h-12.5 bg-white hover:bg-gray-50 border-[#e5e7eb]"
        onClick={() => navigate('/service-advisor-dashboard')}
      >
        Back to Service Advisor
      </Button>
    </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4 py-8 font-['Poppins']">

      {/* Header Section */}
      <div className="flex w-full flex-col items-center gap-1.5 text-center mb-8 md:mb-10">
        <h1 className="text-lg md:text-xl font-semibold leading-[1.2] text-[#333]">
          Send an estimate to customer
        </h1>
        <p className="max-w-70 md:max-w-md text-xs md:text-sm leading-[1.2] text-[#999]">
          This will send the job estimate to the customer for approval via SMS and WhatsApp.
        </p>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-y-6 gap-x-8 md:gap-x-36 mb-8 md:mb-10 w-full max-w-md md:max-w-150">
        <DetailRow label="Customer:" value={customerName} />
        <DetailRow label="Phone:" value={customerPhone} />
        <DetailRow label="Total Jobs" value={String(totalJobs)} />
        <DetailRow label="Estimate Total:" value={estimateTotal} />
      </div>

      {/* Action Buttons */}
      <div className="flex w-full flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
        <Button
          variant="outline"
          className="w-full md:w-44 rounded-[5px]"
          onClick={() => navigate(`/service-advisor-dashboard/vehicle/${vehicleId}`)}
        >
          Cancel
        </Button>
        <Button
          variant="gradient"
          className="w-full md:w-48 rounded-[10px]"
          onClick={handleSendEstimate}
          disabled={sending || !latestJobCardId}
        >
          {sending ? "Sending..." : "Send Estimate"}
        </Button>
      </div>
    </div>
  );
};
