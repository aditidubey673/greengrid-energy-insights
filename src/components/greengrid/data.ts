export const chartColors = { primary: "var(--primary)", info: "var(--info)", warning: "var(--warning)", danger: "var(--danger)", grid: "var(--chart-grid)", muted: "var(--muted-foreground)", surface: "var(--secondary)" };

export const energySeries = {
  daily: [{ name: "00:00", usage: 180, renewable: 48 }, { name: "04:00", usage: 150, renewable: 42 }, { name: "08:00", usage: 310, renewable: 116 }, { name: "12:00", usage: 425, renewable: 212 }, { name: "16:00", usage: 390, renewable: 180 }, { name: "20:00", usage: 330, renewable: 94 }, { name: "24:00", usage: 215, renewable: 52 }],
  weekly: [{ name: "Mon", usage: 2210, renewable: 820 }, { name: "Tue", usage: 2390, renewable: 910 }, { name: "Wed", usage: 2180, renewable: 875 }, { name: "Thu", usage: 2520, renewable: 980 }, { name: "Fri", usage: 2360, renewable: 940 }, { name: "Sat", usage: 1880, renewable: 790 }, { name: "Sun", usage: 1650, renewable: 710 }],
  monthly: [{ name: "Jan", usage: 6840, renewable: 2440 }, { name: "Feb", usage: 6210, renewable: 2580 }, { name: "Mar", usage: 7180, renewable: 3120 }, { name: "Apr", usage: 6920, renewable: 3380 }, { name: "May", usage: 7520, renewable: 3690 }, { name: "Jun", usage: 7248, renewable: 3842 }],
};

export const facilities = [
  { name: "Main Office", location: "Block A", usage: 284.6, share: 36, status: "Normal" },
  { name: "Manufacturing", location: "Plant 01", usage: 248.2, share: 31, status: "High" },
  { name: "Data Centre", location: "Block C", usage: 176.4, share: 22, status: "Normal" },
  { name: "Warehouse", location: "North Wing", usage: 88.1, share: 11, status: "Efficient" },
];

export const billingHistory = [
  { month: "September 2026", units: "7,248 kWh", amount: "₹58,420", status: "Due Oct 08" },
  { month: "August 2026", units: "7,014 kWh", amount: "₹56,805", status: "Paid" },
  { month: "July 2026", units: "7,420 kWh", amount: "₹60,124", status: "Paid" },
  { month: "June 2026", units: "6,890 kWh", amount: "₹55,812", status: "Paid" },
  { month: "May 2026", units: "7,115 kWh", amount: "₹57,631", status: "Paid" },
];
