import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Truck, Armchair, Gauge, Settings, Camera, Trash2, Upload, Check } from "lucide-react";
import { cn } from "../utils/cn";

interface UploadCategoryCardsProps {
  uploadedImages?: Record<string, string | null>;
  onImagesChange?: (images: Record<string, string | null>) => void;
}

export const UploadCategoryCards = ({ 
  uploadedImages: externalUploadedImages, 
  onImagesChange 
}: UploadCategoryCardsProps) => {
  const [activeTab, setActiveTab] = useState("Exterior");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State to track uploaded images for each category
  const [internalUploadedImages, setInternalUploadedImages] = useState<Record<string, string | null>>({
    Exterior: null,
    Interior: null,
    Engine: null,
    Brake: null,
  });

  // Use external state if provided, otherwise use internal state
  const currentUploadedImages = externalUploadedImages !== undefined 
    ? externalUploadedImages 
    : internalUploadedImages;

  const setUploadedImages = (images: Record<string, string | null>) => {
    if (externalUploadedImages !== undefined) {
      onImagesChange?.(images);
    } else {
      setInternalUploadedImages(images);
    }
  };

  const categories = [
    { label: "Exterior", icon: Truck },
    { label: "Interior", icon: Armchair },
    { label: "Engine", icon: Settings },
    { label: "Brake", icon: Gauge },
  ];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedExtensions.includes(ext)) {
        toast.error("Only JPG, JPEG, PNG, and WEBP files are allowed.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages: Record<string, string | null> = {
          ...currentUploadedImages,
          [activeTab]: reader.result as string,
        };
        setUploadedImages(newImages);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow uploading same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    const newImages: Record<string, string | null> = {
      ...currentUploadedImages,
      [activeTab]: null,
    };
    setUploadedImages(newImages);
  };

  const renderUploadContent = () => {
    const currentImage = currentUploadedImages[activeTab];

    if (currentImage) {
      // Show uploaded image with remove option
      return (
        <div className="w-full max-w-sm bg-[#eff1f5] rounded-xl p-5 flex flex-col items-center gap-4">
          <span className="font-semibold text-gray-800">{activeTab}</span>
          <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden group">
            <img
              src={currentImage}
              alt={`${activeTab} Check`}
              className="w-full h-full object-cover"
            />
            {/* Remove Button Overlay */}
            <button
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-red-500 hover:bg-white hover:text-red-600 transition-colors shadow-sm"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      );
    }

    // Show upload placeholder
    return (
      <div 
        onClick={handleUploadClick}
        className="w-full max-w-sm bg-[#eff1f5] rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer hover:bg-[#e4e6eb] transition-colors"
      >
        <span className="font-semibold text-gray-800">{activeTab}</span>
        <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-gray-200 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Click to upload image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
      />

      {/* categories section */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          {categories.map((item, index) => (
            <div
              key={index}
              onClick={() => setActiveTab(item.label)}
              className={cn(
                "h-32 md:h-40 rounded-xl border flex flex-col items-center justify-center gap-2 md:gap-4 p-2 md:p-4 transition-all cursor-pointer",
                activeTab === item.label
                  ? "bg-white border-red-100 shadow-sm"
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center relative",
                  activeTab === item.label
                    ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white shadow-lg shadow-red-100"
                    : "bg-gray-50 border border-gray-200 text-gray-400",
                )}
              >
                <item.icon
                  className="w-5 h-5 md:w-6 md:h-6"
                  strokeWidth={1.5}
                />
                {/* Badge showing uploaded status - check icon with green background */}
                {currentUploadedImages[item.label] && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-xs md:text-sm font-semibold",
                  activeTab === item.label ? "text-gray-800" : "text-gray-400",
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* image upload section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
            <Camera size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">
              Select and upload the photos
            </h4>
            <p className="text-xs text-gray-400">
              Select and upload the photos
            </p>
          </div>
        </div>

        <div className="p-6 min-h-100 bg-[#fbfbfb]">
          {renderUploadContent()}
        </div>
      </div>
    </>
  );
};
