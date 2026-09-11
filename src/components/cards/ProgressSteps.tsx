import { Truck, Armchair, Gauge, ClipboardList, CheckSquare, Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
}

interface ProgressStepsProps {
  currentStep: number;
  maxStep?: number;
  onStepClick?: (step: number) => void;
}

export default function ProgressSteps({ currentStep, maxStep, onStepClick }: ProgressStepsProps) {
  const highestStep = maxStep ?? currentStep;
  const steps: Step[] = [
    { id: 1, label: "Exterior", icon: Truck },
    { id: 2, label: "Interior", icon: Armchair },
    { id: 3, label: "Brake", icon: Gauge },
    { id: 4, label: "Findings", icon: ClipboardList },
    { id: 5, label: "Submit", icon: CheckSquare },
  ];

  return (
    <div className="w-full">
      {/* Mobile: Vertical Stepper */}
      <div className="md:hidden relative">
        {/* Vertical Progress Line */}
        <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-gray-300" />
        <div 
          className="absolute left-5 top-3 w-0.5 bg-linear-to-r from-[#7CE000] to-[#03A800]" 
          style={{ height: `${((highestStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        <div className="flex flex-col space-y-0">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < highestStep;

            const isClickable = step.id !== currentStep && step.id <= highestStep && onStepClick;

            return (
              <div
                key={step.id}
                className={`relative flex items-center py-2 ${isClickable ? "cursor-pointer" : ""}`}
                onClick={isClickable ? () => onStepClick(step.id) : undefined}
              >
                {/* Icon */}
                <div
                  className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-lg transition-all shrink-0
                  ${
                    isActive
                      ? "bg-linear-to-r from-[#FF4F31] to-[#FE2B73] text-white shadow-lg"
                      : isCompleted
                      ? "bg-linear-to-r from-[#7CE000] to-[#03A800] text-white"
                      : "bg-[#FBFBFB] border-[#BFBFBF] border rounded-[10px] text-gray-400"
                  }`}
                >
                  { isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>

                {/* Label */}
                <p
                  className={`ml-4 text-sm font-medium
                  ${
                    isActive || isCompleted
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hidden md:block w-full relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-linear-to-r from-[#7CE000] to-[#03A800]" 
          style={{ width: `${((highestStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;

            const isActive = step.id === currentStep;
            const isCompleted = step.id < highestStep;

            const isClickable = step.id !== currentStep && step.id <= highestStep && onStepClick;

            return (
              <div
                key={step.id}
                className={`relative z-10 flex flex-col ${isClickable ? "cursor-pointer" : ""}
                  ${
                    index === 0
                      ? "items-start"
                      : index === steps.length - 1
                      ? "items-end"
                      : "items-center"
                  }`}
                onClick={isClickable ? () => onStepClick(step.id) : undefined}
              >
                {/* Icon */}
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-linear-to-r from-[#FF4F31] to-[#FE2B73] text-white shadow-lg"
                      : isCompleted
                      ? "bg-linear-to-r from-[#7CE000] to-[#03A800] text-white"
                      : "bg-[#FBFBFB] border-[#BFBFBF] border rounded-[10px] text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-sm font-medium whitespace-nowrap
                  ${
                    isActive || isCompleted
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

