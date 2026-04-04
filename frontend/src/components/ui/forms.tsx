import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-coral/40 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-tide text-white hover:bg-tide/90",
        variant === "secondary" && "bg-white text-ink shadow-soft hover:bg-sand",
        variant === "ghost" && "bg-transparent text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("field-input", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("field-input min-h-28 resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("field-input", props.className)} />;
}

export function Field({ label, hint, children }: PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

