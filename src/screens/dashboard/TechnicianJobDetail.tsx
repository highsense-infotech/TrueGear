import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { BackButton } from "../../components/cards/BackButton";
import { ArrowLeft } from "lucide-react";
import { VehicleCard } from "../../components/cards/VehicleCard";
import { TimerCard } from "../../components/cards/TimerCard";
import { JobChecklist } from "../../components/cards/JobChecklist";

interface Task {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
}

interface JobDetail {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  bayNumber: string;
  customerName: string;
  customerPhone: string;
  status: "pending" | "progress" | "completed";
  entryDate: string;
  serviceType: string;
  tasks: Task[];
}

// Mock data - replace with API call when backend is ready
const mockJobData: Record<string, JobDetail> = {
  "1": {
    id: "1",
    vehicleNumber: "KA-01-AB-1234",
    vehicleModel: "Toyota Innova Crysta",
    bayNumber: "Bay 3",
    customerName: "John Doe",
    customerPhone: "+91 98765 43210",
    status: "pending",
    entryDate: "2024-01-15",
    serviceType: "Standard Service",
    tasks: [
      {
        id: "t1",
        name: "Oil Change",
        description: "Replace engine oil and filter",
        isCompleted: false,
      },
      {
        id: "t2",
        name: "Brake Inspection",
        description: "Check brake pads and discs",
        isCompleted: false,
      },
      {
        id: "t3",
        name: "Tire Rotation",
        description: "Rotate all four tires",
        isCompleted: false,
      },
    ],
  },
  "2": {
    id: "2",
    vehicleNumber: "KA-01-AB-1234",
    vehicleModel: "Toyota Innova Crysta",
    bayNumber: "Bay 3",
    customerName: "Jane Smith",
    customerPhone: "+91 98765 43211",
    status: "progress",
    entryDate: "2024-01-15",
    serviceType: "Premium Service",
    tasks: [
      {
        id: "t1",
        name: "Oil Change",
        description: "Replace engine oil and filter",
        isCompleted: true,
      },
      {
        id: "t2",
        name: "Brake Inspection",
        description: "Check brake pads and discs",
        isCompleted: true,
      },
      {
        id: "t3",
        name: "Tire Rotation",
        description: "Rotate all four tires",
        isCompleted: false,
      },
    ],
  },
  "3": {
    id: "3",
    vehicleNumber: "KA-01-AB-1234",
    vehicleModel: "Toyota Innova Crysta",
    bayNumber: "Bay 3",
    customerName: "Mike Johnson",
    customerPhone: "+91 98765 43212",
    status: "completed",
    entryDate: "2024-01-14",
    serviceType: "Express Service",
    tasks: [
      {
        id: "t1",
        name: "Oil Change",
        description: "Replace engine oil and filter",
        isCompleted: true,
      },
      {
        id: "t2",
        name: "Brake Inspection",
        description: "Check brake pads and discs",
        isCompleted: true,
      },
      {
        id: "t3",
        name: "Tire Rotation",
        description: "Rotate all four tires",
        isCompleted: true,
      },
    ],
  },
};

const statusConfig = {
  pending: { label: "Pending", bg: "bg-[#ffe1b7]", text: "text-[#e89d00]" },
  progress: { label: "In Progress", bg: "bg-[#b7d4ff]", text: "text-[#0061FF]" },
  completed: { label: "Completed", bg: "bg-[#b3ffbd]", text: "text-[#00bf06]" },
};

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
};

const TechnicianJobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = id ? mockJobData[id] : null;

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Checklist derived from job tasks
  const [checklistItems, setChecklistItems] = useState<
    { id: string; title: string; completed: boolean }[]
  >([]);

  useEffect(() => {
    if (job) {
      setChecklistItems(
        job.tasks.map((task) => ({
          id: task.id,
          title: task.name,
          completed: task.isCompleted,
        })),
      );
    }
  }, [id]);

  // Timer interval
  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  const handleToggleItem = (itemId: string) => {
    setChecklistItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const handleToggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  if (!job) {
    return (
      <>
        <BackButton onClick={() => navigate(-1)} />
        <div className="bg-white rounded-xl p-8 text-center mt-4">
          <p className="text-[#333] text-lg">Job not found</p>
        </div>
      </>
    );
  }

  const status = statusConfig[job.status];

  return (
    <>
      {/* Back to Jobs */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-5 text-[#999] hover:text-[#333] transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="font-normal text-[14px]">Back to Jobs</span>
      </button>

      {/* Vehicle Header */}
      <div className="flex items-center justify-between mb-7.5">
        <div>
          <h2 className="font-semibold text-[24px] text-[#333] leading-[1.2] mb-1.25">
            {job.vehicleNumber}
          </h2>
          <p className="font-normal text-[16px] text-[#999] leading-[1.2]">
            {job.vehicleModel}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`${status.bg} px-6 py-2.5 rounded-lg`}>
          <span className={`font-semibold text-[16px] ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Vehicle Cards Row */}
      <div className="grid grid-cols-2 gap-6 mb-7.5">
        <VehicleCard
          vehicleNumber={job.vehicleNumber}
          vehicleName={job.vehicleModel}
        />
        <VehicleCard
          vehicleNumber={job.vehicleNumber}
          vehicleName={job.vehicleModel}
        />
      </div>

      {/* Timer Card */}
      <div className="mb-7.5">
        <TimerCard
          time={formatTime(elapsedSeconds)}
          status={isTimerRunning ? "Timer running" : "Timer paused"}
          isRunning={isTimerRunning}
          onStart={handleToggleTimer}
        />
      </div>
      {/* Job Checklist */}
        <JobChecklist
          items={checklistItems}
          onToggle={handleToggleItem}
        />
    </>
  );
};

export default TechnicianJobDetail;
