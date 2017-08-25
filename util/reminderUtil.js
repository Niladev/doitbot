var state = {
    reminders: {}
}

exports.find = (userId) => {
    return state.reminders[userId];
}

exports.findOne = (userId, reminderName) => {
    return state.reminders[userId][reminderName.replace(/\s+/g, '').toLowerCase()];
}

exports.insertOne = (userId, reminder) => {
    if(!state.reminders[userId]) state.reminders[userId] = {};

    state.reminders[userId][reminder.name.replace(/\s+/g, '').toLowerCase()] = reminder;
    return;
}

exports.updateOne = (userId, reminderName, reminder) => {
    state.reminders[userId][reminderName.replace(/\s+/g, '').toLowerCase()] = reminder;
    return;
}
