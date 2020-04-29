/**
 * CAPTCHA creator
 * @module creator
 */

'use strict';

const fs = require('fs');
const cv = require('canvas');
const _dbg = process.argv.includes('--dev');
const _logger = {
    log: _dbg ? console.log : () => {
    }
};
const _Geo = require('./geometry');

/**
 * Square dimension of one tile. Tile is an option or a puzzle picture frame. Change the tile res to appropriately
 * change other dimensions too.
 * @constant
 * @default
 * @type {number}
 */
const tileRes = 100;
const elementRes = 6 * tileRes / 10,
    padding = tileRes / 10,
    canvasWidth = 5 * padding + tileRes * 5,
    canvasHeigth = 4 * padding + tileRes * 5;

/**
 * Provides a CAPTCHA object. Returned choices are array of option letters. Answer is 2 letter string of correct
 * answers, data is Base64 picture encoding. Mentioned properties are attributes of resolved Promise object which
 * the function returns.
 * @async
 * @returns {Promise<{choices: Array, answer: String, data: String}>}
 */
const create = async () => {
    const canvas = cv.createCanvas(canvasWidth, canvasHeigth),
        ctx = canvas.getContext('2d');

    const topShapeIdces = _Geo.random.genDistinct(0, _Geo.shapes.length - 1, 3, []);

    const [midOffset, qOffset] = _Geo.random.genDistinct(1, _Geo.shapes.length - 1, 2, _Geo.shapes.length);
    const midShapeIdces = topShapeIdces.map(index => ((index + midOffset) % _Geo.shapes.length));
    const qShapeIdces = topShapeIdces.map(index => ((index + qOffset) % _Geo.shapes.length));

    _logger.log(topShapeIdces, midShapeIdces, qShapeIdces);
    _logger.log(`${canvasWidth}x${canvasHeigth}`);

    const overdraws = _Geo.deciders.decideOverdraws();
    const overdrawsParams = _Geo.deciders.decideParams(overdraws);
    const resolutions = [];

    /**
     * decide resolutions/dimensions
     */
    {
        for (let i of [0, 1, 2]) {
            if (overdraws[i] === _Geo.painters.clock || overdraws[i] === _Geo.painters.insert) {
                if (i === 2 && _Geo.random.randInt(0, 2))
                    resolutions.push(Math.floor(elementRes / 3));
                else resolutions.push(Math.floor(elementRes / 2));
            } else resolutions.push(_Geo.random.randInt(0, 2) ? elementRes : Math.floor(elementRes / 2));
        }
    }

    _logger.log(overdraws);
    _logger.log(overdrawsParams);
    _logger.log(resolutions);

    /**
     * prepare for drawing
     */
    let layerCountMatrix = [[1, 2, 3], [1, 2, 3], [1, 2, 3]],
        rowIndexMatrix = _Geo.random.shuffle([[1, 1, 1], [2, 2, 2], [3, 3, 3]]),
        idxTranslation = {
            1: topShapeIdces,
            2: midShapeIdces,
            3: qShapeIdces
        };
    /**
     * shuffle question tiling
     */
    {
        if (_Geo.random.randInt(0, 1)) {
            layerCountMatrix = _Geo.random.shuffle(rowIndexMatrix);
            const replicated = _Geo.random.shuffle([1, 2, 3]);
            rowIndexMatrix = rowIndexMatrix.map(() => replicated);
        } else {
            layerCountMatrix.forEach(row => _Geo.random.shuffle(row));
            _Geo.random.shuffle(rowIndexMatrix);
        }

        _logger.log(layerCountMatrix);
        _logger.log(rowIndexMatrix)
    }
    /**
     * drawing the 3x3 question part
     */
    {
        const boundColors = [0, 0, 0].map(() => 'rgb(' + [0, 0, 0].map(() =>
            (_Geo.random.randInt(50, 255))).reduce((i, j) => (i + ', ' + j)) + ')');
        ctx.save();
        ctx.translate(tileRes + padding, padding); // move one tile rightward and pad for y
        ctx.translate(tileRes / 2, tileRes / 2); // move half a tile so we always draw in middle
        for (let y of [0, 1, 2]) {
            for (let x of [0, 1, 2]) {
                let [upToLayer, idces] = [layerCountMatrix[y][x], idxTranslation[rowIndexMatrix[y][x]]];
                /**
                 * draw tile bounds
                 */
                {
                    const gradient = ctx.createLinearGradient(0, 0, tileRes, tileRes);
                    boundColors.forEach((clr, i) => gradient.addColorStop(i / 2, clr));

                    ctx.save();
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = gradient;
                    ctx.strokeRect(-tileRes / 2, -tileRes / 2, tileRes, tileRes);
                    ctx.restore();
                }
                if (upToLayer === 3 && rowIndexMatrix[y][x] === 3)
                    _Geo.drawLetter(ctx, tileRes, '?');
                else _Geo.drawGroup(ctx, idces.slice(0, upToLayer), overdraws, overdrawsParams, resolutions);

                ctx.translate(tileRes + padding, 0); // move left for next tile in row
            }
            ctx.translate(-3 * (tileRes + padding), tileRes + padding); // move back to the left and step one row lower
        }
        ctx.restore();
    }

    const choices = _Geo.deciders.decideOptions(qShapeIdces, overdraws, overdrawsParams, resolutions);
    _logger.log(choices.answer);

    ctx.save();
    ctx.translate(tileRes / 2, (tileRes + padding) * 3 + tileRes / 2);
    for (let i of [...Array(10).keys()]) {
        if (i === 5) {
            ctx.translate(-5 * (tileRes + padding), tileRes + padding);
        }
        choices.opts[i % choices.opts.length](ctx);
        _Geo.drawLetter(ctx, tileRes, choices.letters[i % choices.opts.length]);
        ctx.translate(tileRes + padding, 0);
    }
    ctx.restore();
    _logger.log(' A N S W E R :' + choices.answer);
    return {
        choices: choices.letters,
        answer: choices.answer.join(''),
        data: canvas.toDataURL()
    };
};

const testGenToFile = (filename = 'a.html') => {
    create().then(gend => {
        const output = '<img src="' + gend.data + '" />';
        console.log(gend.answer);
        fs.writeFileSync(filename, output);
    }).catch(err => {
        console.error(err)
    });

};

module.exports = {
    create
};