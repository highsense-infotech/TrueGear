import React from "react";

type ButtonVariant = "primary" | "secondary" | "gradient" | "outline" | "custom";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  gradient?: {
    from: string;
    to: string;
    direction?:
      | "to-r"
      | "to-b"
      | "to-l"
      | "to-t"
      | "to-tr"
      | "to-tl"
      | "to-br"
      | "to-bl";
  };
  customStyles?: {
    background?: string;
    border?: string;
    text?: string;
    hoverBg?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  gradient,
  customStyles,
  icon,
  className = "",
  ...rest
}) => {
  const getBaseStyles = () => {
    return "flex items-center justify-center gap-2 h-12 sm:h-12.5 rounded-[10px] font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "gradient":
        const direction = gradient?.direction
          ? `-${gradient.direction}`
          : "-to-r";
        return gradient
          ? `bg-gradient${direction} from-[${gradient.from}] to-[${gradient.to}] text-white shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] hover:opacity-90`
          : "bg-gradient-to-b from-[#ff4f31] to-[#fe2b73] text-white shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] hover:opacity-90";
      case "secondary":
        return "bg-[#0066FF] text-white hover:bg-[#0052cc]";
      case "outline":
        return "border-2 border-[#EBEBEB] text-[#808080] bg-transparent hover:bg-[#fff]";
      case "custom":
        return "";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const getResponsiveStyles = () => {
    return variant === "gradient"
      ? "w-full md:w-auto px-6 sm:px-8"
      : " px-5 sm:px-6";
  };

  const getCustomStyles = () => {
    if (variant !== "custom" || !customStyles) return "";
    const styles = [];
    if (customStyles.background) styles.push(`bg-[${customStyles.background}]`);
    if (customStyles.border) styles.push(`border border-[${customStyles.border}]`);
    if (customStyles.text) styles.push(`text-[${customStyles.text}]`);
    if (customStyles.hoverBg) {
      styles.push(`hover:bg-[${customStyles.hoverBg}]`);
    } else if (customStyles.background) {
      // Default hover behavior
      styles.push("transition-colors");
    }
    return styles.join(" ");
  };

  return (
    <button
      style={
        variant === "gradient" && gradient
          ? {
              background: `linear-gradient(${
                gradient.direction === "to-r" ? "to right" : "to bottom"
              }, ${gradient.from}, ${gradient.to})`,
            }
          : variant === "custom" && customStyles
            ? {
                backgroundColor: customStyles.background,
                borderColor: customStyles.border,
                color: customStyles.text,
              }
            : undefined
      }
      className={`${getBaseStyles()} ${getVariantStyles()} ${getResponsiveStyles()} ${getCustomStyles()} ${className} cursor-pointer`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
