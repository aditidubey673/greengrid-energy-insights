# GreenGrid implementation plan

## Build
- Create a responsive dark SaaS shell with a collapsible desktop sidebar and mobile navigation.
- Add separate pages for Dashboard, Energy Monitoring, Smart Grid, Solar Calculator, Utility Billing, Sustainability, and Settings.
- Use shared metric, chart, status, table, alert, and form patterns for a consistent enterprise interface.

## Interactions
- Add daily, weekly, and monthly chart filters with dynamically changing sample data.
- Build a working solar estimate calculator covering capacity, panel count, cost breakdown, savings, payback, ROI, and CO₂ reduction.
- Generate downloadable quotation and invoice text files from the displayed sample data.
- Add practical settings controls with local interactive state.

## Visual direction
- Use charcoal/navy surfaces, restrained emerald highlights, subtle glass effects, and clean information-dense charts.
- Keep charts and controls readable across desktop, tablet, and mobile without excessive glow or brightness.

## Technical details
- Use TanStack Router, the project’s supported React router, with one route file per page.
- Use Recharts and Lucide React already included in the project.
- Define all visual colors through semantic Tailwind tokens and preserve the existing app runtime.
- Add unique metadata for every page and verify the central interactions in the live preview.
