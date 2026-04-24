import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — Midgard",
  description: "Request a password reset link.",
  openGraph: {
    title: "Forgot password — Midgard",
    description: "Request a password reset link.",
    url: "/forgot-password",
    images: ["/opengraph-image.png"],
    type: "website",
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
