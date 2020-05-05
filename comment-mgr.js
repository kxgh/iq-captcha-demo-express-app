'use strict';
const {CaptchaAuthr, CaptchaMgr} = require('@kxghnpm/kx-iqcaptcha');

const iqcMgr = new CaptchaMgr({forks:false,logger:console,genOpts:{}});
iqcMgr.begin();
const authPreferences = {
    requiredAnswers: 1,
    resetOnWrong: true,
    answerTimeout: 2*60000
};
const authr = new CaptchaAuthr(iqcMgr, authPreferences);

const getDate = off => {
    if (!off)
        off = 0;
    let d = new Date(new Date() - off);
    return `${d.getDate()}.${d.getMonth()}.${d.getFullYear()} ` + String(d).match(/\d\d:\d\d:\d\d/);
};
const comments = [{
    date: getDate(4156400),
    nick: "Butchakov",
    body: "The linguistic situation of Luxembourg is complex. It is characterized by the existence of a language specific to the local population (Luxembourgish), mixed with the historical presence of the two major languages spoken in the surrounding countries (French and German).\nThree languages are recognised as official in Luxembourg: French, German and Luxembourgish, a Franconian language of the Moselle region that is also spoken in neighbouring parts of Belgium, Germany and France."
}, {
    date: getDate(123400),
    nick: "James Moldan",
    body: "Esch-sur-Alzette is a commune with town status in south-western Luxembourg. It is the country's second \"city\", and its second-most populous commune, with a population of 35,040 inhabitants, as of 2018. It lies in the south-west of the country, on the border with France and in the valley of the Alzette, which flows through the town. ."
}];
const processRequest = async req => {
    const [id, answer] = [req.sessionID, ((req.body || {}).captcha || {}).answer],
        authrResponse = await authr.tryAuth(id, answer);
    console.log('response')
    console.log(authrResponse)
    if (authr.authSucceeded(authrResponse)) {
        const cmt = req.body.comment; // comment consists of nick and body
        if (cmt && cmt.body) {
            comments.push({date: getDate(), nick: cmt.nick || "Anonym", body: cmt.body});
            authrResponse.comment = 'success';
        }
    }
    return authrResponse;
};

module.exports = {
    getComments: () => comments,
    processRequest
};