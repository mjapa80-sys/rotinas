import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: items } = await supabase
    .from("routine_items")
    .select("*")
    .eq("user_id", user.id)
    .order("position");

  const { data: completions } = await supabase
    .from("routine_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  return NextResponse.json({ items: items ?? [], completions: completions ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, time_of_day } = body;

  const { data: existing } = await supabase
    .from("routine_items")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("routine_items")
    .insert({ user_id: user.id, title, time_of_day: time_of_day ?? "manha", position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase.from("routine_items").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
