import { useState, useEffect } from "react";
import { useCurrency, CURRENCIES } from "../../context/CurrencyContext";
import { Breadcrumb } from "../../components/common/Breadcrumb";

const Settings: React.FC = () => {
  const { currency, setCurrency, taxConfig, setTaxPercentage } = useCurrency();
  const [taxInput, setTaxInput] = useState(String(taxConfig.percentage));

  // Sync input when currency changes
  useEffect(() => {
    setTaxInput(String(taxConfig.percentage));
  }, [currency, taxConfig.percentage]);

  const handleTaxBlur = () => {
    const parsed = parseFloat(taxInput);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setTaxPercentage(parsed);
    } else {
      setTaxInput(String(taxConfig.percentage));
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Settings" }]} />

      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 md:p-6 shadow-sm max-w-2xl">
        <h2 className="text-lg font-semibold text-[#333] mb-1">Settings</h2>
        <p className="text-[#999] text-xs mb-6">Manage your application preferences</p>

        <div className="flex flex-col gap-5">
          {/* Currency Setting */}
          <div>
            <label className="block text-sm font-medium text-[#333] mb-2">
              Currency
            </label>
            <p className="text-xs text-[#999] mb-3">
              Choose the currency used across all billing and estimates.
            </p>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-64 h-11 border border-[#e5e7eb] focus:border-[#04c397] rounded-[10px] px-4 text-[14px] text-[#333] outline-none transition-colors bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tax Configuration */}
          <div className="bg-[#f9f9f9] border border-[#e5e7eb] rounded-[10px] p-4">
            <p className="text-sm text-[#333] font-medium mb-3">Tax Configuration</p>
            <p className="text-xs text-[#999] mb-3">
              Set the {taxConfig.label} percentage to apply to all estimates.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#555] w-20">{taxConfig.label} (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  onBlur={handleTaxBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleTaxBlur()}
                  className="w-28 h-9 border border-[#e5e7eb] focus:border-[#04c397] rounded-lg pl-3 pr-7 text-[14px] text-[#333] outline-none transition-colors bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] text-sm pointer-events-none">%</span>
              </div>
            </div>
            <p className="text-xs text-[#aaa] mt-3">
              {taxConfig.label} ({taxConfig.percentage}%) will be applied to estimates.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
