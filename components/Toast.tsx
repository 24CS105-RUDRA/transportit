"use client";

export function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  const color =
    type === "error"
      ? "bg-rose-600 shadow-rose-200"
      : "bg-emerald-600 shadow-emerald-200";
  return (
    <div
      className={`animate-slideInRight fixed top-4 right-4 z-50 cursor-pointer rounded-lg ${color} px-5 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105`}
      onClick={onClose}
      role="alert"
    >
      {message}
    </div>
  );
}
