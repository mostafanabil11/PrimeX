export function CategoryPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string | null;
}) {
  return (
    <section className="border-b border-border bg-background py-8 text-center md:py-10">
      <h1 className="font-heading text-headline-md font-bold tracking-[-0.02em] text-foreground md:text-display-lg-mobile">
        {title}
      </h1>
      <div className="mx-auto mt-4 h-px w-12 bg-primary" />
      {description && (
        <p className="mx-auto mt-6 max-w-md px-margin-mobile text-body-md text-muted-foreground">
          {description}
        </p>
      )}
    </section>
  );
}
