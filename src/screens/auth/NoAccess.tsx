import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const NoAccess = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="bg-white rounded-[12px] border border-[#e5e7eb] p-8 sm:p-10 max-w-sm w-full text-center shadow-sm">
        <div className="flex justify-center mb-5">
          <div className="bg-[#fff0f4] rounded-full w-16 h-16 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-[#FE2B73]" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-[18px] font-bold text-[#333] mb-2">No Access</h1>
        <p className="text-[13px] text-[#999] mb-1">
          Your account ({user?.role?.name}) does not have permission to view any page.
        </p>
        <p className="text-[12px] text-[#bbb] mb-6">
          Contact your administrator to grant the required permissions.
        </p>
        <Button variant="gradient" onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </div>
    </div>
  );
};

export default NoAccess;
