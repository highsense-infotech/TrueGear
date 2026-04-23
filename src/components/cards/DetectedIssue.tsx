import { BellRing, Megaphone } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";

interface DetectSectionProps {
  title: string;
  description: string;
}

export function DetectedIssue({ title, description }: DetectSectionProps) {
  return (
    <>
      <div className="bg-white border border-[#ebebeb] rounded-[10px] mb-5">
        {/* Section Header */}
        <div className="bg-[#EDEDED] flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3.75 py-4 px-5 gap-2 sm:gap-0 rounded-tr-[10px] rounded-tl-[10px]">
          <div>
            <h3 className="text-[#333] text-[16px] mb-0.5">{title}</h3>
            <p className="text-[#999] text-[12px]">{description}</p>
          </div>
        </div>
        <div className="space-y-3">
          {/* Noise Detected */}
          <div className="flex items-center justify-between py-3 px-4 border-b border-[#ebebeb] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center">
                <Megaphone color="#CACACA" />
              </div>
              <div>
                <p className="text-[#333] text-[14px]">Noise Detected</p>
                <p className="text-[#999] text-[12px]">
                  Squeaking or grinding noise
                </p>
              </div>
            </div>
            <ToggleSwitch defaultChecked={true} />
          </div>

          {/* Vibration Detected */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center">
                <BellRing color="#CACACA" />
              </div>
              <div>
                <p className="text-[#333] text-[14px]">Vibration Detected</p>
                <p className="text-[#999] text-[12px]">
                  Steering or pedal vibration
                </p>
              </div>
            </div>
            <ToggleSwitch defaultChecked={false} />
          </div>
        </div>
      </div>
    </>
  );
}
