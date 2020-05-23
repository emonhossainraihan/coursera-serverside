const express = require('express');
const bodyParser = require('body-parser');
var authenticate = require('../authenticate');
const cors = require('./cors');

const Favorites = require('../models/favorite');
const favoriteRouter = express.Router();

favoriteRouter.use(bodyParser.json());

favoriteRouter
  .route('/')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })

  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorites.find({})
      .populate('user')
      .populate('dishes')
      .then(
        (favorite) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(favorite);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })

  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id })
      .then(
        (favorite) => {
          //! there alreay exist a favorite document
          if (favorite) {
            for (let i = 0; i < req.body.length; i++) {
              if (favorite.dishes.indexOf(req.body[i]._id) === -1) {
                //! _id is not in the dishes array
                favorite.dishes.push(req.body[i]._id);
              }
            }
            favorite
              .save()
              .then((favorite) => {
                Favorites.findById(favorite._id)
                  .populate('user._id')
                  .populate('dishes._id')
                  .then((favorite) => {
                    console.log('Favorite Dish Added!');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                  })
                  .catch((err) => {
                    return next(err);
                  });
              })
              .catch((err) => {
                return next(err);
              });
          } else {
            //! document not found create a new one
            Favorites.create({
              user: req.user._id,
              dishes: [req.params.dishId],
            }).then((favorite) => {
              Favorites.findById(favorite._id)
                .populate('user')
                .populate('dishes')
                .then(
                  (favorite) => {
                    console.log('Favorite Created ', favorite);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                  },
                  (err) => next(err)
                )
                .catch((err) => next(err));
            });
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })

  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
  })

  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOneAndRemove({ user: req.user._id })
      .then(
        (resp) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(resp);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  });

favoriteRouter
  .route('/:dishId')
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id })
      .then(
        (favorites) => {
          //! If this dish is not in the list of favorites then exists equals to false
          if (!favorites) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.json({ exists: false, favorites: favorites });
          } else {
            //! We are going to search the favorite.dishes array
            //! to see if this dish exists in there. If it doesn't
            //! exist it will return a negative index.
            if (favorites.dishes.indexOf(req.params.dishId) < 0) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.json({ exists: false, favorites: favorites });
            }
            //! Else it exists.
            else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.json({ exists: true, favorites: favorites });
            }
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })

  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id })
      .then(
        (favorite) => {
          if (favorite) {
            if (favorite.dishes.indexOf(req.params.dishId) === -1) {
              favorite.dishes.push({ _id: req.params.dishId });
              favorite.save().then(
                (favorite) => {
                  Favorites.findById(favorite._id)
                    .populate('user')
                    .populate('dishes')
                    .then((favorite) => {
                      console.log('Favorite Dish Added!');
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.json(favorite);
                    });
                },
                (err) => next(err)
              );
            }
          } else {
            Favorites.create({
              user: req.user._id,
              dishes: [req.params.dishId],
            }).then((favorite) => {
              console.log('Favorite Created ', favorite);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.json(favorite);
            });
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })

  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites/' + req.params.dishId);
  })

  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    //! update this: Favorites.findOneAndDelete({})
    Favorites.findOne({ user: req.user._id })
      .then(
        (favorite) => {
          if (favorite) {
            index = favorite.dishes.indexOf(req.params.dishId);
            if (index >= 0) {
              //! delete one item after the index
              favorite.dishes.splice(index, 1);
              favorite.save().then(
                (favorite) => {
                  favorite.save().then((favorite) => {
                    Favorites.findById(favorite._id)
                      .populate('user')
                      .populate('dishes')
                      .then((favorite) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorite);
                      });
                  });
                },
                (err) => next(err)
              );
            } else {
              err = new Error('Dish ' + req.params.dishId + ' not found');
              err.status = 404;
              return next(err);
            }
          } else {
            err = new Error('Favorites not found');
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  });

module.exports = favoriteRouter;
