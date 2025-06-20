const router = require('express').Router()
const passport = require('passport')

router.get('/', (req, res) => {
    console.log(req.headers.referer)
    res.render('login.ejs', { user: req.user, dir: req.headers.referer })
})

router.post('/', (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        req.logIn(user, (err) => {
            if (err) return next(err)
            res.redirect(req.body.dir)
        })
    })(req, res, next)
})

module.exports = router
