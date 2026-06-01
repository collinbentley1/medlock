export const VITAL_TYPES = ["heart_rate", "blood_pressure", "blood_oxygen", "respiratory_rate", "temperature"] as const;

export type VitalType = (typeof VITAL_TYPES)[number];

export type VitalReading = {
  readonly confidence: number;
  readonly displayName: string;
  readonly observedAt: string;
  readonly source: string;
  readonly type: VitalType;
  readonly unit: string;
  readonly value: string;
};

export type DateRange = {
  readonly end?: string | undefined;
  readonly start?: string | undefined;
};

const SAMPLE_VITALS: readonly VitalReading[] = [
  {
    confidence: 0.98,
    displayName: "Heart rate",
    observedAt: "2026-05-29T13:04:00.000Z",
    source: "demo-solid-pod",
    type: "heart_rate",
    unit: "bpm",
    value: "72",
  },
  {
    confidence: 0.97,
    displayName: "Blood pressure",
    observedAt: "2026-05-29T13:05:00.000Z",
    source: "demo-solid-pod",
    type: "blood_pressure",
    unit: "mmHg",
    value: "120/78",
  },
  {
    confidence: 0.96,
    displayName: "Blood oxygen",
    observedAt: "2026-05-29T13:06:00.000Z",
    source: "demo-solid-pod",
    type: "blood_oxygen",
    unit: "%",
    value: "98",
  },
  {
    confidence: 0.94,
    displayName: "Respiratory rate",
    observedAt: "2026-05-29T13:07:00.000Z",
    source: "demo-solid-pod",
    type: "respiratory_rate",
    unit: "breaths/min",
    value: "14",
  },
  {
    confidence: 0.95,
    displayName: "Temperature",
    observedAt: "2026-05-29T13:08:00.000Z",
    source: "demo-solid-pod",
    type: "temperature",
    unit: "F",
    value: "98.4",
  },
];

export function fetchDemoVitals(dataTypes: readonly VitalType[], range?: DateRange): VitalReading[] {
  const requested = new Set(dataTypes.length > 0 ? dataTypes : VITAL_TYPES);
  const start = parseOptionalDate(range?.start);
  const end = parseOptionalDate(range?.end);

  return SAMPLE_VITALS.filter((reading) => {
    const observed = Date.parse(reading.observedAt);
    return requested.has(reading.type) && (!start || observed >= start) && (!end || observed <= end);
  });
}

function parseOptionalDate(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
