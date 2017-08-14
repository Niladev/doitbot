require('dotenv').config();

const express = require('express');


const app = express();
const bodyParser = require('body-parser');
const botgram = require('botgram');
const bot = botgram(process.env.ACCESS_TOKEN);
const botController = require('./controllers/botController');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


bot.command('start', botController.start);
bot.command('help', botController.help);
bot.command('remindme', botController.remindMe);
bot.command('reminders', botController.reminders);
bot.command('done', botController.done);
bot.command('test', botController.test);

app.listen(3000, () => {
    console.log("App listening on port 3000");
})
