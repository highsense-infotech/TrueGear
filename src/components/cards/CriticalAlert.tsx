import { AlertCircle } from 'lucide-react';

interface CriticalAlertProps {
  show?: boolean;
}

export const CriticalAlert = ({ show = false }: CriticalAlertProps) => {
  if (!show) return null;
  return (
    <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 mb-6 shadow-sm bg-[#F9F9F9]">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 shrink-0">
        <AlertCircle size={20} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-800">Critical Issues Detected</h4>
        <p className="text-xs text-gray-400 mt-0.5">Based on the inspection results, the system suggests a Fail status. You can override this with justification.</p>
      </div>
    </div>
  );
};
