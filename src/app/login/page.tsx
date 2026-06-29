import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-4">
      <form
        action={loginAction}
        className="surface-card w-full max-w-sm space-y-4 p-8"
      >
        <div className="mb-2">
          <div className="accent-bar mb-4 rounded-full" />
          <h1 className="text-[18px] font-semibold text-(--color-ink)">Sign in</h1>
          <p className="text-sm text-(--color-slate)">Welcome back to PM SaaS</p>
        </div>
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
        <div>
          <label className="block text-sm font-medium text-(--color-ink)">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            className="field-input mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-(--color-ink)">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="field-input mt-1 w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-(--color-slate)">
          <input type="checkbox" name="remember" className="rounded border-(--color-border)" />
          Remember me for 30 days
        </label>
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
