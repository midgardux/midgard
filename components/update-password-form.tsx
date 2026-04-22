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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const EXPIRED_MSG = "This reset link has expired.";
const UPDATE_FAIL_MSG = "Failed to update password. Please try again.";

interface UpdatePasswordFormProps extends React.ComponentPropsWithoutRef<"div"> {
  error?: string;
}

export function UpdatePasswordForm({
  className,
  error: initialError,
  ...props
}: UpdatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(
    initialError === "expired" ? EXPIRED_MSG : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionValid(!!data.session);
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setFormError(null);
    setIsLoading(true);
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setFormError(UPDATE_FAIL_MSG);
      return;
    }

    router.replace("/login?message=password-reset");
  };

  const noValidSession = sessionValid === false && initialError !== "expired";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-mg-surface border border-mg-border">
        <CardHeader>
          <CardTitle className="text-2xl text-mg-foreground font-sans">
            Set new password
          </CardTitle>
          <CardDescription className="text-mg-foreground-muted">
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {noValidSession ? (
            <p className="text-mg-destructive text-sm">
              Invalid or missing reset link.{" "}
              <Link
                href="/forgot-password"
                className="underline underline-offset-4"
              >
                Request a new one.
              </Link>
            </p>
          ) : (
            <form onSubmit={handleUpdatePassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-mg-foreground-muted">
                    New password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="New password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-mg-border focus:border-mg-accent"
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-mg-foreground-muted"
                  >
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-mg-border focus:border-mg-accent"
                  />
                </div>
                {formError && (
                  <p className="text-mg-destructive text-sm">
                    {formError}{" "}
                    {(formError === EXPIRED_MSG || formError === UPDATE_FAIL_MSG) && (
                      <Link
                        href="/forgot-password"
                        className="underline underline-offset-4"
                      >
                        Request a new reset link.
                      </Link>
                    )}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Set new password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
