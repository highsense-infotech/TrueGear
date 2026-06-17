import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import Button from "../common/Button";
import Input from "../common/Input";

interface VehicleLookupProps {
  onSearch?: (query: string) => void;
  onAddNewVehicle?: () => void;
  value?: string;
  /** Parent indicates a lookup is in-flight (Evolve + local DB). */
  loading?: boolean;
}

export function VehicleLookup({ onSearch, onAddNewVehicle, value, loading }: VehicleLookupProps) {
  const [searchQuery, setSearchQuery] = useState(value ?? "");

  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value);
    }
  }, [value]);

  const handleSearch = () => {
    if (loading) return;
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-5">
        <h2 className="text-[#333] text-[15px] sm:text-[16px] mb-1">
          Vehicle Lookup
        </h2>
        <p className="text-[#999] text-[12px] sm:text-[13px]">
          Enter the VIN or registration number to search
        </p>
      </div>

      {/* Form Section */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 bg-white border border-[#bfbfbf] rounded-[10px] px-4 sm:px-5 h-12 sm:h-12.5">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#999]" />

          <Input
            type="text"
            placeholder="Enter VIN or Registration Number"
            className="flex-1 text-[13px] sm:text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            disabled={loading}
          />
        </div>

        {/* Search Button */}
        <Button variant="gradient" onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </span>
          ) : (
            "Search"
          )}
        </Button>

        {/* Add New Vehicle — triggers the existing input in VehicleTable */}
        {onAddNewVehicle && (
          <Button variant="secondary" onClick={onAddNewVehicle} disabled={loading}>
            + Add New Vehicle
          </Button>
        )}
      </div>

      {/* Status hint while waiting on Evolve / DB — Evolve calls can take a
          few seconds (up to ~25s if their pool is exhausted). Show progress
          so the user doesn't think the page froze. */}
      {loading && (
        <p className="text-[12px] text-[#999] mt-3 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking Evolve + local records — this can take a few seconds.
        </p>
      )}
    </div>
  );
}
