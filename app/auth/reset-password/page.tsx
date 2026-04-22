import { UpdatePasswordForm } from "@/components/update-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-mg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm error={params.error} />
      </div>
    </div>
  );
}
