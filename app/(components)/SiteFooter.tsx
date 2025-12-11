// app/(components)/SiteFooter.tsx
export default function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle mt-12 py-4 text-xs text-text-secondary">
      <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
        Website and content created by{" "}
        <a
          href="https://elev8.dev"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          ELEV8.DEV
        </a>
        .
      </div>
    </footer>
  );
}
