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

---

## Backend Architecture (Django REST Framework + MySQL)

GreenGrid includes a modular Django REST Framework backend connected to a MySQL database, providing real-time data persistence, facility tracking, energy readings aggregation, and utility billing.

### 1. Directory Structure

```text
greengrid-energy-insights/
├── backend/
│   ├── .env.example              # Template for database & Django credentials
│   ├── .gitignore                # Ignores venvs, .env, and SQLite files
│   ├── requirements.txt          # Python dependencies (Django, DRF, PyMySQL, etc.)
│   ├── manage.py                 # Django command-line runner
│   ├── config/                   # Django core settings & routing
│   │   ├── __init__.py           # Configures PyMySQL as MySQLdb driver
│   │   ├── settings.py           # Database, CORS, and REST framework settings
│   │   ├── urls.py               # Main URL routing (/api/ and /admin/)
│   │   ├── wsgi.py               # WSGI application entrypoint
│   │   └── asgi.py               # ASGI application entrypoint
│   └── energy/                   # Energy management application
│       ├── models.py             # Facility, EnergySource, EnergyReading, UtilityBill
│       ├── serializers.py        # Model serializers and input validation
│       ├── views.py              # REST API endpoints (Health, Readings, Summary)
│       ├── urls.py               # API route definitions
│       ├── pagination.py         # Standard pagination configuration
│       ├── tests.py              # Unit test suite for API endpoints
│       └── management/commands/  # load_demo_energy_data command
├── src/                          # Existing React + TypeScript frontend
│   ├── lib/
│   │   ├── api.ts                # Central Axios client (reads VITE_API_BASE_URL)
│   │   └── energy-api.ts         # TypeScript API interfaces & query functions
│   └── routes/
│       └── index.tsx             # Dashboard connected to /api/energy-summary/
└── .env.example                  # Frontend environment template
```

---

### 2. MySQL Database Setup

1. Open your MySQL client (MySQL Command Line Client, MySQL Workbench, or phpMyAdmin) and run:

```sql
CREATE DATABASE IF NOT EXISTS greengrid_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'greengrid_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON greengrid_db.* TO 'greengrid_user'@'localhost';
FLUSH PRIVILEGES;
```

2. Copy `backend/.env.example` to `backend/.env` and update credentials:

```ini
DEBUG=True
SECRET_KEY=your_generated_secret_key
DB_ENGINE=mysql
DB_NAME=greengrid_db
DB_USER=greengrid_user
DB_PASSWORD=your_secure_password
DB_HOST=127.0.0.1
DB_PORT=3306
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
```

*(Note: For environments without MySQL running, set `DB_ENGINE=sqlite` to test with SQLite).*

---

### 3. REST API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health/` | Checks Django and MySQL connection health status |
| `GET` | `/api/facilities/` | List all monitored campus facilities |
| `POST` | `/api/facilities/` | Register a new facility (`name`, `code`, `location`, `floor_area_sqft`) |
| `GET` | `/api/energy-sources/` | List energy sources (`grid`, `solar`, `hydro`, `wind`) |
| `POST` | `/api/energy-sources/` | Register a new energy source with its carbon emission factor |
| `GET` | `/api/energy-readings/` | Paginated readings with `facility`, `source_type`, `start_date`, `end_date` filters |
| `POST` | `/api/energy-readings/` | Record an energy reading (`facility`, `energy_source`, `reading_value`, `unit`) |
| `GET` | `/api/energy-summary/` | Aggregate metrics (`total_consumption_kwh`, `renewable_percentage`, `estimated_cost`, `estimated_emissions_kg`) |
| `GET` | `/api/utility-bills/` | List utility billing records with `status` and `facility` filters |
| `POST` | `/api/utility-bills/` | Add a utility bill invoice record |

---

### 4. Running the Project

#### Step A: Windows PowerShell

```powershell
# 1. Navigate to backend and create virtual environment
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Create .env from template and configure MySQL credentials
Copy-Item .env.example .env

# 4. Apply database migrations
python manage.py migrate

# 5. (Optional) Load sample demonstration data
python manage.py load_demo_energy_data

# 6. Run automated test suite
python manage.py test energy

# 7. Start Django development server (http://127.0.0.1:8000)
python manage.py runserver

# -------------------------------------------------------------
# In a NEW PowerShell terminal (from repository root):
# 8. Start the React frontend (http://localhost:3000 or :5173)
npm run dev
```

#### Step B: Git Bash / Linux / macOS

```bash
# 1. Navigate to backend and create virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env

# 4. Apply database migrations
python manage.py migrate

# 5. (Optional) Load sample demonstration data
python manage.py load_demo_energy_data

# 6. Run automated test suite
python manage.py test energy

# 7. Start Django server
python manage.py runserver

# In a separate terminal:
npm run dev
```

