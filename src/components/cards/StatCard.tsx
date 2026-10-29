

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-[14px_16px] sm:p-[16px_18px] md:p-[18px_20px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] h-auto sm:h-28 md:h-30 flex flex-col justify-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-2.5">
          <div className="flex flex-col gap-1 sm:gap-1.25">
            <p className="text-[#999] text-[11px] sm:text-[12px] md:text-[14px]">{title}</p>
            <p className="text-[#333] text-[22px] sm:text-[26px] md:text-[32px]">{value}</p>
          </div>
          {change && (
          <p className="text-[10px] sm:text-[11px] md:text-[12px]">
            <span className={change.startsWith("-") ? "text-[#e53e3e]" : "text-[#3aa400]"}>{change}</span>{' '}
            <span className="text-[#999] font-light">vs yesterday</span>
          </p>
          )}
        </div>
        {icon && (
          <div className="bg-[#fbfbfb] border border-[#bfbfbf] rounded-[10px] p-2 sm:p-2.5 md:p-3.25 opacity-60 w-9 h-9 sm:w-11 sm:h-11 md:w-12.5 md:h-12.5 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
