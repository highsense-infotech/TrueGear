import { Clock, Play, Pause } from "lucide-react";

interface TimerCardProps {
  time: string;
  status: string;
  isRunning?: boolean;
  onStart?: () => void;
}

export function TimerCard({ time, status, isRunning = false, onStart }: TimerCardProps) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between">
      {/* Timer Info */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="bg-[#ff4f31] rounded-full w-12.5 h-12.5 flex items-center justify-center shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]">
          <Clock className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-0.75">
          <h3 className="font-semibold text-[20px] text-[#333] leading-[1.2]">
            {time}
          </h3>
          <p className="font-normal text-[12px] text-[#999] leading-[1.2]">
            {status}
          </p>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        className={`${isRunning ? 'bg-[#4F8EF6] hover:bg-[#3a7ae0]' : 'bg-[#00bf06] hover:bg-[#00a005]'} text-white rounded-[5px] px-6 h-10 flex items-center gap-2 shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] font-semibold text-[16px] transition-colors cursor-pointer`}
      >
        {isRunning ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
        {isRunning ? 'Pause' : 'Start'}
      </button>
    </div>
  );
}
