import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { Clock, TriangleAlert, Check } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { PostServiceQCCard } from "../../components/cards/PostServiceQCCard.tsx";

interface Job {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  technicianName: string;
  completedTime: string;
  status: "pending" | "approved" | "sent_back";
}

const PostServiceQCDashboard = () => {
  const navigate = useNavigate();
  const [jobs] = useState<Job[]>([
    {
      id: "1",
      vehicleNumber: "KA-05-EF-9012",
      vehicleModel: "Maruti swift",
      technicianName: "Ramesh k.",
      completedTime: "11:45 AM",
      status: "pending",
    },
    {
      id: "2",
      vehicleNumber: "DL-03-GH-3456",
      vehicleModel: "Hyundai Creta",
      technicianName: "Sunil M.",
      completedTime: "12:30 PM",
      status: "pending",
    },
  ]);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
        <StatCard
          title="Pending Review"
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
          title="Approved today"
          value="06"
          change=""
          icon={
            <Check
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#00BF06]"
              strokeWidth={3}
            />
          }
        />
        <StatCard
          title="Sent back"
          value="01"
          change=""
          icon={
            <TriangleAlert
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#FF4F31]"
              strokeWidth={3}
            />
          }
        />
      </div>

      {/* Today's Jobs Section */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#333] mb-0.5 sm:mb-1">
          Completed Services Queue
        </h2>
        <p className="text-[13px] sm:text-[14px] text-[#999]">
          Vehicles awaiting post-service inspection
        </p>
      </div>

      {/* Job Cards */}
      <div className="space-y-3 sm:space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() =>
              navigate(
                `${ROUTES.POST_SERVICE_QC_DASHBOARD}/inspection/${job.id}`
              )
            }
            className="cursor-pointer"
          >
            <PostServiceQCCard
              vehicleNumber={job.vehicleNumber}
              vehicleModel={job.vehicleModel}
              technicianName={job.technicianName}
              completedTime={job.completedTime}
              status={job.status}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default PostServiceQCDashboard;
