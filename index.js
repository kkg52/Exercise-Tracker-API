require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/user');
const Exercise = require('./models/exercise');

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const cors = require('cors');
app.use(cors({ optionsSuccessStatus: 200 }));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'));


function formatDate(date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[parseInt(month, 10) - 1];
        const dateObj = new Date(date);
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        return `${weekday} ${monthName} ${day} ${year}`;
    }

    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    return formattedDate.replace(/,/g, '');
}
  


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
})

app.get('/api/users', (req, res) => {
    User.find()
        .then(users => {
            const userArray = users.map(user => ({
                _id: user._id,
                username: user.username
            }));
            res.send(userArray);
        })
        .catch(err => { console.error(err) });
})

app.post('/api/users', (req, res) => {
    let username = req.body.username;

    const newUser = new User({username: username, count: 0});

    newUser.save()
        .then((result) => {
            res.json({
                username: result.username,
                _id: result._id
            })
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ error: 'Kullanıcı kaydedilemedi.' });
        });
})

app.post('/api/users/:userID/exercises', (req, res) => {
    currentID = req.params.userID;

    const newExercise = {
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: req.body.date || new Date()
    };

    User.findById(currentID)
        .then(currentUser => {
            if (!currentUser) {
                res.json({
                    error: "User not found"
                });
            } else {
                currentUser.logs.push(newExercise);
                currentUser.count += 1;
                
                currentUser.save()
                    .then((updatedUser) => {
                        res.json({
                            _id: updatedUser._id,
                            username: updatedUser.username,
                            date: formatDate(newExercise.date),
                            duration: newExercise.duration,
                            description: newExercise.description
                        });
                    })
                    .catch(err => {
                        console.error(err);
                        res.json({error: "Could not add exercise"});     
                    })
            }
        })
        .catch(err => {
            console.error(err);
            res.json({error: "Could not add exercise"});
        });
})

app.get('/api/users/:userID/logs?', (req, res) => {
    currentID = req.params.userID;
    let { from, to, limit } = req.query;
    let fromDate, toDate;

    if (!limit) {
        limit = 500;
    }
    if (!from) {
        fromDate = new Date('1970-01-01');
    } else {
        fromDate = new Date(from);
    }
    if (!to) {
        toDate = new Date();
    } else {
        toDate = new Date(to);
    }

    User.findById(currentID)
        .then(currentUser => {
            if (!currentUser) {
                res.json({
                    error: "User not found"
                });
            } else {
                const logs = currentUser.logs
                    .map((log) => ({
                        description: log.description,
                        duration: log.duration,
                        date: log.date
                    }))
                    .filter((log) => {
                        return log.date >= fromDate && log.date <= toDate;
                    })
                    .sort((log1, log2) => {
                        const date1 = new Date(log1.date);
                        const date2 = new Date(log2.date);
                        
                        return date2 - date1;
                    })
                    .slice(0, limit);
                const formatLogs = logs.map((log) => ({
                    description: log.description,
                    duration: log.duration,
                    date: formatDate(log.date)
                }))

                res.json({
                    _id: currentUser._id,
                    username: currentUser.username,
                    count: currentUser.count,
                    log: formatLogs
                })
            }
        })
})

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port)
})