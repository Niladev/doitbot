"use strict";

const cron = require('node-cron');
const db = require('../util/db');
const reminderUtil = require('../util/reminder');
const cronUtil = require('../util/cron');
const reminderController = require('./reminderController');
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

        reminder.day = msgText[1].toLowerCase();
        var reminderTime = msgText[2].split(':');
        reminder.hour = reminderTime[0];
        reminder.minute = reminderTime[1];
        reminder.interval = msgText[3];
        reminder.name = msg.text.split(/minutes? /)[1];
        reminder.active = true;
        reminder.owner = msg.from.id;

        reminderController.create(reminder, (reminder) => {
            reply.text(reminder.name);
        }).then(() => {
            reply.text('Your reminder has been created!');
        }).catch((err) => {
            console.error(err);
        });

    }
}
