require("dotenv").config();

const express = require("express");
const { Bot, InputFile } = require("node-telegram-bot-api");
const sharp = require("sharp");

const { getMembers } = require("./sheets");
const { getTodaysBirthdays } = require("./birthdays");
const { downloadDriveImage } = require("./drive");
const { hasBeenAnnounced, markAsAnnounced } = require("./announcement");

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const app = express();

const PORT = process.env.PORT || 3000;

console.log("Starting MIVA Birthday Bot...");

// ========================================
// CHECK AND ANNOUNCE BIRTHDAYS
// ========================================

async function checkAndAnnounceBirthdays() {
  console.log("\n========================================");
  console.log("CHECKING BIRTHDAYS");
  console.log("========================================");

  const members = await getMembers();

  console.log(`Loaded ${members.length} unique member(s).`);

  const birthdays = getTodaysBirthdays(members);

  console.log(`Found ${birthdays.length} birthday(s) today.`);

  if (birthdays.length === 0) {
    console.log("No birthdays today.");

    return {
      found: 0,
      announced: 0,
    };
  }

  const pendingBirthdays = birthdays.filter(
    (member) => !hasBeenAnnounced(member),
  );

  console.log(
    `${pendingBirthdays.length} birthday announcement(s) still pending.`,
  );

  if (pendingBirthdays.length === 0) {
    console.log("All of today's birthdays have already been announced.");

    return {
      found: birthdays.length,
      announced: 0,
    };
  }

  let announcedCount = 0;

  for (const member of pendingBirthdays) {
    console.log("\n----------------------------------------");
    console.log(`Processing: ${member.name}`);
    console.log("----------------------------------------");

    try {
      const username = member.telegramUsername
        ? `@${member.telegramUsername}`
        : member.name;

      const caption =
        `🎉 <b>Happy Birthday, ${username}!</b> 🎂\n\n` +
        `Today we celebrate <b>${member.name}</b>! 🥳\n\n` +
        `Everyone at the MIVA Charity & Volunteering Club ` +
        `wishes you a beautiful birthday and an amazing year ahead.\n\n` +
        `Have a fantastic day! ❤️`;

      if (!member.profilePicture) {
        throw new Error("This member does not have a profile picture.");
      }

      console.log("Downloading photo...");

      const originalImage = await downloadDriveImage(member.profilePicture);

      console.log(`Original photo size: ${originalImage.length} bytes`);

      console.log("Compressing photo...");

      const compressedImage = await sharp(originalImage)
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          mozjpeg: true,
        })
        .toBuffer();

      console.log(`Compressed photo size: ${compressedImage.length} bytes`);

      console.log("Sending Telegram announcement...");

      await bot.api.sendPhoto({
        chat_id: process.env.TELEGRAM_GROUP_ID,
        photo: new InputFile(compressedImage, {
          filename: `${member.name}.jpg`,
          contentType: "image/jpeg",
        }),
        caption,
        parse_mode: "HTML",
      });

      console.log(`✅ Announcement sent for ${member.name}`);

      markAsAnnounced(member);

      console.log(`✅ ${member.name} marked as announced.`);

      announcedCount++;
    } catch (error) {
      console.error(`❌ Failed to announce ${member.name}:`, error);
    }
  }

  console.log("\n========================================");
  console.log("BIRTHDAY CHECK FINISHED");
  console.log("========================================");

  console.log(
    `Announcements sent: ${announcedCount}/${pendingBirthdays.length}`,
  );

  return {
    found: birthdays.length,
    announced: announcedCount,
  };
}

// ========================================
// TELEGRAM COMMANDS
// ========================================

bot.command("start", (ctx) => {
  ctx.reply("Hello! 👋 I'm the MIVA Charity & Volunteering Club bot.");
});

bot.command("whoami", (ctx) => {
  console.log(ctx.from);

  ctx.reply(
    `Your Telegram ID is: ${ctx.from.id}\n` +
      `Your username is: @${ctx.from.username || "none"}`,
  );
});

bot.command("chatid", (ctx) => {
  ctx.reply(`This chat's ID is: ${ctx.chat.id}`);

  console.log("Chat:", ctx.chat);
});

bot.command("testbirthday", async (ctx) => {
  try {
    await bot.api.sendMessage({
      chat_id: process.env.TELEGRAM_GROUP_ID,
      text: "🎉🎂 This is a test birthday announcement from the MIVA Charity & Volunteering Club bot!",
    });

    await ctx.reply("Birthday test sent! 🎉");
  } catch (error) {
    console.error("Test birthday failed:", error);

    await ctx.reply(
      `❌ Test birthday failed.\n\n${error.message || "Unknown error"}`,
    );
  }
});

bot.command("checkbirthdays", async (ctx) => {
  try {
    const result = await checkAndAnnounceBirthdays();

    if (result.found === 0) {
      await ctx.reply("There are no birthdays today. 🎂");

      return;
    }

    if (result.announced === 0) {
      await ctx.reply(
        "Today's birthday announcements have already been sent. 🎉",
      );

      return;
    }

    await ctx.reply(
      `Birthday announcements finished. 🎉\n\n` + `Sent: ${result.announced}`,
    );
  } catch (error) {
    console.error("Manual birthday check failed:", error);

    await ctx.reply("Sorry, I couldn't check the birthdays right now.");
  }
});

// ========================================
// EXPRESS SERVER
// ========================================

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "MIVA Birthday Bot is running.",
  });
});

// ========================================
// CRON ENDPOINT
// ========================================

app.get("/check-birthdays", async (req, res) => {
  try {
    const cronSecret = req.query.key;

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    console.log("\n⏰ Birthday check triggered by cron.");

    const result = await checkAndAnnounceBirthdays();

    return res.json({
      success: true,
      found: result.found,
      announced: result.announced,
    });
  } catch (error) {
    console.error("Cron birthday check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Birthday check failed.",
    });
  }
});

// ========================================
// START EVERYTHING
// ========================================

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

bot.startPolling();

console.log("Telegram bot polling started.");
