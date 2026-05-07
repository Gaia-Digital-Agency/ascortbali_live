// This script seeds the database with initial data.
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed languages.
  const languages = ["English", "Indonesian", "Japanese", "Chinese"];
  for (const name of languages) {
    await prisma.language.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed categories.
  const categories = ["Wellness", "Photography", "Guided Tours", "Coaching"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create demo provider, customer, and admin users.
  // NOTE: Passwords are "password123" for local demo. Change in real.
  const hash = await bcrypt.hash("password123", 10);

  const provider = await prisma.user.upsert({
    where: { email: "provider@example.com" },
    update: {},
    create: { role: Role.provider, email: "provider@example.com", passwordHash: hash },
  });

  await prisma.providerProfile.upsert({
    where: { userId: provider.id },
    update: {},
    create: { userId: provider.id, displayName: "Demo Provider", bio: "Example provider profile." },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: { role: Role.customer, email: "customer@example.com", passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { role: Role.admin, email: "admin@example.com", passwordHash: hash },
  });

  await prisma.userProfile.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id, fullName: "Demo Customer" },
  });

  // Create a demo service.
  const cat = await prisma.category.findFirst({ where: { name: "Wellness" } });
  if (cat) {
    await prisma.service.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        creatorId: provider.id,
        title: "Starter Consultation",
        description: "A 60-minute consultation session.",
        categoryId: cat.id,
        basePrice: "250.00",
        durationMinutes: 60,
        active: true,
        featuredRank: 1,
      },
    });
  }

  // Seed advertising spaces.
  const ads = [
    {
      slot: "hero-1",
      title: "Hero Advertising Space",
      subtitle: "Primary banner placement",
      image: "/placeholders/hero-1.jpg",
      ctaLabel: "Inquire",
      ctaHref: "/services",
    },
    {
      slot: "hero-2",
      title: "Premium Placement",
      subtitle: "Highlight seasonal campaigns",
      image: "/placeholders/card-2.jpg",
      ctaLabel: "View Packages",
      ctaHref: "/services",
    },
    {
      slot: "hero-3",
      title: "Featured Sponsor",
      subtitle: "Showcase top-tier partners",
      image: "/placeholders/card-3.jpg",
      ctaLabel: "Get Started",
      ctaHref: "/services",
    },
  ];

  for (const ad of ads) {
    await prisma.advertisingSpace.upsert({
      where: { slot: ad.slot },
      update: {
        title: ad.title,
        subtitle: ad.subtitle,
        image: ad.image,
        ctaLabel: ad.ctaLabel,
        ctaHref: ad.ctaHref,
      },
      create: ad,
    });
  }

  console.log("Seed complete.");
}

// Run the seed script and exit.
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
