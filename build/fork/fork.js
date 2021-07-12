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
var util_crypto_1 = require("@polkadot/util-crypto");
var common_1 = require("../common/common");
var ForkCommand = /** @class */ (function (_super) {
    __extends(ForkCommand, _super);
    function ForkCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ForkCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var flags, wsProvider, api, storageItems, metadata, modules, _loop_1, _i, storageItems_1, key, at, lastHdr;
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
                        storageItems = flags["modules"];
                        // Transfrom modules into correct hashes
                        storageItems.forEach(function (item) {
                        });
                        if (!flags["no-default"]) {
                            storageItems.push.apply(storageItems, common_1.DefaultStorage);
                        }
                        return [4 /*yield*/, api.rpc.state.getMetadata()];
                    case 2:
                        metadata = _a.sent();
                        modules = metadata.asLatest.modules;
                        _loop_1 = function (key) {
                            var available = false;
                            metadata.asLatest.modules.forEach(function (module) {
                                if (module.storage.isSome) {
                                    if (key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                                        available = true;
                                    }
                                }
                            });
                            if (!available) {
                                console.log("Storage with key " + key + " is not available");
                                storageItems.filter(function (val) { return key != val; });
                            }
                        };
                        // Check if module is available
                        // Iteration is death, but we do not care here...
                        for (_i = 0, storageItems_1 = storageItems; _i < storageItems_1.length; _i++) {
                            key = storageItems_1[_i];
                            _loop_1(key);
                        }
                        if (!(flags["at-block"] == '-1')) return [3 /*break*/, 4];
                        return [4 /*yield*/, api.rpc.chain.getHeader()];
                    case 3:
                        lastHdr = _a.sent();
                        at = lastHdr.hash;
                        return [3 /*break*/, 5];
                    case 4:
                        at = api.createType("Hash", flags["at-block"]);
                        _a.label = 5;
                    case 5:
                        //let state = await fork(api, storageItems, at);
                        if (flags["as-genesis"]) {
                            // TODO: Here the stuff to
                            //       * create specs for forked chain
                            //       * output spec somewhere
                        }
                        if (flags["output"]) {
                            // TODO: Write stuff to a file here, correctly as a json
                            //       * define json format
                        }
                        return [2 /*return*/];
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
        var state, _i, storageItems_2, key, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = new Map();
                    _i = 0, storageItems_2 = storageItems;
                    _a.label = 1;
                case 1:
                    if (!(_i < storageItems_2.length)) return [3 /*break*/, 4];
                    key = storageItems_2[_i];
                    return [4 /*yield*/, fetchState(api, at, key)];
                case 2:
                    data = _a.sent();
                    state.set(key.toHex(), data);
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
        var keyArray, fetched, accumulate, nextStartKey, intermArray, pairs, _i, keyArray_1, storageKey, storageValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Fetching storage for prefix: " + key.toHuman());
                    return [4 /*yield*/, api.rpc.state.getKeysPaged(key, 1000)];
                case 1:
                    keyArray = _a.sent();
                    fetched = false;
                    accumulate = keyArray.length;
                    _a.label = 2;
                case 2:
                    if (!!fetched) return [3 /*break*/, 4];
                    nextStartKey = api.createType("StorageKey", keyArray[keyArray.length - 1]);
                    return [4 /*yield*/, api.rpc.state.getKeysPaged(key, 1000, nextStartKey, at)];
                case 3:
                    intermArray = _a.sent();
                    accumulate = accumulate + intermArray.length;
                    process.stdout.write("Fetched keys: " + accumulate + "\r");
                    if (intermArray.length === 0) {
                        fetched = true;
                    }
                    else {
                        keyArray.push.apply(keyArray, intermArray);
                    }
                    return [3 /*break*/, 2];
                case 4:
                    process.stdout.write("\n");
                    pairs = [];
                    accumulate = 0;
                    _i = 0, keyArray_1 = keyArray;
                    _a.label = 5;
                case 5:
                    if (!(_i < keyArray_1.length)) return [3 /*break*/, 8];
                    storageKey = keyArray_1[_i];
                    return [4 /*yield*/, api.rpc.state.getStorage(storageKey)];
                case 6:
                    storageValue = _a.sent();
                    // TODO: Not sure, why the api does solely provide an unknown here and how we can tell the compiler
                    //       that it will have an toU8a method.
                    // @ts-ignore
                    pairs.push([storageKey, storageValue.toU8a(true)]);
                    accumulate = accumulate + 1;
                    process.stdout.write("Fetched storage values: " + accumulate + "/" + keyArray.length + "\r");
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    process.stdout.write("\n");
                    return [2 /*return*/, pairs];
            }
        });
    });
}
function test_run() {
    return __awaiter(this, void 0, void 0, function () {
        var wsProvider, api, storageItems, metadata, _loop_2, _i, storageItems_3, key, lastHdr, at, keyItems, _a, storageItems_4, stringKey, state;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    wsProvider = new api_1.WsProvider("wss://fullnode.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProvider
                        })];
                case 1:
                    api = _b.sent();
                    storageItems = [
                    //xxhashAsHex('Vesting', 128)
                    ];
                    storageItems.push.apply(storageItems, common_1.DefaultStorage);
                    return [4 /*yield*/, api.rpc.state.getMetadata()];
                case 2:
                    metadata = _b.sent();
                    _loop_2 = function (key) {
                        var available = false;
                        metadata.asLatest.modules.forEach(function (module) {
                            if (module.storage.isSome) {
                                if (key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                                    available = true;
                                }
                            }
                        });
                        if (!available) {
                            console.log("Storage with key " + key + " is not available");
                            storageItems.filter(function (val) { return key != val; });
                        }
                    };
                    // Check if module is available
                    // Iteration is death, but we do not care here...
                    for (_i = 0, storageItems_3 = storageItems; _i < storageItems_3.length; _i++) {
                        key = storageItems_3[_i];
                        _loop_2(key);
                    }
                    return [4 /*yield*/, api.rpc.chain.getHeader()];
                case 3:
                    lastHdr = _b.sent();
                    at = lastHdr.hash;
                    keyItems = [];
                    for (_a = 0, storageItems_4 = storageItems; _a < storageItems_4.length; _a++) {
                        stringKey = storageItems_4[_a];
                        keyItems.push(api.createType("StorageKey", stringKey));
                    }
                    return [4 /*yield*/, fork(api, keyItems, at)];
                case 4:
                    state = _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
//# sourceMappingURL=fork.js.map