const fetch = require('node-fetch');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const db = new sqlite3.Database('words.db');
const bot = new Telegraf(process.env.BOT_TOKEN);


db.run(`CREATE TABLE IF NOT EXISTS words (word TEXT NOT NULL UNIQUE, article TEXT NOT NULL)`);


async function getArticleFromWebsite(word) {
    const pageUrl = `https://www.welklidwoord.nl/${word}`;
    const response = await fetch(pageUrl);
    const htmlContent = await response.text();

    const $ = cheerio.load(htmlContent);
    const article = $('h2.nieuwH2 span').first().text();

    return (article === 'De' || article === 'Het') ? article : null;
}

async function getArticleFromDatabase(word) {
    return new Promise((resolve, reject) => {
        db.get('SELECT article FROM words WHERE word = ? LIMIT 1', [word], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.article : null);
            }
        });
    });
}

async function saveArticleToDatabase(word, article) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO words (word, article) VALUES (?, ?)', [word, article], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function processWord(word) {
    const cleanedWord = word.replace(/[^\w\s]|_/g, '').replace(/\s+/g, '').toLowerCase();
    
    let article = await getArticleFromDatabase(cleanedWord);
    
    if (!article) {
        article = await getArticleFromWebsite(word);

        if (article) {
            await saveArticleToDatabase(cleanedWord, article);
        }
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
        console.error(`Error processing word '${word}':`, error);
        ctx.reply(`Sorry, er ging iets mis`);
    }
});

bot.launch();
