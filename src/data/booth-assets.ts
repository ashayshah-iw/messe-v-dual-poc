import type { BoothHotspot } from "@/types/expo";
import type { Stall } from "@/types/expo";

export function getBoothHotspots(stall: Stall): BoothHotspot[] {
  return [
    { id: "video", label: "Factory walkthrough", desc: "Play wall display", color: stall.color },
    { id: "products", label: "Product wall", desc: "Open catalogue", color: "#3A3B9C" },
    { id: "brochures", label: "Brochure desk", desc: "Download PDF pack", color: "#25C08B" },
    { id: "reception", label: "Reception", desc: "Start video call", color: "#FFB020" },
  ];
}

export const PRODUCT_ASSETS = [
  { name: "ERW Tube Ø50", file: "ERW-Tube-50-specsheet.pdf", kind: "Spec PDF" },
  { name: "Seamless Coil", file: "Seamless-Coil-catalogue.pdf", kind: "Catalogue" },
  { name: "Flange Kit A3", file: "Flange-Kit-A3.pdf", kind: "Datasheet" },
  { name: "Pipe Fitting Set", file: "Pipe-Fitting-Set.pdf", kind: "Brochure" },
];

export const BROCHURE_ASSETS = [
  { name: "Company Profile 2026", file: "Company-Profile-2026.pdf", kind: "PDF · 2.4 MB" },
  { name: "Product Range Guide", file: "Product-Range-Guide.pdf", kind: "PDF · 5.1 MB" },
  { name: "Mill Certificates pack", file: "Mill-Certificates.zip", kind: "ZIP · 8 MB" },
];
