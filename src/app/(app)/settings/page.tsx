import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { updateProfile, updatePassword } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { success, error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">Account Settings</h1>
        <p className="text-sm text-(--color-slate)">Update your name, email address, and password.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {success === "profile" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Profile updated successfully.
        </div>
      )}
      {success === "password" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Password changed successfully.
        </div>
      )}

      <section className="surface-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-(--color-ink)">Profile</h2>
        <form action={updateProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-slate)">Full Name</label>
            <input
              name="name"
              defaultValue={session.user.name ?? ""}
              required
              className="field-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-slate)">Email Address</label>
            <input
              name="email"
              type="email"
              defaultValue={session.user.email ?? ""}
              required
              className="field-input w-full"
            />
          </div>
          <button className="btn-primary">Save Profile</button>
        </form>
      </section>

      <section className="surface-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-(--color-ink)">Change Password</h2>
        <form action={updatePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-slate)">Current Password</label>
            <input name="currentPassword" type="password" required className="field-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-slate)">New Password (min 8 characters)</label>
            <input name="newPassword" type="password" required minLength={8} className="field-input w-full" />
          </div>
          <button className="btn-primary">Change Password</button>
        </form>
      </section>
    </div>
  );
}
