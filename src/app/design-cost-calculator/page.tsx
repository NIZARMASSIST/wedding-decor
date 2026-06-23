import type { Metadata } from "next";
import DesignCostCalculatorPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Design Cost Calculator - Technical File Cost Estimation",
  description:
    "Calculate the cost of any design product with materials, cutting, and pricing breakdown.",
  keywords: [
    "Design Cost",
    "Cost Calculator",
    "Technical File",
    "Material Cost",
    "Pricing",
  ],
  authors: [{ name: "Z.ai Team" }],
  openGraph: {
    title: "Design Cost Calculator - Technical File Cost Estimation",
    description:
      "Calculate the cost of any design product with materials, cutting, and pricing breakdown.",
    type: "website",
  },
};

export default function DesignCostCalculatorPage() {
  return <DesignCostCalculatorPageClient />;
}
