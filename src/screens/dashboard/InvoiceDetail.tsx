import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Download,
  CircleDot,
  Send,
} from "lucide-react";
import { ROUTES } from "../../constants/routes";
import Button from "../../components/common/Button";

type PaymentMethod = "card" | "cash" | "upi";

interface ServiceItem {
  name: string;
  parts: number;
  labour: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  generatedDate: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  vehicleModel: string;
  services: ServiceItem[];
}

const mockInvoiceData: Record<string, InvoiceData> = {
  "1": {
    invoiceNumber: "INV-2026-0089",
    generatedDate: "13/2/2026",
    customerName: "Anil Kumar",
    customerPhone: "+91 76543 21098",
    vehicleNumber: "KA-05-EF-9012",
    vehicleModel: "Maruti Swift",
    services: [
      {
        name: "Front Brake Pad Replacement",
        parts: 3500,
        labour: 800,
        total: 4300,
      },
      { name: "Brake Fluid Top-up", parts: 400, labour: 200, total: 600 },
    ],
  },
  "2": {
    invoiceNumber: "INV-2026-0090",
    generatedDate: "13/2/2026",
    customerName: "Rahul Sharma",
    customerPhone: "+91 98765 43210",
    vehicleNumber: "DL-03-GH-3456",
    vehicleModel: "Hyundai Creta",
    services: [
      { name: "Engine Oil Change", parts: 2800, labour: 500, total: 3300 },
      { name: "Oil Filter Replacement", parts: 600, labour: 200, total: 800 },
      { name: "Air Filter Replacement", parts: 1200, labour: 300, total: 1500 },
    ],
  },
};

const paymentMethods: { key: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { key: "card", label: "Card payment", icon: CreditCard },
  { key: "cash", label: "Cash payment", icon: Banknote },
  { key: "upi", label: "UPI payment", icon: Smartphone },
];

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoice = id ? mockInvoiceData[id] : null;

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("card");
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  if (!invoice) {
    return (
      <div className="bg-white rounded-xl p-8 text-center mt-4">
        <p className="text-[#333] text-lg">Invoice not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-[#FF4F31] text-sm hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const subtotal = invoice.services.reduce((sum, s) => sum + s.total, 0);
  const gst = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gst;

  const selectedMethod = paymentMethods.find(
    (m) => m.key === selectedPayment
  );
  const selectedLabel = selectedMethod?.label;

  if (paymentConfirmed) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-130 px-10 py-10 text-center">
          {/* Check icon */}
          <div className="w-14 h-14 rounded-full border-2 border-[#4CAF50] flex items-center justify-center mx-auto mb-5">
            <Check size={28} className="text-[#4CAF50]" />
          </div>

          <h2 className="text-[#333] text-[20px] font-bold mb-1">
            Payment confirmed
          </h2>
          <p className="text-[#999] text-[13px] mb-6">
            Invoice for {invoice.vehicleNumber} has been generated and sent to
            the customer.
          </p>

          {/* Paid badge */}
          <div className="bg-[#4CAF50] text-white text-[15px] font-semibold rounded-lg py-3 px-6 mx-auto max-w-64 mb-6">
            {totalAmount.toLocaleString()} Paid
          </div>

          {/* Action links */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <button className="flex items-center gap-2 text-[#333] text-[14px] font-medium hover:text-[#666] transition-colors cursor-pointer">
              <Download size={16} />
              Download Invoice
            </button>
            <button className="flex items-center gap-2 text-[#333] text-[14px] font-medium hover:text-[#666] transition-colors cursor-pointer">
              <Send size={16} />
              Send to customer
            </button>
          </div>

          {/* Process Next Vehicle */}
          <button
            onClick={() => navigate(ROUTES.FINANCE_BILLING_DASHBOARD)}
            className="bg-[#4CAF50] text-white text-[14px] font-medium rounded-lg py-3 px-8 hover:bg-[#43A047] transition-colors cursor-pointer"
          >
            Process Next Vehicle
          </button>
        </div>
      </div>
    );
  }

  if (showConfirmPayment) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-130 px-10 py-10">
          <div className="text-center mb-8">
            <h2 className="text-[#333] text-[18px] font-bold">
              Confirm Payment
            </h2>
            <p className="text-[#999] text-[13px] mt-1">
              Please verify the payment has been received before confirming.
            </p>
          </div>

          <div className="space-y-5 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-[#999] text-[14px]">Vehicle</span>
              <span className="text-[#333] text-[14px] font-medium">
                {invoice.vehicleNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#999] text-[14px]">Customer</span>
              <span className="text-[#333] text-[14px] font-medium">
                {invoice.customerName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#999] text-[14px]">Payment Method</span>
              <span className="text-[#333] text-[14px] font-medium capitalize">
                {selectedLabel}
              </span>
            </div>
          </div>

          <hr className="border-[#e5e7eb] mb-5" />

          <div className="flex items-center justify-between mb-8">
            <span className="text-[#333] text-[15px] font-semibold">
              Amount
            </span>
            <span className="text-[#333] text-[15px] font-semibold">
              {totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowConfirmPayment(false)}
              className="px-6 h-11 rounded-lg border border-[#e5e7eb] text-[#333] text-[14px] font-medium hover:bg-[#fafafa] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => setPaymentConfirmed(true)}
              className="px-6 h-11 rounded-lg bg-[#4CAF50] text-white text-[14px] font-medium hover:bg-[#43A047] transition-colors cursor-pointer"
            >
              Confirm payment received
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(ROUTES.FINANCE_BILLING_DASHBOARD)}
          className="flex items-center gap-1.5 text-[#999] hover:text-[#333] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span className="font-normal text-[13px]">Back to list</span>
        </button>
        <div className="bg-[#B3FFBD] text-[#00BF06] px-4 py-1.5 rounded-lg text-[13px] font-semibold">
          QC Approved
        </div>
      </div>

      {/* Page Title */}
      <div className="mb-5">
        <h1 className="text-[#333] text-[20px] md:text-[24px] font-bold leading-[1.2]">
          Invoice Preview
        </h1>
        <p className="text-[#999] text-[13px] mt-0.5">
          {invoice.vehicleNumber}
        </p>
      </div>

      {/* Invoice Details Card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 md:p-6 mb-6">
        {/* Invoice header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[#333] text-[16px] font-bold">
              Invoice Details
            </h2>
            <p className="text-[#333] text-[13px] mt-0.5">
              Generated on {invoice.generatedDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#333] text-[14px] font-medium">Invoice #</p>
            <p className="text-[#333] text-[15px] font-bold">
              {invoice.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Customer & Vehicle Details */}
        <div className="flex gap-12 mb-6">
          <div>
            <p className="text-[#999] text-[12px] mb-1">Customer Details</p>
            <p className="text-[#333] text-[15px] font-semibold">
              {invoice.customerName}
            </p>
            <p className="text-[#999] text-[13px]">{invoice.customerPhone}</p>
          </div>
          <div>
            <p className="text-[#999] text-[12px] mb-1">Vehicle Details</p>
            <p className="text-[#333] text-[15px] font-semibold">
              {invoice.vehicleNumber}
            </p>
            <p className="text-[#999] text-[13px]">{invoice.vehicleModel}</p>
          </div>
        </div>

        {/* Services Rendered */}
        <h3 className="text-[#333] text-[15px] font-bold mb-3">
          Services Rendered
        </h3>
        <div className="space-y-3 mb-6">
          {invoice.services.map((service, index) => (
            <div
              key={index}
              className="flex items-center justify-between border border-[#e5e7eb] rounded-xl px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FF4F31] flex items-center justify-center">
                  <Check size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[#333] text-[14px] font-semibold">
                    {service.name}
                  </p>
                  <p className="text-[#999] text-[12px]">
                    Parts: {service.parts.toLocaleString()}
                    <span className="mx-1">|</span>
                    Labour: {service.labour.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-[#333] text-[15px] font-semibold">
                {service.total.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border border-[#e5e7eb] rounded-xl overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between bg-[#FAFAFA]">
            <p className="text-[#666] text-[14px]">Subtotal</p>
            <p className="text-[#333] text-[14px] font-medium">
              {subtotal.toLocaleString()}
            </p>
          </div>
          <div className="px-5 py-3 flex items-center justify-between bg-[#FAFAFA] border-t border-[#e5e7eb]">
            <p className="text-[#666] text-[14px]">GST (18%)</p>
            <p className="text-[#333] text-[14px] font-medium">
              {gst.toLocaleString()}
            </p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between border-t border-[#e5e7eb]">
            <p className="text-[#333] text-[15px] font-bold">Total Amount</p>
            <p className="text-[#333] text-[16px] font-bold">
              {totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-6">
        <h2 className="text-[#333] text-[18px] font-bold mb-0.5">
          Payment Method
        </h2>
        <p className="text-[#999] text-[13px] mb-4">
          Select how the customer will pay
        </p>

        <div className="grid grid-cols-3 gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPayment === method.key;
            return (
              <button
                key={method.key}
                onClick={() => setSelectedPayment(method.key)}
                className={`flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#FF4F31] bg-[#FFF8F6]"
                    : "border-[#e5e7eb] bg-white hover:bg-[#fafafa]"
                }`}
              >
                <Icon
                  size={24}
                  className={isSelected ? "text-[#FF4F31]" : "text-[#999]"}
                />
                <span
                  className={`text-[13px] font-medium ${
                    isSelected ? "text-[#333]" : "text-[#999]"
                  }`}
                >
                  {method.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] px-5 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <CircleDot size={18} className="text-[#FF4F31]" />
          <span className="text-[#333] text-[14px] font-semibold">
            Payment Pending
          </span>
        </div>
        <span className="text-[#333] text-[15px] font-semibold">
          {totalAmount.toLocaleString()}
        </span>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#333] text-[15px] font-bold">
            Ready to process payment?
          </p>
          <p className="text-[#999] text-[13px]">{selectedLabel} selected</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download size={16} />
            Print Invoice
          </Button>
          <Button variant="gradient" onClick={() => setShowConfirmPayment(true)}>
            <Check size={18} />
            Confirm payment
          </Button>
        </div>
      </div>
    </>
  );
};

export default InvoiceDetail;
