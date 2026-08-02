import { useEffect, useId, useRef, useState } from 'react';
import { Button, type ButtonVariant } from './Button';

interface Field {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  fields: Field[];
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onCancel: () => void;
  onConfirm: (values: Record<string, string>) => Promise<void>;
}

/**
 * 사유 입력 모달. 반려·편차 등록·편차 조치가 모두 같은 형태다 —
 * "왜"를 남기지 않고 넘어갈 수 있는 경로를 만들지 않는다(CLAUDE.md).
 */
export function PromptDialog({
  open,
  title,
  description,
  fields,
  confirmLabel,
  confirmVariant = 'primary',
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const id = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValues({});
      setError(null);
      setBusy(false);
      firstRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const missing = fields.some((f) => f.required !== false && !values[f.name]?.trim());

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full max-w-lg rounded-card border border-line bg-surface p-6"
      >
        <h2 id={`${id}-title`} className="text-title">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-caption text-ink-soft">{description}</p>}

        <div className="mt-4 flex flex-col gap-3">
          {fields.map((f, i) => (
            <div key={f.name}>
              <label htmlFor={`${id}-${f.name}`} className="mb-1 block text-caption font-semibold">
                {f.label}
                {f.required !== false && <span className="ml-1 text-phenol-pink">*</span>}
              </label>
              <textarea
                id={`${id}-${f.name}`}
                ref={i === 0 ? firstRef : undefined}
                rows={3}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                className="w-full resize-none rounded-control border border-line bg-paper px-3 py-2 text-body placeholder:text-ink-dim focus-visible:border-indicator-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indicator-teal/40"
              />
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-caption text-phenol-pink">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button variant={confirmVariant} onClick={() => void submit()} disabled={missing || busy}>
            {busy ? '처리 중…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
