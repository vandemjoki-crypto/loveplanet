import { NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

export async function GET() {
  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('Supabase list error:', error);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    const music = (files || [])
      .filter(f => AUDIO_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => {
        const { data } = supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(f.name);
        return data.publicUrl;
      });

    return NextResponse.json({ music });
  } catch (err) {
    console.error('Music GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
