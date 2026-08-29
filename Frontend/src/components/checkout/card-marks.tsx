// Minimal, neutral card-scheme marks. Drawn as flat shapes rather than
// reproducing each brand's full logo artwork — enough for a customer to
// recognise which cards are accepted without shipping trademarked assets.

export function VisaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} role="img" aria-label="Visa">
      <rect width="40" height="24" rx="2" className="fill-[#1A1F71]" />
      <path
        d="M16.2 16.4h-2.1l1.3-8h2.1l-1.3 8Zm7.6-7.8a5.2 5.2 0 0 0-1.9-.34c-2.1 0-3.5 1.1-3.6 2.66 0 1.16 1.05 1.8 1.85 2.19.82.4 1.1.65 1.09.99 0 .53-.65.77-1.25.77-.83 0-1.28-.12-1.97-.42l-.27-.13-.29 1.79c.49.22 1.4.41 2.34.42 2.22 0 3.66-1.08 3.68-2.75 0-.92-.56-1.62-1.79-2.19-.74-.37-1.2-.62-1.19-.99 0-.33.38-.68 1.21-.68a3.8 3.8 0 0 1 1.58.31l.19.09.28-1.72Zm5.44-.2h-1.63c-.5 0-.88.14-1.1.66l-3.13 7.34h2.21l.44-1.2h2.7l.26 1.2h1.95l-1.7-8Zm-2.6 5.16.84-2.24.28-.75.14.68.49 2.31h-1.75ZM12.6 8.4l-2.06 5.46-.22-1.11c-.38-1.28-1.58-2.67-2.92-3.36l1.89 7.01h2.23l3.32-8h-2.24Z"
        fill="#fff"
      />
      <path
        d="M8.62 8.4H5.23l-.03.17c2.64.66 4.39 2.26 5.11 4.18l-.74-3.67c-.13-.5-.5-.66-.95-.68Z"
        fill="#F7B600"
      />
    </svg>
  );
}

export function MastercardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} role="img" aria-label="Mastercard">
      <rect width="40" height="24" rx="2" className="fill-[#16181d]" />
      <circle cx="16" cy="12" r="6" fill="#EB001B" />
      <circle cx="24" cy="12" r="6" fill="#F79E1B" />
      <path
        d="M20 7.4a6 6 0 0 0 0 9.2 6 6 0 0 0 0-9.2Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function MeezaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} role="img" aria-label="Meeza">
      <rect width="40" height="24" rx="2" className="fill-[#0d7d6e]" />
      <path d="M8 15.5V8.5h2l2 3.4 2-3.4h2v7h-1.9v-4l-2.1 3.5-2.1-3.5v4H8Z" fill="#fff" />
      <path d="M19.5 15.5v-7h5.2v1.7h-3.3v.9h3v1.7h-3v1h3.4v1.7h-5.3Z" fill="#fff" />
      <path d="M26.5 15.5v-1.4l3.2-3.9h-3.1V8.5h5.9v1.4l-3.2 3.9h3.3v1.7h-6.1Z" fill="#fff" />
    </svg>
  );
}
