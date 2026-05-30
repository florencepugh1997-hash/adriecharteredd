import { Mail } from "lucide-react";
import { SUPPORT_MAILTO } from "../constants.js";

interface ContactSupportLinkProps {
  label?: string;
  className?: string;
  variant?: "button" | "link";
}

export default function ContactSupportLink({
  label = "Contact support",
  className = "",
  variant = "button",
}: ContactSupportLinkProps) {
  if (variant === "link") {
    return (
      <a
        href={SUPPORT_MAILTO}
        className={`inline-flex items-center gap-1.5 text-[#4A90D9] font-semibold hover:underline ${className}`}
      >
        <Mail className="w-3.5 h-3.5" />
        {label}
      </a>
    );
  }

  return (
    <a
      href={SUPPORT_MAILTO}
      className={`inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white text-sm font-semibold rounded-xl transition-colors no-underline ${className}`}
    >
      <Mail className="w-4 h-4" />
      {label}
    </a>
  );
}
