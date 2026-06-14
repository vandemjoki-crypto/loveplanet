import { NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('Supabase list error:', error);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    const gifs = (files || [])
      .filter(f => f.name.toLowerCase().endsWith('.gif'))
      .map(f => {
        const { data } = supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(f.name);
        return data.publicUrl;
      });

    return NextResponse.json({ gifs });
  } catch (err) {
    console.error('GIFs GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
