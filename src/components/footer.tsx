import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 py-12 md:h-32 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <Link
              href="https://warpcast.com/~/channel/politics"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Politics
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
