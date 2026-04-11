type PlaceholderCardProps = {
  title: string;
  description: string;
};

export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[var(--color-text-dark)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-text-dark)]/70">{description}</p>
    </section>
  );
}
