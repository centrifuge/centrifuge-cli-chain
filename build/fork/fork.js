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
exports.test_run = exports.fork = void 0;
// Here comes the oclif specific stuff
var command_1 = require("@oclif/command");
var api_1 = require("@polkadot/api");
var common_1 = require("../common/common");
var ForkCommand = /** @class */ (function (_super) {
    __extends(ForkCommand, _super);
    function ForkCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ForkCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var flags, wsProvider, api, storageItems, metadataFrom, at, lastHdr, bn, state, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        flags = this.parse(ForkCommand).flags;
                        wsProvider = new api_1.WsProvider(flags["source-network"]);
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: wsProvider
                            })];
                    case 1:
                        api = _a.sent();
                        this.api = api;
                        storageItems = flags["modules"].map(function (value, index) {
                            return common_1.parseModuleInput(value);
                        });
                        if (!flags["no-default"]) {
                            storageItems.push.apply(storageItems, common_1.getDefaultStorage());
                        }
                        return [4 /*yield*/, this.api.rpc.state.getMetadata()];
                    case 2:
                        metadataFrom = _a.sent();
                        return [4 /*yield*/, common_1.checkAvailability(metadataFrom.asLatest.modules, metadataFrom.asLatest.modules, storageItems)];
                    case 3:
                        if (!(_a.sent())) {
                            // TODO: Log error and abort
                        }
                        if (!(flags["at-block"] == '-1')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.api.rpc.chain.getHeader()];
                    case 4:
                        lastHdr = _a.sent();
                        at = lastHdr.hash;
                        return [3 /*break*/, 7];
                    case 5:
                        bn = parseInt(flags['from-block']);
                        if (!(bn !== undefined)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.api.rpc.chain.getBlockHash(bn)];
                    case 6:
                        at = _a.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, fork(api, storageItems, at)];
                    case 8:
                        state = _a.sent();
                        if (flags["as-genesis"]) {
                            // TODO: Here the stuff to
                            //       * create specs for forked chain
                            //       * output spec somewhere
                        }
                        if (flags["output"]) {
                            // TODO: Write stuff to a file here, correctly as a json
                            //       * define json format
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        err_1 = _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    ForkCommand.description = 'fork the state of an existing substrate based chain';
    ForkCommand.flags = {
        'source-network': command_1.flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
            default: 'wss://portal.chain.centrifuge.io',
        }),
        'at-block': command_1.flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a hash.',
            default: '-1',
        }),
        'as-genesis': command_1.flags.boolean({
            char: 'g'
        }),
        'output': command_1.flags.boolean({
            char: 'o'
        }),
        'modules': command_1.flags.string({
            char: 'm',
            multiple: true,
        }),
        'no-default': command_1.flags.boolean({
            description: 'Do not fork the default modules. Namely: System, Balances',
        }),
        'full-chain': command_1.flags.boolean({
            description: 'Fork all modules storages',
            exclusive: ['no-default', 'modules'],
        })
    };
    return ForkCommand;
}(command_1.default));
exports.default = ForkCommand;
function fork(api, storageItems, at) {
    return __awaiter(this, void 0, void 0, function () {
        var state, _i, storageItems_1, element, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = new Map();
                    _i = 0, storageItems_1 = storageItems;
                    _a.label = 1;
                case 1:
                    if (!(_i < storageItems_1.length)) return [3 /*break*/, 4];
                    element = storageItems_1[_i];
                    return [4 /*yield*/, fetchState(api, at, api.createType("StorageKey", element.key))];
                case 2:
                    data = _a.sent();
                    state.set(element.key, data);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, state];
            }
        });
    });
}
exports.fork = fork;
function fetchState(api, at, key) {
    return __awaiter(this, void 0, void 0, function () {
        var keyArray, value, valueArray, fetched, accumulate, nextStartKey, intermArray, pairs, _i, keyArray_1, storageKey, storageValue, storageArray;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Fetching storage for prefix: " + key.toHuman());
                    return [4 /*yield*/, api.rpc.state.getKeysPaged(key, 1000, key, at)];
                case 1:
                    keyArray = _a.sent();
                    if (!(keyArray === undefined || keyArray.length === 0)) return [3 /*break*/, 3];
                    console.log("Fetched keys: 1");
                    return [4 /*yield*/, api.rpc.state.getStorage(key)];
                case 2:
                    value = _a.sent();
                    if (value !== undefined) {
                        valueArray = value.toU8a(true);
                        console.log("Fetched storage values: 1/1");
                        if (valueArray.length > 0) {
                            return [2 /*return*/, [[key, valueArray]]];
                        }
                        else {
                            console.log("ERROR: Fetched empty storage value for key " + key.toHex() + "\n");
                            return [2 /*return*/, []];
                        }
                    }
                    _a.label = 3;
                case 3:
                    fetched = false;
                    accumulate = keyArray.length;
                    _a.label = 4;
                case 4:
                    if (!!fetched) return [3 /*break*/, 6];
                    nextStartKey = api.createType("StorageKey", keyArray[keyArray.length - 1]);
                    return [4 /*yield*/, api.rpc.state.getKeysPaged(key, 1000, nextStartKey, at)];
                case 5:
                    intermArray = _a.sent();
                    accumulate = accumulate + intermArray.length;
                    process.stdout.write("Fetched keys: " + accumulate + "\r");
                    if (intermArray.length === 0) {
                        fetched = true;
                    }
                    else {
                        keyArray.push.apply(keyArray, intermArray);
                    }
                    return [3 /*break*/, 4];
                case 6:
                    process.stdout.write("\n");
                    pairs = [];
                    accumulate = 0;
                    _i = 0, keyArray_1 = keyArray;
                    _a.label = 7;
                case 7:
                    if (!(_i < keyArray_1.length)) return [3 /*break*/, 10];
                    storageKey = keyArray_1[_i];
                    return [4 /*yield*/, api.rpc.state.getStorage(storageKey)];
                case 8:
                    storageValue = _a.sent();
                    storageArray = storageValue.toU8a(true);
                    if (storageArray !== undefined && storageArray.length > 0) {
                        pairs.push([storageKey, storageArray]);
                    }
                    else {
                        console.log("ERROR: Fetched empty storage value for key " + storageKey.toHex() + "\n");
                    }
                    accumulate = accumulate + 1;
                    process.stdout.write("Fetched storage values: " + accumulate + "/" + keyArray.length + "\r");
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10:
                    process.stdout.write("\n");
                    return [2 /*return*/, pairs];
            }
        });
    });
}
function test_run() {
    return __awaiter(this, void 0, void 0, function () {
        var wsProviderFrom, fromApi, storageItems, lastFromHdr, at, state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wsProviderFrom = new api_1.WsProvider("wss://fullnode-archive.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderFrom,
                            types: {
                                ProxyType: {
                                    _enum: ['Any', 'NonTransfer', 'Governance', 'Staking', 'Vesting']
                                }
                            }
                        })];
                case 1:
                    fromApi = _a.sent();
                    storageItems = new Array();
                    storageItems.push.apply(storageItems, common_1.getDefaultStorage());
                    return [4 /*yield*/, fromApi.rpc.chain.getHeader()];
                case 2:
                    lastFromHdr = _a.sent();
                    at = lastFromHdr.hash;
                    return [4 /*yield*/, fork(fromApi, storageItems, at)];
                case 3:
                    state = _a.sent();
                    return [4 /*yield*/, fromApi.disconnect()];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
//# sourceMappingURL=fork.js.map