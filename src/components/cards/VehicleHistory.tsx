import { ServiceHistoryItem, type ServiceHistoryItemProps } from "./ServiceHistoryItem";

interface VehicleHistoryProps {
  title?: string;
  subtitle?: string;
  historyItems?: ServiceHistoryItemProps[];
}

const defaultHistoryItems: ServiceHistoryItemProps[] = [
  {
    title: "General Service",
    date: "15 Dec 2025",
    advisor: "Ramesh K.",
    price: "₹8,500",
    duration: "3h 20m",
  },
  {
    title: "AC Repair",
    date: "02 Sep 2025",
    advisor: "Sunil M.",
    price: "₹4,200",
    duration: "2h 15m",
  },
  {
    title: "Brake Pad Replacement",
    date: "18 May 2025",
    advisor: "Ramesh K.",
    price: "₹8,500",
    duration: "1h 45m",
  },
];

export function VehicleHistory({
  title = "Service Progress",
  subtitle = "Previous service for this vehicle",
  historyItems = defaultHistoryItems,
}: VehicleHistoryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 md:gap-4">
        {historyItems.map((item, index) => (
          <ServiceHistoryItem key={index} {...item} />
        ))}
      </div>
    </div>
  );
}

export type { VehicleHistoryProps };

