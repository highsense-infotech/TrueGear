import { cn } from '../utils/cn';

interface FindingsSectionProps {
  passCount?: number;
  failCount?: number;
  naCount?: number;
  pendingCount?: number;
}

export const FindingsSection = ({ passCount = 0, failCount = 0, naCount = 0, pendingCount = 0 }: FindingsSectionProps) => {
  const stats = [
    { label: 'Pass', count: String(passCount).padStart(2, '0'), color: 'text-green-500', gradient: 'from-[#7ce000] to-[#03a800]' },
    { label: 'Failed', count: String(failCount).padStart(2, '0'), color: 'text-red-500', gradient: 'from-red-500 to-red-600' },
    { label: 'N/A', count: String(naCount).padStart(2, '0'), color: 'text-gray-400', gradient: null },
    { label: 'Pending', count: String(pendingCount).padStart(2, '0'), color: 'text-orange-400', gradient: null },
  ];

  return (
    <div className="mb-8">
       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
         {stats.map((stat, index) => (
           <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 flex flex-col items-center justify-center h-36 md:h-40 lg:h-48 shadow-sm hover:shadow-md transition-shadow">
             <span className={cn(
               "text-xs md:text-sm font-semibold mb-2 md:mb-3",
               stat.gradient ? "bg-clip-text text-transparent bg-linear-to-b" : stat.color,
               stat.gradient
             )}>
               {stat.label}
             </span>
             <span className="text-4xl md:text-4xl lg:text-5xl font-medium text-gray-800 tracking-tight">
               {stat.count}
             </span>
           </div>
         ))}
       </div>
    </div>
  );
};
