import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";

const VehicleEntrySuccess: React.FC = () => {
  const navigate = useNavigate();

  const vehicleNumber = "KA-";

  const handleAddNewVehicle = () => {
    navigate(ROUTES.SECURITY_DASHBOARD);
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[{ label: "Security Guard" }, { label: "Vehicle Details" }]}
      />
      <div className="inset-0 flex items-center justify-center z-50">
        {/* Modal */}
        <div className="bg-white flex flex-col items-start p-7.5 rounded-[10px] w-110 border border-[#e5e7eb] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-7.5 items-center justify-end w-full">
            {/* Success Icon with Glow */}
            <div className="flex flex-col gap-5.25 items-center w-full">
              <div className="bg-[rgba(40,183,0,0.2)] flex gap-2.5 items-center justify-center p-5.5 relative rounded-[36px] size-18">
                <GlowEffect />
                <div className="bg-[#3AA400] flex items-center justify-center relative rounded-[100px] shrink-0 size-9">
                  <Check size={16} color="white" />
                </div>
              </div>

              {/* Success Message */}
              <div className="flex flex-col gap-7.5 items-center w-full">
                <div className="flex flex-col gap-2.5 items-start justify-center text-center w-full">
                  <div className="font-['Poppins',sans-serif] font-bold text-[#28b700] text-[24px] leading-[1.2] w-full">
                    Entry Confirmed
                  </div>
                  <div className="font-['Poppins',sans-serif] font-medium text-[#333] text-[16px] leading-[1.2] w-full">
                    Vehicle {vehicleNumber} has been registered for service
                  </div>
                </div>

                {/* Status Badge */}
                <div className="bg-[rgba(77,0,193,0.1)] flex items-center justify-center px-4 py-2 rounded-[40px] border border-[rgba(77,0,193,0.4)]">
                  <p className="font-['Poppins',sans-serif] text-[#4d00c1] text-[12px]">
                    <span className="font-bold">Status:</span>
                    <span className="font-medium"> Awaiting Quality Check</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Add New Vehicle Button */}
            <Button
              onClick={handleAddNewVehicle}
              variant="secondary"
              icon={<Plus size={18} color="white" />}
              className="bg-[#136dec] shadow-[3px_4px_10px_0px_rgba(88,146,239,0.4)] hover:scale-105 w-full md:w-71 h-12.5"
            >
              Add New Vehicle
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VehicleEntrySuccess;

function GlowEffect() {
  return (
    <div className="absolute -left-6 size-30 -top-6">
      <div className="absolute inset-[-83.33%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 320 320"
        >
          <g filter="url(#filter0_f_1_197)">
            <circle cx="160" cy="160" fill="#B6F3AD" fillOpacity="0.9" r="60" />
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="320"
              id="filter0_f_1_197"
              width="320"
              x="0"
              y="0"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                in="SourceGraphic"
                in2="BackgroundImageFix"
                mode="normal"
                result="shape"
              />
              <feGaussianBlur
                result="effect1_foregroundBlur_1_197"
                stdDeviation="50"
              />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}
