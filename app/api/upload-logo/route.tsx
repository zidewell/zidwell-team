import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { message: "File and user ID are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('business-logos')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { message: "Failed to upload logo", error: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl,
      message: "Logo uploaded successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const logoUrl = searchParams.get('logoUrl');
    const userId = searchParams.get('userId');

    if (!logoUrl || !userId) {
      return NextResponse.json(
        { message: "Logo URL and user ID are required" },
        { status: 400 }
      );
    }

    // Extract filename from URL
    const url = new URL(logoUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fullPath = `${userId}/${fileName}`;

    // Delete from storage
    const { error } = await supabase.storage
      .from('business-logos')
      .remove([fullPath]);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { message: "Failed to delete logo", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Logo deleted successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}