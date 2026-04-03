import { AppLogo } from "@/components/layout/app-logo";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbe8ff_0%,#f7f9ff_35%,#ffffff_100%)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <AppLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
