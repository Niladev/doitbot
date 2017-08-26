require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const bot = require('./util/bot').connect();
const botController = require('./controllers/botController');
const db = require('./util/db');

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
        console.error('--ERROR CONNECTING TO THE DATABASE: ');
        console.error(err);
        process.exit(1);
    } else {
        app.listen(3000, () => {
            console.log('App listening on port 3000');
        });
    }
})
