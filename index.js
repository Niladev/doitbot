require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const botgram = require('botgram');
const bot = botgram(process.env.ACCESS_TOKEN);
const botController = require('./controllers/botController');
const db = require('./util/dbUtil');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

bot.command('start', botController.start);
bot.command('help', botController.help);
bot.command('remindme', botController.remindMe);
bot.command('reminders', botController.reminders);
bot.command('done', botController.done);

db.connect((err) => {
    if(err) {
        console.log('--ERROR CONNECTING TO THE DATABASE: ');
        console.log(err);
        process.exit(1);
    } else {
        app.listen(3000, () => {
            console.log('App listening on port 3000');
        });
    }
})
