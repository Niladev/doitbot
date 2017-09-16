var state = {
    reminders: {}
}

exports.find = (ownerId) => {
    return state.reminders[ownerId];
}

exports.findOne = (ownerId, reminderName) => {
    return state.reminders[ownderId][reminderName.replace(/\s+/g, '').toLowerCase()];
}

exports.create = (ownerId, reminder) => {
    if(!state.reminders[ownerId]) state.reminders[ownerId] = {};

    state.reminders[ownerId][reminder.name.replace(/\s+/g, '').toLowerCase()] = reminder;
    return;
}

exports.updateOne = (ownerId, reminderName, reminder) => {
    var reminderId = reminderName.replace(/\s+/g, '').toLowerCase();
    state.reminders[ownerId][reminderId] = Object.assign(state.reminders[ownerId][reminderId], reminder);
    return;
}
