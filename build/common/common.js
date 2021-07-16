"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.test_run = exports.StorageItemElement = exports.PalletElement = exports.StorageElement = exports.Dispatcher = exports.toByteArray = exports.toHexString = exports.insertOrNewMap = exports.parseModuleInput = exports.checkAvailability = exports.getDefaultStorage = void 0;
var util_crypto_1 = require("@polkadot/util-crypto");
var api_1 = require("@polkadot/api");
function getDefaultStorage() {
    return [
        parseModuleInput("Balances.TotalIssuance"),
        parseModuleInput("System.Account"),
        parseModuleInput("Vesting.Vesting"),
        parseModuleInput("Proxy.Proxies"),
    ];
}
exports.getDefaultStorage = getDefaultStorage;
function checkAvailability(availableFromModules, availableToModules, wanted) {
    return __awaiter(this, void 0, void 0, function () {
        var _loop_1, _i, wanted_1, storage, state_1;
        return __generator(this, function (_a) {
            _loop_1 = function (storage) {
                var availableFrom = false;
                var availableTo = false;
                availableFromModules.forEach(function (module) {
                    if (module.storage.isSome) {
                        if (storage.key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                            if (storage instanceof StorageItemElement) {
                                for (var _i = 0, _a = module.storage.unwrap().items; _i < _a.length; _i++) {
                                    var items = _a[_i];
                                    availableFrom = storage.itemHash === util_crypto_1.xxhashAsHex(items.name.toString(), 128);
                                }
                            }
                            else {
                                availableFrom = true;
                            }
                        }
                    }
                });
                availableToModules.forEach(function (module) {
                    if (module.storage.isSome) {
                        if (storage.key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                            if (storage instanceof StorageItemElement) {
                                for (var _i = 0, _a = module.storage.unwrap().items; _i < _a.length; _i++) {
                                    var items = _a[_i];
                                    availableTo = storage.itemHash === util_crypto_1.xxhashAsHex(items.name.toString(), 128);
                                }
                            }
                            else {
                                availableTo = true;
                            }
                        }
                    }
                });
                if (!availableFrom || !availableTo) {
                    return { value: false };
                }
            };
            // Check if module is available
            // Iteration is death, but we do not care here...
            for (_i = 0, wanted_1 = wanted; _i < wanted_1.length; _i++) {
                storage = wanted_1[_i];
                state_1 = _loop_1(storage);
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
            }
            return [2 /*return*/, true];
        });
    });
}
exports.checkAvailability = checkAvailability;
function parseModuleInput(input) {
    var parsed = input.split(".").filter(function (element, index) {
        return index < 2;
    });
    var elem;
    if (parsed.length === 1) {
        return new PalletElement(parsed[0]);
    }
    else {
        return new StorageItemElement(parsed[0], parsed[1]);
    }
}
exports.parseModuleInput = parseModuleInput;
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
    Dispatcher.prototype.returnNonce = function (activeNonce) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.nonce === activeNonce + BigInt(1)) {
                    this.nonce = activeNonce;
                    return [2 /*return*/, true];
                }
                else {
                    return [2 /*return*/, Promise.reject("Nonce has already progressed. Account out of sync with dispatcher. Need to abort or inject xt with nonce: " + activeNonce + " in order to progress.")];
                }
                return [2 /*return*/];
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
                        console.log("DryRunning: " + xt.toHuman());
                        return [4 /*yield*/, this.api.rpc.system.dryRun(xt.toHex()).catch(function (err) {
                                console.log(err);
                                return false;
                            })];
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
            var counter, _loop_2, this_1, _i, xts_2, extrinsic;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        counter = 0;
                        _loop_2 = function (extrinsic) {
                            var send;
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
                                        send = function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                var activeNonce, unsub;
                                                var _this = this;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, this.nextNonce()];
                                                        case 1:
                                                            activeNonce = _a.sent();
                                                            return [4 /*yield*/, extrinsic.signAndSend(this.signer, { nonce: activeNonce }, function (_a) {
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
                                                                }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                                    return __generator(this, function (_a) {
                                                                        switch (_a.label) {
                                                                            case 0:
                                                                                this.running -= 1;
                                                                                this.dispatched -= BigInt(1);
                                                                                this.cbErr(xts);
                                                                                return [4 /*yield*/, this.returnNonce(activeNonce).catch(function (err) { return console.log(err); })];
                                                                            case 1:
                                                                                _a.sent();
                                                                                console.log(err);
                                                                                return [2 /*return*/];
                                                                        }
                                                                    });
                                                                }); })];
                                                        case 2:
                                                            unsub = _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        };
                                        return [4 /*yield*/, send().catch(function (err) { return console.log(err); })];
                                    case 5:
                                        _b.sent();
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
            var xt, callNext, send;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xt = xts.shift();
                        callNext = function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var extrinsic, send;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            extrinsic = xts.shift();
                                            if (extrinsic === undefined) {
                                                return [2 /*return*/];
                                            }
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
                                            send = function () {
                                                return __awaiter(this, void 0, void 0, function () {
                                                    var activeNonce, unsub;
                                                    var _this = this;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, this.nextNonce()];
                                                            case 1:
                                                                activeNonce = _a.sent();
                                                                return [4 /*yield*/, extrinsic.signAndSend(this.signer, { nonce: activeNonce }, function (_a) {
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
                                                                    }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0:
                                                                                    this.running -= 1;
                                                                                    this.dispatched -= BigInt(1);
                                                                                    this.cbErr(xts);
                                                                                    return [4 /*yield*/, this.returnNonce(activeNonce).catch(function (err) { return console.log(err); })];
                                                                                case 1:
                                                                                    _a.sent();
                                                                                    console.log(err);
                                                                                    return [2 /*return*/];
                                                                            }
                                                                        });
                                                                    }); })];
                                                            case 2:
                                                                unsub = _a.sent();
                                                                return [4 /*yield*/, send().catch(function (err) { return console.log(err); })];
                                                            case 3:
                                                                _a.sent();
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                });
                                            };
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        };
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
                        send = function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var activeNonce, unsub;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.nextNonce()];
                                        case 1:
                                            activeNonce = _a.sent();
                                            return [4 /*yield*/, xt.signAndSend(this.signer, { nonce: activeNonce }, function (_a) {
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
                                                }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                this.running -= 1;
                                                                this.dispatched -= BigInt(1);
                                                                this.cbErr(xts);
                                                                return [4 /*yield*/, this.returnNonce(activeNonce).catch(function (err) { return console.log(err); })];
                                                            case 1:
                                                                _a.sent();
                                                                console.log(err);
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); })];
                                        case 2:
                                            unsub = _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        };
                        return [4 /*yield*/, send().catch(function (err) { return console.log(err); })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.sudoDispatch = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var counter, _loop_3, this_2, _i, xts_3, extrinsic;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.dryRun(xts)];
                    case 1:
                        if (!(_a.sent())) {
                            this.cbErr(xts);
                        }
                        counter = 0;
                        _loop_3 = function (extrinsic) {
                            var send;
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
                                        send = function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                var activeNonce, unsub;
                                                var _this = this;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, this.nextNonce()];
                                                        case 1:
                                                            activeNonce = _a.sent();
                                                            return [4 /*yield*/, this.api.tx.sudo.sudo(extrinsic)
                                                                    .signAndSend(this.signer, { nonce: activeNonce }, function (_a) {
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
                                                                }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                                    return __generator(this, function (_a) {
                                                                        switch (_a.label) {
                                                                            case 0:
                                                                                this.running -= 1;
                                                                                this.dispatched -= BigInt(1);
                                                                                this.cbErr([extrinsic]);
                                                                                return [4 /*yield*/, this.returnNonce(activeNonce).catch(function (err) { return console.log(err); })];
                                                                            case 1:
                                                                                _a.sent();
                                                                                console.log(err);
                                                                                return [2 /*return*/];
                                                                        }
                                                                    });
                                                                }); })];
                                                        case 2:
                                                            unsub = _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        };
                                        return [4 /*yield*/, send().catch(function (err) { return console.log(err); })];
                                    case 5:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _i = 0, xts_3 = xts;
                        _a.label = 2;
                    case 2:
                        if (!(_i < xts_3.length)) return [3 /*break*/, 5];
                        extrinsic = xts_3[_i];
                        return [5 /*yield**/, _loop_3(extrinsic)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Dispatcher.prototype.batchDispatch = function (xts) {
        return __awaiter(this, void 0, void 0, function () {
            var send;
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
                        send = function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var activeNonce, unsub;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.nextNonce()];
                                        case 1:
                                            activeNonce = _a.sent();
                                            return [4 /*yield*/, this.api.tx.utility
                                                    .batch(xts)
                                                    .signAndSend(this.signer, { nonce: activeNonce }, function (_a) {
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
                                                }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                this.running -= 1;
                                                                this.dispatched -= BigInt(1);
                                                                this.cbErr(xts);
                                                                return [4 /*yield*/, this.returnNonce(activeNonce).catch(function (err) { return console.log(err); })];
                                                            case 1:
                                                                _a.sent();
                                                                console.log(err);
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); })];
                                        case 2:
                                            unsub = _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        };
                        return [4 /*yield*/, send().catch(function (err) { return console.log(err); })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Dispatcher;
}());
exports.Dispatcher = Dispatcher;
var StorageElement = /** @class */ (function () {
    function StorageElement(key) {
        this.key = key;
    }
    return StorageElement;
}());
exports.StorageElement = StorageElement;
var PalletElement = /** @class */ (function (_super) {
    __extends(PalletElement, _super);
    function PalletElement(pallet) {
        var _this = this;
        var key = util_crypto_1.xxhashAsHex(pallet, 128);
        _this = _super.call(this, key) || this;
        _this.pallet = pallet;
        _this.palletHash = util_crypto_1.xxhashAsHex(pallet, 128);
        return _this;
    }
    return PalletElement;
}(StorageElement));
exports.PalletElement = PalletElement;
var StorageItemElement = /** @class */ (function (_super) {
    __extends(StorageItemElement, _super);
    function StorageItemElement(pallet, item) {
        var _this = this;
        var key = util_crypto_1.xxhashAsHex(pallet, 128) + util_crypto_1.xxhashAsHex(item, 128).slice(2);
        _this = _super.call(this, key) || this;
        _this.pallet = pallet;
        _this.palletHash = util_crypto_1.xxhashAsHex(pallet, 128);
        _this.item = item;
        _this.itemHash = util_crypto_1.xxhashAsHex(item, 128);
        return _this;
    }
    return StorageItemElement;
}(StorageElement));
exports.StorageItemElement = StorageItemElement;
function test_run() {
    return __awaiter(this, void 0, void 0, function () {
        var wsProvider, api, keyring, alice, failed, nonce, cbErr, dispatcher, _loop_4, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wsProvider = new api_1.WsProvider("wss://fullnode-archive.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProvider,
                            types: {
                                ProxyType: {
                                    _enum: ['Any', 'NonTransfer', 'Governance', 'Staking', 'Vesting']
                                }
                            }
                        })];
                case 1:
                    api = _a.sent();
                    keyring = new api_1.Keyring({ type: 'sr25519' });
                    alice = keyring.addFromUri('//Alice');
                    failed = new Array();
                    return [4 /*yield*/, api.query.system.account(alice.address)];
                case 2:
                    nonce = (_a.sent()).nonce;
                    cbErr = function (xts) {
                        for (var _i = 0, xts_4 = xts; _i < xts_4.length; _i++) {
                            var xt = xts_4[_i];
                            console.log(xt.toHuman());
                        }
                    };
                    dispatcher = new Dispatcher(api, alice, nonce.toBigInt(), cbErr, 10, 100);
                    _loop_4 = function (i) {
                        var send;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    send = function sending() {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var nonce;
                                            var _this = this;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, dispatcher.nextNonce()];
                                                    case 1:
                                                        nonce = _a.sent();
                                                        return [4 /*yield*/, sendingInternal(dispatcher, i, nonce)
                                                                .catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                                return __generator(this, function (_a) {
                                                                    switch (_a.label) {
                                                                        case 0:
                                                                            console.log(err);
                                                                            return [4 /*yield*/, dispatcher.returnNonce(nonce).catch(function (err) { console.log(err); })];
                                                                        case 1:
                                                                            _a.sent();
                                                                            return [2 /*return*/];
                                                                    }
                                                                });
                                                            }); })];
                                                    case 2:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        });
                                    };
                                    return [4 /*yield*/, send()];
                                case 1:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < 100)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_4(i)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    api.disconnect();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
function sendingInternal(dispatcher, anynumber, nonce) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (anynumber % 2 === 0) {
                console.log("Run: " + anynumber + ", nonce: " + nonce);
            }
            else {
                return [2 /*return*/, Promise.reject("Uneven call...")];
            }
            return [2 /*return*/];
        });
    });
}
//# sourceMappingURL=common.js.map