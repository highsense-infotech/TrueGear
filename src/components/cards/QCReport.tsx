import { QCItem, type Status } from "./QCItem";

interface QCReportData {
  label: string;
  subLabel?: string;
  status: Status;
}

interface QCReportProps {
  exteriorItems?: QCReportData[];
  interiorEngineItems?: QCReportData[];
  brakeItems?: QCReportData[];
}

const defaultExteriorItems: QCReportData[] = [
  { label: "Body panels condition", subLabel: "Good condition", status: "pass" },
  { label: "Paint condition & scratches", subLabel: "Good condition", status: "warning" },
  { label: "Windshield & windows", status: "pass" },
  { label: "Headlights & taillights", status: "pass" },
  { label: "Tyres & wheel condition", subLabel: "Front left tyre wear 60%", status: "warning" },
  { label: "Side mirrors", status: "pass" },
];

const defaultInteriorEngineItems: QCReportData[] = [
  { label: "Dashboard condition", status: "pass" },
  { label: "Seat condition", status: "pass" },
  { label: "AC vents & controls", subLabel: "AC not cooling properly", status: "fail" },
  { label: "Steering & gear lever", status: "pass" },
  { label: "Infotainment system", status: "pass" },
  { label: "Engine bay inspection", status: "pass" },
];

const defaultBrakeItems: QCReportData[] = [
  { label: "Brake pedal response", status: "pass" },
  { label: "Handbrake function", status: "pass" },
  { label: "Brake fluid level", subLabel: "Level slightly low", status: "warning" },
  { label: "Brake pad wear", status: "pass" },
];

export function QCReport({
  exteriorItems = defaultExteriorItems,
  interiorEngineItems = defaultInteriorEngineItems,
  brakeItems = defaultBrakeItems,
}: QCReportProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Exterior Column */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h4 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
          Exterior
        </h4>
        <div className="flex flex-col gap-3">
          {exteriorItems.map((item, index) => (
            <QCItem
              key={`exterior-${index}`}
              label={item.label}
              subLabel={item.subLabel}
              status={item.status}
            />
          ))}
        </div>
      </div>

      {/* Interior & Engine Column */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h4 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
          Interior & Engine
        </h4>
        <div className="flex flex-col gap-3">
          {interiorEngineItems.map((item, index) => (
            <QCItem
              key={`interior-${index}`}
              label={item.label}
              subLabel={item.subLabel}
              status={item.status}
            />
          ))}
        </div>
      </div>

      {/* Brake Column */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h4 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
          Brakes
        </h4>
        <div className="flex flex-col gap-3">
          {brakeItems.map((item, index) => (
            <QCItem
              key={`brake-${index}`}
              label={item.label}
              subLabel={item.subLabel}
              status={item.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export type { QCReportProps, QCReportData };

