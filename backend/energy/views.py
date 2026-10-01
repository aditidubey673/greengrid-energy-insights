from decimal import Decimal
from django.db import connection
from django.db.models import Sum, Q, F
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView

from .models import Facility, EnergySource, EnergyReading, UtilityBill
from .serializers import (
    FacilitySerializer,
    EnergySourceSerializer,
    EnergyReadingSerializer,
    UtilityBillSerializer,
)
from .pagination import StandardResultsSetPagination


@api_view(["GET"])
def health_check(request):
    """
    GET /api/health/
    Verifies backend service and MySQL database connectivity.
    """
    db_connected = False
    db_error = None
    db_engine = "unknown"
    db_name = ""

    try:
        from django.conf import settings

        db_engine = settings.DATABASES["default"]["ENGINE"].split(".")[-1]
        db_name = str(settings.DATABASES["default"].get("NAME", ""))

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_connected = True
    except Exception as exc:
        db_connected = False
        db_error = str(exc)

    http_status = status.HTTP_200_OK if db_connected else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        {
            "status": "healthy" if db_connected else "degraded",
            "service": "GreenGrid Energy Management API",
            "version": "1.0.0",
            "database": "connected" if db_connected else "disconnected",
            "database_engine": db_engine,
            "database_name": db_name,
            "timestamp": timezone.now().isoformat(),
            **({"error": db_error} if db_error else {}),
        },
        status=http_status,
    )


class FacilityListCreateView(ListCreateAPIView):
    """
    GET  /api/facilities/ - list facilities
    POST /api/facilities/ - create a new facility
    """

    queryset = Facility.objects.all().order_by("name")
    serializer_class = FacilitySerializer


class EnergySourceListView(ListCreateAPIView):
    """
    GET  /api/energy-sources/ - list energy sources
    POST /api/energy-sources/ - create an energy source
    """

    queryset = EnergySource.objects.all().order_by("name")
    serializer_class = EnergySourceSerializer


class EnergyReadingListCreateView(ListCreateAPIView):
    """
    GET  /api/energy-readings/ - list readings with pagination and filters
    POST /api/energy-readings/ - add an energy reading

    Query parameters:
    - facility: Facility ID
    - source: Energy source ID
    - source_type: 'grid', 'solar', 'hydro', 'wind'
    - start_date: 'YYYY-MM-DD'
    - end_date: 'YYYY-MM-DD'
    - is_demo: 'true' or 'false'
    """

    serializer_class = EnergyReadingSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = EnergyReading.objects.select_related("facility", "energy_source").all()

        facility_param = self.request.query_params.get("facility")
        if facility_param:
            qs = qs.filter(facility_id=facility_param)

        source_param = self.request.query_params.get("source")
        if source_param:
            qs = qs.filter(energy_source_id=source_param)

        source_type_param = self.request.query_params.get("source_type")
        if source_type_param:
            qs = qs.filter(energy_source__source_type=source_type_param.lower())

        start_date_param = self.request.query_params.get("start_date")
        if start_date_param:
            parsed_start = parse_date(start_date_param)
            if parsed_start:
                qs = qs.filter(timestamp__date__gte=parsed_start)

        end_date_param = self.request.query_params.get("end_date")
        if end_date_param:
            parsed_end = parse_date(end_date_param)
            if parsed_end:
                qs = qs.filter(timestamp__date__lte=parsed_end)

        is_demo_param = self.request.query_params.get("is_demo")
        if is_demo_param is not None:
            if is_demo_param.lower() in ("true", "1"):
                qs = qs.filter(is_demo=True)
            elif is_demo_param.lower() in ("false", "0"):
                qs = qs.filter(is_demo=False)

        return qs.order_by("-timestamp")


class EnergySummaryView(APIView):
    """
    GET /api/energy-summary/
    Aggregates energy metrics across time horizons and sources.

    Returns:
    - total_consumption_kwh
    - renewable_generation_kwh
    - grid_consumption_kwh
    - renewable_percentage
    - grid_percentage
    - estimated_cost
    - estimated_emissions_kg
    - breakdown_by_source
    - breakdown_by_facility
    - count
    - is_empty
    """

    def get(self, request):
        qs = EnergyReading.objects.select_related("facility", "energy_source").all()

        # Optional filters
        facility_id = request.query_params.get("facility")
        if facility_id:
            qs = qs.filter(facility_id=facility_id)

        period = request.query_params.get("period", "all").lower()
        now = timezone.now()

        if period == "daily":
            qs = qs.filter(timestamp__date=now.date())
        elif period == "weekly":
            week_ago = now - timezone.timedelta(days=7)
            qs = qs.filter(timestamp__gte=week_ago)
        elif period == "monthly":
            month_ago = now - timezone.timedelta(days=30)
            qs = qs.filter(timestamp__gte=month_ago)

        is_demo_param = request.query_params.get("is_demo")
        if is_demo_param is not None:
            if is_demo_param.lower() in ("true", "1"):
                qs = qs.filter(is_demo=True)
            elif is_demo_param.lower() in ("false", "0"):
                qs = qs.filter(is_demo=False)

        total_readings_count = qs.count()

        if total_readings_count == 0:
            return Response(
                {
                    "is_empty": True,
                    "period": period,
                    "readings_count": 0,
                    "total_consumption_kwh": 0.0,
                    "renewable_generation_kwh": 0.0,
                    "grid_consumption_kwh": 0.0,
                    "renewable_percentage": 0.0,
                    "grid_percentage": 0.0,
                    "estimated_cost": 0.0,
                    "estimated_emissions_kg": 0.0,
                    "breakdown_by_source": [],
                    "breakdown_by_facility": [],
                    "message": "No energy readings found for the specified criteria.",
                },
                status=status.HTTP_200_OK,
            )

        # Aggregate total consumption and renewables
        total_kwh = qs.aggregate(val=Sum("reading_value"))["val"] or Decimal("0.0")
        renewable_kwh = (
            qs.filter(energy_source__is_renewable=True).aggregate(val=Sum("reading_value"))["val"]
            or Decimal("0.0")
        )
        grid_kwh = (
            qs.filter(energy_source__source_type="grid").aggregate(val=Sum("reading_value"))["val"]
            or Decimal("0.0")
        )

        total_float = float(total_kwh)
        renewable_float = float(renewable_kwh)
        grid_float = float(grid_kwh)

        renewable_pct = (
            round((renewable_float / total_float) * 100.0, 1) if total_float > 0 else 0.0
        )
        grid_pct = (
            round((grid_float / total_float) * 100.0, 1) if total_float > 0 else 0.0
        )

        # Tariff calculation (allow parameter or default 8.06 ₹/kWh)
        tariff_param = request.query_params.get("tariff")
        try:
            tariff = float(tariff_param) if tariff_param else 8.06
        except (ValueError, TypeError):
            tariff = 8.06

        estimated_cost = round(total_float * tariff, 2)

        # Emissions calculation using source-specific emission factors
        emissions_sum = (
            qs.annotate(
                reading_emission=F("reading_value") * F("energy_source__emission_factor")
            ).aggregate(total=Sum("reading_emission"))["total"]
            or Decimal("0.0")
        )
        estimated_emissions_kg = round(float(emissions_sum), 2)

        # Breakdown by energy source
        source_aggregates = (
            qs.values(
                "energy_source__id",
                "energy_source__name",
                "energy_source__source_type",
                "energy_source__is_renewable",
            )
            .annotate(kwh=Sum("reading_value"))
            .order_by("-kwh")
        )

        breakdown_by_source = [
            {
                "source_id": item["energy_source__id"],
                "source_name": item["energy_source__name"],
                "source_type": item["energy_source__source_type"],
                "is_renewable": item["energy_source__is_renewable"],
                "kwh": float(item["kwh"] or 0),
                "share": (
                    round((float(item["kwh"] or 0) / total_float) * 100.0, 1)
                    if total_float > 0
                    else 0.0
                ),
            }
            for item in source_aggregates
        ]

        # Breakdown by facility
        facility_aggregates = (
            qs.values("facility__id", "facility__name", "facility__location")
            .annotate(
                total=Sum("reading_value"),
                renewable=Sum(
                    "reading_value",
                    filter=Q(energy_source__is_renewable=True),
                ),
            )
            .order_by("-total")
        )

        breakdown_by_facility = [
            {
                "facility_id": item["facility__id"],
                "facility_name": item["facility__name"],
                "location": item["facility__location"] or "",
                "total_kwh": float(item["total"] or 0),
                "renewable_kwh": float(item["renewable"] or 0),
                "share": (
                    round((float(item["total"] or 0) / total_float) * 100.0, 1)
                    if total_float > 0
                    else 0.0
                ),
            }
            for item in facility_aggregates
        ]

        return Response(
            {
                "is_empty": False,
                "period": period,
                "readings_count": total_readings_count,
                "total_consumption_kwh": round(total_float, 2),
                "renewable_generation_kwh": round(renewable_float, 2),
                "grid_consumption_kwh": round(grid_float, 2),
                "renewable_percentage": renewable_pct,
                "grid_percentage": grid_pct,
                "estimated_cost": estimated_cost,
                "tariff_rate": tariff,
                "estimated_emissions_kg": estimated_emissions_kg,
                "breakdown_by_source": breakdown_by_source,
                "breakdown_by_facility": breakdown_by_facility,
            },
            status=status.HTTP_200_OK,
        )


class UtilityBillListCreateView(ListCreateAPIView):
    """
    GET  /api/utility-bills/ - list utility bills
    POST /api/utility-bills/ - create a utility bill
    """

    queryset = UtilityBill.objects.select_related("facility").all().order_by("-billing_period_end")
    serializer_class = UtilityBillSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(payment_status=status_param.lower())

        facility_param = self.request.query_params.get("facility")
        if facility_param:
            qs = qs.filter(facility_id=facility_param)

        return qs
