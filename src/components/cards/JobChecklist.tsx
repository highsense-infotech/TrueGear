import { Check, CircleCheck } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface JobChecklistProps {
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
}

export function JobChecklist({ items, onToggle }: JobChecklistProps) {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] p-7.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-[20px] text-[#333] leading-[1.2]">
          Job Checklist
        </h2>
        <span className="font-medium text-[14px] text-[#999]">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Text */}
      <p className="font-normal text-[14px] text-[#999] mb-3.75">
        {completedCount} of {totalCount} tasks completed
      </p>

      {/* Progress Bar */}
      <div className="w-full h-5 py-1.25 px-1.75 bg-[#e5e7eb] rounded-full mb-7.5 overflow-hidden">
        <div 
          className="h-full bg-[#00bf06] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="flex flex-col gap-3.75">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle?.(item.id)}
            className={`flex items-center gap-3.75 p-5 rounded-[10px] border transition-all border-[#E5E7EB]`}
          >
            {/* Checkbox */}
            <div className={`p-3.25 rounded-[5px] flex items-center justify-center transition-all ${
              item.completed 
                ? 'bg-[#B3FFBD]' 
                : 'bg-white'
            }`}>
              {item.completed && (
                <Check size={24} color="#00BF06" strokeWidth={3} />
              )}
            </div>

            {/* Title */}
            <span className={`font-medium text-[16px] flex-1 text-left ${item.completed ? 'line-through text-[#999]' : 'text-[#333]'}`}>
              {item.title}
            </span>

            {/* Completed Icon */}
            {item.completed && (
              <div className="w-6 h-6">
                <CircleCheck size={24} color="#00bf06" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
