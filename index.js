const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');


function buildUrl(word) {
    return `https://www.welklidwoord.nl/${word}`;
}

function buildFilename(word) {
    return `pages/${word}.html`;
}

async function downloadHTML(word) {
    const filename = buildFilename(word);
    if (fs.existsSync(filename)) {
        console.log(`File '${filename}' already exists, skipping download`);
        return;
    }
    const response = await fetch(buildUrl(word));
    const htmlContent = await response.text();

    fs.writeFileSync(filename, htmlContent);
    console.log(`File '${filename}' saved`);
}

function extractArticle(word) {
    const html = fs.readFileSync(buildFilename(word), 'utf-8');
    const $ = cheerio.load(html);
    const article = $('h2.nieuwH2 span').first().text();

    return (article === 'De' || article === 'Het') ? article : null;
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
    
    try {
        await downloadHTML(word);
        const value = await extractArticle(word);

        ctx.reply(value ? `${value} ${word}` : `Geen resultaat voor '${word}'`);
    } catch (error) {
        console.error(`Error processing word '${word}':`, error);
        ctx.reply(`Sorry, er ging iets mis`);
    }
});

bot.launch();
