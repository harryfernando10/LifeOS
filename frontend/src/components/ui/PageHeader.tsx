type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="max-w-2xl">
      <h1
        className="text-3xl font-semibold tracking-tight text-[var(--lifeos-ink)] sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--lifeos-muted)]">
        {description}
      </p>
    </header>
  );
}
