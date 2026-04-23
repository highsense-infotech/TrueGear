import type { LucideIcon } from "lucide-react";
import { History, ClipboardCheck, FileText } from "lucide-react";
import { cn } from "../utils/cn";

interface Tab {
  label: string;
  icon: LucideIcon;
  key: string;
}

interface TabNavigationProps {
  tabs?: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

const defaultTabs: Tab[] = [
  { label: "Vehicle History", icon: History, key: "vehicleHistory" },
  { label: "QC Report", icon: ClipboardCheck, key: "qcReport" },
  { label: "Job Card", icon: FileText, key: "jobCard" },
];

export function TabNavigation({
  tabs = defaultTabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  const getMobileLabel = (key: string) => {
    switch (key) {
      case "vehicleHistory":
        return "Vehicle History";
      case "qcReport":
        return "QC Report";
      case "jobCard":
        return "Job Card";
      default:
        return key;
    }
  };

  return (
    <div className="flex items-center gap-2 mb-6 bg-[#EFEFEF] p-1.5 rounded-xl w-full md:w-max overflow-x-auto md:overflow-visible scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer",
            activeTab === tab.key
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200",
          )}
        >
          <tab.icon size={14} strokeWidth={2} className="md:w-4 md:h-4 shrink-0" />
          <span className="hidden sm:inline">{tab.label}</span>
          <span className="sm:hidden">{getMobileLabel(tab.key)}</span>
        </button>
      ))}
    </div>
  );
}

export type { TabNavigationProps, Tab };

