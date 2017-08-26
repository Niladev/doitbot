"use strict";

const cron = require('node-cron');
const db = require('../util/db');
const reminderUtil = require('../util/reminder');
const cronUtil = require('../util/cron');
var reminders = {};

module.exports = {
    start: (msg, reply, next) => {

        /*
        ** The /start function for the bot.
        ** Replies with a message on how to use the bot
        */

        reply.text('This bot will help you set a reminder and notify you ' +
        ' periodically to do it until it has been done. When done, simply ' +
        'type /done <name of reminder>\n\n' +
        'Currently the bot only supports CE(S)T timezone.');
    },

    help: (msg, reply, next) => {

        /*
        ** The /help function.
        ** Provides the user with help how to start a reminder and what commands
        ** are available.
        */

        reply.text('I can set a reminder for you and periodically notify you of it after the time has passed.' +
        '\nTo set a reminder you can use /remindme <day(s) of alarm> <alarm time> <interval> minutes <name of reminder>' +
        '\nTo stop the reminder, just type /done <name of reminder>.' +
        '\nExample: /remindme Sundays 15:00 5 minutes Create a new ToDooh!');
    },

    reminders: (msg, reply, next) => {

        /*
        ** The /reminders function
        ** Provides user with a list of active reminders
        */


        var reminderList = "These are your active reminders:\n";
        var counter = 0;
        for(var reminder in reminderUtil.find(msg.from.id)) {
            if(reminderUtil.find(msg.from.id)[reminder].active) {
                counter += 1;

                reminderList += "\n" + reminderUtil.find(msg.from.id)[reminder].name;
            }

        }

        if(counter > 0) {
            reply.text(reminderList);
            return;
        }

        reply.text('You have no active reminders!');

    },

    done: (msg, reply, next) => {
        /*
        ** The /done function.
        ** Allows a user to stop a reminder, marking it as completed.
        */

        var msgText = msg.text.split('/done');
        var reminderName = msgText[1];


        if(reminderName.length > 1) {
            if(reminderUtil.find(msg.from.id)) {
                var reminder = reminderUtil.findOne(msg.from.id, reminderName);
            }


            // Validate input to ensure that a reminder was found
            if(reminder) {

                // Check if reminder is recurring and delete cron if not
                if(!reminder.recurring) {
                    reminder.schedule.destroy();
                    reminder.active = false;
                    db.get().collection('reminders')
                        .updateOne({owner: msg.from.id, name: reminder.name}, {$set:{active: false}});
                    if(reminder.intervalSchedule) {
                        reminder.intervalSchedule.destroy();
                    }

                    reminderUtil.updateOne(msg.from.id, reminderName, reminder);
                    reply.text('Good job!');
                    return;
                }

                // Check if reminder contains an intervalSchedule.
                if(reminder.intervalSchedule) {

                    // If intervalSchedule was found, destroy it to remove notifiers.
                    // but keep the reminder active.
                    reminder.intervalSchedule.destroy();

                    reminderUtil.updateOne(msg.from.id, reminderName, reminder);
                    reply.text('Good job!');
                    return;
                } else {

                    // If no intervalSchedule was found, set reminder to inactive
                    // To ignore next reminder and avoid creating intervalSchedule.
                    reminder.active = false;

                    reminderUtil.updateOne(msg.from.id, reminderName, reminder);
                    reply.text('Good job!');
                    return;
                }
            }


        } else {
            reply.text('You forgot to type the reminder name!');
        }
    },

    remindMe: (msg, reply, next) => {

        /*
        ** The /remindme function
        ** Takes in the msg object and divides it into arguments that will
        ** be persisted to a database as well as used to create a cron job.
        ** Cron jobs are stored in a global object. Cron string is persisted
        ** to the database with reminder so that in the case of a server
        ** shutdown, cron jobs can be restarted.
        */

        var reminder = {};
        var msgText = msg.text.split(' ');

        if(msgText.length <= 1) {
            reply.text('In order to set a reminder you have to put a day, time,' +
            'interval and name for the reminder.\n' +
            'Like this:\n\n' +
            'Today 15:00 1 minute Create new reminder!');
            return;
        }
        var reminderDay = msgText[1].toLowerCase();


        /*
        ** Split message into arguments and validate arguments
        */

        // Validate time input to a valid hour between 00:00 to 23:59
        if(/^([01]\d|2[0-3]):?([0-5]\d)$/.test(msgText[2])) {
            var reminderTime = msgText[2].split(':');
            reminder.time = {
                hour: reminderTime[0].replace(/^0/, ''),
                minute: reminderTime[1].replace(/^0/, '')
            };
        } else {
            reply.text('You didn\'t enter a correct time of day. Please try again.');
            return;
        }

        // Validate interval input to a number between 1 and 59
        if(/^[1-5]?[0-9]$/.test(msgText[3])) {
            reminder.interval = msgText[3];
        } else {
            reply.text('The interval has to be a number within 1 and 59 minutes. Please try again');
            return;
        }

        reminder.name = msg.text.split(/minutes? /)[1];
        reminder.active = true;
        reminder.owner = msg.from.id;

        // Identify and validate schedule for reminder
        if(reminderDay === 'today'){
            reminder.day = '*';
            reminder.recurring = false;
        } else if(reminderDay === 'daily') {
            reminder.day = '*',
            reminder.recurring = true;
        } else if(/\b((mon|tues|wed(nes)?|thur(s)?|fri|sat(ur)?|sun)(days?)?)\b/.test(reminderDay)) {
            // Check if plural of days and set recurring to match
            if(reminderDay.charAt(reminderDay.length - 1) === 's') {
                reminder.day =  reminderDay.substr(0, 3);// remove last letter of the string
                reminder.recurring = true;
            } else {
                reminder.day = reminderDay.substr(0, 3);
                reminder.recurring = false;
            }
        } else {
            reply.text('You didn\'t enter a valid date, please try again');
            return;
        }

        // Combine some arguments into valid cron string
        var cronString = reminder.time.minute + ' ' + reminder.time.hour + ' ' + '* * ' + reminder.day;

        /*
        ** Use arguments to create valid cron job
        */

        if(cronUtil.validate(cronString)) {
            reminder.cronString = cronString;

            // Persist object without cron task to database
            db.get().collection('reminders').insert(reminder, (err, result) => {
                    if(err) {
                        reply.text('An error happened while saving the reminder. Please try again.');
                        return;
                    };

                    // Create cron job based on valid cron string
                    reminder.schedule = cronUtil.create(cronString, reminder, msg.from.id);

                    // Add reminder to reminders if everything is successful
                    reminderUtil.create(msg.from.id, reminder);
                    reply.text('Your reminder has been saved!');
                    return;
            });
        } else {
            // TODO: Add better error handling
            reply.text('It seems there was an error with the format. Please try again');
        }
    }
}
