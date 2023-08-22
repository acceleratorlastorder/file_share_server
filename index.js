const express = require('express');
const serveIndex = require('serve-index');
const app = express();
const port = 42069;

// Serve URLs like /ftp/thing as public/ftp/thing
// The express.static serves the file contents
// The serveIndex is this module serving the directory

const folderPath = "./sharedfolder";

app.use('/static', express.static('public'));


app.use('/', express.static(folderPath), serveIndex(folderPath, {
    stylesheet: "public/css/customStyle.css",
    template: "public/tpl/customTemplate.html",
    icons: true,
    maxAge: '10m'
}));


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});