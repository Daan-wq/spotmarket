import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SYSTEM_PRESETS = [
  {
    title: "Cake Bear Gift Box Promo",
    language: "zh",
    category: "engagement",
    body: `#\u{1F382}\u{8981}\u{600E}\u{9EBC}\u{4E0D}\u{7D93}\u{610F}\u{7684}\u{8B93}\u{53E6}\u{4E00}\u{4E00}\u{534A}\u{770B}\u{5230}\u{9019}\u{7BC7}\u{6587}\u{1F440} \u{5100}\u{5F0F}\u{611F}\u{6EFF}\u{6EFF}\u{1F233}\u{1F51C}\u{86CB}\u{7CD5}\u{5C0F}\u{718A}\u{881F}\u{71ED}\u{65CB}\u{8F49}\u{8932}\u{76D2}\u{1F56F}\uFE0F \u{563F}~\u{9589}\u{4E0A}\u{773C}\u{775B}\uFF5E\u{8A31}\u{500B}\u{9858}\u{5427}\u{2728} \u{5E0C}\u{671B}\u{4F60}\u{7684}\u{9858}\u{671B}\u{6703}\u{5BE6}\u{73FE} \uFF08\u{5077}\u{5077}\u{6309}\u{4E0B}\u{6A5F}\u{95DC}\uFF09\u{6709}\u{6211}\u{5E6B}\u{4F60}\u{6E96}\u{5099}\u{7684}\u{5C0F}\u{9A5A}\u{559C}\u{5537} \u26A0\uFE0F \u{5546}\u{54C1}\u{662F}\u{86CB}\u{7CD5}\u{5C0F}\u{718A}\u{6A5F}\u{95DC}\u{76D2} \u{6C92}\u{6709}\u{9644}\u{6212}\u{6307}\u{1F48D}\u{79AE}\u{7269}\u{8981}\u{81EA}\u{5DF1}\u{6E96}\u{5099}\u{5537} \u{6D41}\u{884C}\u{5468}\u{908A}\u{597D}\u{7269}\u{63A8}\u{85A6}\u{641C}\u{5C0B} \u{2728} \u{73A9}\u{5177}\u{516C}\u{4ED4}\u{641C}\u{5C0B}\u{1F50D} \u{5BF5}\u{7269}\u{5468}\u{908A}\u{641C}\u{5C0B} \u{1F50D} \u{52D7}\u{65B0}\u{5546}\u{54C1}\u{8CC7}\u{8A0A}\u{8ACB}\u{770B}\u{9650}\u{6642}\u{52D5}\u{614B}\u{7CBE}\u{9078}\u{1F4AD} \u{4E0B}\u{55AE}\u{65B9}\u{5F0F}\u{1F6D2} \u{1F51C}\u{7559}\u{8A00}\u201C+1\uFF1B\u{5C0F}\u{7DE8}\u{706B}\u{901F}\u{56DE}\u{8986}\u{4F60}\u{4E0B}\u{55AE}\u{8CC7}\u{8A0A} \u{1F51C}\u{7559}\u{8A00}\u201C+1\uFF1B \u{5C0F}\u{7DE8}\u{706B}\u{901F}\u{56DE}\u{8986}\u{4F60}\u{4E0B}\u{55AE}\u{8CC7}\u{8A0A} \u{53EF}\u{81EA}\u{884C}\u{622A}\u{5716}\u{5546}\u{54C1}\u{79C1}\u{8A0A}\u{8CFC}\u{8CB7}\u{203C}\uFE0F \u{4ED8}\u{6B3E}\u{65B9}\u{5F0F} \u{53F0}\u{7063}\u{5730}\u{1F4E6}\u{532F}\u{6B3E}\u3001ATM\u{8F49}\u{5E33}\uFF08\u{53EF}\u{7121}\u{647A}\uFF09\u3001\u{8857}\u{53E3}\u{652F}\u{4ED8} \u{652F}\u{6301}\u{5168}\u{7403}\u{9806}\u{8C50}\u{914D}\u{9001}\u{1F30D}\u{5FAE}\u{4FE1}\u3001\u{652F}\u{4ED8}\u{5BF6}\u{6536}\u{6B3E} \u{570B}\u{5916}\u{914D}\u{9001}\u{7D04}2\u{9031}\u{5DE6}\u{53F3} \u{56E0}\u{5929}\u{6C23}\u3001\u{4E0D}\u{53EF}\u{63A7}\u{56E0}\u{7D20}\u{53EF}\u{80FD}\u{5EF6}\u{8AA4} \u{80FD}\u{63A5}\u{53D7}\u{518D}\u{4E0B}\u{55AE}\u{1F5F3}\uFE0F\u{53EF}\u{8A62}\u{554F}\u{5BA2}\u{670D}\u{914D}\u{9001}\u{9032}\u{5EA6}`,
  },
  {
    title: "Japan Piezoelectric Tech Facts",
    language: "en",
    category: "educational",
    body: `#\u{1F1EF}\u{1F1F5}Japan is turning footsteps into electricity!
Using piezoelectric tiles, every step you take generates a small amount of energy. Millions of steps together can power LED lights and displays in busy places like Shibuya Station. A brilliant way to create a sustainable and smart city \u2022 turning movement into renewable energy.

#Japan #Technology #Innovation #Sustainability #SmartCity #PiezoelectricTiles #RenewableEnergy #GreenTech #ShibuyaStation #DidYouKnow`,
  },
  {
    title: "Korean Movie Review",
    language: "ko",
    category: "engagement",
    body: `1997\uB144 \uAC1C\uBD09\uD55C \uC601\uD654 Titanic\uC740 \uC7AD\uACFC \uB85C\uC988\uC758 \uC6B4\uBA85\uC801\uC778 \uC0AC\uB791\uC744 \uD1B5\uD574 \uBE44\uADF9 \uC18D\uC5D0\uC11C\uB3C4 \uC624\uB798 \uB0A8\uB294 \uAC10\uC815\uC758 \uAE4A\uC774\uB97C \uBCF4\uC5EC\uC8FC\uB294 \uC791\uD488\uC785\uB2C8\uB2E4.

\uD654\uB824\uD55C \uC5F0\uCD9C\uBCF4\uB2E4 \uC778\uBB3C\uC758 \uAC10\uC815\uC5D0 \uB354 \uC9D1\uC911\uD55C \uC81C\uC784\uC2A4 \uCE74\uBA54\uB860 \uAC10\uB3C5\uC758 \uC2A4\uD0C0\uC77C\uC740 \uC9C0\uAE08 \uB2E4\uC2DC \uBD10\uB3C4 \uBBD8\uD558\uAC8C \uAC00\uC2B4\uC744 \uC6B8\uB9AC\uC8E0.

\uC774 \uAC10\uC815\uC744 \uC644\uC131\uD574\uC8FC\uB294 \uACE1\uC774 \uBC14\uB85C \uC140\uB9B0 \uB514\uC628\uC758 "My Heart Will Go On"\uC785\uB2C8\uB2E4.

1998\uB144 \uC544\uCE74\uB370\uBBF8 \uC8FC\uC81C\uAC00\uC0C1\uC744 \uBE44\uB86F\uD574 \uC5EC\uB7EC \uC0C1\uC744 \uD718\uC4F4 \uAC74 \uB2E8\uC9C0 \uC778\uAE30 \uB54C\uBB38\uB9CC\uC740 \uC544\uB2D9\uB2C8\uB2E4.

#Titanic #MyHeartWillGo #\uC601\uD654\uCD94\uCC9C #\uAC10\uC131 #\uBA85\uC791`,
  },
  {
    title: "Head Tilt Delay Phenomenon",
    language: "en",
    category: "viral",
    body: `The "Head Tilt Delay" Phenomenon That Has Gen Z Absolutely Losing Their Minds \u{1F928}\u26A1\u{1FAE0}

There's a new trend blowing up called the Head Tilt Delay Phenomenon, and it's making everyone feel like their body has its own secret loading screen. The challenge is simple: record yourself turning your head slightly while listening to someone or reacting to something. But when people replay the clip in slow-mo, they swear their head moves a millisecond after their expression changes \u2014 like their face reacts first and the rest of the body clocks in late. Gen Z is calling it "reaction lag," Gen Alpha says it's "your head buffering," and comment sections are full of people screaming that they look like a desynced video game character.

The theories are next-level chaotic. Some creators think it's your brain firing off micro-reactions before your muscles fully respond. Others blame camera rolling shutter, stretching the motion just enough to make the delay look suspiciously clean. And then there's TikTok's unhinged side claiming it's "your avatar switching camera angles" or "your reaction loading before your hardware catches up." Whatever the cause, people are now filming themselves like they're testing a glitchy character model, hunting for that split-second delay that makes reality feel slightly\u2026 off. \u{1FAE0}\u2728`,
  },
];

async function seed() {
  console.log("Seeding caption presets...");

  for (const preset of SYSTEM_PRESETS) {
    const existing = await prisma.captionPreset.findFirst({
      where: { userId: null, title: preset.title },
    });

    if (existing) {
      console.log(`  Skipping "${preset.title}" (already exists)`);
      continue;
    }

    await prisma.captionPreset.create({
      data: { userId: null, ...preset },
    });
    console.log(`  Created "${preset.title}"`);
  }

  console.log("Done.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
