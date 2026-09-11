interface QCRemarkSectionProps {
  title: string;
  description: string;
  value?: string;
  onChange?: (value: string) => void;
}

const QCRemarkSection = ({ title, description, value = "", onChange }: QCRemarkSectionProps) => {
  return (
    <>
      <div className="bg-white border border-[#ebebeb] rounded-[10px] mb-5">
        {/* Section Header */}
        <div className="bg-[#EDEDED] flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-5 gap-2 sm:gap-0 rounded-tr-[10px] rounded-tl-[10px]">
          <div>
            <h3 className="text-[#333] text-[16px] mb-0.5">{title}</h3>
            <p className="text-[#999] text-[12px]">{description}</p>
          </div>
        </div>
        <div className="p-5">
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-[#333] placeholder-[#999] resize-none focus:outline-none focus:border-[#136dec]"
            rows={4}
            placeholder="Enter final remarks..."
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      </div>
    </>
  );
};

export default QCRemarkSection;
