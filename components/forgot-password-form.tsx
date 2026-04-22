"use client";

import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
      });
    } catch {
      // Intentionally suppressed — always show success (no user enumeration)
    }

    setIsLoading(false);
    setSuccess(true);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="bg-mg-surface border border-mg-border">
          <CardHeader>
            <CardTitle className="text-2xl text-mg-foreground font-sans">
              Check your email
            </CardTitle>
            <CardDescription className="text-mg-foreground-muted">
              Password reset instructions sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-mg-foreground-muted">
              Check your email for a reset link.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-mg-surface border border-mg-border">
          <CardHeader>
            <CardTitle className="text-2xl text-mg-foreground font-sans">
              Forgot password
            </CardTitle>
            <CardDescription className="text-mg-foreground-muted">
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-mg-foreground-muted">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-mg-border focus:border-mg-accent"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                <span className="text-mg-foreground-muted">
                  Remember your password?{" "}
                </span>
                <Link
                  href="/login"
                  className="underline underline-offset-4 text-mg-foreground-muted"
                >
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
