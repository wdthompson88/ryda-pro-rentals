import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToFile,
} from "@react-pdf/renderer";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "docs", "sample-documents");
const OUTPUT_DIR = path.join(SOURCE_DIR, "pdf");

const DOCS = [
  ["operating-agreement.md", "RYDA-sample-operating-agreement.pdf"],
  ["management-services-agreement.md", "RYDA-sample-management-services-agreement.pdf"],
  ["subscription-agreement.md", "RYDA-sample-subscription-agreement.pdf"],
  ["pre-purchase-inspection-report.md", "RYDA-sample-pre-purchase-inspection-report.pdf"],
  ["certificate-of-insurance.md", "RYDA-sample-certificate-of-insurance.pdf"],
  ["title-evidence.md", "RYDA-sample-title-evidence.pdf"],
  ["quarterly-condition-report.md", "RYDA-sample-quarterly-condition-report.pdf"],
  ["booking-rules-fair-use-policy.md", "RYDA-sample-booking-rules-fair-use-policy.pdf"],
  ["damage-reserve-policy.md", "RYDA-sample-damage-reserve-policy.pdf"],
];

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingRight: 54,
    paddingBottom: 58,
    paddingLeft: 54,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1f1b18",
    lineHeight: 1.45,
  },
  brand: {
    fontSize: 9,
    color: "#8f2d2d",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Times-Roman",
    fontSize: 26,
    lineHeight: 1.12,
    marginBottom: 16,
    color: "#181512",
  },
  section: {
    fontFamily: "Times-Roman",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 7,
    color: "#181512",
  },
  paragraph: {
    marginBottom: 8,
  },
  meta: {
    marginBottom: 4,
    color: "#5f5750",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 5,
    paddingRight: 8,
  },
  bullet: {
    width: 12,
    color: "#8f2d2d",
  },
  bulletText: {
    flex: 1,
  },
  notice: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7d0c7",
    paddingTop: 9,
    paddingBottom: 9,
    marginBottom: 13,
    color: "#5f5750",
  },
  footer: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#e2dbd2",
    paddingTop: 8,
    fontSize: 8,
    color: "#7b726a",
  },
});

function cleanInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseMarkdown(markdown) {
  const blocks = [];
  let paragraph = [];
  let activeBullet = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: cleanInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };

  const flushBullet = () => {
    if (activeBullet) {
      blocks.push({ type: "bullet", text: cleanInline(activeBullet.join(" ")) });
      activeBullet = null;
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullet();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushBullet();
      flushParagraph();
      blocks.push({ type: "title", text: cleanInline(trimmed.slice(2)) });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushBullet();
      flushParagraph();
      blocks.push({ type: "section", text: cleanInline(trimmed.slice(3)) });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushBullet();
      flushParagraph();
      activeBullet = [trimmed.slice(2)];
      continue;
    }

    if (activeBullet && /^\s+/.test(line)) {
      activeBullet.push(trimmed);
      continue;
    }

    flushBullet();
    paragraph.push(trimmed);
  }

  flushBullet();
  flushParagraph();
  return blocks;
}

function renderBlock(block, index) {
  if (block.type === "title") {
    return React.createElement(Text, { key: index, style: styles.title }, block.text);
  }
  if (block.type === "section") {
    return React.createElement(Text, { key: index, style: styles.section }, block.text);
  }
  if (block.type === "bullet") {
    return React.createElement(
      View,
      { key: index, style: styles.bulletRow },
      React.createElement(Text, { style: styles.bullet }, "•"),
      React.createElement(Text, { style: styles.bulletText }, block.text),
    );
  }

  const isMeta =
    block.text.startsWith("Document status:") ||
    block.text.startsWith("Version:") ||
    block.text.startsWith("Last updated:");
  const isNotice = index < 8 && /not legal advice|not evidence|for review only/i.test(block.text);

  return React.createElement(
    Text,
    {
      key: index,
      style: isNotice ? styles.notice : isMeta ? styles.meta : styles.paragraph,
    },
    block.text,
  );
}

function SampleDocumentPdf({ title, blocks }) {
  return React.createElement(
    Document,
    {
      title,
      author: "RYDA",
      subject: "Redacted sample document",
      creator: "RYDA",
      producer: "RYDA",
    },
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page, wrap: true },
      React.createElement(Text, { style: styles.brand }, "RYDA · Redacted Sample Document"),
      blocks.map(renderBlock),
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, "RYDA · redacted sample · not for signature"),
        React.createElement(Text, {
          render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`,
        }),
      ),
    ),
  );
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (const [sourceName, pdfName] of DOCS) {
  const sourcePath = path.join(SOURCE_DIR, sourceName);
  const outputPath = path.join(OUTPUT_DIR, pdfName);
  const markdown = await fs.readFile(sourcePath, "utf8");
  const blocks = parseMarkdown(markdown);
  const title = blocks.find((block) => block.type === "title")?.text ?? pdfName;
  await renderToFile(
    React.createElement(SampleDocumentPdf, { title, blocks }),
    outputPath,
  );
  console.log(`wrote ${path.relative(ROOT, outputPath)}`);
}
