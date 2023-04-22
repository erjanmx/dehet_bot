const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const fetch = require('node-fetch');
const fs = require('fs');

async function downloadHTML(url, filename) {
  if (fs.existsSync(filename)) {
    console.log(`File '${filename}' already exists, skipping download`);
    return;
  }

  const response = await fetch(url);
  const html = await response.text();
  fs.writeFileSync(filename, html);
  console.log(`File '${filename}' saved`);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Hoi. Stuur me een woord en ik geef het lidwoord'));

bot.on(message('text'), async (ctx) => {
  const words = ctx.message.text.split(' ');

  if (words.length > 1) {
    ctx.reply('Stuur slechts één woord');
    return;  
  }
  
  const word = words[0].replace(/[^\w\s]|_/g, "").replace(/\s+/g, "").toLowerCase()
  const url = `https://www.welklidwoord.nl/${word}`;
  const filename = `pages/${word}.html`;

  try {
    await downloadHTML(url, filename);
    const html = fs.readFileSync(filename, 'utf-8');
    const value = html.match(/\<span\>(De|Het)<\/span>\s*[^<]*<\/h2>/)?.[1];
    ctx.reply(value ? `${value} ${word}` : `Geen resultaat voor '${word}'`);
  } catch (error) {
    console.error(`Error processing word '${word}':`, error);
    ctx.reply(`Sorry, er ging iets mis`);
  }
});

bot.launch();
