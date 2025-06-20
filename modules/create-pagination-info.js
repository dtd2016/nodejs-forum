function createPaginationInfo(query, postsCount) {
    let currPage = 1
    let postsPerPage = 5
    if (query.page) {
        if (parseInt(query.page) > 0) currPage = parseInt(query.page)
        else throw new Error('잘못된 요청입니다.')
    }
    if (query.pageSize) {
        if (parseInt(query.pageSize) > 0)
            postsPerPage = parseInt(query.pageSize)
        else throw new Error('잘못된 요청입니다.')
    }

    // if (currPage > Math.floor((postsCount + postsPerPage - 1) / postsPerPage))
    //     // try accessing page after the last page
    //     throw new Error('잘못된 요청입니다.')

    let skippedPosts = postsCount - currPage * postsPerPage
    let postsOnPage = postsPerPage
    if (currPage * postsPerPage >= postsCount) {
        // last page
        skippedPosts = 0
        postsOnPage = postsCount - (currPage - 1) * postsPerPage
    }

    let pageInfo = {
        curr: currPage,
        postsPerPage: postsPerPage,
        skippedPosts: skippedPosts,
        postsOnPage: postsOnPage,
        count: Math.floor((postsCount + postsPerPage - 1) / postsPerPage),
        start: Math.floor((currPage - 1) / 5) * 5 + 1,
        end: Math.floor((currPage - 1) / 5) * 5 + 5,
    }
    if (pageInfo.end > pageInfo.count) pageInfo.end = pageInfo.count

    return pageInfo
}

module.exports = createPaginationInfo
