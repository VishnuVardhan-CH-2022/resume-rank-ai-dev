import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  validateJobDescription,
  validateJobTitle,
} from "@/modules/jobs/lib/validation";

type JobFormProps = {
  initialTitle?: string;
  initialJdText?: string;
  submitLabel: string;
  cancelLabel?: string;
  readOnly?: boolean;
  busy?: boolean;
  onCancel?: () => void;
  onSubmit: (values: { title: string; jd_text: string }) => void | Promise<void>;
};

/** UXD §8.2 Create / Edit Job form */
export function JobForm({
  initialTitle = "",
  initialJdText = "",
  submitLabel,
  cancelLabel = "Cancel",
  readOnly,
  busy,
  onCancel,
  onSubmit,
}: JobFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [jdText, setJdText] = useState(initialJdText);
  const [errors, setErrors] = useState<{ title?: string; jd?: string }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    const titleErr = validateJobTitle(title);
    const jdErr = validateJobDescription(jdText);
    setErrors({
      title: titleErr ?? undefined,
      jd: jdErr ?? undefined,
    });
    if (titleErr || jdErr) return;

    await onSubmit({ title, jd_text: jdText });
  }

  return (
    <form className="max-w-2xl space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Job title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          disabled={busy || readOnly}
          aria-invalid={Boolean(errors.title)}
          autoFocus={!readOnly}
        />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jd_text">Job description</Label>
        <Textarea
          id="jd_text"
          name="jd_text"
          rows={12}
          value={jdText}
          onChange={(ev) => setJdText(ev.target.value)}
          disabled={busy || readOnly}
          aria-invalid={Boolean(errors.jd)}
          className="min-h-48"
        />
        {errors.jd ? (
          <p className="text-sm text-destructive">{errors.jd}</p>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
