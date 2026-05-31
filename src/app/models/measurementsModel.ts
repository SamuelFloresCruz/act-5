import { supabase } from "../lib/supabaseClient";

export interface MeasurementRow {
  id: string;
  child_id: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  bmi_status: string;
  measured_at?: string;
}

export interface LatestMeasurementRow extends MeasurementRow {
  full_name: string;
  age_years: number | null;
}

export async function insertMeasurement(measurement: MeasurementRow) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("measurements").insert({
    child_id: measurement.child_id,
    weight_kg: measurement.weight_kg,
    height_cm: measurement.height_cm,
    bmi: measurement.bmi,
    bmi_status: measurement.bmi_status,
  });
  if (error) throw error;
  return true;
}

export async function getLatestMeasurements(): Promise<LatestMeasurementRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("latest_measurements")
    .select("id, child_id, weight_kg, height_cm, bmi, bmi_status, measured_at, full_name, age_years");
  if (error) throw error;
  return (data as LatestMeasurementRow[]) ?? [];
}

export async function getMeasurementsByChild(child_id: string, limit = 5): Promise<MeasurementRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("measurements")
    .select("id, child_id, weight_kg, height_cm, bmi, bmi_status, measured_at")
    .eq("child_id", child_id)
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as MeasurementRow[]) ?? [];
}

export async function countMeasurementsSince(isoDate: string): Promise<number> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { count, error } = await supabase
    .from("measurements")
    .select("id", { head: true, count: "exact" })
    .gte("measured_at", isoDate);
  if (error) throw error;
  return count ?? 0;
}

export async function getMeasurementsByDateRange(isoDate: string): Promise<Pick<MeasurementRow, 'bmi' | 'bmi_status' | 'measured_at'>[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("measurements")
    .select("bmi, bmi_status, measured_at")
    .gte("measured_at", isoDate);
  if (error) throw error;
  return (data as Pick<MeasurementRow, "bmi" | "bmi_status" | "measured_at">[]) ?? [];
}
