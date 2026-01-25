// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export async function middleware(req: NextRequest) {
//   let accessToken = req.cookies.get("sb-access-token")?.value;
//   const refreshToken = req.cookies.get("sb-refresh-token")?.value;
//   const verified = req.cookies.get("verified")?.value;

//   // ✅ Protect dashboard and admin routes
//   if (
//     req.nextUrl.pathname.startsWith("/dashboard") ||
//     req.nextUrl.pathname.startsWith("/admin")
//   ) {
//     // No session at all → redirect to login
//     if (!accessToken && !refreshToken) {
//       return redirectToLogin(req);
//     }

//     // ✅ Refresh access token using refresh token
//     if (!accessToken && refreshToken) {
//       const supabase = createClient(
//         process.env.SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!
//       );

//       const { data, error } = await supabase.auth.refreshSession({
//         refresh_token: refreshToken,
//       });

//       if (error || !data.session) {
//         return redirectToLogin(req);
//       }

//       // Save new tokens
//       const res = NextResponse.next();
//       res.cookies.set("sb-access-token", data.session.access_token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//       });
//       res.cookies.set("sb-refresh-token", data.session.refresh_token!, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//       });
//       return res;
//     }

//     // ✅ Block unverified users
//     if (verified !== "true" && !req.nextUrl.pathname.startsWith("/onboarding")) {
//       return NextResponse.redirect(new URL("/onboarding", req.url));
//     }

//     // ✅ Admin protection
//     if (req.nextUrl.pathname.startsWith("/admin")) {
//       const supabaseAdmin = createClient(
//         process.env.SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!
//       );

//       const {
//         data: { user },
//       } = await supabaseAdmin.auth.getUser(accessToken);

//       if (!user) return redirectToLogin(req);

//       const { data: profile } = await supabaseAdmin
//         .from("users")
//         .select("admin_role")
//         .eq("id", user.id)
//         .single();

//       if (!["super_admin", "finance_admin", "operations_admin", "support_admin", "legal_admin"].includes(profile?.admin_role)) {
//         return NextResponse.redirect(new URL("/dashboard", req.url));
//       }
//     }
//   }

//   return NextResponse.next();
// }

// function redirectToLogin(req: NextRequest) {
//   const res = NextResponse.redirect(new URL("/auth/login", req.url));
//   res.cookies.delete("sb-access-token");
//   res.cookies.delete("sb-refresh-token");
//   res.cookies.delete("verified");
//   return res;
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding"],
// };



// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export async function middleware(req: NextRequest) {
//   let accessToken = req.cookies.get("sb-access-token")?.value;
//   const refreshToken = req.cookies.get("sb-refresh-token")?.value;
//   const verified = req.cookies.get("verified")?.value;

//   // ✅ Protect dashboard and admin routes
//   if (
//     req.nextUrl.pathname.startsWith("/dashboard") ||
//     req.nextUrl.pathname.startsWith("/admin")
//   ) {
//     // No session at all → redirect to login
//     if (!accessToken && !refreshToken) {
//       return redirectToLogin(req);
//     }

//     // ✅ Refresh access token using refresh token
//     if (!accessToken && refreshToken) {
//       const supabase = createClient(
//         process.env.SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!
//       );

//       const { data, error } = await supabase.auth.refreshSession({
//         refresh_token: refreshToken,
//       });

//       if (error || !data.session) {
//         return redirectToLogin(req);
//       }

//       // Save new tokens
//       const res = NextResponse.next();
//       res.cookies.set("sb-access-token", data.session.access_token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//       });
//       res.cookies.set("sb-refresh-token", data.session.refresh_token!, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//       });
//       return res;
//     }

//     // ✅ Block unverified users
//     if (verified !== "true" && !req.nextUrl.pathname.startsWith("/onboarding")) {
//       return NextResponse.redirect(new URL("/onboarding", req.url));
//     }

//     // ✅ Admin protection
//     if (req.nextUrl.pathname.startsWith("/admin")) {
//       const supabaseAdmin = createClient(
//         process.env.SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!
//       );

//       const {
//         data: { user },
//       } = await supabaseAdmin.auth.getUser(accessToken);

//       if (!user) return redirectToLogin(req);

//       const { data: profile } = await supabaseAdmin
//         .from("users")
//         .select("admin_role")
//         .eq("id", user.id)
//         .single();

//       if (!["super_admin", "finance_admin", "operations_admin", "support_admin", "legal_admin"].includes(profile?.admin_role)) {
//         return NextResponse.redirect(new URL("/dashboard", req.url));
//       }
//     }
//   }

//   return NextResponse.next();
// }

// function redirectToLogin(req: NextRequest) {
//   // Get the current URL the user was trying to access
//   const { pathname, search } = req.nextUrl;
  
  
//   const fullUrl = `${pathname}${search}`;
  
//   // Create login URL with callback parameter
//   const loginUrl = new URL("/auth/login", req.url);
//   loginUrl.searchParams.set("callbackUrl", encodeURIComponent(fullUrl));
  
//   const res = NextResponse.redirect(loginUrl);
//   res.cookies.delete("sb-access-token");
//   res.cookies.delete("sb-refresh-token");
//   res.cookies.delete("verified");
//   return res;
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding"],
// };


import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host");
  const url = req.nextUrl.clone();

  /**
   * ------------------------------------------------
   * 1️⃣ SUBDOMAIN HANDLING (FIRST)
   * app.zidwell.com → /my-app
   * ------------------------------------------------
   */
  if (hostname === "app.zidwell.com") {
    if (!url.pathname.startsWith("/my-app")) {
      url.pathname = `/my-app${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  /**
   * ------------------------------------------------
   * 2️⃣ AUTH / ROLE PROTECTION
   * ------------------------------------------------
   */
  let accessToken = req.cookies.get("sb-access-token")?.value;
  const refreshToken = req.cookies.get("sb-refresh-token")?.value;
  const verified = req.cookies.get("verified")?.value;

  const pathname = url.pathname;

  // Protect dashboard & admin routes (including rewritten ones)
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/my-app/dashboard") ||
    pathname.startsWith("/my-app/admin")
  ) {
    // ❌ No session
    if (!accessToken && !refreshToken) {
      return redirectToLogin(req);
    }

    // 🔁 Refresh token
    if (!accessToken && refreshToken) {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return redirectToLogin(req);
      }

      const res = NextResponse.next();
      res.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
      res.cookies.set("sb-refresh-token", data.session.refresh_token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return res;
    }

    // 🚫 Block unverified users
    if (
      verified !== "true" &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/my-app/onboarding")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // 🔐 Admin role check
    if (pathname.includes("/admin")) {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(accessToken);

      if (!user) return redirectToLogin(req);

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("admin_role")
        .eq("id", user.id)
        .single();

      if (
        ![
          "super_admin",
          "finance_admin",
          "operations_admin",
          "support_admin",
          "legal_admin",
        ].includes(profile?.admin_role)
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
}

/**
 * ------------------------------------------------
 * 🔁 Redirect to login with callback
 * ------------------------------------------------
 */
function redirectToLogin(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const fullUrl = `${pathname}${search}`;

  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("callbackUrl", encodeURIComponent(fullUrl));

  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete("sb-access-token");
  res.cookies.delete("sb-refresh-token");
  res.cookies.delete("verified");
  return res;
}

/**
 * ------------------------------------------------
 * 🎯 MATCHER (VERY IMPORTANT)
 * ------------------------------------------------
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/onboarding",
    "/my-app/:path*",
  ],
};
