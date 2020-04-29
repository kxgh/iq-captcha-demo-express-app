'use strict';
const creator = require('./creator');
const {fork} = require('child_process');
const {join} = require('path');

class IQC {
    /**
     * Class for automatic CAPTCHA creating, providing and dynamic capacity adjusting.
     * @param {Object} opts options for CAPTCHA management
     * @param {number} [opts.initialCapacity] starting CAPTCHA capacity. Default 1
     * @param {number} [opts.checkInterval] time interval for CAPTCHA checks in millisecondds. Default 3000
     * @param {boolean} [opts.capacityDynamic] whether capacity should be dynamically adjusted. Default true
     * @param {boolean} [opts.capacityCutbackInterval] time in milliseconds after which capacity drops by one. Default 1000*60*60
     * @param {boolean} [opts.capacityCutbackMinPercentage] minimal ready/capacity ratio to perform cutback. Default 0.9
     * @param {object} [opts.logger] logger
     * @param {boolean} [opts.forks] whether creation should run in separate process. Defaults to true
     */
    constructor(opts = {}) {
        this._capacity = opts.initialCapacity || 1;
        this._checkInterval = opts.checkInterval || 3000;
        this._capacityDynamic = opts.capacityDynamic !== false;
        this._capacityCutbackInterval = opts.capacityCutbackInterval || 1000 * 60 * 60;
        this._capacityCutbackMinPercentage = opts.capacityCutbackMinPercentage || .9;
        this._forks = opts.forks !== false;
        this._logger = opts.logger || console;
        this._pendingCaptchas = 0;
        this._readyQue = [];
        this._awaitingQue = [];
        this._terminate = false;
    }

    /**
     * Starts the periodic, non-blocking checking for CAPTCHAs. If amount of ready CAPTCHAs is less
     * than specified capacity, a CAPTCHA is generated. This method needs to be called before calling any CAPTCHA
     * providing functions.
     */
    begin() {
        this._ticking = setInterval(() => {
            this._logger.debug('--- Loop tick ---');
            this._checkForCaptchas();
        }, this._checkInterval);
        if (this._capacityCutbackInterval > 0 && this._capacityDynamic)
            this._cutback = setInterval(() => {
                if (this._capacity > 2 && this._readyQue.length / this._capacity > this._capacityCutbackMinPercentage) {
                    this._capacity--;
                    this._logger.debug('Capacity cut back to ', this._capacity)
                }
            }, Math.max(10000, this._capacityCutbackInterval));
    }

    _checkForCaptchas() {
        if (!this._terminate) {
            const req = (this._capacity - (this._pendingCaptchas + this._readyQue.length));
            this._logger.debug(`Checking  for  captchas, have  ${this._readyQue.length},  will  need: ${req}`);
            while (this._capacity > this._pendingCaptchas + this._readyQue.length) {
                this._createCaptcha();
            }
        }
    }

    _tryGettingCaptcha() {
        if (this._readyQue.length <= 2 && this._capacityDynamic)
            this._capacity++;
        if (this._awaitingQue.length === 0 && this._readyQue.length > 0) {
            return this._readyQue.shift();
        }
        return null;
    }

    async _createCaptcha() {
        this._pendingCaptchas++;
        const onDone = res => {
            if (this._awaitingQue.length)
                this._awaitingQue.shift()(res);
            else this._readyQue.push(res);
        };
        if (this._forks) {
            fork(join(__dirname, 'provider-job')).on('message', data => {
                if (data.err)
                    this._logger.warn(data.err);
                else onDone(data);
                this._pendingCaptchas--;
            });
        } else {
            try {
                onDone(await creator.create());
                this._pendingCaptchas--;
            } catch (e) {
                this._logger.warn(e);
            }
        }
    }

    /**
     * Retrieves ready CAPTCHA from the queue in a form of promise.
     * @returns {Promise<{choices: Array, answer: String, data: String}>} resolved object consists of:<ul>
     * <li>choices: list of picked letter choices</li>
     * <li>answer: string of exactly two letters form the choices</li>
     * <li>data: Base64 encoded picture</li>
     * </ul>
     */
    async popCaptcha() {
        const result = this._tryGettingCaptcha();
        if (result)
            return Promise.resolve(result);
        let resolveFunc = () => {
        };
        const futureResult = new Promise(resolve => {
            resolveFunc = resolve;
        });
        this._awaitingQue.push(resolveFunc);
        return futureResult;
    }

    /**
     * Stops all ongoing intervals
     */
    stop() {
        this._terminate = true;
        if (this._ticking)
            this._ticking.close();
        if (this._cutback)
            this._cutback.close();
        this._logger.info('Stopping loops...');
    }
}

module.exports = IQC;