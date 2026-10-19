import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (
    request.nextUrl.searchParams.has("error") ||
    !request.nextUrl.searchParams.has("code")
  ) {
    loginUrl.searchParams.set("error", "email-confirmation-failed");
  } else {
    loginUrl.searchParams.set("email-confirmed", "1");
  }

  return NextResponse.redirect(loginUrl);
}
