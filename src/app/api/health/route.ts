import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('organizations').select('id').limit(1).single();
    // PGRST116 = 0 rows is fine; any other error means DB is down
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { ok: false, service: 'vein-spiral-v2', error: 'database_unavailable' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, service: 'vein-spiral-v2' });
  } catch {
    return NextResponse.json(
      { ok: false, service: 'vein-spiral-v2', error: 'health_check_failed' },
      { status: 503 }
    );
  }
}
