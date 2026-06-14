export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const CONFIG_ID = 1; // Satu baris config saja

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('data')
      .eq('id', CONFIG_ID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase GET config error:', error);
      return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
    }

    if (!data) {
      // Return default jika belum ada
      return NextResponse.json({
        targetName: 'Name',
        greetingMessage: 'Message',
        photos: [],
        musicUrl: '',
        tunnelMusicUrl: '',
        finaleMusicUrl: '',
        planetColors: [],
        ringColors: [],
      });
    }

    return NextResponse.json(data.data);
  } catch (err) {
    console.error('GET config error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const { error } = await supabaseAdmin
      .from('config')
      .upsert({ id: CONFIG_ID, data: body }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase POST config error:', error);
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: body });
  } catch (err) {
    console.error('POST config error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
