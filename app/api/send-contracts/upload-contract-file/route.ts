import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed file types and sizes
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/gif',
  'image/webp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    console.log("File upload API called");
    
    const formData = await req.formData();
    
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const contractId = formData.get('contractId') as string;
    const bucketName = formData.get('bucketName') as string || 'contracts';

    console.log("Received file upload request:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId,
      contractId,
      bucketName
    });

    // Validate inputs
    if (!file) {
      console.error("No file provided");
      return NextResponse.json(
        { 
          success: false, 
          error: "No file provided" 
        },
        { status: 400 }
      );
    }

    if (!userId) {
      console.error("No userId provided");
      return NextResponse.json(
        { 
          success: false, 
          error: "User ID is required" 
        },
        { status: 400 }
      );
    }

    if (!contractId) {
      console.error("No contractId provided");
      return NextResponse.json(
        { 
          success: false, 
          error: "Contract ID is required" 
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.error(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPEG, PNG, GIF, WEBP` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File too large: ${file.size} bytes`);
      return NextResponse.json(
        { 
          success: false, 
          error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${userId}/${contractId}/${uniqueFileName}`;

    console.log("Uploading file to Supabase:", {
      originalName: file.name,
      uniqueFileName,
      filePath,
      size: file.size,
      type: file.type
    });

    // Ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating bucket: ${bucketName}`);
        await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_FILE_TYPES
        });
      }
    } catch (bucketError) {
      console.log("Bucket check/creation error:", bucketError);
      // Continue anyway
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to upload file to storage: ${uploadError.message}` 
        },
        { status: 500 }
      );
    }

    console.log("File uploaded to storage:", uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("Generated public URL:", publicUrl);

    // Save to database - update contract metadata
    try {
      // First, get the existing contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('user_id', userId)
        .single();

      if (contractError) {
        console.error("Error fetching contract:", contractError);
        // Don't fail the upload, just log it
      } else {
        const currentMetadata = contract?.metadata || {};
        const uploadedFiles = currentMetadata.uploadedFiles || [];

        // Create file metadata
        const fileMetadata = {
          id: uuidv4(),
          originalName: file.name,
          fileName: uniqueFileName,
          filePath: filePath,
          fileUrl: publicUrl,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          bucketName: bucketName
        };

        // Update contract with file metadata
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            metadata: {
              ...currentMetadata,
              uploadedFiles: [...uploadedFiles, fileMetadata]
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', contractId)
          .eq('user_id', userId);

        if (updateError) {
          console.error("Error updating contract metadata:", updateError);
          // Don't fail the upload, just log it
        } else {
          console.log("Contract metadata updated successfully");
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Don't fail the upload if DB update fails
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        fileName: uniqueFileName,
        originalName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type,
        storagePath: filePath,
        uploadedAt: new Date().toISOString(),
        contractId,
        userId,
        bucketName
      }
    });

  } catch (error: any) {
    console.error("File upload error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error during file upload" 
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to list uploaded files
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const contractId = searchParams.get('contractId');
    const bucketName = searchParams.get('bucketName') || 'contracts';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // List files from storage
    let fileList: any[] = [];
    let storageError = null;
    
    try {
      const path = contractId ? `${userId}/${contractId}` : `${userId}`;
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(path);

      if (error) {
        console.error("Error listing files:", error);
        storageError = error;
      } else {
        fileList = files || [];
      }
    } catch (listError) {
      console.error("Storage list error:", listError);
    }

    // Also get from contract metadata
    let contractFiles: any[] = [];
    if (contractId) {
      try {
        const { data: contract } = await supabase
          .from('contracts')
          .select('metadata')
          .eq('id', contractId)
          .eq('user_id', userId)
          .single();

        if (contract?.metadata?.uploadedFiles) {
          contractFiles = contract.metadata.uploadedFiles;
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }
    }

    return NextResponse.json({
      success: true,
      files: {
        storage: fileList,
        metadata: contractFiles
      },
      storageError: storageError?.message
    });

  } catch (error: any) {
    console.error("List files error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('filePath');
    const bucketName = searchParams.get('bucketName') || 'contracts';
    const userId = searchParams.get('userId');
    const contractId = searchParams.get('contractId');

    if (!filePath || !userId) {
      return NextResponse.json(
        { success: false, error: "File path and user ID are required" },
        { status: 400 }
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: "Failed to delete file" },
        { status: 500 }
      );
    }

    // Remove from contract metadata if contractId provided
    if (contractId) {
      try {
        const { data: contract } = await supabase
          .from('contracts')
          .select('metadata')
          .eq('id', contractId)
          .eq('user_id', userId)
          .single();

        if (contract?.metadata?.uploadedFiles) {
          const updatedFiles = contract.metadata.uploadedFiles.filter(
            (file: any) => file.filePath !== filePath
          );

          await supabase
            .from('contracts')
            .update({
              metadata: {
                ...contract.metadata,
                uploadedFiles: updatedFiles
              }
            })
            .eq('id', contractId)
            .eq('user_id', userId);
        }
      } catch (dbError) {
        console.error("Error updating contract metadata:", dbError);
        // Don't fail if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully"
    });

  } catch (error: any) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}