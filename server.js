/* settings */
const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo')
require('dotenv').config()

/* MongoDB settings */
let connectDB = require('./database.js')
let db
connectDB
    .then((client) => {
        console.log('DB연결성공')
        db = client.db('forum')
        app.listen(process.env.PORT, () => {
            console.log('http://localhost:8080 에서 서버 실행중')
        })
    })
    .catch((err) => {
        console.log(err)
    })

/* method-override settings */
app.use(methodOverride('_method'))

/* passport settings */
app.use(passport.initialize())
app.use(
    session({
        secret: process.env.ENCRYPTION_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 86400000 }, // ms, 24hrs
        store: MongoStore.create({
            mongoUrl: process.env.DB_URL,
            dbName: 'forum',
        }),
    })
)

app.use(passport.session())

passport.use(
    new LocalStrategy(async (username, password, cb) => {
        let result = await db.collection('user').findOne({ username: username })
        if (!result) {
            return cb(null, false, { message: '아이디가 존재하지 않습니다.' })
        }
        if (await bcrypt.compare(password, result.password)) {
            return cb(null, result)
        } else {
            return cb(null, false, { message: '비밀번호가 일치하지 않습니다.' })
        }
    })
)
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
})
passport.deserializeUser(async (user, done) => {
    let result = await db
        .collection('user')
        .findOne({ _id: new ObjectId(user.id) })
    delete result.password
    process.nextTick(() => {
        return done(null, result)
    })
})

/* the others */
app.use(express.static(__dirname + '/public')) // css, img, etc.
app.set('view engine', 'ejs') // ejs settings
app.use(express.json()) // for req.body
app.use(express.urlencoded({ extended: true }))

/* settings end */

/* user defined functions */
const alertAndRedirect = require('./modules/alert-and-redirect.js')
const checkAuth = require('./modules/check-auth.js')
const createPaginationInfo = require('./modules/create-pagination-info.js')

/* server implementation */
app.get('/', (req, res) => {
    res.render('index.ejs', { user: req.user })
})

app.get('/list', async (req, res) => {
    try {
        let postsCount = (await db.collection('counter').find().toArray())[0]
            .postsCount
        let pageInfo = createPaginationInfo(req.query, postsCount)
        let result = []
        if (pageInfo.postsOnPage > 0) {
            result = await db
                .collection('post')
                .find()
                .skip(pageInfo.skippedPosts)
                .limit(pageInfo.postsOnPage)
                .toArray()
        }

        res.render('list.ejs', {
            user: req.user,
            posts: result,
            pages: pageInfo,
            keyword: '',
        })
    } catch (e) {
        console.log(e)
        alertAndRedirect(res, 400, e.message, '/')
        // alertAndRedirect(res, 500, '서버에 오류가 발생했습니다.', '/list')
    }
})

app.get('/search', async (req, res) => {
    try {
        if (req.query.keyword.length < 2)
            throw new Error('2글자 이상 입력해주세요.')
        let searchCondition = [
            {
                $search: {
                    index: 'title_index',
                    text: { query: req.query.keyword, path: 'title' },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]
        let resultAll = await db
            .collection('post')
            .aggregate(searchCondition)
            .toArray()
        let postsCount = resultAll.length
        let pageInfo = createPaginationInfo(req.query, postsCount)
        let result = resultAll.slice(
            pageInfo.skippedPosts,
            pageInfo.skippedPosts + pageInfo.postsOnPage
        )
        res.render('list.ejs', {
            user: req.user,
            posts: result,
            pages: pageInfo,
            keyword: req.query.keyword,
        })
    } catch (e) {
        alertAndRedirect(res, 400, e.message, '/list')
        // alertAndRedirect(res, 500, '서버에 오류가 발생했습니다.', '/list')
    }
})

app.get('/write', checkAuth, (req, res) => {
    res.render('write.ejs', { user: req.user })
})

app.get('/edit', checkAuth, async (req, res) => {
    try {
        let post = await db
            .collection('post')
            .findOne({ _id: new ObjectId(req.query.postId) })
        if (!post) {
            throw new Error('글이 존재하지 않습니다.')
        } else if (!post.userId.equals(req.user._id)) {
            throw new Error('권한이 없습니다.')
        } else {
            res.render('edit.ejs', { user: req.user, post: post })
        }
    } catch (e) {
        alertAndRedirect(res, 400, e.message, req.headers.referer)
    }
})

/* CRUD service about posts */
app.use('/post', require('./routes/post.js'))
app.post('/comment', async (req, res) => {
    await db.collection('comment').insertOne({
        parentId: new ObjectId(req.body.parentId),
        writerId: req.user._id,
        writer: req.user.username,
        content: req.body.content,
    })
    res.redirect(req.headers.referer)
})

/* user service */
app.use('/register', require('./routes/register.js'))
app.use('/login', require('./routes/login.js'))

app.get('/mypage', checkAuth, (req, res) => {
    res.render('mypage.ejs', { user: req.user })
})

app.post('/logout', async (req, res) => {
    req.logout(() => {
        req.session.destroy()
        alertAndRedirect(res, 200, '로그아웃되었습니다.', '/')
    })
})
