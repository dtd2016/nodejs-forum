const router = require('express').Router()
const { ObjectId } = require('mongodb')
let connectDB = require('../database.js')
const alertAndRedirect = require('../modules/alert-and-redirect.js')
const checkAuth = require('../modules/check-auth.js')

let db
connectDB
    .then((client) => {
        db = client.db('forum')
    })
    .catch((err) => {
        console.log(err)
    })

router.get('/', async (req, res) => {
    try {
        let post = await db
            .collection('post')
            .findOne({ _id: new ObjectId(req.query.postId) })
        if (post == null)
            alertAndRedirect(
                res,
                404,
                '글이 존재하지 않습니다.',
                req.headers.referer
            )
        else {
            let comments = await db
                .collection('comment')
                .find({ parentId: new ObjectId(req.query.postId) })
                .toArray()
            res.render('post.ejs', {
                user: req.user,
                post: post,
                comments: comments,
            })
        }
    } catch (e) {
        console.log(e)
        alertAndRedirect(
            res,
            500,
            '서버에 오류가 발생했습니다.',
            req.headers.referer
        )
    }
})

router.post('/', async (req, res) => {
    try {
        if (req.body.title == '')
            alertAndRedirect(res, 400, '제목을 입력해주세요.', '/write')
        else if (req.body.content == '')
            alertAndRedirect(res, 400, '내용을 입력해주세요.', '/write')
        else {
            await db.collection('post').insertOne({
                title: req.body.title,
                content: req.body.content,
                img: req.file ? req.file.location : '',
                userId: req.user._id,
                username: req.user.username,
            })
            await db
                .collection('counter')
                .updateOne({}, { $inc: { postsCount: 1 } })
            alertAndRedirect(res, 200, '작성이 완료되었습니다.', '/list')
        }
    } catch (e) {
        console.log(e)
        alertAndRedirect(res, 500, '서버에 오류가 발생했습니다.', '/write')
    }
})

router.put('/', async (req, res) => {
    try {
        if (
            (await db
                .collection('post')
                .findOne({ _id: new ObjectId(req.body.id) })) == null
        )
            alertAndRedirect(res, 404, '글이 존재하지 않습니다.', '/list')
        else if (req.body.title == '')
            alertAndRedirect(
                res,
                400,
                '제목을 입력해주세요.',
                '/edit/' + req.params.id
            )
        else if (req.body.content == '')
            alertAndRedirect(
                res,
                400,
                '내용을 입력해주세요.',
                '/edit/' + req.params.id
            )
        else {
            let post = await db.collection('post').updateOne(
                { _id: new ObjectId(req.body.id) },
                {
                    $set: {
                        title: req.body.title,
                        content: req.body.content,
                    },
                }
            )
            alertAndRedirect(res, 200, '수정이 완료되었습니다.', '/list')
        }
    } catch (e) {
        console.log(e)
        alertAndRedirect(res, 500, '서버에 오류가 발생했습니다.', '/list')
    }
})

router.delete('/', checkAuth, async (req, res) => {
    try {
        let post = await db.collection('post').findOne({
            _id: new ObjectId(req.query.postId),
        })

        if (!post) {
            throw new Error('글이 존재하지 않습니다.')
        } else if (!post.userId.equals(req.user._id)) {
            throw new Error('권한이 없습니다.')
        } else {
            await db.collection('post').deleteOne({
                _id: new ObjectId(req.query.postId),
                userId: req.user._id,
            })

            await db
                .collection('counter')
                .updateOne({}, { $inc: { postsCount: -1 } })
            alertAndRedirect(
                res,
                200,
                '삭제가 완료되었습니다.',
                req.headers.referer
            )
        }
    } catch (e) {
        alertAndRedirect(res, 400, e.message, req.headers.referer)
    }
})

module.exports = router
