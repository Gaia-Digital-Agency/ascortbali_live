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
    { slot: "home-9",  title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-10", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-11", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-12", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-13", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-14", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-15", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-16", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-17", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-18", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-19", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
    { slot: "home-20", title: "", subtitle: "", image: "", ctaLabel: null, ctaHref: null },
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

  // ── Blog seeds (11 wellness/lifestyle articles) ───────────────────────────
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
    {
      slug: "cold-plunges-and-the-wim-hof-claims",
      title: "Cold Plunges and the Wim Hof Claims",
      excerpt:
        "The cold-plunge industry has built itself around a small set of charismatic claims and a much smaller set of robust studies. Here's what the published research actually supports, what it doesn't, and a conservative protocol for someone who wants to try it.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000005.jpg",
      publishedAt: new Date("2026-04-05T08:00:00Z"),
      body: `Wim Hof brought cold exposure into the mainstream wellness conversation around 2012. By 2024, "cold plunge" had crossed from a fringe biohack into hotel spa standard equipment. The marketing claims attached to this industry are wider than the published science.

## What the evidence actually supports

A few effects are robust across multiple controlled trials:

- **Acute mood lift.** A 1- to 5-minute cold-water immersion (~10–15 °C) reliably triggers a 200–250% rise in plasma noradrenaline. Subjective alertness and mood improve for several hours. Replicated in cold-water swimmers, finishers of contrast showers, and ice-bath protocols (Šrámek 2000, Janský 1996).
- **Reduced inflammation markers in trained users.** Long-term cold-adapters (regular winter swimmers, decade-plus practitioners) show measurably lower baseline inflammatory cytokines.
- **Recovery of perceived soreness.** Cold-water immersion right after eccentric exercise modestly reduces DOMS in the following 24–48 hours. The effect is real but small and likely psychological in part.

## What the evidence does NOT support

- **Boosted immunity in general use.** A single 2014 trial (Kox et al., *PNAS*) showed that the Wim Hof method — combining hyperventilation, breath-holds, and cold exposure — could blunt cytokine response to injected endotoxin. That study did not show that healthy people get sick less. Subsequent trials have been mixed at best.
- **Brown fat-driven fat loss.** Cold *can* activate brown adipose tissue, but the calorie burn from this is small (~50–100 kcal in lean adults at sustained exposure). It will not substitute for a caloric deficit.
- **"Resetting" the nervous system after a single plunge.** This is metaphor, not measurement. Vagal tone and HRV adapt with repeated practice, not from one cold session.
- **Curing depression / anxiety.** Cold exposure has shown small adjunctive benefit in a few small open-label trials. It is not a treatment.

## What it does well, in plain terms

It is a fast, reliable way to make yourself feel sharper and more present for the next 60–180 minutes. Done regularly it builds tolerance for discomfort and a small amount of metabolic resilience. That is a worthwhile psychological and minor physiological return, and it does not require the inflated claims to justify the practice.

## A conservative protocol

For a healthy adult with no cardiac issues:

1. Start with cold showers — last 30 seconds of an otherwise normal shower, gradually extending to 60–90 seconds.
2. Move to a tub of water at 12–15 °C. First session: 60 seconds. Add 30 seconds per session up to 3–5 minutes total. Do not exceed 5 minutes for general use.
3. Frequency: 3–4 times per week is plenty.
4. Always exit if you stop shivering and start to feel warm again — that's early hypothermia, not adaptation.
5. Do not combine extreme breath-holding (Wim Hof breathing) with submersion. The cluster of *shallow water blackout* drownings around viral breath-hold protocols is the single non-negotiable safety point in this entire field.

If you have heart disease, uncontrolled hypertension, Raynaud's, are pregnant, or are on beta-blockers — talk to a doctor before any cold-water immersion. The cardiac stress is real even when the rest of the claims are soft.`,
    },
    {
      slug: "why-men-over-35-should-lift-heavy",
      title: "Why Men Over 35 Should Lift Heavy",
      excerpt:
        "The single most reliable intervention against age-related decline is heavy resistance training. Not high-rep circuits, not yoga, not cardio — heavy compound lifts twice a week. Here's the evidence, and a practical starter programme.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000006.jpg",
      publishedAt: new Date("2026-03-29T08:00:00Z"),
      body: `Sarcopenia — age-related muscle loss — begins, on average, in the mid-thirties. The trajectory is well measured: roughly 1% loss per year in untrained men past 40, accelerating after 60. By 80 the average sedentary man has lost about half his muscle mass and a comparable share of his bone density.

The trajectory is not destiny. Resistance training, done with the right intensity, halts and partially reverses it. This is not a small effect; it is the single largest modifier of healthspan that exists outside of avoiding tobacco.

## What the evidence shows

- **Muscle protein synthesis remains responsive to load** at 70+ years old (Phillips lab, McMaster). Older muscle needs slightly more total protein and more stimulus to grow than young muscle, but it does grow.
- **Strength training reduces all-cause mortality** independent of cardio. A 2022 meta-analysis (Momma et al., *Br J Sports Med*) of 16 prospective cohorts found 10–17% reduction in all-cause mortality in adults who did 30–60 min/week of resistance training. Beyond ~60 min/week the curve flattens — a little goes a long way.
- **Bone density responds specifically to heavy load.** Walking, swimming, and cycling do not build bone. Squats, deadlifts, and overhead pressing do. The 2017 LIFTMOR trial showed that postmenopausal women doing high-load resistance training (5x5 at >80% 1RM) gained spine and femoral neck bone density in eight months, while a low-load control group continued losing it.
- **Glucose disposal improves.** Skeletal muscle is the body's largest sink for blood glucose. More muscle, better insulin sensitivity, lower fasting glucose. This is one of the strongest non-pharmacological interventions for pre-diabetic men over 40.

## What "heavy" means

Heavy means challenging your full musculoskeletal system, not isolation work. The exercises that consistently appear in productive programmes for men over 35:

- **Squat** (back or front)
- **Deadlift** (conventional, sumo, or trap-bar)
- **Bench press** (or floor press if shoulders won't tolerate it)
- **Overhead press**
- **Row** (barbell, dumbbell, or T-bar)
- **Pull-up** (assisted if needed)

Sets in the 3–6 rep range, weights in the 75–87% 1RM range, 2–3 working sets per lift, 2 sessions per week. That is enough.

## What about cardio?

Cardio is good. It is not a substitute. Zone-2 cardio (90 min/week) and resistance training (60 min/week) cover the major aging-related decline pathways with about 2.5 hours of weekly investment. They are complementary, not competing.

## A starter programme — eight weeks

Two sessions per week. Day A: squat, bench, row. Day B: deadlift, overhead press, pull-up. Three sets of five at a weight you could perform for about seven good reps. Add 2.5 kg per session as long as form holds. Stall? Drop 10%, work back up.

Find a coach for the first month. The cost of doing the heavy compounds with bad form is back surgery at 60. The cost of doing them with good form is staying upright and independent at 90.`,
    },
    {
      slug: "tantric-tradition-vs-tantric-workshop",
      title: "Tantric Tradition vs. The Tantric Workshop",
      excerpt:
        "What is sold as 'tantra' in modern wellness circles bears almost no relationship to the millennium-old tradition the word comes from. The result is a genuine practice tradition obscured by a popular branding category that mostly markets sensual touch.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000007.jpg",
      publishedAt: new Date("2026-03-22T08:00:00Z"),
      body: `When a Western wellness centre advertises a "tantra workshop," it almost always means one of two things: structured sensual touch as a couples exercise, or a partnered breath-and-eye-gazing practice in the lineage of Margot Anand and *The Art of Sexual Ecstasy* (1989). Neither is wrong as a practice on its own terms. Both are very loosely related to the actual Tantric tradition.

## What the tradition actually is

Tantra (from the Sanskrit root *tan*, "to weave") is a body of philosophical and ritual practice that crystallised in north and south India between roughly 500 and 1300 CE. It exists in Hindu, Buddhist, and Jain forms. Its core texts — the *Tantraloka* of Abhinavagupta, the *Vijnana Bhairava Tantra*, the Buddhist *Hevajra* and *Cakrasamvara* tantras — are concerned with metaphysics, ritual, mantra recitation, deity visualisation, and a model of the human being as a microcosm of cosmic energy.

A tiny minority of these texts contain what the academic literature calls "left-hand" or *vamacara* practices, which include ritual transgression of brahminical purity rules. Some of those practices are sexual. Most are not (they involve meat, alcohol, contact with the dead, or physical proximity to people from outside one's caste — a far broader transgressive category than just sex).

The single most important point: even within the small subset of Tantric practice that is sexual, the goal is *not pleasure*. It is the controlled use of an extreme physiological state as a vehicle for non-dual awareness. The historical practitioners were initiates with years of preparatory work in mantra, deity yoga, and breath control, working under a guru who controlled the timing and context.

## What the modern workshop usually offers

The contemporary "neo-tantra" workshop tradition, which traces back through Osho's ashram in Pune in the 1970s and 80s, takes a small kernel of these ideas — the body as sacred, sexual energy as potentially transformative — and combines it with modern somatic therapy, breathwork, and consent-conscious touch. Margot Anand's books, the work of David Deida, the Source School, and most weekend retreat offerings descend from this stream.

It is its own thing. At its best, it teaches couples to slow down, communicate explicitly about desire, and feel a wider register of sensation. That is a useful and good thing to teach. It is not Tantra in any meaningful textual or lineage sense, and treating it as such collapses a thousand-year tradition into a content marketing category.

## How to tell which is which

A teacher in the actual Tantric tradition can name their lineage, their guru, the textual source of any practice they teach, and almost certainly does not run weekend workshops as their primary offering. The work involves substantial mantra and meditation foundation before any sexual practice is introduced — usually years.

A neo-tantra teacher will speak in language drawn from somatic therapy and breath-awareness traditions, may reference Osho, Anand, or Deida, and is offering relational and experiential work. If that is what you are looking for, it is fine; just know that it is.

## Where to start if you want the actual tradition

The Hindu side: Christopher Wallis's *Tantra Illuminated* is the best non-academic introduction, and his *Embodied Awareness* lectures are the closest thing to a contemporary teacher in the Kashmir Shaivite stream. Read the *Vijnana Bhairava* in Lakshmanjoo's translation alongside it.

The Buddhist side: the Karma Kagyu and Nyingma schools both have functioning Vajrayana lineages that teach in the West. Reggie Ray's Dharma Ocean and Lama Tsultrim Allione's Tara Mandala are accessible entry points.

The actual practice is harder, slower, and ultimately less about sex than what the workshop economy is selling. It is also a substantially deeper tradition than the marketing category that borrowed its name.`,
    },
    {
      slug: "magnesium-which-form-actually-does-what",
      title: "Magnesium: Which Form Actually Does What It Claims",
      excerpt:
        "Eight different magnesium salts are sold under the same heading. They behave very differently in the body, and most of the marketing claims attached to one salt are derived from studies of another. Here's a sorting of which form is for which goal.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000008.jpg",
      publishedAt: new Date("2026-03-15T08:00:00Z"),
      body: `Magnesium is one of the few mineral supplements where mainstream nutritional research, sleep medicine, and sports performance literature actually agree: most adults are running below the RDA (about 400 mg/day for men), and supplementing brings measurable improvements in sleep quality, leg-cramp frequency, and stress reactivity.

The trouble is "magnesium" on a supplement label means any of about eight different chemical forms with very different absorption profiles and tissue affinities. Buying the wrong one for your goal is the single most common mistake.

## The forms that matter

| Form | Bioavailability | Best for | Avoid for |
|---|---|---|---|
| **Glycinate** (bisglycinate) | High | Sleep, stress, muscle relaxation | — |
| **Threonate** | Moderate (CNS-targeted) | Cognitive function (only form crossing blood-brain barrier well) | General-purpose |
| **Citrate** | Moderate-high | Constipation, general top-up | Sleep (mildly stimulating in some) |
| **Malate** | High | Daytime energy, fibromyalgia adjunct | Bedtime |
| **Taurate** | Moderate | Cardiovascular, blood pressure | — |
| **Oxide** | Low (~4%) | Cheap antacid; mostly laxative | Anything except budget bulk dosing |
| **Sulfate (Epsom salt)** | Topical only (debated absorption) | Bath soak, localised muscle | Oral use |
| **Chloride** | High | Topical sprays, transdermal | Oral (very bitter) |

## What the evidence supports

- **Glycinate for sleep** — the most-replicated finding. 200–400 mg taken 30–60 minutes before bed improves sleep onset and self-reported sleep quality in adults with subclinical insomnia. Glycine itself is sleep-promoting, so the salt is doing double duty.
- **Threonate for cognition** — small but consistent studies show improved working memory and attention in older adults. The specific advantage is that magnesium L-threonate is the only commonly available form that meaningfully raises brain magnesium levels.
- **Citrate or oxide for constipation** — both work as osmotic laxatives. Cheap, effective. Not what you want at bedtime if you are using magnesium for sleep.
- **Taurate for blood pressure** — modest effects (3–5 mmHg systolic reduction) in mildly hypertensive adults. Not a substitute for ACE inhibitors but a reasonable adjunct.

## What the evidence does NOT support

- **Topical "magnesium oil" sprays** for systemic deficiency. The skin absorbs vanishingly little. A bath in Epsom salts is pleasant; the magnesium absorption claim is mostly marketing.
- **Magnesium for migraines as a one-size-fix.** A small subgroup of migraineurs respond. Most do not.
- **Megadosing** anything above ~600 mg/day from supplements. The kidneys clear excess magnesium efficiently in healthy adults — the result is loose stools, not benefit.

## A practical default

If you want one bottle in the cabinet:

- Magnesium glycinate, 200–300 mg, taken 30–45 minutes before sleep. This will cover most of the deficit without GI side effects and improves sleep for the majority of people who try it.
- If your goal is daytime energy or constipation: citrate, 200 mg with breakfast.
- If cognition is the priority: threonate at the manufacturer-recommended dose, in the morning.

Avoid: combination products that mix oxide with anything else (the oxide both pads the milligram count and reduces absorption of the better forms). Read the label for the specific salt; "magnesium" alone is meaningless.

People with chronic kidney disease should not supplement magnesium without medical supervision — the renal clearance assumption above does not hold.`,
    },
    {
      slug: "bali-for-solo-male-travelers",
      title: "Bali for Solo Male Travelers — What Locals Wish You Knew",
      excerpt:
        "Solo male travelers to Bali fall into one of two patterns: a ten-day Canggu loop with surf and beach clubs, or a deeper, longer stay that actually meets the place. The difference is mostly about a handful of small choices in the first 48 hours.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000009.jpg",
      publishedAt: new Date("2026-03-08T08:00:00Z"),
      body: `Bali handles around 5 million foreign visitors a year. A growing minority — roughly a third in the post-2022 surge — are men traveling alone. Most do not get past the South Bali corridor (Canggu, Seminyak, Uluwatu) and most leave with the same compressed version of the island they arrived with.

The actual island is extraordinary. Reaching it requires only a few different decisions. This piece collects what longtime expats and locals say to nearly every solo male newcomer they meet — usually around day three, when the questions start.

## Where you stay shapes everything

Canggu and Seminyak are designed around foreign tourists. They are real, they are fun, and they are about as Balinese as a Marriott lobby. If you have a week, splitting time is the move:

- **3 nights South** (Canggu/Uluwatu) for the surf-beach-bar experience.
- **3 nights Ubud or East** (Sidemen, Amed, Munduk) for actual Bali — terraced rice fields, ceremonies you'll walk past on side roads, no other foreigners after dark.
- **1 buffer night** for the bus or motorbike ride between, because Bali traffic on Highway 1 is its own thing.

If you have only 4 days, do Ubud and skip Canggu. You can find Canggu in any beach town in the world. You cannot find Ubud anywhere else.

## Get a local sim and Grab on day one

Skip the international roaming charge. A Telkomsel or XL prepaid SIM at the airport runs about 150,000 IDR ($10) for 30 days of unlimited data. Install **Grab** for transport and **GoFood** for delivery. Both are how the island actually moves — taxis at the curb in Kuta will charge 4–5x the Grab rate to a foreigner who doesn't know.

## Money

ATMs at major banks (BCA, Mandiri) work fine. Avoid the standalone ATMs in tourist alleys; they have been the source of card-skimming complaints for years. Tell your bank you're traveling so they don't freeze the card on the first withdrawal. Carry small notes — most warungs (local food stalls) cannot break a 100,000 IDR.

## Food: the actual rule

The "tourist tummy" complaint is real but specific. The two patterns that consistently cause it are: (1) ice from unfiltered water in cheaper places, (2) cut fruit that has been sitting at room temperature since morning. Hot, freshly-cooked food at a busy warung is statistically safer than the buffet at a five-star resort. Eat where the local office workers eat at lunchtime. *Nasi campur* (mixed rice plate) at a clean warung is 25,000 IDR and as good as anything you'll have in a $40 restaurant.

## Things to actually do (that aren't on the first page of TripAdvisor)

- Walk the **Campuhan Ridge** at sunrise. Yes, it's "famous." Be there at 6:30 a.m. and you'll have it nearly to yourself.
- Hire a guide and walk into a **traditional cremation** if one is happening — they're public events and visitors are welcome if you dress respectfully (sarong + sash). They are unlike any funeral you've been to.
- **Sidemen** for terraced rice and zero nightlife. Stay at a small homestay; eat where they tell you to.
- **Munduk** for the cool mountain interior. Coffee plantations, waterfalls, near-empty roads.
- **Amed** for diving without the Komodo price tag. The wreck of the USS Liberty is one of the easiest world-class shore dives anywhere.

## What locals quietly wish more solo male visitors understood

- **Dress.** Singlets and bare chests in a temple complex aren't edgy; they read as deliberate disrespect. Sarongs are provided at most temple entrances. Wear them. A simple t-shirt off-temple is fine.
- **The "Bali belly" jokes get old.** It is mostly a sign of the visitor having eaten in places designed for visitors.
- **Public ceremonies belong to the community, not your Instagram.** Photograph if invited. Lower the camera if you sense you shouldn't.
- **Tipping is not expected** at warungs but is appreciated at hotels and for guides, around 10%.
- **The drug economy is a trap.** Indonesia has some of the world's strictest narcotics enforcement and 2024 saw multiple long sentences for foreigners on small possession charges. Whatever someone offers you on a beach in Kuta, decline it.

The island rewards a slower week dramatically more than a faster one. Most solo travelers who come back second or third time say the same thing: they wish they'd stayed longer the first time.`,
    },
    {
      slug: "morning-sunlight-beats-your-sleep-app",
      title: "Morning Sunlight Beats Your Sleep App",
      excerpt:
        "Of all the modern sleep interventions sold to overworked adults, the highest-evidence one is also the cheapest: ten minutes of morning sunlight in your eyes within an hour of waking up. The trackers and gummies aren't moving the needle the way this does.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000010.jpg",
      publishedAt: new Date("2026-03-01T08:00:00Z"),
      body: `The sleep-tech industry will reach roughly $112 billion in 2026. Most of what it sells — wearable trackers, sleep gummies, weighted blankets, magnesium combinations, smart mattresses — produces small effects on real sleep architecture, sometimes even improving subjective scores while measurable sleep stays unchanged.

Underneath all of that, one intervention has more evidence than the rest combined and costs nothing: getting bright outdoor light into your eyes within the first hour after waking up.

## How the system actually works

The suprachiasmatic nucleus (SCN) — a tiny cluster of neurons in the hypothalamus — is the master clock for the body's circadian system. It is set by light, specifically by intrinsically photosensitive retinal ganglion cells (ipRGCs) in the eye that respond to short-wavelength (blue) light around 480 nm.

When you get bright morning light:

1. Cortisol awakening response sharpens — the natural morning cortisol pulse rises and falls cleanly, leaving you alert in the day and able to come down at night.
2. Melatonin onset shifts earlier — typically by 30–90 minutes — meaning you feel sleepy at a more useful time that evening.
3. Body temperature curve shifts earlier, supporting sleep-onset latency.
4. Tonic dopaminergic tone in the prefrontal cortex rises slightly during daylight hours, which the literature ties to mood and motivation.

The exposure threshold is much higher than people assume. Indoor office lighting is around 100–500 lux. A bright overcast day outside is 10,000–25,000 lux. Direct sun is 50,000–100,000 lux. The ipRGCs need outdoor levels — looking out a closed window through a coffee cup of morning light is not enough.

## What the published research shows

- **Phase-shift studies** (Czeisler, Wright, others) consistently show 10–30 minutes of morning bright light advances the circadian phase by about an hour over 3–5 days.
- **Mood and depression** — bright light therapy boxes (10,000 lux at 30 cm) are the established non-pharmacological treatment for seasonal affective disorder. Mechanism appears to be the same circadian system.
- **Athletic performance** — multiple sports-science groups have measured improved reaction time and reduced perceived exertion in afternoon-evening training when athletes do morning bright light.
- **Older adults** show particularly strong effects. Age-related sleep fragmentation correlates well with reduced light exposure (less time outdoors); supplemental morning light improves sleep continuity.

## The protocol

It is unfussy:

- **Within 30–60 minutes of waking**, get outside.
- **10 minutes minimum** on a clear day, **20–30 minutes** on overcast.
- **Don't look at the sun directly.** You're not staring at it; you're standing in its general direction with eyes open at the horizon.
- **No sunglasses** during this exposure — they substantially attenuate the wavelengths that drive the response.
- **Through a window doesn't work** — most window glass blocks 30–50% of the relevant short-wavelength light, and you're typically getting an order of magnitude less lux indoors anyway.
- Walking, drinking your coffee, watering plants — all fine. The activity is irrelevant; the light is the active ingredient.

## Bookend with low light at night

The companion intervention is reducing bright light exposure for the 2 hours before sleep. Dim the rooms you're in. If you must be on a screen, drop the brightness. Switch overhead lighting to warm-white (2700K or below). Wearing blue-blockers actually has weaker evidence than just dimming the room.

## Why apps and trackers underperform this

A sleep tracker can tell you that you slept badly. It can not change the upstream input that controls when your sleep system thinks night is. Light timing is upstream of almost every variable a tracker measures.

If you do nothing else from this article, do this one. The cost is fifteen minutes of your morning. The return is measurable in a week.`,
    },
    {
      slug: "indonesian-coffee-tasting-tour",
      title: "Indonesian Coffee: A Tasting Tour Through the Archipelago",
      excerpt:
        "Indonesia is the world's fourth-largest coffee producer and most travelers leave having tasted only one of its many distinct regional profiles. Here's a working introduction to Sumatra, Java, Bali, Flores, Toraja, and the rare estates above 1,500 m.",
      heroImage: "/api/uploads/baligirls/blogs/1715000000011.jpg",
      publishedAt: new Date("2026-02-22T08:00:00Z"),
      body: `Indonesia produced roughly 760,000 tonnes of green coffee in the 2024–25 crop year, behind only Brazil, Vietnam, and Colombia. The bean profile that most foreigners associate with Indonesia — earthy, low-acid, full-bodied "Sumatra" — is one of at least six meaningfully distinct regional styles. The country grows a wider span of coffee than nearly anywhere else.

Some of that is geography (volcanic soil, equatorial latitude, altitudes from 800 to 2,000 m). Some is processing (the wet-hulled "Giling Basah" method that gives much Indonesian coffee its signature mouthfeel exists almost nowhere else at scale). And some is the long colonial history that put Arabica seedlings in nearly every fertile mountain region of the archipelago by the late 1700s.

## The big six origins to know

**Sumatra (Mandheling, Lintong, Gayo).** The reference Indonesian profile. Wet-hulled processing creates the heavy body, low acidity, and the dark, herbaceous, sometimes earthy notes (cedar, tobacco, baker's chocolate) that defined Indonesia for the specialty market. Aceh's Gayo highlands now produce some of the cleanest examples; the Mandheling region's traditional lots are heavier and more polarising.

**Java.** The original — "java" as a synonym for coffee comes from the Dutch East India Company plantings here in the 1690s. Modern Java coffee is brighter and cleaner than Sumatran, more chocolate and less earth. The Ijen plateau and Pengalengan are the regions to look for.

**Bali (Kintamani).** Grown in the volcanic shadow of Mount Batur. Sweeter, citric, often with a distinct orange-peel character that distinguishes it from Sumatran heaviness. Most Bali-bought coffee in cafés around the island is from this region. Around 1,300–1,600 m altitude, mostly Bourbon and Typica varietals.

**Flores (Bajawa, Manggarai).** Smaller in volume, often missed by general visitors. The Bajawa highlands in central Flores produce some of the most chocolate-forward, syrupy-bodied coffee in the country, with a distinct vanilla or floral lift on the cleaner lots. If you see a Bajawa pourover on a Bali café menu, order it.

**Toraja (Sulawesi).** Grown in the highlands of the Toraja regency. The wet-hulled Sulawesi profile sits between Sumatra and Java — earthier than Java, cleaner than Sumatra, with a sweet nuttiness (almond, brown sugar) that's hallmark Toraja. The traditional Tongkonan houses and burial cliffs of this region are also one of the country's most distinctive cultural landscapes.

**Papua (Wamena, Baliem).** The newest origin to reach specialty markets. Grown by smallholders in the Baliem Valley at 1,500–2,000 m, traditional dry processing, very limited volume. When you find Papuan single-origin in Jakarta or Bali specialty shops, the cup is bright and complex — passionfruit, blackcurrant, and the body still distinctly Indonesian.

## Brewing — what to drink it as

Sumatran and Toraja shine in dark-roast espresso and as the base of a flat white; the body is doing work the brighter African coffees can't match.

Bali Kintamani, Bajawa, and Java do better as a medium-roast pourover or AeroPress where the citric and sugar notes can lift.

The traditional Indonesian street-coffee preparation, **kopi tubruk** — coarse-ground coffee dumped into a glass, hot water poured over, drunk after the grounds settle — is genuinely good with Sumatran beans and not at all with brighter ones. Order it at warungs to taste the local style.

## What about kopi luwak?

Skip it. The animal-welfare reality of caged civet farms across Indonesia and the Philippines was substantively documented by 2013 and has not improved. There is some genuinely wild-foraged civet coffee, but at retail you cannot reliably distinguish it from the farmed product, and the farmed product is bad ethically and only mediocre in cup. Use the budget on a Bajawa or a Gayo single origin instead — better coffee at a lower price with no civet involved.

## Where to buy in Bali

The supermarket shelves carry decent grocery-grade single-origin (Kopi Kapal Api's Toraja line is reliable). For specialty, the Canggu and Ubud roaster scene has matured — places like **Revolver Espresso**, **Anomali**, **Kaffeine**, and **Crate Café** roast in small batches and will sell you 250 g bags of fresh single-origin. Ask which farms the lot is from; the good ones can answer.

If you have luggage room, buying a kilo of fresh Bajawa or Gayo at the airport is one of the better things you can take home. The price is roughly 1/3 of what the same beans cost imported into Europe or Australia.`,
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
