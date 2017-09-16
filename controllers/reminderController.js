"use strict";

const cronUtil = require('../util/cron');
const reminderUtil = require('../util/reminder');
const db = require('../util/db');
const Promise = require('bluebird');
const cron = require('node-cron');



module.exports = {
    /**
     * Creates a reminder with a cron job and persists it to the database
     * @param  {Object}   reminder  Must contain: {
     *                                  name: String,
     *                                  owner: String,
     *                                  hour: String,
     *                                  minute: String,
     *                                  interval: String
     *                              }
     *
     * @param  {Function} callback  Callback to be executed by cron job
     *
     * @return {Promise}            Returns promise with a validated reminder
     *                              with an updated Reminder object cotaining
     *                              the cron job and active boolean
     */
    create: (reminder, callback) => {
        if(!reminder || !callback) {
            Promise.reject(new Error('Missing a parameter'));
        }

        const validateNameAndTime = (reminder) => {

            return new Promise((resolve, reject) => {

                if(!reminder.name) reject(new Error('The reminder needs to have a name'));

                if(!reminder.hour) reject(new Error('Hour of reminder was not defined'));

                if(!reminder.minute) reject(new Error('Minute of reminder was not defined'));

                if(!/\b(2[0-3]|[1]?[0-9])\b/.test(reminder.hour)) reject(new Error('Hour is not valid. Must be a value between 0 and 23'));

                if(!/\b(5[0-9]|[0-5]?[0-9])\b/.test(reminder.minute)) reject(new Error('Minute is not valid. Must be a value between 0 and 59'));


                reminder.time = {
                    hour: reminder.hour.replace(/^0/, ''),
                    minute: reminder.minute.replace(/^0/, '')
                };

                resolve(reminder);
            });
        }
        const validateDay = (reminder) => {
            return new Promise((resolve, reject) => {
                if(!reminder.day) reject(new Error('Day has not been defined'));

                if(reminder.day === 'today'){
                    reminder.day = '*';
                    reminder.recurring = false;
                } else if(reminder.day === 'daily') {
                    reminder.day = '*',
                    reminder.recurring = true;
                } else if(/\b((mon|tues|wed(nes)?|thur(s)?|fri|sat(ur)?|sun)(days?)?)\b/.test(reminder.day)) {
                    // Check if plural of days and set recurring to match
                    if(reminder.day.charAt(reminder.day.length - 1) === 's') {
                        reminder.day =  reminder.day.substr(0, 3);// remove last letter of the string
                        reminder.recurring = true;
                    } else {
                        reminder.day = reminder.day.substr(0, 3);
                        reminder.recurring = false;
                    }
                } else {
                    reject(new Error('Day was not valid. Must be a week day, today, or daily.'));
                }

                resolve(reminder);
            });
        }
        const createCronString = (reminder) => {
            var cronString = reminder.time.minute + ' ' + reminder.time.hour + ' ' + '* * ' + reminder.day;

            if(cron.validate(cronString)) {
                reminder.cronString = cronString;
            } else {
                throw new Error('Cron string was not valid.');
            }

            return reminder;
        }
        const persistReminder = (reminder) => {
            return db.get().collection('reminders').insertAsync(reminder).then(() => {
                reminderUtil.create(reminder.owner, reminder);
                return reminder;
            }).catch((err) => {
                return new Error('Error while inserting reminder in database');
            });
        }
        const createCronAndUpdateReminder = (reminder) => {
            return new Promise((resolve, reject) => {

                reminder.schedule = cron.schedule(reminder.cronString, () => {
                    db.get().collection('reminders')
                            .findOneAsync({owner:reminder.owner, name: reminder.name})
                            .then((scheduleReminder) => {
                                var activeReminder = reminderUtil.findOne(scheduleReminder.owner, scheduleReminder.name);

                                if(!activeReminder.active && activeReminder.recurring) {
                                    activeReminder.active = true;
                                    db.get().collection('reminders')
                                            .updateOneAync({
                                                owner:activeReminder.owner,
                                                name:activeReminder.name
                                            }, {$set:{active:true}})
                                            .then(() => {
                                                reminderUtil.updateOne(activeReminder.owner,
                                                                       activeReminder.name,
                                                                       activeReminder);
                                                return;
                                            });
                                } else if(!activeReminder.active && !activeReminder.recurring) {
                                    activeReminder.schedule.destroy();
                                    reminderUtil.updateOne(activeReminder.owner,
                                                           activeReminder.name,
                                                           activeReminder);
                                    return;
                                }

                                callback(activeReminder);

                                var intervalCronString = '*/' + activeReminder.interval + ' * * * *';
                                if(cron.validate(intervalCronString)) {
                                    activeReminder.intervalSchedule = cron.schedule(intervalCronString, () => {
                                        callback(activeReminder);
                                    });

                                    reminderUtil.updateOne(activeReminder.owner,
                                                           activeReminder.name,
                                                           activeReminder);
                                } else {
                                    activeReminder.intervalSchedule = cron.schedule('*/5 * * * *', () => {
                                        callback(activeReminder);
                                    });

                                    reminderUtil.updateOne(activeReminder.owner,
                                                           activeReminder.name,
                                                           activeReminder);
                                }

                                if(!activeReminder.recurring) {
                                    activeReminder.active = false;
                                    activeReminder.schedule.destroy();
                                    db.get().collection('reminders')
                                            .updateOneAsync({
                                                owner:activeReminder.owner,
                                                name:activeReminder.name
                                            }, {$set:{active:true}})
                                            .then(() => {
                                                reminderUtil.updateOne(activeReminder.owner,
                                                                       activeReminder.name,
                                                                       activeReminder);
                                            });
                                    return;
                                }

                            });
                });

                reminderUtil.updateOne(reminder.owner, reminder.name, reminder);
                console.log(reminder);
                resolve(reminder);
            });
        }

        return validateNameAndTime(reminder).then(validateDay)
                .then(createCronString)
                .then(persistReminder)
                .then(createCronAndUpdateReminder);

    },

    delete: (ownerId, reminder) => {
        // TODO: Support delete method
    },

    // TODO: Add documentation
    update: (ownerId, updatedReminder) => {
        if(!ownerId || !reminder) Promise.reject(new Error('Missing parameter'));

        const validateNameAndTime = (reminder) => {

            return new Promise((resolve, reject) => {

                if(!reminder.name) reject(new Error('The reminder needs to have a name'));

                if(!reminder.hour) reject(new Error('Hour of reminder was not defined'));

                if(!reminder.minute) reject(new Error('Minute of reminder was not defined'));

                if(!/\b(2[0-3]|[1]?[0-9])\b/.test(reminder.hour)) reject(new Error('Hour is not valid. Must be a value between 0 and 23'));

                if(!/\b(5[0-9]|[0-5]?[0-9])\b/.test(reminder.minute)) reject(new Error('Minute is not valid. Must be a value between 0 and 59'));


                reminder.time = {
                    hour: reminder.hour.replace(/^0/, ''),
                    minute: reminder.minute.replace(/^0/, '')
                };

                resolve(reminder);
            });
        }
        const validateDay = (reminder) => {
            return new Promise((resolve, reject) => {
                if(!reminder.day) reject(new Error('Day has not been defined'));

                if(reminder.day === 'today'){
                    reminder.day = '*';
                    reminder.recurring = false;
                } else if(reminder.day === 'daily') {
                    reminder.day = '*',
                    reminder.recurring = true;
                } else if(/\b((mon|tues|wed(nes)?|thur(s)?|fri|sat(ur)?|sun)(days?)?)\b/.test(reminder.day)) {
                    // Check if plural of days and set recurring to match
                    if(reminder.day.charAt(reminder.day.length - 1) === 's') {
                        reminder.day =  reminder.day.substr(0, 3);// remove last letter of the string
                        reminder.recurring = true;
                    } else {
                        reminder.day = reminder.day.substr(0, 3);
                        reminder.recurring = false;
                    }
                } else {
                    reject(new Error('Day was not valid. Must be a week day, today, or daily.'));
                }

                resolve(reminder);
            });
        }
        const updateReminder = (reminder) => {
            db.get().collection('reminders')
                    .updateOneAsync({owner: ownerId, name: updatedReminder.name}, {$set:updatedReminder})
                    .then(() => {
                        reminderUtil.updateOne(ownerId, updatedReminder.name, updatedReminder);
                    });
        }

        return validateNameAndTime(reminder).then(validateDay)
                                            .then(updateReminder);
    },

    // TODO: Add documentation
    find: (ownerId, reminderName) => {
        if(!ownerId || !reminder) Promise.reject(new Error('Missing parameter'));

        return db.get().collection('reminders')
            .findOneAsync({owner:ownerId, name:reminderName})
            .then((reminder) => {
                var finalReminder = Object.assign(reminder, reminderUtil.findOne(ownerId, reminderName));

                return finalReminder
            }).catch((err) => {
                return new Error(err);
            });
    }
}
