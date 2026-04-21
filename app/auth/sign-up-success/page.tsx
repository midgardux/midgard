export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm rounded-lg bg-mg-surface border border-mg-border p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-sans text-mg-foreground">
          Check your email
        </h1>
        <p className="text-sm text-mg-foreground-muted">
          We sent a confirmation link to your inbox. Click it to activate your
          account.
        </p>
      </div>
    </div>
  );
}
