import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { SAMPLE_DOCUMENTS } from "@/lib/sample-documents";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({
    documents: SAMPLE_DOCUMENTS.map((doc) => ({
      ...doc,
      publicHref: `/api/sample-documents/${doc.slug}`,
      adminHref: `/api/admin/sample-documents/${doc.slug}`,
    })),
  });
}

