const mongoose = require('mongoose')

const tripSchema = new mongoose.Schema({
  date: {
    type: Date
  },
  country: {
    type: String
  },
  city: {
    type: String
  },
  description: {
    type: String
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Trip', tripSchema)
