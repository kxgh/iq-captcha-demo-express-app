'use strict';
(
    function () {
        var captchaMgr = CaptchaResponseParserFactory();

        var btnAddCommentClicked = function () {
            var sent = {};
            sent.nick = document.getElementById('inputNick').value;
            sent.body = document.getElementById('inputComment').value;

            var request = new XMLHttpRequest();
            request.open('POST', '/', true);

            request.onload = function () {
                if (request.status >= 200 && request.status < 400) {
                    var resp = JSON.parse(request.response);
                    captchaMgr.processResponse(resp);
                }
            };
            request.setRequestHeader('Content-Type', 'application/json');
            request.send(JSON.stringify({comment: sent}));
        };
        captchaMgr.handlers.success.push(function () {
            location.reload();
        });
        captchaMgr.handlers.sound.push(function (res) {
            alert('Not implemented.')
        });
        captchaMgr.handlers.atsend.push(function () {
            var commentObj = {};
            commentObj.body = document.getElementById('inputComment').value;
            commentObj.nick = document.getElementById('inputNick').value;
            captchaMgr.postData.comment = commentObj;
        });
        addEventListener('load', function () {
            document.getElementById('btnAddComment').addEventListener('click', btnAddCommentClicked);
        })
    }
)();