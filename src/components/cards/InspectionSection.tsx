import { ChecklistItem } from "./ChecklistItem.tsx";

type ChecklistStatus = "pass" | "fail" | "na" | null;

interface InspectionSectionProps {
  title: string;
  description: string;
  progress: string;
  items: Array<{
    id: string;
    label: string;
    subCategory?: string | null;
    description?: string;
    photos?: { id: string; imageUrl: string }[];
  }>;
  status?: Record<number, ChecklistStatus>;
  onStatusChange?: (status: Record<number, ChecklistStatus>) => void;
  onPhotoUpload?: (itemId: string, file: File) => Promise<void>;
  onPhotoDelete?: (itemId: string, photoId: string) => Promise<void>;
  showPhotoError?: boolean;
}

export function InspectionSection({
  title,
  description: _description,
  progress: _progress,
  items,
  status = {},
  onStatusChange,
  onPhotoUpload,
  onPhotoDelete,
  showPhotoError,
}: InspectionSectionProps) {
  const handleStatusChange = (index: number, newStatus: ChecklistStatus) => {
    if (onStatusChange) {
      const updatedStatus = { ...status, [index]: newStatus };
      onStatusChange(updatedStatus);
    }
  };

  // Group items by subCategory while preserving original index
  const groups: {
    subCategory: string | null;
    items: { item: (typeof items)[number]; originalIndex: number }[];
  }[] = [];
  let currentGroup: (typeof groups)[number] | null = null;

  items.forEach((item, index) => {
    const sub = item.subCategory ?? null;
    if (!currentGroup || currentGroup.subCategory !== sub) {
      currentGroup = { subCategory: sub, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push({ item, originalIndex: index });
  });

  return (
    <div className="bg-white border border-[#ebebeb] rounded-[10px] mb-5">
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          overflow: "hidden",
          maxHeight: "calc(100vh - 380px)",
          overflowY: "auto",
        }}
      >
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.subCategory && (
              <div
                className="px-5 pt-4 pb-2 border-t border-[#f0f0f0] first:border-t-0"
                style={{
                  padding: "10px 20px",
                  background: "#FAFAFA",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#9CA3AF",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.05em",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <h4 className="text-[14px] font-semibold text-[#9CA3AF]">
                  {group.subCategory}
                </h4>
              </div>
            )}
            {group.items.map(({ item, originalIndex }) => (
              <ChecklistItem
                key={`${title}-${originalIndex}`}
                label={item.label}
                description={item.description}
                status={status[originalIndex]}
                onStatusChange={(newStatus) =>
                  handleStatusChange(originalIndex, newStatus)
                }
                photos={item.photos}
                onPhotoUpload={
                  onPhotoUpload
                    ? (file) => onPhotoUpload(item.id, file)
                    : undefined
                }
                onPhotoDelete={
                  onPhotoDelete
                    ? (photoId) => onPhotoDelete(item.id, photoId)
                    : undefined
                }
                showPhotoError={showPhotoError}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
