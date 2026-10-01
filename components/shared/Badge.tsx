import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function Badge({
  children,
  className = "bg-slate-100 text-slate-600",
}: Props) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
