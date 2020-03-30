// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for events
const Trip = require('../models/trip')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { event: { title: '', text: 'foo' } } -> { event: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX SIGNED IN, OWNED
// GET /events/owned
router.get('/trips/owned', requireToken, (req, res, next) => {
  Trip.find({ owner: req.user._id })
    .then(trips => {
      // `events` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return trips.map(trip => trip.toObject())
    })
    // respond with status 200 and JSON of the events
    .then(trips => res.status(200).json({ trips: trips }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// INDEX SIGNED OUT
// GET /events/
router.get('/trips/openall', (req, res, next) => {
  console.log('open')
  Trip.find()
    .then(trips => {
      // `events` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return trips.map(trip => trip.toObject())
    })
    // respond with status 200 and JSON of the events
    .then(trips => res.status(200).json({ trips: trips }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /events/5a7db6c74d55bc51bdf39793
router.get('/trips/:id', requireToken, (req, res, next) => {
  console.log('id')
  // req.params.id will be set based on the `:id` in the route
  Trip.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "event" JSON
    .then(trip => res.status(200).json({ trip: trip.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// INDEX SIGNED IN
// GET /events
router.get('/trips', requireToken, (req, res, next) => {
  Trip.find()
    .then(trips => {
      // `events` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return trips.map(trip => trip.toObject())
    })
    // respond with status 200 and JSON of the events
    .then(trips => res.status(200).json({ trips: trips }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /trips
router.post('/trips', requireToken, (req, res, next) => {
  // set owner of new event to be current user
  req.body.trip.owner = req.user.id

  Trip.create(req.body.trip)
    // respond to succesful `create` with status 201 and JSON of new "event"
    .then(trip => {
      res.status(201).json({ trip: trip.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /events/5a7db6c74d55bc51bdf39793
router.patch('/trips/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.trip.owner

  Trip.findById(req.params.id)
    .then(handle404)
    .then(trip => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, trip)

      // pass the result of Mongoose's `.update` to the next `.then`
      return trip.updateOne(req.body.trip)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

router.patch('/trips/rsvp/:id', requireToken, removeBlanks, (req, res, next) => {
  // console.log(req.params)
  // console.log(req.user.id)
  Trip.findByIdAndUpdate(req.params.id, { $addToSet: { users: req.user.id } }, { new: true, useFindAndModify: false })
    .then(handle404)
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

router.patch('/trips/unrsvp/:id', requireToken, removeBlanks, (req, res, next) => {
  // console.log(req.params)
  // console.log(req.user.id)
  Trip.findByIdAndUpdate(req.params.id, { $pull: { users: req.user.id } }, { new: true, useFindAndModify: false })
    .then(handle404)
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /events/5a7db6c74d55bc51bdf39793
router.delete('/trips/:id', requireToken, (req, res, next) => {
  Trip.findById(req.params.id)
    .then(handle404)
    .then(trip => {
      // throw an error if current user doesn't own `event`
      requireOwnership(req, trip)
      // delete the event ONLY IF the above didn't throw
      trip.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
