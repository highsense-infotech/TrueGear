import { ChecklistItem } from './ChecklistItem.tsx';

type ChecklistStatus = 'pass' | 'fail' | 'na' | null;

interface InspectionSectionProps {
  title: string;
  description: string;
  progress: string;
  items: Array<{ id: string; label: string; description?: string; photos?: { id: string; imageUrl: string }[] }>;
  status?: Record<number, ChecklistStatus>;
  onStatusChange?: (status: Record<number, ChecklistStatus>) => void;
  onPhotoUpload?: (itemId: string, file: File) => Promise<void>;
  onPhotoDelete?: (itemId: string, photoId: string) => Promise<void>;
  showPhotoError?: boolean;
}

export function InspectionSection({ title, description: _description, progress: _progress, items, status = {}, onStatusChange, onPhotoUpload, onPhotoDelete, showPhotoError }: InspectionSectionProps) {
  const handleStatusChange = (index: number, newStatus: ChecklistStatus) => {
    if (onStatusChange) {
      const updatedStatus = { ...status, [index]: newStatus };
      onStatusChange(updatedStatus);
    }
  };

  return (
    <div className="bg-white border border-[#ebebeb] rounded-[10px] mb-5">
      {/* Checklist Items */}
      <div>
        {items.map((item, index) => (
          <ChecklistItem
            key={`${title}-${index}`}
            label={item.label}
            description={item.description}
            status={status[index]}
            onStatusChange={(newStatus) => handleStatusChange(index, newStatus)}
            photos={item.photos}
            onPhotoUpload={onPhotoUpload ? (file) => onPhotoUpload(item.id, file) : undefined}
            onPhotoDelete={onPhotoDelete ? (photoId) => onPhotoDelete(item.id, photoId) : undefined}
            showPhotoError={showPhotoError}
          />
        ))}
      </div>
    </div>
  );
}
