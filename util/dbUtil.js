const MongoClient = require('mongodb').MongoClient;
const mongoURL = process.env.DB_URL;


var state = {
    db: null,
    reminders: {}
};

exports.connect = (done) => {
    if(state.db) return done();

    MongoClient.connect(mongoURL, (err, database) => {
        if(err) return done(err);

        console.log('Connected to the database');
        state.db = database;
        done();
    });
}

exports.get = () => {
    return state.db;
}

exports.close = () => {
    if(state.db) {
        state.db.close((err, result) => {
            state.db = null;
            state.mode = null;
            done(err);
        })
    }
}
var mongoDB;
