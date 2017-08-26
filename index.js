require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const bot = require('./util/bot').connect();
const botController = require('./controllers/botController');
const db = require('./util/db');
const cronUtil = require('./util/cron');
const reminderUtil = require('./util/reminder');

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
        db.get().collection('reminders').find({active: true}).toArray((err, activeReminders) => {
            if(err) {
                console.error('--ERROR RETRIEVING ACTIVE REMINDERS');
                console.error(err);
            }

            console.info('Active reminders have been retrieved');
            for(var reminderIndex in activeReminders) {
                var reminder = activeReminders[reminderIndex];
                if(cronUtil.validate(reminder.cronString)){
                    reminder.schedule = cronUtil.create(reminder.cronString, reminder, reminder.owner);
                    reminderUtil.create(reminder.owner, reminder);
                }                
            }
            console.info('Active reminders have been reinstanciated');
        });

        app.listen(3000, () => {
            console.log('App listening on port 3000');
        });
    }
})
