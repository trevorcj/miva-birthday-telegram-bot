require("dotenv").config();

const express = require("express");
const { Bot, InputFile } = require("node-telegram-bot-api");
const sharp = require("sharp");

const { getMembers } = require("./sheets");
const { getTodaysBirthdays } = require("./birthdays");
const { downloadDriveImage } = require("./drive");
const { hasBeenAnnounced, markAsAnnounced } = require("./announcement");
const {
  getBearerToken,
  isAdminUser,
  isEnabled,
  isPrivateChat,
  isProductionChat,
} = require("./config");

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const app = express();

const PORT = process.env.PORT || 3000;

let birthdayCheckRunning = false;
let lastBirthdayCheck = {
  completedAt: null,
  error: null,
  found: null,
  announced: null,
};

function isProductionGroup(chatId) {
  return isProductionChat(chatId, process.env.TELEGRAM_GROUP_ID);
}

async function requirePrivateAdmin(ctx) {
  if (!isPrivateChat(ctx.chat)) {
    console.warn("Ignored an operational command outside a private chat.");

    return false;
  }

  if (!isAdminUser(ctx.from?.id)) {
    console.warn(`Unauthorized admin command from Telegram user ${ctx.from?.id}.`);
    await ctx.reply("You are not authorized to use this command.");

    return false;
  }

  return true;
}

function recordSuccessfulBirthdayCheck(result) {
  lastBirthdayCheck = {
    completedAt: new Date().toISOString(),
    error: null,
    ...result,
  };

  return result;
}

// checks today's birthdays and announces them in the Telegram group

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

    return recordSuccessfulBirthdayCheck({
      found: 0,
      announced: 0,
    });
  }

  const pendingBirthdays = [];

  for (const member of birthdays) {
    const alreadyAnnounced = await hasBeenAnnounced(member);

    if (alreadyAnnounced) {
      console.log(`Already announced: ${member.name}`);
    } else {
      pendingBirthdays.push(member);
    }
  }

  console.log(
    `${pendingBirthdays.length} birthday announcement(s) still pending.`,
  );

  if (pendingBirthdays.length === 0) {
    console.log("All of today's birthdays have already been announced.");

    return recordSuccessfulBirthdayCheck({
      found: birthdays.length,
      announced: 0,
    });
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
        `<b>Happy Birthday, ${username}! 🎂🎉</b>\n\n` +
        `Today we celebrate <b>${member.name}</b>! 🥳\n\n` +
        `Everyone at the MIVA Charity & Volunteering Club ` +
        `wishes you a beautiful birthday and an amazing year ahead 🥂.\n\n` +
        `Have a fantastic day! ❤️`;

      if (!member.profilePicture) {
        throw new Error("This member does not have a profile picture.");
      }

      console.log(`Downloading photo for ${member.name}...`);

      const originalImage = await downloadDriveImage(member.profilePicture);

      console.log(`Photo downloaded: ${originalImage.length} bytes`);

      console.log(`Compressing photo for ${member.name}...`);

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

      console.log(`Compressed photo: ${compressedImage.length} bytes`);

      console.log(`Sending Telegram photo for ${member.name}...`);

      await bot.api.sendPhoto({
        chat_id: process.env.TELEGRAM_GROUP_ID,
        photo: new InputFile(compressedImage, {
          filename: `${member.name}.jpg`,
          contentType: "image/jpeg",
        }),
        caption,
        parse_mode: "HTML",
      });

      console.log(`Telegram announcement sent for ${member.name} ✅`);

      await markAsAnnounced(member);

      console.log(`${member.name} marked as announced ✅`);

      announcedCount++;
    } catch (error) {
      console.error(`Failed to announce ${member.name} ❌:`, error);
    }
  }

  console.log("\n========================================");
  console.log("BIRTHDAY CHECK FINISHED");
  console.log("========================================");

  console.log(
    `Announcements sent: ${announcedCount}/${pendingBirthdays.length}`,
  );

  const result = {
    found: birthdays.length,
    announced: announcedCount,
  };

  return recordSuccessfulBirthdayCheck(result);
}

// commands

bot.command("start", async (ctx) => {
  if (!isPrivateChat(ctx.chat)) {
    return;
  }

  await ctx.reply("Hello! 👋 I'm the MIVA Charity & Volunteering Club bot.");
});

bot.command("whoami", async (ctx) => {
  if (!isPrivateChat(ctx.chat)) {
    return;
  }

  console.log(ctx.from);

  await ctx.reply(
    `Your Telegram ID is: ${ctx.from.id}\n` +
      `Your username is: @${ctx.from.username || "none"}`,
  );
});

bot.command("chatid", async (ctx) => {
  if (isProductionGroup(ctx.chat?.id)) {
    console.warn("Ignored a chat ID request in the production group.");

    return;
  }

  if (!isAdminUser(ctx.from?.id)) {
    console.warn(`Unauthorized chat ID request from Telegram user ${ctx.from?.id}.`);

    if (isPrivateChat(ctx.chat)) {
      await ctx.reply("You are not authorized to use this command.");
    }

    return;
  }

  await ctx.reply(`This chat's ID is: ${ctx.chat.id}`);

  console.log("Non-production chat ID requested.");
});

bot.command("testbirthday", async (ctx) => {
  if (!(await requirePrivateAdmin(ctx))) {
    return;
  }

  try {
    const testChatId = process.env.TELEGRAM_TEST_CHAT_ID;

    if (!testChatId) {
      throw new Error("TELEGRAM_TEST_CHAT_ID is not configured.");
    }

    if (isProductionGroup(testChatId)) {
      throw new Error("The test chat must not be the production group.");
    }

    await bot.api.sendMessage({
      chat_id: testChatId,
      text:
        "This is a test-only birthday announcement from the " +
        "MIVA Charity & Volunteering Club bot! 🎉🎂",
    });

    await ctx.reply("Birthday test sent! 🎉");
  } catch (error) {
    console.error("Test birthday failed:", error);

    await ctx.reply(
      `Test birthday failed ❌.\n\n${error.message || "Unknown error"}`,
    );
  }
});

bot.command("checkbirthdays", async (ctx) => {
  if (!(await requirePrivateAdmin(ctx))) {
    return;
  }

  if (!isEnabled(process.env.ALLOW_MANUAL_PRODUCTION_BIRTHDAY_CHECKS)) {
    await ctx.reply(
      "Manual production birthday checks are disabled. Use the scheduled job instead.",
    );

    return;
  }

  if (birthdayCheckRunning) {
    await ctx.reply("A birthday check is already running. Please wait. ⏳");

    return;
  }

  birthdayCheckRunning = true;

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

    lastBirthdayCheck = {
      ...lastBirthdayCheck,
      completedAt: new Date().toISOString(),
      error: error.message || "Unknown error",
    };

    await ctx.reply("Sorry, I couldn't check the birthdays right now.");
  } finally {
    birthdayCheckRunning = false;
  }
});

// express server

app.get("/", (req, res) => {
  res.status(200).send("MIVA Birthday Bot is running.");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    birthdayCheckRunning,
    lastBirthdayCheck,
  });
});

// cron endpoints

app.get("/check-birthdays", async (req, res) => {
  const cronSecret = getBearerToken(req.get("authorization"));

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    console.warn("Unauthorized cron request.");

    return res.status(401).send("Unauthorized.");
  }

  if (birthdayCheckRunning) {
    console.log("Birthday check already running.");

    return res.status(200).send("Birthday check already running.");
  }

  birthdayCheckRunning = true;

  try {
    console.log("\nBirthday check triggered by cron. ⏰");

    const result = await checkAndAnnounceBirthdays();

    console.log(
      `Cron job complete. Found: ${result.found}, Announced: ${result.announced}`,
    );

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Cron birthday check failed:", error);

    lastBirthdayCheck = {
      ...lastBirthdayCheck,
      completedAt: new Date().toISOString(),
      error: error.message || "Unknown error",
    };

    return res.status(500).send("Birthday check failed.");
  } finally {
    birthdayCheckRunning = false;
  }
});

// start server

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

bot.startPolling();

console.log("Telegram bot polling started.");
