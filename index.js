const fs = require('fs');
const csv = require('csv-parser');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const bot = new Telegraf('6122433307:AAHvVLe4edwJQ5pFX_dDqBFJFbk6rKCYU14');

let csvData = null;


async function getArticleFromWebsite(word) {
    const pageUrl = `https://www.welklidwoord.nl/${word}`;
    const response = await fetch(pageUrl);
    const htmlContent = await response.text();

    const $ = cheerio.load(htmlContent);
    const article = $('h2.nieuwH2 span').first().text();

    return (article === 'De' || article === 'Het') ? article : null;
}

function loadCSV() {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream('de_het_1350.csv')
        .pipe(csv())
        .on('data', (data) => {
            results.push(data);
        })
        .on('end', () => {
            csvData = results;
            resolve();
        })
        .on('error', (error) => {
            reject(error);
        });
    });
}

async function getArticleFromDatabase(word) {
    if (!csvData) {
        console.debug('Loading CSV...');
        await loadCSV();
        console.debug('CSV Loaded');
    }

    const foundWord = csvData.find((item) => item.Word.toLowerCase() === word.toLowerCase());
    const article = foundWord ? foundWord.Article : null;
    return article;
}

async function processWord(word) {
    const cleanedWord = word.replace(/[^\w\s]|_/g, '').replace(/\s+/g, '').toLowerCase();

    let article = await getArticleFromDatabase(cleanedWord);

    if (!article) {
        console.info(`Trying web for '${word}':`);

        article = await getArticleFromWebsite(cleanedWord);
    }
    return [ cleanedWord, article ];
}

bot.start((ctx) => ctx.reply('Hoi. Stuur me een woord en ik geef het lidwoord'));

bot.on(message('text'), async (ctx) => {
    const words = ctx.message.text.split(' ');

    if (words.length > 1) {
        ctx.reply('Stuur slechts één woord');
        return;
    }

    try {
        const [ word, article ] = await processWord(words[0]);

        ctx.reply(article ? `${article} ${word}` : `Geen resultaat voor '${word}'`);
    } catch (error) {
        console.error(`Error processing word '${words[0]}':`, error);
        ctx.reply(`Sorry, er ging iets mis`);
    }
});

bot.launch();
