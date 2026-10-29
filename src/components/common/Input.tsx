import React, { forwardRef } from "react";
import { cn } from "../utils/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  labelClassName?: string;
  prefix?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(({ label, labelClassName, prefix, rightIcon, onRightIconClick, error, className, ...rest }, ref) => (
  <div className="w-full space-y-[8px] font-['Poppins']">
    {label && (
      <label className={cn("block text-base font-medium text-white leading-[25px]", labelClassName)}>
        {label}
      </label>
    )}
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "flex w-full rounded-[20px] border border-white bg-transparent px-[20px] py-[19.5px] text-base font-medium text-white placeholder:text-white focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50",
          prefix && "pl-8",
          error && "border-red-500",
          className
        )}
        {...rest}
      />
      {rightIcon && (
        <div
          className="absolute right-[20px] top-1/2 -translate-y-1/2 cursor-pointer text-white"
          onClick={onRightIconClick}
        >
          {rightIcon}
        </div>
      )}
    </div>
    {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
  </div>
));

Input.displayName = "Input";

export default Input;

