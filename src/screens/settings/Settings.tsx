import { useCurrency, CURRENCIES } from "../../context/CurrencyContext";
import { Breadcrumb } from "../../components/common/Breadcrumb";

const Settings: React.FC = () => {
  const { currency, setCurrency, taxConfig } = useCurrency();

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

          {/* Tax Info */}
          <div className="bg-[#f9f9f9] border border-[#e5e7eb] rounded-[10px] p-4">
            <p className="text-sm text-[#333] font-medium mb-2">Tax Configuration</p>
            <p className="text-sm text-[#666]">
              {taxConfig.label} ({taxConfig.percentage}%) will be applied to estimates.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
