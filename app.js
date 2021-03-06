const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
var passport = require('passport');
var config = require('./config');

//! bring routes
const usersRouter = require('./routes/users');
const indexRouter = require('./routes/index');
const dishRouter = require('./routes/dishRouter');
const promotionRouter = require('./routes/promoRouter');
const leaderRouter = require('./routes/leaderRouter');
const uploadRouter = require('./routes/uploadRouter');
const favoriteRouter = require('./routes/favoriteRouter');
const commentRouter = require('./routes/commentRouter');

const app = express();

//! Secure traffic only
app.all('*', (req, res, next) => {
  if (req.secure) {
    return next();
  } else {
    res.redirect(
      307,
      'https://' + req.hostname + ':' + app.get('secPort') + req.url
    );
  }
});

//! database setup
const mongoose = require('mongoose');

const url = config.mongoUrl;
const connect = mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

connect.then(
  (db) => {
    console.log('Connected correctly to server');
  },
  (err) => {
    console.log(err);
  }
);

//! view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//! middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(passport.initialize());

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(express.static(path.join(__dirname, 'public')));

// mount this express router at the /dishes endpoint
app.use('/dishes', dishRouter);
// mount this express router at the /promotions endpoint
app.use('/promotions', promotionRouter);
// mount this express router at the /leaders endpoint
app.use('/leaders', leaderRouter);
app.use('/imageUpload', uploadRouter);
app.use('/favorites', favoriteRouter);
app.use('/comments', commentRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
