import { SectionLoading } from "@/components/feedback/section-loading";

export default function AdminLoading() {
  return (
    <SectionLoading
      eyebrow="Administration"
      title="Chargement du back-office"
      description="Nous préparons les données de gouvernance, les utilisateurs et les réglages."
    />
  );
}
