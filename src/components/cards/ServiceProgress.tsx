import type { LucideIcon } from "lucide-react";
import { Truck, ClipboardCheck, Check, AlertCircle, FileText } from "lucide-react";
import { cn } from "../utils/cn";

type StepStatus = "completed" | "current" | "pending";

interface Step {
  label: string;
  icon: LucideIcon;
  status: StepStatus;
}

interface ServiceProgressProps {
  steps?: Step[];
}

const defaultSteps: Step[] = [
  { label: "Entry", icon: Truck, status: "completed" },
  { label: "QC", icon: ClipboardCheck, status: "completed" },
  { label: "Approval", icon: Check, status: "current" },
  { label: "Service", icon: AlertCircle, status: "pending" },
  { label: "Billing", icon: FileText, status: "pending" },
];

export function ServiceProgress({ steps = defaultSteps }: ServiceProgressProps) {
  const getProgressWidth = () => {
    const lastCompletedIdx = steps.reduce((acc, s, i) => s.status === "completed" ? i : acc, -1);
    const currentIdx = steps.findIndex(s => s.status === "current");
    const targetIdx = currentIdx >= 0 ? (lastCompletedIdx + currentIdx) / 2 + 0.5 : lastCompletedIdx;
    const totalSteps = steps.length;
    return `${(Math.max(targetIdx, 0) / (totalSteps - 1)) * 100}%`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-8 shadow-sm overflow-x-auto scrollbar-hide">
      <h3 className="text-base font-semibold text-gray-800 mb-6 md:mb-8 min-w-max">
        Service Progress
      </h3>

      <div className="relative pt-2 min-w-max">
        <div className="absolute top-6.5 md:top-7.5 left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute top-6.5 md:top-7.5 left-0 h-1.5 rounded-full bg-linear-to-r from-[#ff4f31] to-[#fe2b73]"
          style={{ width: getProgressWidth() }}
        />

        <div className="flex justify-between relative z-10 gap-2 md:gap-0">
          {steps.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  "flex flex-col gap-2 md:gap-3",
                  isFirst
                    ? "items-start"
                    : isLast
                      ? "items-end"
                      : "items-center",
                )}
              >
                <div className="relative">
                  {step.status === "current" && (
                    <div className="absolute -inset-1 rounded-full border-2 border-[#ff4f31] animate-ping opacity-30" />
                  )}
                  <div
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                      step.status === "completed"
                        ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] border-transparent text-white"
                        : step.status === "current"
                          ? "bg-white border-[#ff4f31] text-[#ff4f31] animate-pulse"
                          : "bg-white border-gray-200 text-gray-400",
                    )}
                  >
                    <step.icon size={16} strokeWidth={2} className="md:w-5 md:h-5" />
                  </div>
                </div>

                <span className="text-xs md:text-sm font-medium text-gray-800 whitespace-nowrap">
                  {isFirst ? "Start" : isLast ? "End" : step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type { ServiceProgressProps, Step, StepStatus };

