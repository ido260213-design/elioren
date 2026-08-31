import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-bold text-primary">HireUp</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Real work. Real experience. Built for teens.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          HireUp connects teens 13–18 with employers and businesses for part-time and
          one-time jobs — with parental consent and safety built in from day one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/jobs">Browse jobs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
