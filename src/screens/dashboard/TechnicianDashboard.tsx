import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { Wrench, Clock } from "lucide-react";
import { TechnicianJobCard } from "../../components/cards/TechnicianJobCard.tsx";
import { ROUTES } from "../../constants/routes";

interface Job {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  bayNumber: string;
  completedTasks: number;
  totalTasks: number;
  status: "pending" | "progress" | "completed";
}

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const [jobs] = useState<Job[]>([
    {
      id: "1",
      vehicleNumber: "KA-01-AB-1234",
      vehicleModel: "Toyota Innova Crysta",
      bayNumber: "Bay 3",
      completedTasks: 0,
      totalTasks: 3,
      status: "pending",
    },
    {
      id: "2",
      vehicleNumber: "KA-01-AB-1234",
      vehicleModel: "Toyota Innova Crysta",
      bayNumber: "Bay 3",
      completedTasks: 0,
      totalTasks: 3,
      status: "pending",
    },
    {
      id: "3",
      vehicleNumber: "KA-01-AB-1234",
      vehicleModel: "Toyota Innova Crysta",
      bayNumber: "Bay 3",
      completedTasks: 0,
      totalTasks: 3,
      status: "pending",
    },
  ]);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
        <StatCard
          title="Pending"
          value="01"
          change=""
          icon={
            <Clock
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#E89D00]"
              strokeWidth={3}
            />
          }
        />
        <StatCard
          title="In Progress"
          value="01"
          change=""
          icon={
            <Wrench
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#0061FF]"
              strokeWidth={3}
            />
          }
        />
        <StatCard
          title="Completed"
          value="01"
          change=""
          icon={
            <Clock
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#00BF06]"
              strokeWidth={3}
            />
          }
        />
      </div>

      {/* Today's Jobs Section */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#333] mb-0.5 sm:mb-1">
          Today's job
        </h2>
        <p className="text-[13px] sm:text-[14px] text-[#999]">
          {jobs.length} vehicles assigned
        </p>
      </div>

      {/* Job Cards */}
      <div className="space-y-3 sm:space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => navigate(`${ROUTES.TECHNICIAN_DASHBOARD}/job/${job.id}`)}
            className="cursor-pointer"
          >
            <TechnicianJobCard
              vehicleNumber={job.vehicleNumber}
              vehicleModel={job.vehicleModel}
              bayNumber={job.bayNumber}
              completedTasks={job.completedTasks}
              totalTasks={job.totalTasks}
              status={job.status}
              statusIcon={
                job.status === "pending" ? (
                  <svg
                    className="size-5 text-[#ffa726]"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 6V10L12.5 12.5"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                ) : job.status === "progress" ? (
                  <svg
                    className="size-5 text-[#2196f3]"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M10 3L11.5 6.5L15 8L11.5 9.5L10 13L8.5 9.5L5 8L8.5 6.5L10 3Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                ) : (
                  <svg
                    className="size-5 text-[#4caf50]"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M15 7L8.5 13.5L5 10"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                )
              }
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default TechnicianDashboard;
