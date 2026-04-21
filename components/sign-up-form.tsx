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
import { useState } from "react";

function mapSignUpError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered")
  ) {
    return "An account with this email already exists.";
  }
  return "Something went wrong. Please try again.";
}

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setIsLoading(false);

    if (error) {
      setError(mapSignUpError(error.message));
      return;
    }

    router.push("/auth/sign-up-success");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-mg-surface border border-mg-border">
        <CardHeader>
          <CardTitle className="text-2xl text-mg-foreground font-sans">
            Sign up
          </CardTitle>
          <CardDescription className="text-mg-foreground-muted">
            Create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label
                    htmlFor="password"
                    className="text-mg-foreground-muted"
                  >
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-mg-border focus:border-mg-accent"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label
                    htmlFor="repeat-password"
                    className="text-mg-foreground-muted"
                  >
                    Repeat Password
                  </Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="border-mg-border focus:border-mg-accent"
                />
              </div>
              {error && (
                <p className="text-mg-destructive text-sm">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              <span className="text-mg-foreground-muted">
                Already have an account?{" "}
              </span>
              <Link
                href="/auth/login"
                className="underline underline-offset-4 text-mg-foreground-muted"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
