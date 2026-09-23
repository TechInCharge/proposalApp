import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { OnlyOfficeDocKind } from "./constants";

export type { OnlyOfficeDocKind };

interface DocRow {
  bodyUrl: string | null;
  updatedAt: Date;
}

interface KindAdapter {
  get(id: string): Promise<DocRow | null>;
  setBodyUrl(id: string, url: string): Promise<void>;
}

const adapters: Record<OnlyOfficeDocKind, KindAdapter> = {
  "section-template": {
    async get(id) {
      const row = await prisma.sectionTemplate.findUnique({ where: { id } });
      if (!row) return null;
      return {
        bodyUrl: typeof row.body === "string" ? row.body : null,
        updatedAt: row.updatedAt,
      };
    },
    async setBodyUrl(id, url) {
      // docxReviewed: true — this row was just saved directly through the
      // live editor, same meaning as a manual SuperDoc-era save.
      await prisma.sectionTemplate.update({
        where: { id },
        data: { body: url as Prisma.InputJsonValue, docxReviewed: true },
      });
    },
  },
  "proposal-section": {
    async get(id) {
      const row = await prisma.proposalSection.findUnique({ where: { id } });
      if (!row) return null;
      return {
        bodyUrl: typeof row.body === "string" ? row.body : null,
        updatedAt: row.updatedAt,
      };
    },
    async setBodyUrl(id, url) {
      await prisma.proposalSection.update({
        where: { id },
        data: { body: url as Prisma.InputJsonValue, edited: true },
      });
    },
  },
};

export function isOnlyOfficeDocKind(v: string): v is OnlyOfficeDocKind {
  return v === "section-template" || v === "proposal-section";
}

export async function getDocRow(
  kind: OnlyOfficeDocKind,
  id: string,
): Promise<DocRow | null> {
  return adapters[kind].get(id);
}

export async function setDocBodyUrl(
  kind: OnlyOfficeDocKind,
  id: string,
  url: string,
): Promise<void> {
  await adapters[kind].setBodyUrl(id, url);
}
