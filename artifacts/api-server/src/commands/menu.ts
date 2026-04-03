import type { CommandContext } from "./context";

export async function menuCommand(ctx: CommandContext) {
  const { sock, jid, prefix, pushName } = ctx;

  const date = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const p = prefix;

  const menu =
    `*NUTTER-XMD* — Command Reference\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *User:* ${pushName}\n` +
    `🔡 *Prefix:* ${p}\n` +
    `📅 *Date:* ${date}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

    `🤖 *AI & Intelligence*\n` +
    `\`${p}gpt\` \`${p}gemini\` \`${p}deepseek\` \`${p}blackbox\`\n` +
    `\`${p}code\` \`${p}analyze\` \`${p}summarize\` \`${p}translate\`\n` +
    `\`${p}recipe\` \`${p}story\` \`${p}teach\` \`${p}generate\`\n\n` +

    `⬇️ *Downloads*\n` +
    `\`${p}youtube\` \`${p}song\` \`${p}tiktok\` \`${p}instagram\`\n` +
    `\`${p}twitter\` \`${p}facebook\` \`${p}gdrive\` \`${p}mediafire\`\n\n` +

    `🔊 *Audio*\n` +
    `\`${p}tomp3\` \`${p}toptt\` \`${p}bass\` \`${p}earrape\`\n` +
    `\`${p}reverse\` \`${p}robot\` \`${p}deep\`\n\n` +

    `😄 *Fun*\n` +
    `\`${p}fact\` \`${p}jokes\` \`${p}quotes\` \`${p}trivia\`\n` +
    `\`${p}truth\` \`${p}dare\` \`${p}truthordare\`\n\n` +

    `👥 *Group Management*\n` +
    `\`${p}kick\` \`${p}promote\` \`${p}demote\` \`${p}add\`\n` +
    `\`${p}invite\` \`${p}open\` \`${p}close\` \`${p}poll\`\n` +
    `\`${p}tagall\` \`${p}hidetag\` \`${p}kickall\`\n` +
    `\`${p}setgroupname\` \`${p}setdesc\`\n\n` +

    `🔍 *Search & Lookup*\n` +
    `\`${p}weather\` \`${p}define\` \`${p}imdb\`\n` +
    `\`${p}lyrics\` \`${p}yts\` \`${p}shazam\`\n\n` +

    `🛠️ *Utilities*\n` +
    `\`${p}sticker\` \`${p}emojimix\` \`${p}qrcode\` \`${p}tinyurl\`\n` +
    `\`${p}calculate\` \`${p}genpass\` \`${p}say\` \`${p}getpp\`\n` +
    `\`${p}fancy\` \`${p}fliptext\` \`${p}device\` \`${p}disk\`\n` +
    `\`${p}ping\` \`${p}runtime\` \`${p}time\` \`${p}vv\`\n\n` +

    `⚙️ *Settings*\n` +
    `\`${p}anticall\` \`${p}antilink\` \`${p}antisticker\`\n` +
    `\`${p}antitag\` \`${p}antibadword\` \`${p}autoread\`\n` +
    `\`${p}alwaysonline\` \`${p}autoviewstatus\` \`${p}autolikestatus\`\n` +
    `\`${p}mode\` \`${p}setprefix\` \`${p}setwelcome\`\n\n` +

    `👑 *Owner*\n` +
    `\`${p}block\` \`${p}unblock\` \`${p}delete\` \`${p}warn\`\n` +
    `\`${p}join\` \`${p}leave\` \`${p}setbio\` \`${p}restart\`\n\n` +

    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Send \`${p}<command>\` to run a command_\n` +
    `_Powered by *NUTTER-XMD*_`;

  await sock.sendMessage(jid, { text: menu });
}
