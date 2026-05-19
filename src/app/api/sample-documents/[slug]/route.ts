import { NextResponse, type NextRequest } from "next/server";
import { readSampleDocumentPdf } from "@/lib/sample-documents";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await readSampleDocumentPdf(slug);
  if (!result) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.doc.downloadName}"`,
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
