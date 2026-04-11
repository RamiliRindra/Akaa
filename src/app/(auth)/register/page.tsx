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
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">Créer un compte Akaa</h1>
        <p className="text-sm text-[var(--color-text-dark)]/70">Démarrez votre parcours d’apprentissage gamifié.</p>
      </div>
      <RegisterForm />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-(--color-text-dark)/10" />
        <span className="text-xs text-[var(--color-text-dark)]/50">ou</span>
        <span className="h-px flex-1 bg-(--color-text-dark)/10" />
      </div>
      <GoogleButton enabled={hasGoogleOAuth} />
    </div>
  );
}
