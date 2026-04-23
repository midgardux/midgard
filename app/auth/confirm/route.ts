import { createServerClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/projects";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // PKCE flow — newer Supabase projects send a code instead of token_hash
  if (code) {
    const supabase = await createServerClient();
    let exchangeError: string | null = null;
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) exchangeError = error.message;
    } catch {
      exchangeError = "Code exchange failed";
    }
    if (!exchangeError) {
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(exchangeError)}`);
    }
  }

  // OTP flow — token_hash + type
  if (token_hash && type) {
    const supabase = await createServerClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      redirect(next);
    } else if (type === "recovery") {
      redirect("/auth/reset-password?error=expired");
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error?.message ?? "Unknown error")}`);
    }
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
