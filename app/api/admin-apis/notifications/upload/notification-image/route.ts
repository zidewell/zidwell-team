// app/api/admin-apis/notifications/upload/simple/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Generate filename
    const fileName = `notification_${Date.now()}_${file.name}`;
    const filePath = `notifications/${fileName}`;

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload
    const { error } = await supabaseAdmin.storage
      .from('notification-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: error.message, details: error }, 
        { status: 500 }
      );
    }

    // Get URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('notification-images')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}