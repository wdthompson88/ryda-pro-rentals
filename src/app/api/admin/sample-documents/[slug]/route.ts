import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readSampleDocument } from "@/lib/sample-documents";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { slug } = await params;
  const result = await readSampleDocument(slug);
  if (!result) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return new NextResponse(result.content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.doc.downloadName}"`,
      "Cache-Control": "no-store",
      "X-RYDA-Document-Access": `admin:${admin.id}`,
    },
  });
}

