from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from energy.models import Facility, EnergySource, EnergyReading, UtilityBill


class Command(BaseCommand):
    help = "Loads a small, clearly labelled demonstration dataset for testing GreenGrid connection."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Purge previously loaded demonstration records (leaves real data intact).",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            demo_readings = EnergyReading.objects.filter(is_demo=True).count()
            demo_bills = UtilityBill.objects.filter(is_demo=True).count()
            EnergyReading.objects.filter(is_demo=True).delete()
            UtilityBill.objects.filter(is_demo=True).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Cleared {demo_readings} demo energy readings and {demo_bills} demo utility bills."
                )
            )
            return

        self.stdout.write(self.style.NOTICE("Creating default energy sources and facilities..."))

        # 1. Energy Sources
        grid_source, _ = EnergySource.objects.get_or_create(
            name="Main Utility Grid",
            defaults={
                "source_type": "grid",
                "is_renewable": False,
                "emission_factor": Decimal("0.8200"),
                "description": "High-tension commercial grid supply (blended state utility).",
            },
        )
        solar_source, _ = EnergySource.objects.get_or_create(
            name="Rooftop Solar PV Array",
            defaults={
                "source_type": "solar",
                "is_renewable": True,
                "emission_factor": Decimal("0.0000"),
                "description": "Monocrystalline rooftop solar installation across campus blocks.",
            },
        )
        hydro_source, _ = EnergySource.objects.get_or_create(
            name="Micro-Hydropower Plant",
            defaults={
                "source_type": "hydro",
                "is_renewable": True,
                "emission_factor": Decimal("0.0000"),
                "description": "Run-of-river micro-hydro turbine installation.",
            },
        )
        wind_source, _ = EnergySource.objects.get_or_create(
            name="Campus Wind Generator",
            defaults={
                "source_type": "wind",
                "is_renewable": True,
                "emission_factor": Decimal("0.0000"),
                "description": "Demonstration small-scale wind generator.",
            },
        )

        # 2. Facilities
        fac_main, _ = Facility.objects.get_or_create(
            name="Main Office",
            defaults={
                "code": "BLK-A",
                "facility_type": "Commercial Office",
                "location": "Block A",
                "floor_area_sqft": Decimal("35000.00"),
            },
        )
        fac_mfg, _ = Facility.objects.get_or_create(
            name="Manufacturing",
            defaults={
                "code": "PLANT-01",
                "facility_type": "Manufacturing Plant",
                "location": "Plant 01",
                "floor_area_sqft": Decimal("50000.00"),
            },
        )
        fac_dc, _ = Facility.objects.get_or_create(
            name="Data Centre",
            defaults={
                "code": "BLK-C",
                "facility_type": "Data Centre / Server Room",
                "location": "Block C",
                "floor_area_sqft": Decimal("12000.00"),
            },
        )
        fac_wh, _ = Facility.objects.get_or_create(
            name="Warehouse",
            defaults={
                "code": "WH-NORTH",
                "facility_type": "Logistics & Storage",
                "location": "North Wing",
                "floor_area_sqft": Decimal("28000.00"),
            },
        )

        # 3. Create Sample Readings (last 7 days, every 4 hours)
        now = timezone.now()
        readings_to_create = []

        # Clear existing demo data before reloading
        EnergyReading.objects.filter(is_demo=True).delete()

        facilities = [
            (fac_main, Decimal("280.0"), Decimal("110.0")),
            (fac_mfg, Decimal("250.0"), Decimal("90.0")),
            (fac_dc, Decimal("180.0"), Decimal("45.0")),
            (fac_wh, Decimal("90.0"), Decimal("35.0")),
        ]

        for day_offset in range(7, -1, -1):
            day_time = now - timedelta(days=day_offset)
            for hour in [0, 4, 8, 12, 16, 20]:
                reading_ts = day_time.replace(hour=hour, minute=0, second=0, microsecond=0)
                
                # Diurnal solar multiplier: peaks at 12:00, 0 at night
                solar_factor = Decimal("1.2") if hour == 12 else (Decimal("0.8") if hour in (8, 16) else Decimal("0.0"))
                # Steady hydro multiplier
                hydro_factor = Decimal("0.5")

                for fac, base_grid, base_renew in facilities:
                    # Grid reading
                    grid_val = round(base_grid * (Decimal("0.9") + Decimal(hour % 5) * Decimal("0.05")), 2)
                    readings_to_create.append(
                        EnergyReading(
                            facility=fac,
                            energy_source=grid_source,
                            timestamp=reading_ts,
                            reading_value=grid_val,
                            unit="kWh",
                            demand_kw=round(grid_val / Decimal("4.0"), 2),
                            is_demo=True,
                        )
                    )

                    # Solar reading (daytime only)
                    if solar_factor > Decimal("0.0"):
                        solar_val = round(base_renew * solar_factor, 2)
                        readings_to_create.append(
                            EnergyReading(
                                facility=fac,
                                energy_source=solar_source,
                                timestamp=reading_ts,
                                reading_value=solar_val,
                                unit="kWh",
                                demand_kw=round(solar_val / Decimal("4.0"), 2),
                                is_demo=True,
                            )
                        )

                    # Hydro reading (baseload)
                    hydro_val = round(base_renew * hydro_factor, 2)
                    readings_to_create.append(
                        EnergyReading(
                            facility=fac,
                            energy_source=hydro_source,
                            timestamp=reading_ts,
                            reading_value=hydro_val,
                            unit="kWh",
                            demand_kw=round(hydro_val / Decimal("4.0"), 2),
                            is_demo=True,
                        )
                    )

        EnergyReading.objects.bulk_create(readings_to_create)

        # 4. Utility Bills
        UtilityBill.objects.filter(is_demo=True).delete()
        today = date.today()
        bills = [
            UtilityBill(
                facility=fac_main,
                billing_period_start=date(today.year, 8, 1),
                billing_period_end=date(today.year, 8, 31),
                consumption_kwh=Decimal("7014.00"),
                total_amount=Decimal("56805.00"),
                energy_charge=Decimal("47890.00"),
                demand_charge=Decimal("5120.00"),
                taxes_and_duties=Decimal("3795.00"),
                tariff_rate=Decimal("8.06"),
                payment_status="paid",
                due_date=date(today.year, 9, 10),
                is_demo=True,
            ),
            UtilityBill(
                facility=fac_main,
                billing_period_start=date(today.year, 9, 1),
                billing_period_end=date(today.year, 9, 30),
                consumption_kwh=Decimal("7248.00"),
                total_amount=Decimal("58420.00"),
                energy_charge=Decimal("49236.00"),
                demand_charge=Decimal("5120.00"),
                taxes_and_duties=Decimal("4064.00"),
                tariff_rate=Decimal("8.06"),
                payment_status="pending",
                due_date=date(today.year, 10, 8),
                is_demo=True,
            ),
        ]
        UtilityBill.objects.bulk_create(bills)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully loaded {len(readings_to_create)} demonstration readings and 2 demo utility bills (labelled with is_demo=True)."
            )
        )
