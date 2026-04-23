import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden"> {/* Added overflow-hidden */}
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto"> {/* Added overflow-auto */}
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
