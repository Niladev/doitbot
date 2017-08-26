"use strict"


const cron = require('node-cron');
const db = require('./db');
const reminderUtil = require('./reminder');
const bot = require('./bot').get();

module.exports = {
    create: (cronString, reminder, userId) => {
        return cron.schedule(cronString, () => {
            if(!reminder.active && reminder.recurring){
                reminder.active = true;
                reminderUtil.updateOne(userId, reminder.name, reminder);
                db.get().collection('reminders')
                    .updateOne({owner: userId, name: reminder.name}, {$set:{active: true}});

                return;
            } else if(!reminder.active && !reminder.recurring) {
                reminder.schedule.destroy();
                return;
            }

            bot.reply(userId).text(reminder.name);
            var intervalString = '*/' + reminder.interval + ' * * * *';
            if(cron.validate(intervalString)){
                reminder.intervalSchedule = cron.schedule(intervalString, () => {
                    bot.reply(userId).text(reminder.name);
                });
            } else {
                reply.text('There was an error in the interval, so defaulted to 5 minutes.');
                reminder.intervalSchedule = cron.schedule('5 * * * *', () => {
                    bot.reply(userId).text(reminder.name);
                });
            }

            // Remove reminder if not recurring
            if(!reminder.recurring){
                reminder.active = false;
                reminderUtil.updateOne(userId, reminder.name, reminder);
                db.get().collection('reminders')
                    .updateOne({owner: userId, name: reminder.name}, {$set:{active: false}});
                reminder.schedule.destroy();
                return;
            }
        });
    },

    validate: (cronString) => {
        return cron.validate(cronString);
    }
}
