import { supabase } from "../lib/supabaseClient";

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number | null;
}

export async function getFaqs(): Promise<FaqRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("faqs").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as FaqRow[]) ?? [];
}

export interface GuideRow {
  id: string;
  title: string;
  type: string;
  emoji: string | null;
  url: string | null;
}

export async function getGuides(): Promise<GuideRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("guides").select("*").order("title", { ascending: true });
  if (error) throw error;
  return (data as GuideRow[]) ?? [];
}

export interface ContactInfoRow {
  id: string;
  label: string;
  value: string;
  sort_order: number | null;
}

export async function getContactInfo(): Promise<ContactInfoRow[]> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("contact_info").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ContactInfoRow[]) ?? [];
}
