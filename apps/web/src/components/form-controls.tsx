import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children, ...props }: { label: string; children: React.ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" {...props}>
      {label}
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className ?? ''}`}
    />
  );
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed ${styles} ${className ?? ''}`}
    />
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className ?? ''}`}>{children}</div>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}
