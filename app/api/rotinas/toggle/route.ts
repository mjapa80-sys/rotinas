import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routine_item_id, completed } = await request.json();
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("routine_completions")
    .upsert(
      { user_id: user.id, routine_item_id, date: today, completed },
      { onConflict: "routine_item_id,date" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
