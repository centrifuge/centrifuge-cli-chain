"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dispatcher = exports.toByteArray = exports.toHexString = exports.insertOrNewMap = exports.DefaultStorage = void 0;
var util_crypto_1 = require("@polkadot/util-crypto");
exports.DefaultStorage = [
    util_crypto_1.xxhashAsHex("System", 128) + util_crypto_1.xxhashAsHex("Account", 128).slice(2),
    util_crypto_1.xxhashAsHex("Balances", 128),
];
function insertOrNewMap(map, key, item) {
    return __awaiter(this, void 0, void 0, function () {
        var itemsArray, itemsArray;
        return __generator(this, function (_a) {
            if (map.has(key)) {
                itemsArray = map.get(key);
                itemsArray.push(item);
            }
            else {
                itemsArray = new Array();
                itemsArray.push(item);
                map.set(key, itemsArray);
            }
            return [2 /*return*/];
        });
    });
}
exports.insertOrNewMap = insertOrNewMap;
function toHexString(byteArray) {
    return __awaiter(this, void 0, void 0, function () {
        var hex, asArray, _i, asArray_1, byte, val;
        return __generator(this, function (_a) {
            hex = [];
            asArray = Array.from(byteArray);
            for (_i = 0, asArray_1 = asArray; _i < asArray_1.length; _i++) {
                byte = asArray_1[_i];
                val = ('0' + (byte & 0xFF).toString(16)).slice(-2);
                hex.push(val);
            }
            return [2 /*return*/, hex.join('')];
        });
    });
}
exports.toHexString = toHexString;
function toByteArray(hexString) {
    return __awaiter(this, void 0, void 0, function () {
        var numBytes, byteArray, i;
        return __generator(this, function (_a) {
            if (hexString.length % 2 !== 0) {
                throw "Must have an even number of hex digits to convert to bytes";
            }
            numBytes = hexString.length / 2;
            byteArray = new Uint8Array(numBytes);
            for (i = 0; i < numBytes; i++) {
                byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
            }
            return [2 /*return*/, byteArray];
        });
    });
}
exports.toByteArray = toByteArray;
var Dispatcher = /** @class */ (function () {
    function Dispatcher(api, keypair, startingNonce, cbErr, perBlock, concurrent) {
        if (perBlock === void 0) { perBlock = 100; }
        if (concurrent === void 0) { concurrent = 500; }
        if (cbErr !== undefined) {
            this.cbErr = cbErr;
        }
        else {
            this.cbErr = function (xts) {
            };
        }
        this.api = api;
        this.nonce = startingNonce;
        this.maxConcurrent = concurrent;
        this.running = 0;
        this.perBlock = perBlock;
        this.signer = keypair;
        this.dispatched = BigInt(0);
        this.dispatchHashes = new Array();
    }
    Dispatcher.prototype.nextNonce = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tmp;
            return __generator(this, function (_a) {
                tmp = this.nonce;
                this.nonce = tmp + BigInt(1);
                return [2 /*return*/, tmp];
            });
        });
    };
    Dispatcher.prototype.dryRun = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, xts_1, xt, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _i = 0, xts_1 = xts;
                        _a.label = 1;
                    case 1:
                        if (!(_i < xts_1.length)) return [3 /*break*/, 4];
                        xt = xts_1[_i];
                        return [4 /*yield*/, xt.dryRun(this.signer)];
                    case 2:
                        result = _a.sent();
                        // @ts-ignore
                        if (result.isErr()) {
                            return [2 /*return*/, false];
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, true];
                }
            });
        });
    };
    Dispatcher.prototype.dispatch = function (xts, inSequence) {
        if (inSequence === void 0) { inSequence = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dryRun(xts)];
                    case 1:
                        if (!(_a.sent())) {
                            this.cbErr(xts);
                            return [2 /*return*/];
                        }
                        if (!inSequence) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.dispatchInternalInSequence(xts)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.dispatchInternal(xts)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.dispatchInternal = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var counter, _loop_1, this_1, _i, xts_2, extrinsic;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        counter = 0;
                        _loop_1 = function (extrinsic) {
                            var unsub;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        counter += 1;
                                        if (!(counter % this_1.perBlock === 0)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                    case 1:
                                        _b.sent();
                                        _b.label = 2;
                                    case 2:
                                        if (!(this_1.running >= this_1.maxConcurrent)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                    case 3:
                                        _b.sent();
                                        return [3 /*break*/, 2];
                                    case 4:
                                        this_1.dispatched += BigInt(1);
                                        this_1.running += 1;
                                        return [4 /*yield*/, extrinsic.signAndSend(this_1.signer, { nonce: -1 }, function (_a) {
                                                var _b = _a.events, events = _b === void 0 ? [] : _b, status = _a.status;
                                                if (status.isInBlock) {
                                                    events.forEach(function (_a) {
                                                        var _b = _a.event, data = _b.data, method = _b.method, section = _b.section, phase = _a.phase;
                                                        if (method === 'ExtrinsicSuccess') {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                        }
                                                        else if (method === 'ExtrinsicFailed') {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                            _this.cbErr([extrinsic]);
                                                        }
                                                        _this.running -= 1;
                                                    });
                                                }
                                                else if (status.isFinalized) {
                                                    // @ts-ignore
                                                    unsub();
                                                }
                                                // @ts-ignore
                                            }).catch(function (err) {
                                                _this.running -= 1;
                                                _this.dispatched -= BigInt(1);
                                                _this.cbErr(xts);
                                                console.log(err);
                                            })];
                                    case 5:
                                        unsub = _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, xts_2 = xts;
                        _a.label = 1;
                    case 1:
                        if (!(_i < xts_2.length)) return [3 /*break*/, 4];
                        extrinsic = xts_2[_i];
                        return [5 /*yield**/, _loop_1(extrinsic)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.getResults = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(BigInt(this.dispatchHashes.length) !== this.dispatched && this.running !== 0)) return [3 /*break*/, 2];
                        process.stdout.write("Waiting for results. Returned calls " + this.dispatchHashes.length + " vs. dispatched " + this.dispatched + ". Running: " + this.running + " \r");
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/, this.dispatchHashes];
                }
            });
        });
    };
    Dispatcher.prototype.dispatchInternalInSequence = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var xt, callNext, unsub;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xt = xts.shift();
                        callNext = function () { return __awaiter(_this, void 0, void 0, function () {
                            var extrinsic, unsub;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        extrinsic = xts.shift();
                                        _a.label = 1;
                                    case 1:
                                        if (!(this.running >= this.maxConcurrent)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 1];
                                    case 3:
                                        this.dispatched += BigInt(1);
                                        this.running += 1;
                                        return [4 /*yield*/, extrinsic.signAndSend(this.signer, { nonce: -1 }, function (_a) {
                                                var _b = _a.events, events = _b === void 0 ? [] : _b, status = _a.status;
                                                if (status.isInBlock) {
                                                    events.forEach(function (_a) {
                                                        var _b = _a.event, data = _b.data, method = _b.method, section = _b.section, phase = _a.phase;
                                                        if (method === 'ExtrinsicSuccess') {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                            callNext();
                                                        }
                                                        else if (method === 'ExtrinsicFailed') {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                            _this.cbErr([extrinsic]);
                                                        }
                                                        _this.running -= 1;
                                                    });
                                                }
                                                else if (status.isFinalized) {
                                                    // @ts-ignore
                                                    unsub();
                                                }
                                                // @ts-ignore
                                            }).catch(function (err) {
                                                _this.running -= 1;
                                                _this.dispatched -= BigInt(1);
                                                _this.cbErr(xts);
                                                console.log(err);
                                            })];
                                    case 4:
                                        unsub = _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        _a.label = 1;
                    case 1:
                        if (!(this.running >= this.maxConcurrent)) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.dispatched += BigInt(1);
                        this.running += 1;
                        return [4 /*yield*/, xt.signAndSend(this.signer, { nonce: -1 }, function (_a) {
                                var _b = _a.events, events = _b === void 0 ? [] : _b, status = _a.status;
                                if (status.isInBlock) {
                                    events.forEach(function (_a) {
                                        var _b = _a.event, data = _b.data, method = _b.method, section = _b.section, phase = _a.phase;
                                        if (method === 'ExtrinsicSuccess') {
                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                            callNext();
                                        }
                                        else if (method === 'ExtrinsicFailed') {
                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                            _this.cbErr([xt]);
                                        }
                                        _this.running -= 1;
                                    });
                                }
                                else if (status.isFinalized) {
                                    // @ts-ignore
                                    unsub();
                                }
                                // @ts-ignore
                            }).catch(function (err) {
                                _this.running -= 1;
                                _this.dispatched -= BigInt(1);
                                _this.cbErr(xts);
                                console.log(err);
                            })];
                    case 4:
                        unsub = _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.sudoDispatch = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var counter, _loop_2, this_2, _i, xts_3, extrinsic;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        counter = 0;
                        _loop_2 = function (extrinsic) {
                            var activeNonce, unsub;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        counter += 1;
                                        if (!(counter % this_2.perBlock === 0)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                    case 1:
                                        _b.sent();
                                        console.log("Waiting in perBlock... " + counter);
                                        _b.label = 2;
                                    case 2:
                                        if (!(this_2.running >= this_2.maxConcurrent)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                    case 3:
                                        _b.sent();
                                        console.log("Waiting in line... " + counter);
                                        return [3 /*break*/, 2];
                                    case 4:
                                        this_2.dispatched += BigInt(1);
                                        this_2.running += 1;
                                        console.log("Sending with nonce " + this_2.nonce + ", running " + this_2.running + " : " + extrinsic.meta.name.toString());
                                        return [4 /*yield*/, this_2.nextNonce()];
                                    case 5:
                                        activeNonce = _b.sent();
                                        return [4 /*yield*/, this_2.api.tx.sudo.sudo(extrinsic)
                                                .signAndSend(this_2.signer, { nonce: activeNonce }, function (_a) {
                                                var _b = _a.events, events = _b === void 0 ? [] : _b, status = _a.status;
                                                if (status.isInBlock || status.isFinalized) {
                                                    console.log("Sending with nonce " + activeNonce + " is in Block/Finalized : " + extrinsic.meta.name.toString());
                                                    events.filter(function (_a) {
                                                        var event = _a.event;
                                                        return _this.api.events.sudo.Sudid.is(event);
                                                    })
                                                        .forEach(function (_a) {
                                                        var result = _a.event.data[0], phase = _a.phase;
                                                        // We know that `Sudid` returns just a `Result`
                                                        // @ts-ignore
                                                        if (result.isError) {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                            _this.cbErr([extrinsic]);
                                                            console.log("Sudo error: " + activeNonce);
                                                        }
                                                        else {
                                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                                            console.log("Sudo ok: " + activeNonce);
                                                        }
                                                    });
                                                    _this.running -= 1;
                                                    // @ts-ignore
                                                    unsub();
                                                }
                                            }).catch(function (err) {
                                                _this.running -= 1;
                                                _this.dispatched -= BigInt(1);
                                                _this.cbErr([extrinsic]);
                                                console.log(err);
                                            })];
                                    case 6:
                                        unsub = _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _i = 0, xts_3 = xts;
                        _a.label = 1;
                    case 1:
                        if (!(_i < xts_3.length)) return [3 /*break*/, 4];
                        extrinsic = xts_3[_i];
                        return [5 /*yield**/, _loop_2(extrinsic)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.batchDispatch = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var unsub;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dryRun(xts)];
                    case 1:
                        if (!(_a.sent())) {
                            this.cbErr(xts);
                        }
                        _a.label = 2;
                    case 2:
                        if (!(this.running >= this.maxConcurrent)) return [3 /*break*/, 4];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 4:
                        this.dispatched += BigInt(1);
                        this.running += 1;
                        return [4 /*yield*/, this.api.tx.utility
                                .batch(xts)
                                .signAndSend(this.signer, { nonce: -1 }, function (_a) {
                                var status = _a.status, events = _a.events;
                                if (status.isInBlock) {
                                    events.forEach(function (_a) {
                                        var _b = _a.event, data = _b.data, method = _b.method, section = _b.section, phase = _a.phase;
                                        if (method === 'ExtrinsicSuccess') {
                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                        }
                                        else if (method === 'ExtrinsicFailed') {
                                            _this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                            _this.cbErr(xts);
                                        }
                                    });
                                    _this.running -= 1;
                                }
                                else if (status.isFinalized) {
                                    // @ts-ignore
                                    unsub();
                                }
                            }).catch(function (err) {
                                _this.running -= 1;
                                _this.dispatched -= BigInt(1);
                                _this.cbErr(xts);
                                console.log(err);
                            })];
                    case 5:
                        unsub = _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Dispatcher;
}());
exports.Dispatcher = Dispatcher;
//# sourceMappingURL=common.js.map