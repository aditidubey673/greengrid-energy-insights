from django.urls import path
from . import views

app_name = "energy"

urlpatterns = [
    # Health check
    path("health/", views.health_check, name="health-check"),
    # Facilities
    path("facilities/", views.FacilityListCreateView.as_view(), name="facility-list-create"),
    # Energy Sources
    path("energy-sources/", views.EnergySourceListView.as_view(), name="energy-source-list-create"),
    # Energy Readings
    path("energy-readings/", views.EnergyReadingListCreateView.as_view(), name="energy-reading-list-create"),
    # Energy Aggregation Summary
    path("energy-summary/", views.EnergySummaryView.as_view(), name="energy-summary"),
    # Utility Bills
    path("utility-bills/", views.UtilityBillListCreateView.as_view(), name="utility-bill-list-create"),
]
