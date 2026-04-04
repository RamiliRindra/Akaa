type FormFeedbackProps = {
  type?: string;
  message?: string;
};

export function FormFeedback({ type, message }: FormFeedbackProps) {
  if (!message) {
    return null;
  }

  const isError = type === "error";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#119da4]/20 bg-[#119da4]/10 text-[#0c0910]"
      }`}
    >
      {message}
    </div>
  );
}

