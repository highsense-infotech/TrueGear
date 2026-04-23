import Button from "../common/Button";
import Modal from "../common/Modal";

interface NotesForm {
  notes: string;
}

interface AddNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notesForm: NotesForm;
  setNotesForm: React.Dispatch<React.SetStateAction<NotesForm>>;
  onSave: () => void;
  isSaving?: boolean;
}

export function AddNotesModal({
  isOpen,
  onClose,
  notesForm,
  setNotesForm,
  onSave,
  isSaving = false,
}: AddNotesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Internal Notes"
      size="md"
    >
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Notes
          </label>
          <textarea
            value={notesForm.notes}
            onChange={(e) =>
              setNotesForm({ ...notesForm, notes: e.target.value })
            }
            rows={6}
            placeholder="Enter internal notes here..."
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none"
          />
          <p className="text-[10px] sm:text-xs text-[#999] mt-1">
            Maximum 2000 characters. This note will be saved to the customer
            record.
          </p>
        </div>
        <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
          <Button variant="outline" onClick={onClose} className="text-xs sm:text-sm" disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={onSave} className="text-xs sm:text-sm" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Notes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
