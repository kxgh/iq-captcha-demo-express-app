/**
 * CAPTCHA response parser/builder.
 * Use show/hide for GUI toggling, handlers for registering callbacks.
 */
var CaptchaResponseParserFactory = function () {

    var _built = false,
        autoRefreshTimer = null;
    var api = {
        postAddress: '/', // server address
        postData: {}, // object that will be posted to server along with captcha
        imgsPath: 'images/', // images path for obtaining png icons if needed
        _elems: {},
        handlers:{ // functions stored in these arrays will be called on appropriate events
            new: [], // on each new set of captchas
            wrong: [], // on each wrong answer
            success: [], // on auth success
            sound: [], // on alternate captcha pressed
            limit: [], // on too many incorrect answers
            more: [], // on a correct answer but when more than one answer is required
            timeout: [], // on answer timeout
            error: [], // on unsuccessful captcha download
            atsend: [] // before sending any answer
        },
        hdrContentType: 'application/json', // header content type
        sentPrefix: '', // prefixed string inserted before stringified postData
        defaultLabels: { // labels to be used for buttons, text areas
            labelText: 'As a prevention from robots and, hopefully, as a content improvement feature, ' +
                'users are required to solve this CAPTCHA prior to submitting a comment. Enter the correct answer as a ' +
                'pair of exactly 2 letters into the textbox below and press submit.',
            btnSubmitText: 'Submit',
            btnCloseText: 'Close',
            btnRegenText: "I don't know",
            btnSoundText: 'Use altern. CAPTCHA',
        },
        show: function (res) {
            if (_built) {
                api._elems.container.style.display = 'block';
                return;
            }
            _built = true;

            var els = api._elems;
            els.container = document.createElement('DIV');
            els.image = document.createElement("IMG");
            els.label = document.createElement("P");
            els.btnSubmit = document.createElement("BUTTON");
            els.btnClose = document.createElement("BUTTON");
            els.btnRegen = document.createElement("BUTTON");
            els.btnSound = document.createElement("BUTTON");
            els.inputAnswer = document.createElement("INPUT");

            els.container.classList.add('iqCaptchaModal');
            els.label.classList.add('iqcLabel');
            els.image.classList.add('iqcImage');
            //els.image.setAttribute('src', api.imgsPath +'sample.png');
            els.btnSubmit.classList.add('iqcButton');
            els.btnSubmit.classList.add('btnSubmit');
            els.btnClose.classList.add('iqcButton');
            els.btnClose.classList.add('btnClose');
            els.btnRegen.classList.add('iqcButton');
            els.btnRegen.classList.add('btnRegen');
            els.btnSound.classList.add('iqcButton');
            els.btnSound.classList.add('btnSound');
            els.inputAnswer.classList.add('iqcInput');
            els.inputAnswer.setAttribute('type', 'text');
            els.inputAnswer.setAttribute('autofocus', 'autofocus');
            els.inputAnswer.setAttribute('placeholder', 'answer');


            els.label.innerText = api.defaultLabels.labelText;
            els.btnSubmit.innerText = api.defaultLabels.btnSubmitText;
            els.btnClose.innerText = api.defaultLabels.btnCloseText;
            els.btnRegen.innerText = api.defaultLabels.btnRegenText;
            els.btnSound.innerText = api.defaultLabels.btnSoundText;

            els.container.appendChild(els.label);
            els.container.appendChild(els.image);
            els.container.appendChild(els.inputAnswer);
            els.container.appendChild(els.btnSubmit);
            els.container.appendChild(els.btnRegen);
            els.container.appendChild(els.btnSound);
            els.container.appendChild(els.btnClose);
            document.getElementsByTagName('body')[0].appendChild(els.container);

            function sendAns(regen) {
                var ajax = new XMLHttpRequest();
                ajax.onreadystatechange = function () {
                    if (ajax.readyState == 4 && ajax.status >= 200 && ajax.status < 400) {
                        var r = JSON.parse(ajax.response);
                        api.processResponse(r);
                    }
                };
                ajax.open('POST', api.postAddress, true);
                ajax.setRequestHeader('Content-Type', api.hdrContentType);
                for (var i = 0, hn = api.handlers.atsend; i < hn.length; i++)
                    hn[i](res);
                ajax.send(api.sentPrefix + (regen ? api._prepareRegenMessage() : api._prepareAnswerMessage()));
            }

            els.btnSubmit.addEventListener('click', function () {
                sendAns();
            });
            els.inputAnswer.addEventListener("keyup", function (event) {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    sendAns();
                }
            });
            els.btnRegen.addEventListener('click', function () {
                sendAns('regen')
            });
            els.btnSound.addEventListener('click', function (res) {
                for (var i = 0, hn = api.handlers.sound; i < hn.length; i++)
                    hn[i](res);
            });
            els.btnClose.addEventListener('click', api.hide);
            els.image.addEventListener('load', function () {
                els.image.style.display = 'block';
            });
            els.container.style.display = 'block';
        },
        _getAnswer: function () {
            return api._elems.inputAnswer.value;
        },
        _prepareAnswerMessage: function () {
            api.postData.captcha = {answer: api._getAnswer()};
            return JSON.stringify(api.postData);
        },
        _prepareRegenMessage: function () {
            api.postData.captcha = {answer: 'regen'};
            return JSON.stringify(api.postData);
        },
        setLabelText: function (txt) {
            if (_built) {
                api._elems.label.innerText = txt;
            }
        },
        setProgressText: function (txt) {
            if (_built) {
                api._elems.progress.innerText = txt;
            }
        },
        setImgSrc: function (src) {
            if (_built) {
                api._elems.image.style.display = 'hidden';
                api._elems.image.setAttribute('src', src);
            }
        },
        hide: function () {
            if (_built) {
                api._elems.container.style.display = 'none';
            }
        },
        processResponse: function (res) {
            var c = res.captcha, i, hn;
            if (!c)
                return null;
            if (c.state == 'error') {
                for (i = 0, hn = api.handlers.error; i < hn.length; i++)
                    hn[i](res);
                return false;
            } else {
                if (c.state == 'new') {
                    for (i = 0, hn = api.handlers.new; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.state == 'wrong') {
                    for (i = 0, hn = api.handlers.wrong; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.state == 'more') {
                    for (i = 0, hn = api.handlers.more; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.state == 'limit') {
                    for (i = 0, hn = api.handlers.limit; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.state == 'success') {
                    for (i = 0, hn = api.handlers.success; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.state == 'timeout') {
                    for (i = 0, hn = api.handlers.timeout; i < hn.length; i++)
                        hn[i](res);
                }
                if (c.info && api._elems.progress) {
                    api.setProgressText(parseInt(c.info.correct + 1) + '/' + c.info.required)
                }
                if (c.challenge)
                    api.setImgSrc(c.challenge);
                return true;
            }
        }
    };
    api.handlers.new.push(function (res) {
        if(!autoRefreshTimer) // captcha autorefresh pending = do not show intro text
            api.setLabelText(api.defaultLabels.labelText);
        api.show(res);
    });
    api.handlers.success.push(function () {
        api.hide();
    });
    api.handlers.more.push(function (res) {
        api.setLabelText('Correct. Just ' + (res.captcha.info.required - res.captcha.info.correct) + ' more.');
    });
    api.handlers.timeout.push(function (res) {
        api.setLabelText('Sorry, answering took you too long. Try again.');
    });
    api.handlers.wrong.push(function (res) {
        api.setLabelText('That was not correct. Please try again.');
    });
    api.handlers.limit.push(function (res) {
        var time = res.captcha.info.dropAfter;
        api.show(res);
        if (!autoRefreshTimer)
            autoRefreshTimer = setTimeout(function () {
                if (api._elems.container.style.display != 'none')
                    api._elems.btnRegen.click();
                console.log('autorefreshed');
                autoRefreshTimer = null;
            }, time < 1000 ? time * 1000 : time);
        if (time > 999)
            time /= 1000;
        api.setLabelText('Too many incorrect attempts. Please try again ' + time + ' seconds later. CAPTCHA will ' +
            'reload automatically.');
    });
    return api;
};