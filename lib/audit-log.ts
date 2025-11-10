import { createClient } from '@supabase/supabase-js';

// Create admin client for audit logs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateAuditLogParams {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    let location = null;
    
    // Get location info if IP is provided and not local
    if (params.ipAddress && params.ipAddress !== "::1" && !params.ipAddress.startsWith("192.168.")) {
      location = await getLocationFromIP(params.ipAddress);
    }

    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: params.userId,
        user_email: params.userEmail,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        description: params.description,
        metadata: params.metadata,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        location: location,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (error) {
    console.error("Error in createAuditLog:", error);
    // Don't throw to avoid breaking main functionality
  }
}

async function getLocationFromIP(ip: string) {
  try {
    // Using ipapi.co - sign up for free at https://ipapi.co/
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    return {
      country: data.country_name,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.org,
    };
  } catch (error) {
    console.error("Failed to get location from IP:", error);
    return null;
  }
}

// Helper function to extract IP and user agent from headers
export function getClientInfo(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const userAgent = headers.get("user-agent") || "";
  
  let ipAddress = "unknown";
  
  if (forwardedFor) {
    ipAddress = forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    ipAddress = realIp.trim();
  }
  
  return { ipAddress, userAgent };
}