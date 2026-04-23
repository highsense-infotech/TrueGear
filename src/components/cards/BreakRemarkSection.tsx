interface BreakRemarkSectionProps {
  title: string;
  description: string;
}

const BreakRemarkSection = ({ title, description }: BreakRemarkSectionProps) => {
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
      </div>
    </>
  );
};

export default BreakRemarkSection;
