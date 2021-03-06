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


                reminder.hour = reminder.hour.replace(/^0/, '');
                reminder.minute = reminder.minute.replace(/^0/, '');

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
            var cronString = reminder.minute + ' ' + reminder.hour + ' ' + '* * ' + reminder.day;

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

    /**
     * Updates a reminder in both database and reminderUtil
     * @param  {String} ownerId         The id of the owner
     * @param  {Object} updatedReminder A reminder Object containing fields: {
     *                                      name: String,
     *                                      owner: String,
     *                                      hour: String,
     *                                      minute: String,
     *                                      interval: String
     *                                  }
     * @return {Promise}                Returns a promise resolving into the updated reminder
     */
    updateOne: (ownerId, updatedReminder) => {
        if(!ownerId || !updatedReminder) Promise.reject(new Error('Missing parameter'));

        const validateNameAndTime = (reminder) => {

            return new Promise((resolve, reject) => {
                if(!reminder.name) reject(new Error('The reminder needs to have a name'));

                if(!reminder.hour) reject(new Error('Hour of reminder was not defined'));

                if(!reminder.minute) reject(new Error('Minute of reminder was not defined'));

                if(!/\b(2[0-3]|[1]?[0-9])\b/.test(reminder.hour)) reject(new Error('Hour is not valid. Must be a value between 0 and 23'));

                if(!/\b(5[0-9]|[0-5]?[0-9])\b/.test(reminder.minute)) reject(new Error('Minute is not valid. Must be a value between 0 and 59'));

                if(reminder.hour.length >= 2) reminder.hour = reminder.hour.replace(/^0/, '');;
                if(reminder.minute.length >= 2) reminder.minute = reminder.minute.replace(/^0/, '');

                resolve(reminder);
            });
        }
        const validateDay = (reminder) => {
            return new Promise((resolve, reject) => {
                if(!reminder.day) reject(new Error('Day has not been defined'));

                if(reminder.day === 'today' || reminder.day === '*'){
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

        return validateNameAndTime(updatedReminder).then(validateDay)
                                            .then(updateReminder);
    },

    /**
     * Finds a reminder object and returns a promise resolving with this object
     * @param  {String} ownerId         Id of the owner of the reminder
     * @param  {String} reminderName    String name of the reminder
     * @return {Promise}                Returns a Promise that resolves into the reminder
     */
    findOne: (ownerId, reminderName) => {
        if(!ownerId || !reminderName) return Promise.reject(new Error('Missing parameter'));



        return db.get().collection('reminders')
            .findOneAsync({owner:ownerId, name: reminderName.replace(/^\s+|\s+$/gm, '')})
            .then((reminder) => {
                if(!reminder) {
                    throw new Error('Reminder not found');
                } else {
                    var cronReminder = reminderUtil.findOne(ownerId, reminderName.replace(/^\s+|\s+$/gm, ''));

                    if(!cronReminder) {
                        throw new Error('Could not find cron reminder');
                    }

                    var finalReminder = Object.assign(reminder, cronReminder);
                    console.log(finalReminder);
                    return finalReminder
                }

            })
    }
}
