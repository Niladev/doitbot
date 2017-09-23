const Promise = require('bluebird');
const MongoClient = Promise.promisifyAll(require('mongodb')).MongoClient;
const mongoURL = process.env.DB_URL;


var state = {
    db: null
};

// exports.connect = (done) => {
//     if(state.db) return done();
//
//     MongoClient.connect(mongoURL, (err, database) => {
//         if(err) return done(err);
//
//         console.log('Connected to the database');
//         state.db = database;
//         done();
//     });
// }

exports.connect = () => {
    return MongoClient.connectAsync(mongoURL)
                .then((db) => {
                    db.collectionAsync('reminders');
                    state.db = db;

                    return state.db;
                });
}

exports.get = () => {
    return Promise.promisifyAll(state.db);
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
