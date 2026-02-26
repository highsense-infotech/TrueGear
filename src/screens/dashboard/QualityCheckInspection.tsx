import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import truck from "../../assets/truck.png";
import { InspectionSection } from "../../components/cards/InspectionSection";
import ProgressSteps from "../../components/cards/ProgressSteps";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";
import { FindingsSection } from "../../components/cards/FindingsSection";
import { FailedItemSection } from "../../components/cards/FailedItemSection";
import { BreakTestSummary } from "../../components/cards/BreakTestSummary";
import { CriticalAlert } from "../../components/cards/CriticalAlert";
import QCRatingSection from "../../components/cards/QCRatingSection";
import QCRemarkSection from "../../components/cards/QCRemarkSection";
import QCSuccess from "../../components/cards/QCSuccess";
import {
  getInspectionDetails,
  saveStepItems,
  saveFindings,
  submitInspection,
  uploadItemPhoto,
  type InspectionItem,
  type InspectionVehicle,
  type InspectionSummary,
  type InspectionFindings,
} from "../../api/qc.api";

// Type for checklist item status
type ChecklistStatus = "pass" | "fail" | "na" | null;

// Type for step validation errors
interface ValidationErrors {
  [key: string]: string;
}

// Map API result to local status
function mapResultToStatus(result: string | null): ChecklistStatus {
  if (!result) return null;
  switch (result.toUpperCase()) {
    case "PASS":
      return "pass";
    case "FAIL":
      return "fail";
    case "NA":
      return "na";
    default:
      return null;
  }
}

// Map local status to API result
function mapStatusToResult(
  status: ChecklistStatus
): "PASS" | "FAIL" | "NA" | null {
  if (!status) return null;
  return status.toUpperCase() as "PASS" | "FAIL" | "NA";
}

// Map QC rating display value to API enum
function mapRatingToApi(rating: string): string {
  const map: Record<string, string> = {
    "Pass": "PASS",
    "conditional": "CONDITIONAL",
    "Conditional": "CONDITIONAL",
    "Fail - Suggested": "FAIL",
    "Fail": "FAIL",
  };
  return map[rating] || rating.toUpperCase();
}

// Map API enum to QC rating display value
function mapApiToRating(apiValue: string): string {
  const map: Record<string, string> = {
    "PASS": "Pass",
    "CONDITIONAL": "conditional",
    "FAIL": "Fail - Suggested",
  };
  return map[apiValue] || apiValue;
}

const QualityCheckInspection: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Vehicle info from API
  const [vehicle, setVehicle] = useState<InspectionVehicle | null>(null);

  // Items from API categories
  const [exteriorItems, setExteriorItems] = useState<InspectionItem[]>([]);
  const [interiorItems, setInteriorItems] = useState<InspectionItem[]>([]);
  const [brakeItems, setBrakeItemsList] = useState<InspectionItem[]>([]);

  // Summary from API
  const [summary, setSummary] = useState<InspectionSummary>({
    totalItems: 0,
    passCount: 0,
    failCount: 0,
    naCount: 0,
    pendingCount: 0,
  });

  // Findings from API
  const [findings, setFindings] = useState<InspectionFindings | null>(null);

  // Status records for checklist UI
  const [bodyPaintStatus, setBodyPaintStatus] = useState<
    Record<number, ChecklistStatus>
  >({});
  const [seatsStatus, setSeatsStatus] = useState<
    Record<number, ChecklistStatus>
  >({});
  const [brakeStatus, setBrakeStatus] = useState<
    Record<number, ChecklistStatus>
  >({});
  // State for Step 4 (Findings)
  const [qcRating, setQcrating] = useState<string>("");
  const [finalRemarks, setFinalRemarks] = useState<string>("");

  // Fetch inspection data
  const fetchInspection = useCallback(async () => {
    if (!inspectionId) return;
    setLoading(true);
    try {
      const res = await getInspectionDetails(inspectionId);
      if (res.status) {
        const { inspection, vehicle: vehicleData, categories, summary: summaryData, findings: findingsData } = res.data;

        setVehicle(vehicleData);
        setCurrentStep(inspection.currentStep);
        setMaxStep(inspection.currentStep);
        setSummary(summaryData);
        setFindings(findingsData);

        // Set exterior items and pre-fill statuses
        const ext = categories.EXTERIOR || [];
        setExteriorItems(ext);
        const extStatus: Record<number, ChecklistStatus> = {};
        ext.forEach((item, index) => {
          extStatus[index] = mapResultToStatus(item.result);
        });
        setBodyPaintStatus(extStatus);

        // Set interior items and pre-fill statuses
        const int = categories.INTERIOR || [];
        setInteriorItems(int);
        const intStatus: Record<number, ChecklistStatus> = {};
        int.forEach((item, index) => {
          intStatus[index] = mapResultToStatus(item.result);
        });
        setSeatsStatus(intStatus);

        // Set brake items and pre-fill statuses
        const brk = categories.BRAKE || [];
        setBrakeItemsList(brk);
        const brkStatus: Record<number, ChecklistStatus> = {};
        brk.forEach((item, index) => {
          brkStatus[index] = mapResultToStatus(item.result);
        });
        setBrakeStatus(brkStatus);

        // Pre-fill findings
        if (findingsData.overallStatus) {
          setQcrating(mapApiToRating(findingsData.overallStatus));
        }
        if (findingsData.finalRemarks) {
          setFinalRemarks(findingsData.finalRemarks);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inspection details:", err);
      toast.error("Failed to load inspection details");
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);
  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);
  // Validation functions for each step
  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        for (let i = 0; i < exteriorItems.length; i++) {
          if (!bodyPaintStatus[i]) {
            newErrors["bodyPaint"] = "Please complete all Body & Paint items";
            isValid = false;
            break;
          }
        }
        break;
      case 2:
        for (let i = 0; i < interiorItems.length; i++) {
          if (!seatsStatus[i]) {
            newErrors["seats"] =
              "Please complete all Seats & Upholstery items";
            isValid = false;
            break;
          }
        }
        break;
      case 3:
        for (let i = 0; i < brakeItems.length; i++) {
          if (!brakeStatus[i]) {
            newErrors["brake"] = "Please complete all Brake items";
            isValid = false;
            break;
          }
        }
        break;

      case 4:
        if (!qcRating) {
          newErrors["qcRating"] = "Please select a QC status rating";
          isValid = false;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return isValid;
  };
  // Update all categories and statuses from save response
  const updateCategoriesFromResponse = (categories: {
    EXTERIOR: InspectionItem[];
    INTERIOR: InspectionItem[];
    BRAKE: InspectionItem[];
  }) => {
    const ext = categories.EXTERIOR || [];
    setExteriorItems(ext);
    const extStatus: Record<number, ChecklistStatus> = {};
    ext.forEach((item, index) => {
      extStatus[index] = mapResultToStatus(item.result);
    });
    setBodyPaintStatus(extStatus);

    const int = categories.INTERIOR || [];
    setInteriorItems(int);
    const intStatus: Record<number, ChecklistStatus> = {};
    int.forEach((item, index) => {
      intStatus[index] = mapResultToStatus(item.result);
    });
    setSeatsStatus(intStatus);

    const brk = categories.BRAKE || [];
    setBrakeItemsList(brk);
    const brkStatus: Record<number, ChecklistStatus> = {};
    brk.forEach((item, index) => {
      brkStatus[index] = mapResultToStatus(item.result);
    });
    setBrakeStatus(brkStatus);

    // Derive failed items for findings step
    const allItems = [...ext, ...int, ...brk];
    const failedItems = allItems
      .filter((item) => item.result === "FAIL")
      .map((item) => ({
        itemCode: item.itemCode,
        itemLabel: item.itemLabel,
        category: ext.includes(item) ? "EXTERIOR" : int.includes(item) ? "INTERIOR" : "BRAKE",
        comment: item.comment,
      }));

    setFindings((prev) => prev ? { ...prev, failedItems } : {
      overallStatus: null,
      overrideJustification: null,
      finalRemarks: null,
      brakeTestSummary: { performance: null, noise: null, vibration: null },
      failedItems,
      criticalIssuesDetected: failedItems.length > 0,
    });
  };

  const handleSaveAndContinue = async () => {
    if (!validateStep(currentStep) || !inspectionId) return;

    setSaving(true);
    try {
      if (currentStep === 1) {
        const items = exteriorItems.map((item, index) => ({
          itemId: item.id,
          result: mapStatusToResult(bodyPaintStatus[index])!,
        }));
        const res = await saveStepItems(inspectionId, {
          category: "EXTERIOR",
          items,
        });
        if (res.status) {
          const nextStep = res.data.currentStep;
          setCurrentStep(nextStep);
          setMaxStep((prev) => Math.max(prev, nextStep));
          setSummary(res.data.summary);
          updateCategoriesFromResponse(res.data.categories);
          setErrors({});
        }
      } else if (currentStep === 2) {
        const items = interiorItems.map((item, index) => ({
          itemId: item.id,
          result: mapStatusToResult(seatsStatus[index])!,
        }));
        const res = await saveStepItems(inspectionId, {
          category: "INTERIOR",
          items,
        });
        if (res.status) {
          const nextStep = res.data.currentStep;
          setCurrentStep(nextStep);
          setMaxStep((prev) => Math.max(prev, nextStep));
          setSummary(res.data.summary);
          updateCategoriesFromResponse(res.data.categories);
          setErrors({});
        }
      } else if (currentStep === 3) {
        const items = brakeItems.map((item, index) => ({
          itemId: item.id,
          result: mapStatusToResult(brakeStatus[index])!,
        }));
        const res = await saveStepItems(inspectionId, {
          category: "BRAKE",
          items,
        });
        if (res.status) {
          const nextStep = res.data.currentStep;
          setCurrentStep(nextStep);
          setMaxStep((prev) => Math.max(prev, nextStep));
          setSummary(res.data.summary);
          updateCategoriesFromResponse(res.data.categories);
          setErrors({});
        }
      } else if (currentStep === 4) {
        const res = await saveFindings(inspectionId, {
          overallStatus: mapRatingToApi(qcRating),
          finalRemarks: finalRemarks || null,
          brakePerformance:
            findings?.brakeTestSummary?.performance || null,
          brakeNoise: findings?.brakeTestSummary?.noise || null,
          brakeVibration: findings?.brakeTestSummary?.vibration || null,
        });
        if (res.status) {
          const submitRes = await submitInspection(inspectionId);
          if (submitRes.status) {
            setCurrentStep(5);
            setMaxStep(5);
          }
          setErrors({});
        }
      }
    } catch (err) {
      console.error("Failed to save step:", err);
      toast.error("Failed to save inspection step");
    } finally {
      setSaving(false);
    }
  };
  // Photo upload handler
  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (!inspectionId) return;
    const res = await uploadItemPhoto(inspectionId, itemId, file);
    if (res.status) {
      // Update photo count in the relevant category
      const updatePhotos = (items: InspectionItem[]) =>
        items.map((item) =>
          item.id === itemId
            ? { ...item, photos: [...item.photos, res.data] }
            : item
        );
      setExteriorItems((prev) => updatePhotos(prev));
      setInteriorItems((prev) => updatePhotos(prev));
      setBrakeItemsList((prev) => updatePhotos(prev));
    }
  };

  // Convert API items to display format
  const exteriorDisplayItems = exteriorItems.map((item) => ({
    id: item.id,
    label: item.itemLabel,
    photoUrl: item.photos.length > 0 ? item.photos[item.photos.length - 1].imageUrl : undefined,
  }));
  const interiorDisplayItems = interiorItems.map((item) => ({
    id: item.id,
    label: item.itemLabel,
    photoUrl: item.photos.length > 0 ? item.photos[item.photos.length - 1].imageUrl : undefined,
  }));
  const brakeDisplayItems = brakeItems.map((item) => ({
    id: item.id,
    label: item.itemLabel,
    photoUrl: item.photos.length > 0 ? item.photos[item.photos.length - 1].imageUrl : undefined,
  }));

  // Calculate progress strings
  const exteriorCompleted = Object.values(bodyPaintStatus).filter(Boolean).length;
  const interiorCompleted = Object.values(seatsStatus).filter(Boolean).length;
  const brakeCompleted = Object.values(brakeStatus).filter(Boolean).length;

  // Render error message if exists
  const renderError = (errorKey: string) => {
    if (errors[errorKey]) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {errors[errorKey]}
        </div>
      );
    }
    return null;
  };

  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-[#999] text-base">Loading inspection data...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 1: // Exterior
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">
                  Exterior Inspection
                </h1>
                <p className="text-[#999] text-[12px]">
                  Vehicles awaiting quality inspection
                </p>
              </div>
            </div>
            {renderError("bodyPaint")}
            <InspectionSection
              title="Body & Paint"
              description="Scratches, Cracks or impact inspection"
              progress={`${exteriorCompleted}/${exteriorItems.length}`}
              items={exteriorDisplayItems}
              status={bodyPaintStatus}
              onStatusChange={setBodyPaintStatus}
              onPhotoUpload={handlePhotoUpload}
            />
          </>
        );
      case 2: // Interior
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">
                  Interior Inspection
                </h1>
                <p className="text-[#999] text-[12px]">
                  Vehicles awaiting quality inspection
                </p>
              </div>
            </div>
            {renderError("seats")}
            <InspectionSection
              title="Seats & Upholstery"
              description="Vehicles awaiting quality inspection"
              progress={`${interiorCompleted}/${interiorItems.length}`}
              items={interiorDisplayItems}
              status={seatsStatus}
              onStatusChange={setSeatsStatus}
              onPhotoUpload={handlePhotoUpload}
            />
          </>
        );
      case 3: // Brake
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">
                  Brake Inspection
                </h1>
                <p className="text-[#999] text-[12px]">
                  Brake system inspection
                </p>
              </div>
            </div>
            {renderError("brake")}
            <InspectionSection
              title="Brake System"
              description="Brake system inspection"
              progress={`${brakeCompleted}/${brakeItems.length}`}
              items={brakeDisplayItems}
              status={brakeStatus}
              onStatusChange={setBrakeStatus}
              onPhotoUpload={handlePhotoUpload}
            />
          </>
        );
      case 4: // Findings
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">
                  Record Findings
                </h1>
                <p className="text-[#999] text-[12px]">
                  Vehicles awaiting quality inspection
                </p>
              </div>
            </div>
            {renderError("qcRating")}
            <FindingsSection
              passCount={summary.passCount}
              failCount={summary.failCount}
              naCount={summary.naCount}
              pendingCount={summary.pendingCount}
            />
            <FailedItemSection
              title="Failed Items"
              description="Items that failed inspection"
              items={findings?.failedItems || []}
            />
            <BreakTestSummary
              title="Brake Test Summary"
              description="Rate overall brake performance"
              performance={findings?.brakeTestSummary?.performance}
              noise={findings?.brakeTestSummary?.noise}
              vibration={findings?.brakeTestSummary?.vibration}
            />
            <CriticalAlert show={findings?.criticalIssuesDetected || false} />
            <QCRatingSection
              title="Overall QC Status"
              description="Rate overall brake performance"
              value={qcRating}
              onChange={setQcrating}
            />
            <QCRemarkSection
              title="Final Remarks"
              description="Add final remarks for this inspection"
              value={finalRemarks}
              onChange={setFinalRemarks}
            />
          </>
        );
      case 5: // Submit
        return (
          <>
            <QCSuccess />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[{ label: "QC Team" }, { label: "Vehicle Details" }]}
      />
      <div className="bg-white rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden">
            <img
              src={truck}
              alt="Vehicle"
              className="max-w-17.5 object-contain "
            />
          </div>
          <div>
            <p className="text-[#333] text-[16px] mb-0.5">
              {vehicle?.registrationNumber || "—"}
            </p>
            <p className="text-[#999] text-[12px]">
              {vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}
            </p>
          </div>
        </div>

        <div className="border-b border-[#CACACA] my-4"></div>
        <div className="p-8">
          <ProgressSteps
            currentStep={currentStep}
            maxStep={maxStep}
            onStepClick={(step) => {
              if (step <= maxStep && step !== currentStep && currentStep < 5) {
                setCurrentStep(step);
              }
            }}
          />
        </div>
        <div className="border-b border-[#CACACA] my-4"></div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Progress Bar */}
        <div className="bg-white border border-[#ebebeb] rounded-[10px] p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-3">
          <div className="w-full md:w-[50%]">
            <p className="text-[#333333] text-[14px] font-semibold leading-[120%] align-middle mb-1.25">
              Progress
            </p>
            <div className="w-full h-2 bg-[#f5f5f5] rounded-full ">
              <div
                className="h-full bg-linear-to-r from-[#7CE000] to-[#03A800] rounded-full"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
          {/* Action Buttons */}
          {currentStep !== 5 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 w-full md:w-auto">
              <Button variant="outline">Cancel</Button>
              <Button
                variant="gradient"
                gradient={{ from: "#ff4f31", to: "#fe2b73" }}
                onClick={handleSaveAndContinue}
                disabled={saving || loading}
              >
                {saving ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default QualityCheckInspection;
