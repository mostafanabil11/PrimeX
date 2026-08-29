import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Size Guide — Valiant",
  description: "Find your size with our body measurement guide.",
};

const SIZE_ROWS = [
  { size: "S", chest: "86–91", waist: "71–76", hips: "89–94" },
  { size: "M", chest: "94–99", waist: "79–84", hips: "97–102" },
  { size: "L", chest: "102–107", waist: "87–92", hips: "105–110" },
  { size: "XL", chest: "110–115", waist: "95–100", hips: "113–118" },
  { size: "2XL", chest: "118–124", waist: "103–109", hips: "121–127" },
];

export default function SizeGuidePage() {
  requireShop();

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
          Size Guide
        </h1>
        <p className="mb-12 text-[14px] text-muted-foreground">
          All measurements are body measurements in centimeters, not garment measurements — take your own
          measurements and compare them against the ranges below. Fit varies slightly by style, so check the
          fit note on each product page for anything cut looser or slimmer than usual.
        </p>

        <div className="mb-12 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-foreground text-left">
                <th className="py-3 pr-4 font-semibold tracking-[0.05em] text-foreground uppercase">Size</th>
                <th className="py-3 pr-4 font-semibold tracking-[0.05em] text-foreground uppercase">Chest (cm)</th>
                <th className="py-3 pr-4 font-semibold tracking-[0.05em] text-foreground uppercase">Waist (cm)</th>
                <th className="py-3 font-semibold tracking-[0.05em] text-foreground uppercase">Hips (cm)</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map((row) => (
                <tr key={row.size} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">{row.size}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.chest}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.waist}</td>
                  <td className="py-3 text-muted-foreground">{row.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6 text-[14px] leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-2 font-heading text-headline-sm font-bold text-foreground">How to Measure</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-foreground">Chest</span> — wrap the tape around the fullest part of your
                chest, under your arms and across your shoulder blades.
              </li>
              <li>
                <span className="text-foreground">Waist</span> — measure around your natural waistline, at the
                narrowest point.
              </li>
              <li>
                <span className="text-foreground">Hips</span> — measure around the fullest part of your hips.
              </li>
            </ul>
          </div>
          <p>
            Between two sizes? For a relaxed fit, size up; for a slimmer fit, size down. If you&apos;re still
            unsure, our team is happy to help — see our{" "}
            <Link href="/contact" className="text-foreground underline">
              Contact
            </Link>{" "}
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
