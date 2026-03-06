import ResetPasswordForm from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <ResetPasswordForm token={token} />
    </main>
  );
}
