require('./creator').create().then(result => {
    process.send(result);
}).catch(err => {
    process.send({err});
});