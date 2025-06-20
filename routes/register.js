const router = require('express').Router()
const bcrypt = require('bcrypt')
let connectDB = require('../database.js')
const alertAndRedirect = require('../modules/alert-and-redirect.js')

let db
connectDB
    .then((client) => {
        db = client.db('forum')
    })
    .catch((err) => {
        console.log(err)
    })

router.get('/', (req, res) => {
    res.render('register.ejs', { user: req.user })
})

router.post('/', async (req, res) => {
    let searchResult = await db
        .collection('user')
        .findOne({ username: req.body.username })
    if (searchResult) {
        alertAndRedirect(
            res,
            400,
            '이미 존재하는 아이디입니다.',
            req.headers.referer
        )
    } else if (req.body.password != req.body.password2) {
        alertAndRedirect(
            res,
            400,
            '비밀번호가 일치하지 않습니다.',
            req.headers.referer
        )
    } else {
        let hashedPassword = await bcrypt.hash(req.body.password, 10)
        await db.collection('user').insertOne({
            username: req.body.username,
            password: hashedPassword,
        })
        alertAndRedirect(res, 200, '가입이 완료되었습니다.', '/')
    }
})

module.exports = router
