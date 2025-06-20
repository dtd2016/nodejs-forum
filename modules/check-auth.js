const alertAndRedirect = require('./alert-and-redirect.js')

function checkAuth(req, res, next) {
    if (req.user) next()
    else {
        alertAndRedirect(res, 400, '로그인이 필요합니다.', '/login')
    }
}

module.exports = checkAuth
