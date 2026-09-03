import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Minimal TipTap/ProseMirror doc helper. */
function doc(...paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin1234";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  await prisma.brandProfile.upsert({
    where: { id: "default-brand" },
    update: {},
    create: {
      id: "default-brand",
      name: "Default",
      isDefault: true,
      primaryColor: "#1D4ED8",
      secondaryColor: "#0F172A",
      fontFamily: "Inter",
      headerText: "Technical Proposal",
      footerText: "Confidential",
    },
  });

  const firewall = await prisma.product.upsert({
    where: { id: "sample-firewall" },
    update: {},
    create: {
      id: "sample-firewall",
      name: "Perimeter Firewall NGFW-1000",
      category: "Network Security",
      description: "Next-generation firewall appliance.",
      tags: ["security", "network"],
      sections: {
        create: [
          {
            title: "Solution Overview",
            order: 0,
            placeholders: ["customer.name"],
            body: doc(
              "The proposed NGFW-1000 provides {{customer.name}} with deep packet inspection, intrusion prevention, and application-aware policy control at the network perimeter.",
              "It is designed for high-availability deployment with sub-second failover.",
            ),
          },
          {
            title: "Technical Specifications",
            order: 1,
            placeholders: [],
            body: doc(
              "Throughput: 10 Gbps (threat inspection enabled).",
              "Concurrent sessions: 4,000,000. New sessions/sec: 250,000.",
              "Interfaces: 8x 1GbE, 4x 10GbE SFP+.",
            ),
          },
          {
            title: "Deployment & Integration",
            order: 2,
            placeholders: ["customer.name"],
            body: doc(
              "The appliance integrates with {{customer.name}}'s existing directory services for identity-based policy and forwards logs to the central SIEM.",
            ),
          },
        ],
      },
    },
  });

  console.log("Seeded:", {
    admin: admin.email,
    adminPassword,
    product: firewall.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
