import type { Metadata } from "next";
import { SignUpForm } from "@/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up — Midgard",
  description: "Create your Midgard account.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
