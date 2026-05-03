import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const upcoming = searchParams.get("upcoming");

  let query = supabase
    .from("health_records")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true });

  if (upcoming) {
    const limit = parseInt(upcoming) || 5;
    query = query
      .gt("scheduled_at", new Date().toISOString())
      .limit(limit);
  }

  const { data: records } = await query;
  return NextResponse.json({ records: records ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("health_records")
    .insert({
      user_id: user.id,
      type: body.type ?? "outro",
      title: body.title,
      doctor_name: body.doctor_name || null,
      specialty: body.specialty || null,
      location: body.location || null,
      scheduled_at: body.scheduled_at || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await supabase
    .from("health_records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
