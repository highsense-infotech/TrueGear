import { ChecklistItem } from './ChecklistItem.tsx';

type ChecklistStatus = 'pass' | 'fail' | 'na' | null;

interface InspectionSectionProps {
  title: string;
  description: string;
  progress: string;
  items: Array<{ id: string; label: string; description?: string; photoUrl?: string }>;
  status?: Record<number, ChecklistStatus>;
  onStatusChange?: (status: Record<number, ChecklistStatus>) => void;
  onPhotoUpload?: (itemId: string, file: File) => Promise<void>;
}

export function InspectionSection({ title, description: _description, progress: _progress, items, status = {}, onStatusChange, onPhotoUpload }: InspectionSectionProps) {
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
            photoUrl={item.photoUrl}
            onPhotoUpload={onPhotoUpload ? (file) => onPhotoUpload(item.id, file) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
