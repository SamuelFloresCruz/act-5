import { supabase } from "../lib/supabaseClient";

export interface ChildRow {
  id: string;
  full_name: string;
  age_years: number | null;
}

export async function findChildByName(full_name: string): Promise<ChildRow | null> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("children")
    .select("id, full_name, age_years")
    .eq("full_name", full_name)
    .maybeSingle();
  if (error) throw error;
  return (data as ChildRow) ?? null;
}

export async function createChild(full_name: string, age_years: number | null): Promise<ChildRow> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("children")
    .insert({ full_name, age_years })
    .select("id, full_name, age_years")
    .single();
  if (error) throw error;
  return data as ChildRow;
}

export async function listChildren(): Promise<ChildRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("children").select("id, full_name, age_years").order("full_name", { ascending: true });
  if (error) throw error;
  return data as ChildRow[];
}
