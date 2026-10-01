from decimal import Decimal
from rest_framework import serializers
from .models import Facility, EnergySource, EnergyReading, UtilityBill


class FacilitySerializer(serializers.ModelSerializer):
    readings_count = serializers.IntegerField(source="readings.count", read_only=True)

    class Meta:
        model = Facility
        fields = [
            "id",
            "name",
            "code",
            "facility_type",
            "location",
            "floor_area_sqft",
            "is_active",
            "readings_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Facility name cannot be empty.")
        return value.strip()


class EnergySourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergySource
        fields = [
            "id",
            "name",
            "source_type",
            "is_renewable",
            "emission_factor",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EnergyReadingSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source="facility.name", read_only=True)
    source_name = serializers.CharField(source="energy_source.name", read_only=True)
    source_type = serializers.CharField(source="energy_source.source_type", read_only=True)
    is_renewable = serializers.BooleanField(source="energy_source.is_renewable", read_only=True)

    class Meta:
        model = EnergyReading
        fields = [
            "id",
            "facility",
            "facility_name",
            "energy_source",
            "source_name",
            "source_type",
            "is_renewable",
            "timestamp",
            "reading_value",
            "unit",
            "demand_kw",
            "is_demo",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_reading_value(self, value):
        if value < Decimal("0.000"):
            raise serializers.ValidationError("Energy reading value cannot be negative.")
        return value


class UtilityBillSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source="facility.name", read_only=True, default="Campus-wide")

    class Meta:
        model = UtilityBill
        fields = [
            "id",
            "facility",
            "facility_name",
            "billing_period_start",
            "billing_period_end",
            "consumption_kwh",
            "total_amount",
            "energy_charge",
            "demand_charge",
            "taxes_and_duties",
            "tariff_rate",
            "payment_status",
            "due_date",
            "is_demo",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        start = attrs.get("billing_period_start")
        end = attrs.get("billing_period_end")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"billing_period_end": "Billing period end date cannot be earlier than start date."}
            )
        return attrs
