import { RatingButtons } from "./RatingButtons";

interface BreakSectionProps {
  title: string;
  description: string;
  value?: string;
  onChange?: (value: string) => void;
}

const BreakRatingSection = ({ title, description, value, onChange }: BreakSectionProps) => {
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
        <div className="mb-6 flex justify-center">
          <RatingButtons
            options={["Good", "Average", "Poor"]}
            defaultValue="Good"
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    </>
  );
};

export default BreakRatingSection;
