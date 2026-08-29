import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata; a
// route layout is the smallest way to give it a real title without splitting
// the component in two for the sake of one constant.
export const metadata: Metadata = {
  title: "Track Your Order — Valiant",
  description: "Look up any Valiant order with your order number and the email address it was placed with.",
  // A lookup form has nothing to index, and the results are personal.
  robots: { index: false, follow: true },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
