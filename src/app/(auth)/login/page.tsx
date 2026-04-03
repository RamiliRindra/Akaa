import { Suspense } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { hasGoogleOAuth } from "@/lib/auth-config";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Connexion | Akaa",
};

export default function LoginPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-[#0c0910]">Bon retour sur Akaa</h1>
        <p className="text-sm text-[#0c0910]/70">Connectez-vous pour reprendre votre progression.</p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-64 animate-pulse rounded-xl bg-[#0c0910]/5"
            aria-hidden
          />
        }
      >
        <LoginForm />
      </Suspense>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#0c0910]/10" />
        <span className="text-xs text-[#0c0910]/50">ou</span>
        <span className="h-px flex-1 bg-[#0c0910]/10" />
      </div>
      <GoogleButton enabled={hasGoogleOAuth} />
    </div>
  );
}
