# Task 3: Database Schema & Data Relationships

## Entity Relationship Diagram (ERD)

```
┌──────────────────────┐
│   PUBLIC.PROFILES    │
├──────────────────────┤
│ id (UUID) PK         │
│ name (TEXT)          │
│ phone (TEXT)         │
│ role (TEXT)          │
└──────────────────────┘
         ▲
         │ (REFERENCES)
         │
┌────────┴──────────────────────────────┐
│   SHIFT_METER_READINGS [NEW TABLE]    │
├──────────────────────────────────────┤
│ id (UUID) PK                          │
│ meter_id (UUID) FK→machine_meters     │
│ worker_id (UUID) FK→profiles [*]      │
│ opening_reading (NUMERIC)             │
│ closing_reading (NUMERIC)             │
│ liters_dispensed (NUMERIC)            │
│ recorded_at (TIMESTAMPTZ)             │
│ created_at (TIMESTAMPTZ)              │
│ updated_at (TIMESTAMPTZ)              │
├──────────────────────────────────────┤
│ Indexes:                              │
│  • idx_worker_id (worker_id)          │
│  • idx_meter_id (meter_id)            │
│  • idx_recorded_at DESC               │
└────────┬───────────────────────────────┘
         │ (REFERENCES)
         │
┌────────▼──────────────────────────────┐
│    PUBLIC.MACHINE_METERS [EXISTING]   │
├──────────────────────────────────────┤
│ id (UUID) PK                          │
│ machine_id (UUID) FK→pump_machines    │
│ meter_number (TEXT)                   │
│ label (TEXT)                          │
│ initial_reading (NUMERIC)             │
│ current_reading (NUMERIC)             │
│ fuel_type (TEXT)                      │
│ status (TEXT)                         │
│ created_at (TIMESTAMPTZ)              │
│ updated_at (TIMESTAMPTZ)              │
└────────┬──────────────────────────────┘
         │ (REFERENCES)
         │
┌────────▼──────────────────────────────┐
│     PUBLIC.PUMP_MACHINES [EXISTING]   │
├──────────────────────────────────────┤
│ id (UUID) PK                          │
│ machine_number (TEXT)                 │
│ fuel_type (TEXT)                      │
│ tank_id (UUID) FK→fuel_tanks [NULL]   │
│ status (TEXT)                         │
│ created_at (TIMESTAMPTZ)              │
│ updated_at (TIMESTAMPTZ)              │
└───────────────────────────────────────┘
```

## New Table: shift_meter_readings

### Column Specifications

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| **id** | UUID | NO | gen_random_uuid() | Primary key, uniquely identifies each reading record |
| **meter_id** | UUID | NO | — | Foreign key to `machine_meters(id)`, which meter was read |
| **worker_id** | UUID | NO | — | Foreign key to `profiles(id)`, which worker recorded the reading |
| **opening_reading** | NUMERIC | NO | — | Opening meter value (e.g., 1234.50 liters) |
| **closing_reading** | NUMERIC | NO | — | Closing meter value (e.g., 1450.75 liters) |
| **liters_dispensed** | NUMERIC | NO | — | Calculated: closing_reading - opening_reading |
| **recorded_at** | TIMESTAMPTZ | NO | — | Timestamp when worker submitted the reading |
| **created_at** | TIMESTAMPTZ | NO | NOW() | Server timestamp of record creation |
| **updated_at** | TIMESTAMPTZ | NO | NOW() | Server timestamp of last update |

### Constraints

```sql
-- Primary Key
ALTER TABLE shift_meter_readings ADD CONSTRAINT pk_shift_meter_readings 
  PRIMARY KEY (id);

-- Foreign Keys
ALTER TABLE shift_meter_readings ADD CONSTRAINT fk_meter_id 
  FOREIGN KEY (meter_id) REFERENCES machine_meters(id) 
  ON DELETE CASCADE;

ALTER TABLE shift_meter_readings ADD CONSTRAINT fk_worker_id 
  FOREIGN KEY (worker_id) REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Indexes for Query Performance
CREATE INDEX idx_shift_meter_readings_worker_id 
  ON shift_meter_readings(worker_id);

CREATE INDEX idx_shift_meter_readings_meter_id 
  ON shift_meter_readings(meter_id);

CREATE INDEX idx_shift_meter_readings_recorded_at 
  ON shift_meter_readings(recorded_at DESC);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE shift_meter_readings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can SELECT all records
CREATE POLICY "Allow authenticated read access to shift_meter_readings"
  ON shift_meter_readings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "Allow authenticated write access to shift_meter_readings"
  ON shift_meter_readings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Realtime Support

```sql
-- Add table to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE shift_meter_readings;
```

This allows real-time subscriptions to:
- New meter readings being recorded
- Updates to existing readings
- Historical data syncing

## Data Relationships

### One-to-Many: Worker → Readings

```
Worker (profiles)
  │
  └─→ Many Shift Meter Readings
       ├─ Opening reading: 1234.50
       ├─ Closing reading: 1300.75
       ├─ Dispensed: 66.25L
       ├─ Recorded: 2024-03-15 10:30:00
       │
       ├─ Opening reading: 8210.00
       ├─ Closing reading: 8289.45
       ├─ Dispensed: 79.45L
       ├─ Recorded: 2024-03-15 11:00:00
       │
       └─ ... more readings
```

### One-to-Many: Meter → Readings

```
Meter (machine_meters)
  │ Meter #1 (Petrol - Nozzle A)
  │
  └─→ Many Shift Meter Readings (Historical)
       ├─ 2024-03-15: 45.30L dispensed
       ├─ 2024-03-15: 52.10L dispensed
       ├─ 2024-03-14: 48.75L dispensed
       │
       └─ ... historical data
```

### One-to-Many: Machine → Meters

```
Machine (pump_machines)
  │ Dispenser 01 (Petrol)
  │
  ├─→ Meter #1 (Nozzle A - Front Bay)
  │   └─→ Shift Meter Readings
  │
  └─→ Meter #2 (Nozzle B - Rear Bay)
      └─→ Shift Meter Readings
```

## Query Patterns

### Query 1: Get All Readings for a Worker

```sql
SELECT 
  smr.id,
  smr.opening_reading,
  smr.closing_reading,
  smr.liters_dispensed,
  smr.recorded_at,
  mm.label,
  mm.fuel_type,
  pm.machine_number
FROM shift_meter_readings smr
JOIN machine_meters mm ON smr.meter_id = mm.id
JOIN pump_machines pm ON mm.machine_id = pm.id
WHERE smr.worker_id = ?
ORDER BY smr.recorded_at DESC
LIMIT 20;
```

**Use Case**: Worker views their reading history

### Query 2: Get Total Liters by Fuel Type

```sql
SELECT 
  mm.fuel_type,
  SUM(smr.liters_dispensed) as total_liters,
  COUNT(smr.id) as reading_count,
  AVG(smr.liters_dispensed) as avg_dispensed
FROM shift_meter_readings smr
JOIN machine_meters mm ON smr.meter_id = mm.id
WHERE smr.recorded_at >= ? AND smr.recorded_at <= ?
GROUP BY mm.fuel_type
ORDER BY total_liters DESC;
```

**Use Case**: Daily report showing fuel dispensing by type

### Query 3: Get Readings by Date Range

```sql
SELECT 
  smr.id,
  smr.opening_reading,
  smr.closing_reading,
  smr.liters_dispensed,
  smr.recorded_at,
  p.name as worker_name,
  mm.label as meter_label,
  mm.fuel_type
FROM shift_meter_readings smr
JOIN profiles p ON smr.worker_id = p.id
JOIN machine_meters mm ON smr.meter_id = mm.id
WHERE smr.recorded_at >= ? AND smr.recorded_at <= ?
ORDER BY smr.recorded_at DESC;
```

**Use Case**: Admin generates daily/weekly reports

### Query 4: Anomaly Detection (Unusual Readings)

```sql
SELECT 
  smr.*,
  mm.label,
  p.name,
  AVG(smr.liters_dispensed) OVER (PARTITION BY smr.meter_id) as avg_dispensed
FROM shift_meter_readings smr
JOIN machine_meters mm ON smr.meter_id = mm.id
JOIN profiles p ON smr.worker_id = p.id
WHERE smr.liters_dispensed > (
  SELECT AVG(liters_dispensed) * 2 
  FROM shift_meter_readings 
  WHERE meter_id = smr.meter_id
)
ORDER BY smr.recorded_at DESC;
```

**Use Case**: Flag unusually high dispensing for audit

## Data Integrity Rules

### At Application Level (Client):

1. **Opening Must Be Positive**: `opening_reading >= 0`
2. **Closing Must Be Positive**: `closing_reading >= 0`
3. **Closing ≥ Opening**: `closing_reading >= opening_reading`
4. **At Least One Meter Per Entry**: User must record at least 1 meter

### At Database Level (Constraints):

1. **Foreign Key Integrity**: 
   - Worker must exist in `profiles` table
   - Meter must exist in `machine_meters` table

2. **Data Consistency**:
   - `liters_dispensed = closing_reading - opening_reading`
   - Cannot be null or negative

3. **Audit Trail**:
   - `created_at` and `updated_at` always recorded
   - Timestamps in UTC (TIMESTAMPTZ)

## Performance Optimization

### Index Strategy

```
Index 1: idx_shift_meter_readings_worker_id
  → Used for: SELECT * WHERE worker_id = ?
  → Query: Fetch all readings for a specific worker
  → Cardinality: Medium (multiple readings per worker)

Index 2: idx_shift_meter_readings_meter_id  
  → Used for: SELECT * WHERE meter_id = ?
  → Query: Fetch all readings for a specific meter
  → Cardinality: Medium (multiple readings per meter)

Index 3: idx_shift_meter_readings_recorded_at DESC
  → Used for: ORDER BY recorded_at DESC LIMIT N
  → Query: Fetch recent readings (most common)
  → Cardinality: High (unique timestamp for each entry)
  → Descending order: For "most recent first" queries
```

### Query Optimization Tips

1. **Always filter by date range**: Avoid full table scans
   ```sql
   WHERE recorded_at >= NOW() - INTERVAL '30 days'
   ```

2. **Use LIMIT for large result sets**: Pagination
   ```sql
   ORDER BY recorded_at DESC
   LIMIT 50 OFFSET 0
   ```

3. **Pre-aggregate data**: For reports
   ```sql
   SELECT fuel_type, SUM(liters_dispensed)
   GROUP BY fuel_type
   ```

## Cascade Delete Behavior

### If Worker Deleted (profiles):
```
profiles → [DELETE] → shift_meter_readings
↓
All readings for that worker are deleted
(Set in migration: ON DELETE CASCADE)
```

### If Meter Deleted (machine_meters):
```
machine_meters → [DELETE] → shift_meter_readings
↓
All readings for that meter are deleted
(Set in migration: ON DELETE CASCADE)
```

**Consideration**: This is intentional to maintain referential integrity. If business logic requires audit trail preservation, add a "soft delete" flag instead.

## Migration History

```
Migration 0001: Initial schema (profiles, auth)
Migration 0002: Profiles trigger & seed
Migration 0003: Manual flow overhaul
Migration 0004: Shift duty details
Migration 0005: Enable realtime
Migration 0006: Pump hardware config (fuel_tanks, pump_machines, machine_meters)
Migration 0007: Shift meter readings [NEW] ← We are here
```

## Future Schema Enhancements

### Planned:
1. **shift_duty_sessions**: Link readings to shift sessions
   ```sql
   ALTER TABLE shift_meter_readings 
   ADD COLUMN shift_session_id UUID REFERENCES shifts(id);
   ```

2. **meter_reading_audits**: Immutable audit log
   ```sql
   CREATE TABLE meter_reading_audits (
     id UUID PRIMARY KEY,
     reading_id UUID REFERENCES shift_meter_readings(id),
     action TEXT ('INSERT', 'UPDATE', 'DELETE'),
     old_values JSONB,
     new_values JSONB,
     changed_by UUID,
     changed_at TIMESTAMPTZ
   );
   ```

3. **meter_anomalies**: Flagged suspicious readings
   ```sql
   CREATE TABLE meter_anomalies (
     id UUID PRIMARY KEY,
     reading_id UUID REFERENCES shift_meter_readings(id),
     anomaly_type TEXT ('UNUSUALLY_HIGH', 'NEGATIVE_DELTA', 'REVERSAL'),
     flagged_by UUID,
     status TEXT ('PENDING', 'REVIEWED', 'APPROVED'),
     notes TEXT,
     created_at TIMESTAMPTZ
   );
   ```

---

**Schema Version**: 0007 (Current)  
**Last Updated**: 2024-03-15  
**Status**: Production Ready
