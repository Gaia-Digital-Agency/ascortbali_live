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

  // Seed advertising spaces. Slots must match the live CHECK constraint on
  // advertising_spaces.slot — `home-1`..`home-8` plus `bottom`. Older
  // versions of this seed used `hero-*` which violates the constraint and
  // breaks `pnpm db:seed`. The actual ad rows for `home-1..home-8` are
  // already populated in the live DB; this seed simply ensures rows exist
  // (without overwriting their content) so a fresh DB has the slots.
  const ads = [
    { slot: "home-1", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-2", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-3", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-4", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-5", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-6", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-7", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-8", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "bottom", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
  ];

  for (const ad of ads) {
    // Only create on a fresh DB. Never overwrite live ad content from the
    // seed — the admin Ads-Mgmt page is the single source of truth for
    // production rows. Empty `update: {}` makes the upsert a no-op when the
    // slot already exists.
    await prisma.advertisingSpace.upsert({
      where: { slot: ad.slot },
      update: {},
      create: ad,
    });
  }

  // ── Blog seeds (4 wellness/lifestyle articles) ────────────────────────────
  // Each is upserted by slug so re-running the seed is idempotent. Hero
  // images live in GCS at baligirls/blogs/<filename>.jpg and are served via
  // the existing /api/uploads/* proxy.
  const blogSeeds = [
    {
      slug: "why-mens-circles-can-be-beneficial",
      title: "Why Men's Circles Can Be Beneficial",
      excerpt:
        "A men's circle is a small, confidential group that meets regularly to talk honestly about life, work, relationships, and emotion. Here's what they actually do, why modern men keep showing up, and what to look for in a good one.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000001.jpg",
      publishedAt: new Date("2026-04-12T08:00:00Z"),
      body: `A men's circle is a small group — usually six to twelve men — that meets at a regular cadence to talk honestly with each other. There is no facilitator-as-teacher in the therapy sense. There is a host, a few simple agreements, and a willingness to say what's actually happening in your life.

The format has been around longer than most people realise. Indigenous men's councils, the Greek symposium, monastic chapter meetings — every functional culture has had a structured place for men to speak with other men outside of work and family. The contemporary version is closest in shape to the work that organisations like the **ManKind Project** (founded 1985), **EVRYMAN**, and **Sacred Sons** popularised in the last two decades.

## What actually happens in a circle

A typical weekly meeting runs about ninety minutes:

1. **Opening.** Phones away. A short check-in: each man says, in a sentence or two, what he is bringing into the room. Tired. Anxious about a deal. Proud of his daughter. Whatever is true.
2. **Speaking round.** A talking object passes. Whoever holds it speaks. The rest listen. No interruption, no advice, no "have you tried...". This is the part most modern men have never experienced.
3. **Group focus.** One man takes the floor for a longer share — an actual problem, decision, or grief he is sitting with. The group reflects back what they heard, not what they would do.
4. **Closing.** A line of gratitude or a stated intention for the week. Done.

That's it. There is no homework, no business networking, no manifesto.

## Why it works

The current research on male loneliness is unambiguous. The 2023 U.S. Surgeon General's advisory on the loneliness epidemic singled out adult men as the demographic with the steepest decline in close friendships over the past three decades. Most men over thirty have *colleagues, teammates, in-laws* — but not someone they can call at 11pm when something has actually fallen apart.

A circle quietly fixes that. You sit with the same men week after week, you watch them through divorces and promotions and bereavements, and over twelve to eighteen months a kind of friendship forms that most adult men have not had since university. The clinical literature on group support — Yalom's work on therapeutic groups, the Australian Men's Sheds longitudinal data — consistently shows lower depression scores, better stress regulation, and improved partnership outcomes for men who attend.

## What to look for in a circle

- **Confidentiality is enforced.** What is said in the room stays in the room. Period.
- **No advice unless asked.** "Have you tried meditation?" derails a real share faster than anything else.
- **The host doesn't dominate.** Their job is to hold the structure, not to be the smartest person speaking.
- **Mixed ages.** A circle of only 25-year-olds or only 60-year-olds tends to flatten. Range is the thing.
- **It's not a pick-up workshop, a seminar, or an MLM downline.** If anyone is selling something at the end, leave.

## How to start

Find one near you, or start one with three friends who you suspect would actually show up. Pick a regular night. Read the *King, Warrior, Magician, Lover* archetypes if you want a frame, or skip that and just hold the structure above.

The first three meetings will feel awkward. Around the fifth, something shifts. By the tenth, you'll wonder how you went the first thirty-five years of your life without it.`,
    },
    {
      slug: "who-and-what-mantak-chia-teaches",
      title: "Who and What Mantak Chia Teaches",
      excerpt:
        "Mantak Chia is the Thai-Chinese teacher behind the modern Western popularisation of Taoist energy practice. A practical introduction to the man, his curriculum, and what he is actually teaching at Tao Garden in Chiang Mai.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000002.jpg",
      publishedAt: new Date("2026-04-19T08:00:00Z"),
      body: `Mantak Chia (born 1944, Bangkok) is the most widely read living teacher of Taoist internal practice in the West. He is the founder of the **Universal Healing Tao** system, the author of more than fifty books — *Awaken Healing Energy Through the Tao*, *Iron Shirt Chi Kung*, *The Multi-Orgasmic Man*, *Healing Love Through the Tao* — and the director of **Tao Garden**, a residential teaching centre near Chiang Mai, Thailand.

He learned the underlying material from a series of named lineage holders: Cheng Yao-Lun (Hatha Yoga, Taoist Yoga), Lu Tung-Pin's lineage holder Master One Cloud (the Microcosmic Orbit and Inner Alchemy), Master Pan Yu (Kundalini Yoga and a stream of bone-marrow practice), and others. What is unusual about Chia is that he was the first lineage practitioner to translate this body of material into a curriculum that could be taught in an eight-day workshop to a Western beginner — without surrendering the technical content.

## The core architecture

Chia organises the curriculum around the Taoist alchemical model that energy refines through three stages: **jing → qi → shen** — *essence* (sexual / structural energy) is refined into *qi* (vital force, breath, flow), which is in turn refined into *shen* (spirit, awareness). Most people in the modern world leak jing, never accumulate qi, and have shen only in flashes.

The standard sequence he teaches:

1. **Inner Smile + Six Healing Sounds.** A short morning practice that quiets the autonomic nervous system and clears stagnation in the major organs. This is the entry door — most students do this for the first month before being shown anything else.
2. **Microcosmic Orbit.** Circulating attention (and breath, and warmth) up the spine and down the front midline. The first time it works, the body becomes warmly tingly in a way that is unmistakable.
3. **Iron Shirt Chi Kung.** Standing structural practice. Roots posture, packs the bones with qi, prepares the body to hold higher-voltage practices without leaking.
4. **Healing Love.** The single-partner and solo sexual practices — semen retention for men, ovarian breathing for women, the cultivation of sexual energy upward into the body rather than out of it. This is the layer the Western press has obsessed over and which is, in his system, *intermediate*, not foundational.
5. **Fusion of the Five Elements.** Inner alchemy proper. The student learns to balance the emotional/elemental energies of the organs into a single pearl of qi, which is then refined into the higher practices.
6. **Kan & Li (Water and Fire).** Advanced inner-alchemy meditations that are taught residentially over weeks, not weekends.

## What it is — and is not

It is not a religion. There is no required belief, no theology to sign on to. The instructions are technical: *put your tongue here, breathe like this, attend to that sensation*. If the practice does what it claims, you feel the result in your body within weeks; if it doesn't, you stop.

It is also not "Taoism" as a single tradition. Chinese Taoist practice has a thousand-year split between religious / monastic Taoism and internal-alchemy Taoism; Chia's system is firmly the latter, with simplifications that allow householders rather than monastics to practise.

## Where to start if you're curious

Read *Awaken Healing Energy Through the Tao* (1983) — it is the first English-language book in his system and contains the Microcosmic Orbit instructions that are still the centre of the curriculum forty years later. Practise the Inner Smile for two weeks before reading further; if it does nothing for you, the rest of the system probably won't either.

If it does, Tao Garden runs the eight-day **Universal Tao Foundation** programme several times a year. The travel is worth it. Most of what is on YouTube under "Mantak Chia" is third-hand summary by other teachers; the source material is the books and the teaching centre.`,
    },
    {
      slug: "does-sex-burn-more-calories-than-walking",
      title: "Does Sex Burn More Calories Than Walking?",
      excerpt:
        "The sex-as-cardio claim makes for great headlines. The 2013 study most articles cite gives a much more boring answer than the headlines suggest. Here's what the data actually says — and what the better reasons to have sex are.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000003.jpg",
      publishedAt: new Date("2026-04-26T08:00:00Z"),
      body: `Every year, a magazine recycles the headline: *"Sex burns more calories than going to the gym!"* It is an attractive claim and a misleading one. The actual research, when you read it, says something close to the opposite.

## What the study actually measured

The most-cited paper is **Frappier et al., *PLoS ONE*, 2013** — *Energy Expenditure During Sexual Activity in Young Healthy Couples*. Twenty-one heterosexual couples were fitted with portable accelerometers and gas-exchange equipment and asked to have sex (and separately, to walk on a treadmill at 4.8 km/h) while their oxygen consumption was measured.

The findings:

| Activity | Mean energy expenditure (men) | Per minute |
|---|---|---|
| Sex (mean session 24.7 min) | ~101 kcal | ~4.2 kcal/min |
| Treadmill walk (30 min @ 4.8 km/h) | ~130 kcal | ~4.3 kcal/min |

In other words, **per minute, brisk walking and sex burn roughly the same** for an average-weight young man. Per *session*, walking burns slightly more, because most sex sessions are shorter than thirty minutes. Per *hour*, walking wins clearly, because nobody walks for ten minutes and then stops.

The numbers for women in the study were ~70 kcal per session — about 3.1 kcal/min — and similarly compared to a slower walking pace.

## Where the inflated headlines come from

A 1984 *New England Journal of Medicine* paper estimated sex at **~300 kcal per session** based on self-report and assumed durations. That number is the source of the recurring "300 calories of sex equals running a mile!" claim. The 2013 study, which is the only one to actually measure it with calorimetry, came in at about a third of that.

If you see a number above ~150 kcal per session, it is either talking about an unusually long, vigorous encounter or it is a recycled estimate from before anyone measured.

## The honest comparison

For weight management specifically, walking is much better than sex. Not because walking is inherently magical, but because it is *repeatable, schedulable, and scalable*. You can walk an hour every day. You can walk uphill. You can walk faster. The calorie cost rises with all three. None of that is true about sex.

For most adults, a 45-minute walk after dinner is going to beat any sexual frequency you can realistically maintain.

## Why have sex anyway

The interesting findings in the literature are not the calorie ones; they are the cardiovascular and hormonal ones:

- A long-running British cohort study (Caerphilly, ~900 men over 10 years) found that men who reported sex two or more times a week had **half** the rate of fatal coronary events of men reporting sex less than once a month, controlling for age and baseline health.
- Sexual activity raises oxytocin and lowers measured cortisol for several hours afterward — a stress-reduction effect comparable to a moderate cardio session.
- Penile-vaginal intercourse is associated with better blood-pressure response to subsequent stress in laboratory settings (Brody, 2006).

None of this is "sex is exercise." It is closer to: sex is a hormonal reset that has cardiovascular benefits a calorie counter doesn't capture.

## Bottom line

Sex burns roughly as much per minute as a brisk walk and considerably less per hour. If your goal is fat loss or cardiovascular fitness, walk. If your goal is connection, stress regulation, sleep quality, and the broader health markers that turn up in long-cohort studies, do both, and stop counting calories during.`,
    },
    {
      slug: "how-yoga-is-misunderstood-by-men",
      title: "How Yoga Is Misunderstood by Men",
      excerpt:
        "Yoga was developed by men, for male monastic discipline, for around two thousand years before it became a Western lifestyle category. The modern idea that it is gentle stretching for women is a marketing artefact. Here's the misalignment, and where men should actually start.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000004.jpg",
      publishedAt: new Date("2026-05-03T08:00:00Z"),
      body: `In a 2022 Yoga Alliance market survey, men were 28% of yoga practitioners in the United States, up from 17% a decade earlier but still well behind their share of gym-goers, runners, and weight trainers. The most common reasons men gave for not practising were variants of "I'm not flexible," "it looks like stretching," and "it's a women's thing."

All three are wrong on the historical and physiological evidence.

## Yoga was a men's discipline for most of its history

The earliest systematic text — Patanjali's *Yoga Sutras*, dated to around 400 BCE — is a manual for male renunciate monastics. The medieval Hatha Yoga texts (*Hatha Yoga Pradipika*, 15th century; *Gheranda Samhita*, 17th century) describe practices designed for celibate male yogins to prepare the body for long sitting meditation. The 20th-century reconstruction of yoga as a global modern discipline was driven by **T. Krishnamacharya** in Mysore (1888–1989), and by his three most influential students: **B.K.S. Iyengar**, **K. Pattabhi Jois**, and **T.K.V. Desikachar**. All male.

The first organised yoga classes for women in India were Krishnamacharya's *Indra Devi* lineage, established in the 1940s. The shift to a female-majority practice happened in the West, between roughly 1990 and 2010, driven by studio economics rather than the source tradition.

## "I'm not flexible enough" is backwards

Flexibility is the *output* of practice, not the prerequisite. A standard objection — "I can't even touch my toes, I shouldn't go to a class" — is the equivalent of "I can't run 5km, I shouldn't start running." Beginner yoga in any reputable lineage assumes you cannot touch your toes. The point is that you will be able to in twelve weeks.

The biomechanical literature is consistent: men carrying typical weight-training loads have measurably tighter hip flexors, hamstrings, and thoracic spines than untrained men. Those tightnesses correlate with lower-back pain (the most common male musculoskeletal complaint over thirty-five) and with reduced testosterone-mobilising hip movement in athletic populations. A regular yoga practice addresses exactly these tissues.

## "It's just stretching" misses the strength

A held *Chaturanga Dandasana* is a slow tricep push-up. *Plank* held for a minute is a heavier core load than most cable crunches. *Warrior 3* is a single-leg posterior-chain hold. *Crow* is a body-weight static press. *Handstand* is a full-body isometric.

Vinyasa and Ashtanga sequences move through dozens of these holds in an hour, with the fascia loaded throughout. The training stimulus is closer to gymnastic strength work than to static stretching. Iyengar yoga in particular, with its long held poses and prop-supported alignment, is closer to physical therapy meets bodybuilding for tissue under tension than to anything you'd find in a dance studio.

## Where men should actually start

- **Iyengar yoga.** Slow, technical, alignment-obsessed. Props are used liberally. The classes run on instruction, not vibes. Best for men with chronic lower-back, neck, or shoulder issues who want measurable progress.
- **Ashtanga (led primary series) or beginner Vinyasa.** Movement-based, sweaty, builds strength while opening the body. Good if your gym training is plateauing because of mobility.
- **Yin yoga, two evenings a week.** Long passive holds that target connective tissue. Excellent recovery work alongside heavy lifting; nothing else opens the hips like this.

## What to avoid as your first class

- Hot yoga sculpt, "yoga + HIIT," or anything advertised as a workout fusion. The injury rates are high and the form correction is low.
- Power-flow classes in dim rooms with loud music. Fine once you know the postures; not where to learn them.
- Anyone teaching headstand or arm balances in week one.

## A reasonable trial

Twelve weeks, two classes a week, in a single lineage with one teacher who watches your form. If at the end of twelve weeks your hip mobility, lower-back pain, sleep, and grip on stress are unchanged, the practice probably is not for you. Most men who do this find the result is unambiguous in the other direction.`,
    },
  ];

  for (const b of blogSeeds) {
    await prisma.blog.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        excerpt: b.excerpt,
        heroImage: b.heroImage,
        body: b.body,
        publishedAt: b.publishedAt,
      },
      create: b,
    });
  }
  console.log(`Seeded ${blogSeeds.length} blog post(s).`);

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
