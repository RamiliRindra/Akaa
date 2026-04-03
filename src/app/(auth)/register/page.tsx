import { GoogleButton } from "@/components/auth/google-button";
import { hasGoogleOAuth } from "@/lib/auth-config";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Inscription | Akaa",
};

export default function RegisterPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-[#0c0910]">Créer un compte Akaa</h1>
        <p className="text-sm text-[#0c0910]/70">Démarrez votre parcours d’apprentissage gamifié.</p>
      </div>
      <RegisterForm />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#0c0910]/10" />
        <span className="text-xs text-[#0c0910]/50">ou</span>
        <span className="h-px flex-1 bg-[#0c0910]/10" />
      </div>
      <GoogleButton enabled={hasGoogleOAuth} />
    </div>
  );
}
