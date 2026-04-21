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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError("Invalid email or password.");
        return;
      }

      router.refresh();
      router.push("/projects");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-mg-surface border border-mg-border">
        <CardHeader>
          <CardTitle className="text-2xl text-mg-foreground font-sans">
            Log in
          </CardTitle>
          <CardDescription className="text-mg-foreground-muted">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
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
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-mg-foreground-muted"
                  >
                    Forgot your password?
                  </Link>
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
              {error && (
                <p className="text-mg-destructive text-sm">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-mg-accent text-[#0A0A0A] font-mono text-xs uppercase tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              <span className="text-mg-foreground-muted">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                href="/signup"
                className="underline underline-offset-4 text-mg-foreground-muted"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
