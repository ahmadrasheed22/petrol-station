# Task 3: Visual UI Implementation Guide

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKER DASHBOARD                           │
│                  Petrol Station Management                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Welcome back, [Worker Name]                          [WORKER]  │
│  Session managed via User Service & Profile Engine              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Dashboard Stats (Shift Data, Expenses, Sync Status)            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│                          │                                      │
│  Shift Duty Manager      │  Expense Form                        │
│  (Existing Component)    │  (Existing Component)                │
│                          │                                      │
│  - Start/End Duty        │  - Add Daily Expenses                │
│  - Product Selection     │  - Category & Amount                 │
│  - Meter Reading Input   │  - Quick Entry                       │
│  - Reconciliation        │                                      │
│                          │                                      │
└──────────────────────────┴──────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════╗
║          🎯 SHIFT DUTY METER READINGS [NEW]                    ║
║  Record opening & closing readings for each nozzle              ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ ⛽ PETROL                                               │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                 ║
║  ┌──────────────────────────┐  ┌──────────────────────────┐   ║
║  │ Nozzle A (Dispenser 01)  │  │ Nozzle B (Dispenser 01)  │   ║
║  ├──────────────────────────┤  ├──────────────────────────┤   ║
║  │ Opening Reading:     ____│  │ Opening Reading:     ____│   ║
║  │ Closing Reading:     ____│  │ Closing Reading:     ____│   ║
║  │                          │  │                          │   ║
║  │ Liters Dispensed:        │  │ Liters Dispensed:        │   ║
║  │ ► 45.30 L ◄              │  │ ► 67.85 L ◄              │   ║
║  └──────────────────────────┘  └──────────────────────────┘   ║
║                                                                 ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ ⛽ DIESEL                                               │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                 ║
║  ┌──────────────────────────┐                                 ║
║  │ Nozzle A (Dispenser 02)  │                                 ║
║  ├──────────────────────────┤                                 ║
║  │ Opening Reading:     ____│                                 ║
║  │ Closing Reading:     ____│                                 ║
║  │                          │                                 ║
║  │ Liters Dispensed:        │                                 ║
║  │ ► 0.00 L ◄               │                                 ║
║  └──────────────────────────┘                                 ║
║                                                                 ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │                   [Save All Readings]                   │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝

┌──────────────────────────┬──────────────────────────────────────┐
│                          │                                      │
│  📊 Meter Readings       │  📊 All Meter Readings               │
│     (My Readings)        │     (Station Overview)               │
│                          │                                      │
│  Recent 5 entries from   │  Recent 5 entries from all workers   │
│  current worker          │                                      │
│                          │                                      │
│  ┌────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ Nozzle A - Petrol  │  │  │ Nozzle B - Diesel (Ahmed)      │ │
│  │ Opening: 1234.50   │  │  │ Opening: 8900.75               │ │
│  │ Closing: 1279.80   │  │  │ Closing: 8967.30               │ │
│  │ Dispensed: 45.30L  │  │  │ Dispensed: 66.55L              │ │
│  │ Time: 10:30 AM     │  │  │ Time: 02:15 PM                 │ │
│  └────────────────────┘  │  └────────────────────────────────┘ │
│                          │                                      │
│  ┌────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ Nozzle B - Petrol  │  │  │ Nozzle A - Petrol (Fatima)     │ │
│  │ Opening: 8210.00   │  │  │ Opening: 10450.00              │ │
│  │ Closing: 8289.45   │  │  │ Closing: 10502.10              │ │
│  │ Dispensed: 79.45L  │  │  │ Dispensed: 52.10L              │ │
│  │ Time: 11:00 AM     │  │  │ Time: 01:45 PM                 │ │
│  └────────────────────┘  │  └────────────────────────────────┘ │
│                          │                                      │
└──────────────────────────┴──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Recent Entries: Today's Logged Expenses & Credit Sales         │
└─────────────────────────────────────────────────────────────────┘
```

## Meter Card Component Detail

```
┌──────────────────────────────────────────┐
│  Nozzle Label (Meter Name - Machine)     │
│  [Text: Nozzle A - Front Bay - Petrol]   │
├──────────────────────────────────────────┤
│                                          │
│  Opening Reading                         │
│  ┌────────────────────────────────────┐ │
│  │ e.g., 1234.50                   ▼ │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Closing Reading                         │
│  ┌────────────────────────────────────┐ │
│  │ e.g., 1450.75                   ▼ │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Liters Dispensed                   │ │
│  │ ► 216.25 L ◄                       │ │
│  │ [Auto-calculated, not editable]    │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

## User Interaction Flow

```
WORKER OPENS DASHBOARD
         ↓
┌─ Check: Is Worker?
│        No → Redirect to /admin
│        Yes → Continue
│
↓ Page renders with Worker Context
├─ ShiftDutyManager (Existing)
├─ ExpenseForm (Existing)
├─ ShiftDutyMeterReadings [NEW] ← Focus here
│  ├─ useEffect: loadPumpConfig()
│  │  └─ Fetch: getPumpConfig() → machines & meters
│  │  └─ Filter: Only active status
│  │  └─ Group: By fuel_type
│  │  └─ Initialize: readings object
│  │
│  ↓ Render: Fuel Type Sections
│  ├─ Group meters by Petrol/Diesel/Hi-Octane
│  ├─ For each meter, show card with inputs
│  │
│  ↓ Worker enters opening reading
│  ├─ onChange → handleOpeningChange()
│  ├─ setState: readings[meterId].openingReading
│  ├─ useMemo: recalculates dispensed
│  ├─ UI updates instantly
│  │
│  ↓ Worker enters closing reading  
│  ├─ onChange → handleClosingChange()
│  ├─ setState: readings[meterId].closingReading
│  ├─ useMemo: calculates (closing - opening)
│  ├─ Displays with 2 decimal places
│  ├─ Shows 0 if invalid
│  │
│  ↓ Worker clicks "Save All Readings"
│  ├─ Validate: At least 1 meter has readings
│  ├─ Validate: All closing >= opening
│  ├─ If invalid → Show error, return
│  ├─ setIsSubmitting(true)
│  │
│  ↓ Server Action: Insert into shift_meter_readings
│  ├─ For each reading:
│  │  ├─ meter_id: readings[meterId].meterId
│  │  ├─ worker_id: userId
│  │  ├─ opening_reading: parseFloat(opening)
│  │  ├─ closing_reading: parseFloat(closing)
│  │  ├─ liters_dispensed: closing - opening
│  │  └─ recorded_at: NOW()
│  │
│  ↓ Response from Supabase
│  ├─ Success → Show success message
│  ├─ Reset form inputs (empty strings)
│  ├─ Re-initialize readings object
│  └─ Success notification shown to user
│
└─ MeterReadingsHistory [NEW]
   ├─ useEffect: loadReadings()
   │  └─ Fetch: getShiftMeterReadings(userId, limit)
   │  └─ Display: Recent readings
   │
   └─ Show: Last 5 records with details
      ├─ Meter label & fuel type
      ├─ Opening & closing values
      ├─ Calculated dispensed liters
      └─ Recorded timestamp
```

## Real-time Calculation Example

```
Input Sequence:
1. Opening Reading: "1234.50"
   → calculateDispensed("1234.50", "") = 0.00 L
   
2. Closing Reading: "1300.75"
   → calculateDispensed("1234.50", "1300.75") = 66.25 L
   → Display: "66.25 L"

3. User corrects Closing: "1301.25"
   → calculateDispensed("1234.50", "1301.25") = 66.75 L
   → Display: "66.75 L" (instant update)

4. User clears Opening Reading: ""
   → calculateDispensed("", "1301.25") = 0.00 L
   → Display: "0.00 L"

5. User re-enters Opening: "1234.50"
   → Closing still "1301.25"
   → Display: "66.75 L"
```

## Color Coding System

### Fuel Types:
```
PETROL    → Amber/Orange theme (🟠)
           Border: border-amber-500/30
           Background: bg-amber-500/5
           Text: text-amber-400

DIESEL    → Red/Dark Red theme (🔴)
           Border: border-red-500/30
           Background: bg-red-500/5
           Text: text-red-400

HI-OCTANE → Cyan/Light Blue theme (🔵)
           Border: border-cyan-500/30
           Background: bg-cyan-500/5
           Text: text-cyan-400
```

### Status Badges:
```
Success   → Emerald green (✓)
           bg-emerald-500/10, text-emerald-400

Error     → Rose red (✗)
           bg-rose-500/10, text-rose-400

Active    → Blue (●)
           bg-blue-500/10, text-blue-400
```

## Responsive Behavior

### Desktop (1024px+):
- Meter cards in 2-column grid
- Full-width fuel type headers
- Side-by-side history components

### Tablet (768px - 1023px):
- Meter cards in 2-column grid (responsive)
- Full-width on narrow tablets
- Stacked history components

### Mobile (< 768px):
- Single column meter cards
- Full-width layout
- Vertical stacking of all components
- Touch-friendly input fields
- Larger touch targets
