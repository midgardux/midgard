import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in — Midgard",
  description: "Log in to your Midgard account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        {params.message === "password-reset" && (
          <p className="mb-4 text-sm text-center text-mg-foreground-muted">
            Your password has been reset. Log in with your new password.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
