import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in — Midgard",
  description: "Log in to your Midgard account.",
  openGraph: {
    title: "Log in — Midgard",
    description: "Log in to your Midgard account.",
    url: "/login",
    images: ["/opengraph-image.png"],
    type: "website",
  },
};

async function PasswordResetMessage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  if (params.message !== "password-reset") return null;
  return (
    <p className="mb-4 text-sm text-center text-mg-foreground-muted">
      Your password has been reset. Log in with your new password.
    </p>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <PasswordResetMessage searchParams={searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </div>
  );
}
