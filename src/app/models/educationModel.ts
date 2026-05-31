import { supabase } from "../lib/supabaseClient";

export async function getTips() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("education_tips").select("id, tip, sort_order").order("sort_order", { ascending: true });
  if (error) throw error;
  return data as { id: string; tip: string; sort_order: number }[];
}

export interface FoodComparisonRow {
  id: string;
  local_name: string;
  local_emoji: string | null;
  local_calories: number | null;
  local_protein: number | null;
  local_sugar: number | null;
  local_vitamins: string | null;
  processed_name: string;
  processed_emoji: string | null;
  processed_calories: number | null;
  processed_protein: number | null;
  processed_sugar: number | null;
  processed_vitamins: string | null;
}

export async function getComparisons(): Promise<FoodComparisonRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("food_comparisons").select("*").order("local_name", { ascending: true });
  if (error) throw error;
  return (data as FoodComparisonRow[]) ?? [];
}

export async function getGames() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("education_games").select("*").order("title", { ascending: true });
  if (error) throw error;
  return data as { id: string; title: string; description: string; icon_emoji: string }[];
}
