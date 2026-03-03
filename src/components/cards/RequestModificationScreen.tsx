import { useState } from "react";
import Button from "../common/Button";

interface Job {
  id: number;
  title: string;
  description: string;
  details: string;
  price: number;
  selected: boolean;
}

interface PendingApproval {
  id: number;
  vehicleNumber: string;
  vehicleModel: string;
  customerName: string;
  customerPhone: string;
  timeAgo: string;
  sentDate: string;
  sentTime: string;
  jobs: Job[];
}

interface RequestModificationScreenProps {
  approval?: PendingApproval;
  selectedJobs?: Job[];
  total?: number;
  onBack: () => void;
  onSubmit: (notes: string) => void;
  submitting?: boolean;
}

export function RequestModificationScreen({ onBack, onSubmit, submitting }: RequestModificationScreenProps) {
  const [notes, setNotes] = useState("");

  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Notes Textarea */}
      <div>
        <label className="text-[14px] font-medium text-[#333] block mb-2">Modification Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter details about the requested modification..."
          className="w-full h-32 p-3 border border-[#e5e7eb] rounded-[5px] text-[14px] text-[#333] placeholder-[#999] focus:outline-none focus:border-[#0066FF] resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button variant="outline" className="flex-1 rounded-[5px]" onClick={onBack}>
          Cancel
        </Button>
        <Button variant="gradient" className="flex-1 rounded-[10px]" onClick={() => onSubmit(notes)} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}

