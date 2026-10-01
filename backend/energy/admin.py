from django.contrib import admin
from .models import Facility, EnergySource, EnergyReading, UtilityBill


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility_type", "location", "floor_area_sqft", "is_active", "created_at")
    list_filter = ("facility_type", "is_active")
    search_fields = ("name", "code", "location")


@admin.register(EnergySource)
class EnergySourceAdmin(admin.ModelAdmin):
    list_display = ("name", "source_type", "is_renewable", "emission_factor", "created_at")
    list_filter = ("source_type", "is_renewable")
    search_fields = ("name",)


@admin.register(EnergyReading)
class EnergyReadingAdmin(admin.ModelAdmin):
    list_display = ("facility", "energy_source", "timestamp", "reading_value", "unit", "demand_kw", "is_demo")
    list_filter = ("energy_source__source_type", "energy_source__is_renewable", "is_demo", "facility")
    search_fields = ("facility__name", "energy_source__name")
    date_hierarchy = "timestamp"


@admin.register(UtilityBill)
class UtilityBillAdmin(admin.ModelAdmin):
    list_display = ("facility", "billing_period_start", "billing_period_end", "consumption_kwh", "total_amount", "payment_status", "is_demo")
    list_filter = ("payment_status", "is_demo")
    search_fields = ("facility__name",)
    date_hierarchy = "billing_period_end"
