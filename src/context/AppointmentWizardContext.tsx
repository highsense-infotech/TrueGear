import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Service Type Maps ────────────────────────────────────────────────────────

export const SERVICE_TYPE_MAP: Record<string, string> = {
  periodic:   'PERIODIC',
  repair:     'GENERAL_REPAIR',
  breakdown:  'BREAKDOWN',
  insurance:  'INSURANCE',
  bodyshop:   'BODYSHOP',
  inspection: 'INSPECTION_ONLY',
};

export const SERVICE_LABEL_MAP: Record<string, string> = {
  periodic:   'Periodic Service',
  repair:     'General Repair',
  breakdown:  'Breakdown',
  insurance:  'Insurance Job',
  bodyshop:   'Bodyshop',
  inspection: 'Inspection Only',
};

export const SERVICE_DURATION_MAP: Record<string, number> = {
  periodic:   150,
  repair:     180,
  breakdown:  120,
  insurance:  240,
  bodyshop:   480,
  inspection: 60,
};

// ─── Time Labels ──────────────────────────────────────────────────────────────

export const TIME_LABELS: Record<string, string> = {
  '09:00': '9:00 AM', '10:00': '10:00 AM', '11:00': '11:00 AM',
  '12:00': '12:00 PM', '13:00': '1:00 PM', '14:00': '2:00 PM',
  '15:00': '3:00 PM', '16:00': '4:00 PM', '17:00': '5:00 PM', '18:00': '6:00 PM',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewCustomerData {
  firstName:      string;
  lastName:       string;
  contactNumber:  string;
  primaryEmail:   string;
  address:        string;
  // Populated when customer originates from IRM lookup
  crmReferenceNo?: string;
  custSequenceId?: string;
}

export interface NewVehicleData {
  brand:              string;
  model:              string;
  manufacturingYear:  number;
  registrationNumber: string;
  vin:                string;
  fuelType:           string;
  transmissionType:   string;
  odometerLast:       number;
  // IRM-sourced extra fields
  engineNumber?:      string;
  seriesDescription?: string;
  modelDescription?:  string;
  extColour?:         string;
  registrationDate?:  string;
  sellingDate?:       string;
}

export interface WizardState {
  // Step 1 — Customer
  customerId:      string | null;
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string;
  isNewCustomer:   boolean;
  newCustomerData: NewCustomerData | null;

  // Step 2 — Vehicle
  vehicleId:          string | null;
  vehicleName:        string;   // "Toyota Camry 2021"
  vehicleReg:         string;
  vehicleMakeModel:   string;   // "Toyota Camry"
  vehicleYear:        string;
  vehicleFuel:        string;
  vehicleTransmission: string;
  vehicleOdometer:    string;
  isNewVehicle:       boolean;
  newVehicleData:     NewVehicleData | null;

  // Step 3 — Service
  serviceType:              string;  // "periodic" (frontend ID)
  serviceTypeBackend:       string;  // "PERIODIC"
  serviceLabel:             string;  // "Periodic Service"
  complaints:               string[];
  estimatedDurationMinutes: number;
  isOverrideEnabled:        boolean;

  // Step 4 — Slot
  appointmentDate:    string | null;  // "2026-03-14"
  appointmentTime:    string | null;  // "09:00"
  pickupRequired:     boolean;
  pickupAddress:      string;
  serviceAdvisorId:   string | null;
  serviceAdvisorName: string;

  // Step 5 — Review
  internalNotes: string;
  sendWhatsApp:  boolean;
  sendEmail:     boolean;
}

const DEFAULT_STATE: WizardState = {
  customerId:      null,
  customerName:    '',
  customerPhone:   '',
  customerEmail:   '',
  isNewCustomer:   false,
  newCustomerData: null,

  vehicleId:           null,
  vehicleName:         '',
  vehicleReg:          '',
  vehicleMakeModel:    '',
  vehicleYear:         '',
  vehicleFuel:         '',
  vehicleTransmission: '',
  vehicleOdometer:     '',
  isNewVehicle:        false,
  newVehicleData:      null,

  serviceType:              '',
  serviceTypeBackend:       '',
  serviceLabel:             '',
  complaints:               [],
  estimatedDurationMinutes: 150,
  isOverrideEnabled:        false,

  appointmentDate:    null,
  appointmentTime:    null,
  pickupRequired:     false,
  pickupAddress:      '',
  serviceAdvisorId:   null,
  serviceAdvisorName: '',

  internalNotes: '',
  sendWhatsApp:  true,
  sendEmail:     true,
};

const SESSION_KEY = 'appointmentWizard';

// ─── Context ──────────────────────────────────────────────────────────────────

interface WizardContextValue {
  state:    WizardState;
  setState: (partial: Partial<WizardState>) => void;
  reset:    () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppointmentWizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setStateRaw] = useState<WizardState>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [state]);

  const setState = (partial: Partial<WizardState>) => {
    setStateRaw((prev) => ({ ...prev, ...partial }));
  };

  const reset = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setStateRaw(DEFAULT_STATE);
  };

  return (
    <WizardContext.Provider value={{ state, setState, reset }}>
      {children}
    </WizardContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppointmentWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useAppointmentWizard must be used inside AppointmentWizardProvider');
  }
  return ctx;
}
