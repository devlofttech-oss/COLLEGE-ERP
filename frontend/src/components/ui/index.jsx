// Teal Tiles — shared UI primitives. Every module composes these so the app feels
// like one clean product (solid rounded tiles, soft shadows, generous spacing).
// Styling lives in index.css (.tt-*).

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Password input with show/hide toggle.
export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-2 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}


// A soft white card with an optional header (title + action link/button).
export function Card({ title, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`tt-card ${className}`}>
      {(title || action) && (
        <div className="tt-card-head">
          {title ? <span className="tt-card-title">{title}</span> : <span />}
          {action || null}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// A small stat tile: colored round icon + uppercase micro-label + big value.
export function StatTile({ icon: Icon, label, value, color = 'var(--color-brand-500)' }) {
  return (
    <div className="tt-tile">
      <div className="tt-stat-icon mb-4" style={{ background: color }}>{Icon ? <Icon size={20} /> : null}</div>
      <div className="tt-micro mb-2">{label}</div>
      <div className="tt-stat-value">{value}</div>
    </div>
  );
}

// A subtle text link/button used for card actions ("View all").
export function LinkAction({ children, onClick, href }) {
  if (href) return <a className="tt-link" href={href}>{children}</a>;
  return <button type="button" className="tt-link" onClick={onClick}>{children}</button>;
}

// A pill primary button.
export function Button({ children, onClick, type = 'button', variant = 'primary', className = '', ...rest }) {
  return (
    <button type={type} onClick={onClick} className={`tt-pill-btn ${variant === 'light' ? 'is-light' : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

// A round icon button (search/bell/etc.).
export function IconButton({ icon: Icon, label, dot = false, onClick, className = '' }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`tt-icon-btn ${className}`}>
      {Icon ? <Icon size={19} /> : null}
      {dot ? <span className="tt-dot" /> : null}
    </button>
  );
}

// A labeled progress row (used in fee/admission breakdowns).
export function ProgressRow({ label, value, max = 100, color = 'var(--color-brand-500)', formatter = (v) => v }) {
  const pct = Math.max(6, Math.round((Number(value || 0) / (max || 1)) * 100));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between gap-3 text-[13px] mb-2">
        <span className="min-w-0 truncate font-medium text-ink">{label}</span>
        <b className="shrink-0 text-ink">{formatter(value)}</b>
      </div>
      <div className="h-2 rounded-full bg-[#eef3f3] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// A simple two-line list row (notices, exams, activities).
export function ListRow({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-t border-[#eef3f3] first:border-t-0">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-ink truncate">{title}</div>
        {subtitle ? <div className="text-[12px] text-muted mt-0.5">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0 text-[12px] text-muted">{right}</div> : null}
    </div>
  );
}

// Empty state.
export function EmptyState({ message }) {
  return <div className="text-center text-[13px] text-muted py-8">{message}</div>;
}
