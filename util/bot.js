const botgram = require('botgram');

var state = {
    bot: null
}

exports.connect = () => {
    state.bot = botgram(process.env.ACCESS_TOKEN);
    return state.bot;
};

exports.get = () => {
    return state.bot;
};
