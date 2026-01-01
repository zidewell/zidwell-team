import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "File and userId are required" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/${uuidv4()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("contract-uploads")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error(error);
      throw error;
    }

    const { data } = supabase.storage
      .from("contract-uploads")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      filePath,
      fileUrl: data.publicUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
