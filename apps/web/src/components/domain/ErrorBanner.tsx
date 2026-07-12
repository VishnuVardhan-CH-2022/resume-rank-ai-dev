import { getSafeErrorMessage, type ErrorObject } from "@/lib/errors";

export function ErrorBanner({ error }: { error: unknown }) {
  let message = "Something went wrong.";
  if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object" && "error" in error) {
    message = getSafeErrorMessage(error as ErrorObject);
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
