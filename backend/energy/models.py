from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Facility(models.Model):
    """Represents an energy monitored facility, plant or building."""

    name = models.CharField(max_length=150, unique=True, db_index=True)
    code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional facility code, e.g., BLK-A, PLANT-01",
    )
    facility_type = models.CharField(
        max_length=100,
        blank=True,
        default="Commercial",
        help_text="e.g. Office, Manufacturing, Data Centre, Warehouse",
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Physical location or zone on campus",
    )
    floor_area_sqft = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Total covered rooftop or floor area in sq. ft.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this facility is actively monitored",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Facilities"

    def __str__(self):
        return f"{self.name} ({self.location})" if self.location else self.name


class EnergySource(models.Model):
    """Represents a generation or supply energy source (grid, solar, hydro, wind)."""

    SOURCE_TYPE_CHOICES = [
        ("grid", "Utility Grid"),
        ("solar", "Solar PV"),
        ("hydro", "Hydropower"),
        ("wind", "Wind Energy"),
        ("biomass", "Biomass / Other"),
    ]

    name = models.CharField(max_length=100, unique=True)
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        db_index=True,
    )
    is_renewable = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True for zero-direct-emission renewable sources",
    )
    emission_factor = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=Decimal("0.0000"),
        validators=[MinValueValidator(Decimal("0.0000"))],
        help_text="Grid or source emission factor in kg CO2 per kWh",
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} [{self.get_source_type_display()}]"


class EnergyReading(models.Model):
    """Time-series energy generation or consumption reading."""

    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="readings",
        db_index=True,
    )
    energy_source = models.ForeignKey(
        EnergySource,
        on_delete=models.CASCADE,
        related_name="readings",
        db_index=True,
    )
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    reading_value = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Energy quantity in the specified unit (typically kWh)",
    )
    unit = models.CharField(max_length=20, default="kWh")
    demand_kw = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Peak instantaneous electric demand in kW",
    )
    is_demo = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Flag explicitly distinguishing demonstrative sample data from live readings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["facility", "timestamp"]),
            models.Index(fields=["energy_source", "timestamp"]),
            models.Index(fields=["timestamp", "is_demo"]),
        ]

    def __str__(self):
        return f"{self.facility.name} - {self.energy_source.name}: {self.reading_value} {self.unit} @ {self.timestamp}"


class UtilityBill(models.Model):
    """Monthly utility bill and billing records for facilities or site."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]

    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="utility_bills",
        null=True,
        blank=True,
        help_text="Facility associated with this invoice (leave blank for campus-wide bill)",
    )
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    consumption_kwh = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Total billable consumption in kWh",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Total payable invoice amount in ₹",
    )
    energy_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Variable energy consumption charge in ₹",
    )
    demand_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Fixed sanctioned peak demand charge in ₹",
    )
    taxes_and_duties = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Electricity duty and municipal surcharges in ₹",
    )
    tariff_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Blended tariff rate (₹/kWh)",
    )
    payment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    due_date = models.DateField(null=True, blank=True)
    is_demo = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Identifies demonstration sample invoices",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-billing_period_end"]

    def __str__(self):
        period_str = f"{self.billing_period_start.strftime('%b %Y')}"
        fac_name = self.facility.name if self.facility else "Campus-wide"
        return f"{fac_name} - {period_str}: ₹{self.total_amount} ({self.get_payment_status_display()})"
