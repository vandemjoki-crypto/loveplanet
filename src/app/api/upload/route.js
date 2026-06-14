import { NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    const fileUrls = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
      const filename = `${uniqueSuffix}-${safeName}`;

      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return NextResponse.json({ error: `Failed to upload ${file.name}` }, { status: 500 });
      }

      // Ambil public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filename);

      fileUrls.push(urlData.publicUrl);
    }

    return NextResponse.json({ message: 'Success', urls: fileUrls });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('file');

    if (!fileUrl) {
      return NextResponse.json({ error: 'No file specified' }, { status: 400 });
    }

    // Extract filename dari full Supabase URL
    // Format: https://xxx.supabase.co/storage/v1/object/public/uploads/FILENAME
    const parts = fileUrl.split(`/object/public/${STORAGE_BUCKET}/`);
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }
    const filename = parts[1];

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
