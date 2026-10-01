from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import Facility, EnergySource, EnergyReading, UtilityBill


class HealthCheckAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        url = reverse("energy:health-check")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "healthy")
        self.assertEqual(response.data["database"], "connected")
        self.assertIn("timestamp", response.data)


class FacilityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_and_list_facility(self):
        url = reverse("energy:facility-list-create")
        payload = {
            "name": "Innovation Hub",
            "code": "HUB-01",
            "facility_type": "Research Lab",
            "location": "South Campus",
            "floor_area_sqft": "15000.00",
        }
        create_resp = self.client.post(url, payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data["name"], "Innovation Hub")

        list_resp = self.client.get(url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(list_resp.data["count"], 1)
        self.assertEqual(len(list_resp.data["results"]), 1)

    def test_facility_name_validation(self):
        url = reverse("energy:facility-list-create")
        invalid_payload = {"name": "   "}
        response = self.client.post(url, invalid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EnergyReadingAndSummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.facility = Facility.objects.create(
            name="Block A", code="BLK-A", location="Main Campus"
        )
        self.grid_source = EnergySource.objects.create(
            name="Main Grid",
            source_type="grid",
            is_renewable=False,
            emission_factor=Decimal("0.8200"),
        )
        self.solar_source = EnergySource.objects.create(
            name="Solar PV",
            source_type="solar",
            is_renewable=True,
            emission_factor=Decimal("0.0000"),
        )

    def test_energy_summary_empty_state(self):
        url = reverse("energy:energy-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_empty"])
        self.assertEqual(response.data["total_consumption_kwh"], 0.0)
        self.assertEqual(response.data["renewable_percentage"], 0.0)

    def test_create_energy_reading_valid(self):
        url = reverse("energy:energy-reading-list-create")
        payload = {
            "facility": self.facility.id,
            "energy_source": self.solar_source.id,
            "reading_type": "generation",
            "reading_value": "125.500",
            "unit": "kWh",
            "demand_kw": "31.40",
            "is_demo": False,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["reading_value"])), Decimal("125.500"))
        self.assertEqual(response.data["facility_name"], "Block A")
        self.assertEqual(response.data["source_name"], "Solar PV")
        self.assertEqual(response.data["reading_type"], "generation")

    def test_create_energy_reading_negative_rejected(self):
        url = reverse("energy:energy-reading-list-create")
        payload = {
            "facility": self.facility.id,
            "energy_source": self.grid_source.id,
            "reading_value": "-10.000",
            "unit": "kWh",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_update_delete_energy_reading(self):
        reading = EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.solar_source,
            reading_type="generation",
            reading_value=Decimal("75.000"),
            unit="kWh",
            is_demo=False,
        )
        detail_url = reverse("energy:energy-reading-detail", kwargs={"pk": reading.pk})

        # Retrieve (View)
        get_resp = self.client.get(detail_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["id"], reading.pk)
        self.assertEqual(Decimal(str(get_resp.data["reading_value"])), Decimal("75.000"))

        # Update (Edit)
        patch_payload = {"reading_value": "90.500"}
        patch_resp = self.client.patch(detail_url, patch_payload, format="json")
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(patch_resp.data["reading_value"])), Decimal("90.500"))

        # Delete
        del_resp = self.client.delete(detail_url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EnergyReading.objects.filter(pk=reading.pk).exists())

    def test_demo_energy_reading_cannot_be_deleted_or_edited(self):
        demo_reading = EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.grid_source,
            reading_type="consumption",
            reading_value=Decimal("150.000"),
            unit="kWh",
            is_demo=True,
        )
        detail_url = reverse("energy:energy-reading-detail", kwargs={"pk": demo_reading.pk})

        # Attempt to edit demo reading -> 400 Bad Request
        patch_resp = self.client.patch(detail_url, {"reading_value": "200.000"}, format="json")
        self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to delete demo reading -> 400 Bad Request
        del_resp = self.client.delete(detail_url)
        self.assertEqual(del_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(EnergyReading.objects.filter(pk=demo_reading.pk).exists())

    def test_energy_reading_search_and_filters(self):
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.solar_source,
            reading_type="generation",
            reading_value=Decimal("100.000"),
            unit="kWh",
            is_demo=False,
        )
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.grid_source,
            reading_type="consumption",
            reading_value=Decimal("200.000"),
            unit="kWh",
            is_demo=False,
        )

        list_url = reverse("energy:energy-reading-list-create")

        # Filter by reading_type=generation
        gen_resp = self.client.get(list_url, {"reading_type": "generation"})
        self.assertEqual(gen_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(gen_resp.data["count"], 1)
        self.assertEqual(gen_resp.data["results"][0]["reading_type"], "generation")

        # Search by source name
        search_resp = self.client.get(list_url, {"search": "Solar"})
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(search_resp.data["count"], 1)

        # Filter by facility
        fac_resp = self.client.get(list_url, {"facility": self.facility.id})
        self.assertEqual(fac_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(fac_resp.data["count"], 2)

    def test_energy_summary_calculation(self):
        # Create 300 kWh grid + 200 kWh solar => 500 kWh total, 40% renewable
        now = timezone.now()
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.grid_source,
            timestamp=now,
            reading_value=Decimal("300.000"),
            unit="kWh",
        )
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.solar_source,
            timestamp=now,
            reading_value=Decimal("200.000"),
            unit="kWh",
        )

        url = reverse("energy:energy-summary")
        response = self.client.get(url, {"tariff": "8.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_empty"])
        self.assertEqual(response.data["total_consumption_kwh"], 500.0)
        self.assertEqual(response.data["renewable_generation_kwh"], 200.0)
        self.assertEqual(response.data["grid_consumption_kwh"], 300.0)
        self.assertEqual(response.data["renewable_percentage"], 40.0)
        self.assertEqual(response.data["grid_percentage"], 60.0)
        self.assertEqual(response.data["estimated_cost"], 4000.0)  # 500 * 8.00
        # Emissions: 300 * 0.82 + 200 * 0.0 = 246.0 kg
        self.assertEqual(response.data["estimated_emissions_kg"], 246.0)


class UtilityBillAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.facility = Facility.objects.create(name="Plant 01", location="Industrial Zone")

    def test_create_and_list_utility_bill(self):
        url = reverse("energy:utility-bill-list-create")
        payload = {
            "facility": self.facility.id,
            "billing_period_start": "2026-08-01",
            "billing_period_end": "2026-08-31",
            "consumption_kwh": "5000.00",
            "total_amount": "40000.00",
            "energy_charge": "35000.00",
            "demand_charge": "3000.00",
            "taxes_and_duties": "2000.00",
            "tariff_rate": "8.00",
            "payment_status": "paid",
            "due_date": "2026-09-10",
        }
        create_resp = self.client.post(url, payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data["facility_name"], "Plant 01")

        list_resp = self.client.get(url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(list_resp.data["count"], 1)

    def test_invalid_billing_period_rejected(self):
        url = reverse("energy:utility-bill-list-create")
        invalid_payload = {
            "facility": self.facility.id,
            "billing_period_start": "2026-08-31",
            "billing_period_end": "2026-08-01",  # End before start
            "consumption_kwh": "5000.00",
            "total_amount": "40000.00",
        }
        response = self.client.post(url, invalid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class KaggleIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.facility = Facility.objects.create(name="Lab Block", code="LAB-01")
        self.solar_source = EnergySource.objects.create(
            name="Solar Array",
            source_type="solar",
            is_renewable=True,
            emission_factor=Decimal("0.0000"),
        )
        self.grid_source = EnergySource.objects.create(
            name="Main Grid",
            source_type="grid",
            is_renewable=False,
            emission_factor=Decimal("0.8200"),
        )

    def test_reading_with_data_source(self):
        reading = EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.solar_source,
            reading_type="generation",
            reading_value=Decimal("45.500"),
            unit="kWh",
            demand_kw=Decimal("15.20"),
            is_demo=False,
            data_source="kaggle:solar-generation",
        )
        self.assertEqual(reading.data_source, "kaggle:solar-generation")
        self.assertFalse(reading.is_demo)

        # List filter by data_source
        url = reverse("energy:energy-reading-list-create")
        resp = self.client.get(url, {"data_source": "kaggle:solar-generation"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["data_source"], "kaggle:solar-generation")

        # Generic kaggle filter
        resp_kaggle = self.client.get(url, {"data_source": "kaggle"})
        self.assertEqual(resp_kaggle.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_kaggle.data["count"], 1)

    def test_summary_filter_by_data_source(self):
        now = timezone.now()
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.solar_source,
            reading_type="generation",
            timestamp=now,
            reading_value=Decimal("100.000"),
            unit="kWh",
            is_demo=False,
            data_source="kaggle:solar-generation",
        )
        EnergyReading.objects.create(
            facility=self.facility,
            energy_source=self.grid_source,
            reading_type="consumption",
            timestamp=now,
            reading_value=Decimal("50.000"),
            unit="kWh",
            is_demo=True,
            data_source="synthetic",
        )

        url = reverse("energy:energy-summary")
        resp_kaggle = self.client.get(url, {"data_source": "kaggle"})
        self.assertEqual(resp_kaggle.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_kaggle.data["readings_count"], 1)
        self.assertEqual(resp_kaggle.data["renewable_generation_kwh"], 100.0)

    def test_management_command_dry_run(self):
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command("import_kaggle_energy_data", "--dry-run", stdout=out)
        output = out.getvalue()
        self.assertIn("Dry run completed", output)
        self.assertIn("Conventional Electricity", output)

