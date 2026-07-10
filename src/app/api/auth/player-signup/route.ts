import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Public signup is disabled. Accounts are created by the Sfera team.",
    },
    { status: 410 }
  );
}
