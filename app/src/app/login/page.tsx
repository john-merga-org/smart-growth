import { LoginForm } from "./form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Smart Growth</h1>
          <p className="text-sm text-ink-3">Enter your passcode.</p>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
