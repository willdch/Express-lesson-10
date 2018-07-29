var express = require('express');
var router = express.Router();
const sqlite = require('sqlite3').verbose();
var models = require('../models');
const auth = require('../config/auth');
const sequelize = require('sequelize');
const Op = sequelize.Op;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get('/signup', function(req, res, next) {
  res.render('signup');
});

router.post('/signup', function(req, res, next) {
  const hashedPassword = auth.hashPassword(req.body.password);
  models.users
    .findOne({
      where: {
        Username: req.body.username
      }
    })
    .then(user => {
      if (user) {
        res.send('this user already exists');
      } else {
        models.users
          .create({
            FirstName: req.body.firstName,
            LastName: req.body.lastName,
            Email: req.body.email,
            Username: req.body.username,
            Password: hashedPassword
          })
          .then(createdUser => {
            const isMatch = createdUser.comparePassword(req.body.password);

            if (isMatch) {
              const userId = createdUser.UserId;
              console.log(userId);
              const token = auth.signUser(createdUser);
              res.cookie('jwt', token);
              res.redirect('profile/' + userId);
            } else {
              console.error('not a match');
            }
          });
      }
    });
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/login', function(req, res, next) {
  const hashedPassword = auth.hashPassword(req.body.password);
  models.users
    .findOne({
      where: {
        Username: req.body.username
        // Password: req.body.password
      }
    })
    .then(user => {
      const isMatch = user.comparePassword(req.body.password);
      console.log('login found a user');
      if (!user) {
        return res.status(401).json({
          message: 'Login Failed'
        });
      }
      if (isMatch) {
        const userId = user.UserId;
        const token = auth.signUser(user);
        res.cookie('jwt', token);
        res.redirect('profile/' + userId);
      } else {
        console.log(req.body.password);
        res.redirect('login');
      }
    });
});



router.get('/profile/:id', auth.verifyUser, (req, res, next) => {
  if (req.params.id !== String(req.user.UserId)) {
    res.send('This is not your profile')
  } else {
    models.posts
      .findAll({
        where: {
          [Op.and]: {
            Deleted: null,
            UserId: req.user.UserId
          }
        },
        include: [models.users]
      })
      .then(post => {
        let status;
        let display;
        if (req.user.Admin) {
          status = 'Admin';
          display = 'Go to admin page';
        } else {
          status = 'Normal user';
        }
        res.render('profile', {
          FirstName: req.user.FirstName,
          LastName: req.user.LastName,
          Email: req.user.Email,
          UserId: req.user.UserId,
          Username: req.user.Username,
          status: status,
          Display: display,
          posts: post
        });
      });
  }
 });

router.get('/logout', function(req, res) {
  res.cookie('jwt', null);
  res.redirect('/users/login');
});

router.post('/profile/:id', (req, res) => {
  let UserId = parseInt(req.params.id);
  models.posts
    .findOrCreate({
      where: {
        UserId: req.body.UserId,
        PostTitle: req.body.title,
        PostBody: req.body.body
      }
    })
.then(post => {
  res.redirect(req.originalUrl);
} )

});

module.exports = router;
