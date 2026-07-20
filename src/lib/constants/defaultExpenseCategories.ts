// Standard starting categories seeded for every store (see the "What counts
// as a real cost" spec) so Net Profit and expense breakdowns are comparable
// across stores and months instead of everything landing in "Other." Owners
// can still add their own categories on top of these.

export interface DefaultExpenseCategorySeed {
  name: string;
  description: string;
  icon: string; // lucide-react icon name, kebab-case
  color: string; // hex
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultExpenseCategorySeed[] = [
  {
    name: "Product Purchase",
    description:
      "What you paid to restock — the base cost of what's on the shelf.",
    icon: "package",
    color: "#1e6f57",
  },
  {
    name: "Delivery Shortfall",
    description:
      "The gap between what you charge for shipping and what the courier actually bills.",
    icon: "truck",
    color: "#b23b2e",
  },
  {
    name: "Marketing & Ads",
    description:
      "Facebook/Google ad spend, boosted posts, influencer payments.",
    icon: "megaphone",
    color: "#33566a",
  },
  {
    name: "Packaging",
    description:
      "Poly bags, boxes, tape, printed labels — the physical cost of sending an order out.",
    icon: "box",
    color: "#9a6b1e",
  },
  {
    name: "Staff & Salary",
    description:
      "Wages for anyone helping run the store — packing, support, delivery pickup.",
    icon: "users",
    color: "#6d28d9",
  },
  {
    name: "Platform & Software",
    description:
      "This subscription, payment gateway fees, domain, hosting — the tools that run the business.",
    icon: "monitor",
    color: "#0891b2",
  },
  {
    name: "Rent & Utilities",
    description:
      "Shop or warehouse space, electricity, internet — costs that exist whether or not you sell anything that day.",
    icon: "home",
    color: "#a16207",
  },
  {
    name: "Other",
    description:
      "Anything real that doesn't fit above — but titled specifically, not filed away as misc and forgotten.",
    icon: "folder",
    color: "#57685f",
  },
];
