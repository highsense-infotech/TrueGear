import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage,
  onPageChange 
}: PaginationProps) {
  // Calculate showing range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Don't render if no items
  if (totalItems === 0) {
    return null;
  }

  // Handle page change
  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 my-5 sm:px-5">

      {/* Showing Text */}
      <p className="text-[#666] text-xs sm:text-sm text-center sm:text-left">
        Showing {startItem} - {endItem} of {totalItems}
      </p>

      {/* ===== Desktop / Tablet Pagination ===== */}
      <div className="hidden sm:flex items-center gap-2">

        {/* Prev */}
        <button 
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`p-2 hover:bg-gray-100 rounded-md ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ChevronLeft className="w-5 h-5 text-[#666]" />
        </button>

        {/* Pages */}
        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm ${
                page === currentPage
                  ? 'bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white'
                  : 'bg-white border border-[#e5e7eb] text-[#333] hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-sm text-[#666]">
              ...
            </span>
          )
        ))}

        {/* Next */}
        <button 
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`p-2 hover:bg-gray-100 rounded-md ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ChevronRight className="w-5 h-5 text-[#666]" />
        </button>
      </div>

      {/* ===== Mobile Pagination ===== */}
      <div className="flex sm:hidden items-center justify-between gap-2">

        <button 
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 px-3 py-2 border rounded-md text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <span className="text-sm font-medium text-[#333]">
          Page {currentPage} of {totalPages}
        </span>

        <button 
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1 px-3 py-2 border rounded-md text-sm ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
