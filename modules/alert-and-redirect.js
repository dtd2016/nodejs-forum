function alertAndRedirect(res, code, script, url) {
    // alert script and redirect to url
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' })
    res.write('<script>alert("' + script + '")</script>')
    res.write('<script>window.location="' + url + '"</script>')
}

module.exports = alertAndRedirect
