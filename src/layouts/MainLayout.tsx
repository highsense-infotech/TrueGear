import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import ErrorBoundary from "../components/common/ErrorBoundary";

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden"> {/* Added overflow-hidden */}
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto"> {/* Added overflow-auto */}
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Keyed on the pathname so navigating away CLEARS a caught error.
              Without the key the boundary latches: the user clicks another
              sidebar item, the route changes underneath, and the fallback
              stays on screen with no way back short of a reload.
              `region` keeps the sidebar and header mounted, so a broken page
              never costs the user their navigation. */}
          <ErrorBoundary key={location.pathname} variant="region">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
