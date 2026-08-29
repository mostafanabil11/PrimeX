import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
      <h1 className="mb-4 font-heading text-headline-md font-bold text-foreground">
        Page Not Found
      </h1>
      <p className="mb-8 text-body-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  );
}
