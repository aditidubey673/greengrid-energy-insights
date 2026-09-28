# GreenGrid Energy Insights

Build a modern, professional, fully responsive Smart Energy Management System named "GreenGrid" using React.js.

### TECH STACK

* React.js
* Tailwind CSS
* Recharts for data visualization
* Lucide React icons
* React Router for navigation
* Use dummy data initially.

### DESIGN & THEME

* Complete dark theme UI.
* Dark charcoal and deep navy background.
* Neon green and emerald accents.
* Modern glassmorphism cards.
* Professional SaaS dashboard design.
* Smooth hover effects and transitions.
* Responsive design for desktop, tablet and mobile.
* Sidebar navigation with icons.
* Clean typography and modern charts.
* Avoid excessive brightness.

### 1. DASHBOARD

Display:

* Total Energy Consumption (kWh)
* Renewable Energy Generation (kWh)
* Carbon Emissions (kg CO2)
* Monthly Electricity Bill (₹)
* Energy consumption line chart.
* Renewable vs Non-renewable energy pie chart.
* Monthly energy usage comparison.
* Recent activities and alerts.

### 2. ENERGY MONITORING

* Real-time energy monitoring interface.
* Facility-wise electricity consumption.
* Daily, weekly and monthly filters.
* Energy usage trends.
* Power consumption statistics.
* High energy consumption alerts.

### 3. SMART GRID

* Solar energy generation.
* Wind energy generation.
* Renewable energy integration.
* Grid status indicators.
* Energy distribution visualization.
* Solar and grid energy comparison.

### 4. SOLAR PANEL PRICE CALCULATOR

Create a dedicated interactive Solar Panel Calculator page.

Users should be able to enter:

* Monthly electricity consumption (kWh).
* Average electricity bill (₹).
* Available rooftop area (sq. ft.).
* Solar panel type (Monocrystalline / Polycrystalline).
* System capacity (1kW, 2kW, 3kW, 5kW, 10kW or custom).
* Installation location.
* On-grid / Off-grid / Hybrid system.

CALCULATIONS:

1. Estimated required solar capacity.
2. Number of solar panels required.
3. Total panel cost.
4. Inverter cost.
5. Installation and wiring cost.
6. Total estimated installation cost.
7. Estimated monthly electricity savings.
8. Estimated annual savings.
9. Estimated payback period in years.
10. Estimated CO2 emissions reduction.

Display results using:

* Interactive cost breakdown cards.
* Monthly savings chart.
* Before vs After electricity bill comparison.
* Estimated ROI visualization.
* Download quotation button.

IMPORTANT:
Use configurable dummy pricing initially. Clearly mention that prices are approximate estimates and actual costs depend on location, equipment, installation and applicable subsidy policies.

### 5. UTILITY BILLING

* Monthly electricity bills.
* Cost breakdown.
* Electricity tariff information.
* Download invoice button.
* Monthly billing history.

### 6. SUSTAINABILITY

* CO2 reduction statistics.
* Renewable energy percentage.
* Trees equivalent to carbon savings.
* Sustainability performance charts.
* Environmental impact dashboard.

### 7. NAVIGATION

Create a sidebar containing:

* Dashboard
* Energy Monitoring
* Smart Grid
* Solar Calculator
* Utility Billing
* Sustainability
* Settings

### FUNCTIONALITY

* All navigation links should work.
* Calculator should perform actual calculations based on user inputs.
* Charts should update dynamically using selected filters.
* Use React useState for interactive components.
* Add realistic dummy data.
* Keep components reusable and modular.
* Separate each page into individual React components.
* Make the UI visually impressive and suitable for a college major project demonstration.

The application should look like a real-world enterprise-level Smart Energy Management SaaS platform.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/16ceb6c4-9bc6-4df0-9f0b-bb5a80c0309a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
