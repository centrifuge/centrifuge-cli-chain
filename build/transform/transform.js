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
exports.test_run = exports.StorageDoubleMapValue = exports.StorageMapValue = exports.StorageValueValue = exports.StorageItem = exports.transform = void 0;
// Here comes the oclif specific stuff
var command_1 = require("@oclif/command");
var api_1 = require("@polkadot/api");
var util_crypto_1 = require("@polkadot/util-crypto");
var fork_1 = require("../fork/fork");
var common_1 = require("../common/common");
var TransformCommand = /** @class */ (function (_super) {
    __extends(TransformCommand, _super);
    function TransformCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TransformCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var flags, wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, metadata, modules, _loop_1, _i, storageItems_1, key, at, lastHdr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        flags = this.parse(TransformCommand).flags;
                        wsProviderFrom = new api_1.WsProvider(flags["source-network"]);
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: wsProviderFrom
                            })];
                    case 1:
                        fromApi = _a.sent();
                        wsProviderTo = new api_1.WsProvider(flags["destination-network"]);
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: wsProviderTo
                            })];
                    case 2:
                        toApi = _a.sent();
                        this.fromApi = fromApi;
                        this.toApi = toApi;
                        storageItems = flags["modules"];
                        // Transfrom modules into correct hashes
                        storageItems.forEach(function (item) {
                        });
                        if (!flags["no-default"]) {
                            storageItems.push.apply(storageItems, common_1.DefaultStorage);
                        }
                        return [4 /*yield*/, this.fromApi.rpc.state.getMetadata()];
                    case 3:
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
                        if (!(flags["at-block"] == '-1')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.fromApi.rpc.chain.getHeader()];
                    case 4:
                        lastHdr = _a.sent();
                        at = lastHdr.hash;
                        return [3 /*break*/, 6];
                    case 5:
                        at = this.fromApi.createType("Hash", flags["at-block"]);
                        _a.label = 6;
                    case 6:
                        try {
                            //let state = await transform(this.fromApi, this.toApi, storageItems, at, at); // TODO: add actual to hash from parachain
                        }
                        catch (err) {
                            // TODO: Do something with the error
                        }
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
    TransformCommand.description = 'transform the centrifuge state from mainnet to a parachain compatible state';
    TransformCommand.flags = {
        'source-network': command_1.flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
            default: 'wss://portal.chain.centrifuge.io',
        }),
        'destination-network': command_1.flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
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
    return TransformCommand;
}(command_1.default));
exports.default = TransformCommand;
function transform(fromApi, toApi, storageItems, atFrom, atTo) {
    return __awaiter(this, void 0, void 0, function () {
        var forkData, _a, _b, state, _i, forkData_1, _c, key, keyValues, palletKey, migratedPalletStorageItems, palletKey, migratedPalletStorageItems, palletKey, migratedPalletStorageItems, palletKey, migratedPalletStorageItems;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = Array).from;
                    return [4 /*yield*/, fork_1.fork(fromApi, storageItems, atFrom)];
                case 1:
                    forkData = _b.apply(_a, [_d.sent()]);
                    state = new Map();
                    _i = 0, forkData_1 = forkData;
                    _d.label = 2;
                case 2:
                    if (!(_i < forkData_1.length)) return [3 /*break*/, 12];
                    _c = forkData_1[_i], key = _c[0], keyValues = _c[1];
                    if (!key.startsWith(util_crypto_1.xxhashAsHex("System", 128))) return [3 /*break*/, 4];
                    palletKey = util_crypto_1.xxhashAsHex("System", 128);
                    return [4 /*yield*/, transformSystem(fromApi, toApi, keyValues)];
                case 3:
                    migratedPalletStorageItems = _d.sent();
                    state.set(palletKey, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 4:
                    if (!key.startsWith(util_crypto_1.xxhashAsHex("Balances", 128))) return [3 /*break*/, 6];
                    palletKey = util_crypto_1.xxhashAsHex("Balances", 128);
                    return [4 /*yield*/, transformBalances(fromApi, toApi, keyValues)];
                case 5:
                    migratedPalletStorageItems = _d.sent();
                    state.set(palletKey, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 6:
                    if (!key.startsWith(util_crypto_1.xxhashAsHex("Vesting", 128))) return [3 /*break*/, 8];
                    palletKey = util_crypto_1.xxhashAsHex("Vesting", 128);
                    return [4 /*yield*/, transformVesting(fromApi, toApi, keyValues, atFrom, atTo)];
                case 7:
                    migratedPalletStorageItems = _d.sent();
                    state.set(palletKey, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 8:
                    if (!key.startsWith(util_crypto_1.xxhashAsHex("Proxy", 128))) return [3 /*break*/, 10];
                    palletKey = util_crypto_1.xxhashAsHex("Proxy", 128);
                    return [4 /*yield*/, transformProxy(fromApi, toApi, keyValues)];
                case 9:
                    migratedPalletStorageItems = _d.sent();
                    state.set(palletKey, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 10:
                    console.log("Fetched data that can not be transformed. PatriciaKey is: " + key);
                    _d.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/, state];
            }
        });
    });
}
exports.transform = transform;
function transformProxy(fromApi, toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var state, _i, keyValues_1, _a, patriciaKey, value, pkStorageItem, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    state = new Map();
                    _i = 0, keyValues_1 = keyValues;
                    _d.label = 1;
                case 1:
                    if (!(_i < keyValues_1.length)) return [3 /*break*/, 6];
                    _a = keyValues_1[_i], patriciaKey = _a[0], value = _a[1];
                    if (!patriciaKey.toHex().startsWith(util_crypto_1.xxhashAsHex("Proxy", 128) + util_crypto_1.xxhashAsHex("Proxies", 128).slice(2))) return [3 /*break*/, 4];
                    pkStorageItem = util_crypto_1.xxhashAsHex("Proxy", 128) + util_crypto_1.xxhashAsHex("Proxies", 128).slice(2);
                    _b = common_1.insertOrNewMap;
                    _c = [state, pkStorageItem];
                    return [4 /*yield*/, transformProxyProxies(fromApi, toApi, patriciaKey, value)];
                case 2: return [4 /*yield*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 3:
                    _d.sent();
                    return [3 /*break*/, 5];
                case 4:
                    console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, state];
            }
        });
    });
}
function transformProxyProxies(fromApi, toApi, completeKey, scaleOldProxies) {
    return __awaiter(this, void 0, void 0, function () {
        var oldProxyInfo, proxies, CINC, CINCisDelegate, _i, _a, oldElement, delegate, proxyType, delay, proxyDef, deposit, newProxyInfo, proxiedAccount, _b, nonce, balance, base, perProxy, reserve, amount, amount;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    oldProxyInfo = fromApi.createType('(Vec<(AccountId, ProxyType)>, Balance)', scaleOldProxies);
                    proxies = new Array();
                    CINC = fromApi.createType("AccountId", "4djGpfJtHkS3kXBNtSFijf8xHbBY8mYvnUR7zrLM9bCyF7Js");
                    CINCisDelegate = false;
                    // 1. Iterate over all elements of the vector
                    // 2. Create a `ProxyDefinition` for each element
                    for (_i = 0, _a = oldProxyInfo[0]; _i < _a.length; _i++) {
                        oldElement = _a[_i];
                        delegate = toApi.createType("AccountId", oldElement[0]);
                        if (CINC.toHex() === delegate.toHex()) {
                            CINCisDelegate = true;
                        }
                        proxyType = toApi.createType("ProxyType", oldElement[1]);
                        delay = toApi.createType("BlockNumber", 0);
                        proxyDef = toApi.createType("ProxyDefinition", [
                            delegate,
                            proxyType,
                            delay
                        ]);
                        proxies.push(proxyDef);
                    }
                    deposit = toApi.createType("Balance", oldProxyInfo[1]);
                    newProxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', [
                        proxies,
                        deposit
                    ]);
                    proxiedAccount = fromApi.createType("AccountId", completeKey.slice(-32));
                    return [4 /*yield*/, fromApi.query.system.account(proxiedAccount)];
                case 1:
                    _b = _c.sent(), nonce = _b.nonce, balance = _b.data;
                    return [4 /*yield*/, fromApi.consts.proxy.proxyDepositBase];
                case 2:
                    base = _c.sent();
                    return [4 /*yield*/, fromApi.consts.proxy.proxyDepositFactor];
                case 3:
                    perProxy = _c.sent();
                    // In the case that we see that the amount reserved is smaller than 350 mCFG, we can be sure, that this
                    // is an anonymous proxy. The reverse does not prove the non-existence of an anonymous proxy!
                    // Hence, we must ensure, that we subtract 350 mCFg from the deposit, as this one is reserved on the creator!
                    if (balance.reserved.toBigInt() < (BigInt(proxies.length) * perProxy.toBigInt()) + base.toBigInt()) {
                        amount = deposit.toBigInt() - (perProxy.toBigInt() + base.toBigInt());
                        reserve = toApi.createType("Balance", amount);
                        console.log("Anonymous detected. Reserving: " + reserve.toHuman() + " CINC is: " + CINCisDelegate);
                    }
                    else if (CINCisDelegate) {
                        amount = deposit.toBigInt() - (perProxy.toBigInt() + base.toBigInt());
                        reserve = toApi.createType("Balance", amount);
                        console.log("Anonymous detected. Reserving: " + reserve.toHuman() + " CINC is: " + CINCisDelegate);
                    }
                    else {
                        reserve = toApi.createType("Balance", deposit);
                        console.log("Non-Anonymous detected. Reserving: " + reserve.toHuman() + " CINC is: " + CINCisDelegate);
                        console.log("Balance of this proxy is: " + balance.free.toHuman() + " " + balance.reserved.toHuman());
                    }
                    console.log("----------------------------");
                    return [2 /*return*/, new StorageMapValue(newProxyInfo.toU8a(), completeKey, reserve)];
            }
        });
    });
}
function transformSystem(fromApi, toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var state, _i, keyValues_2, _a, patriciaKey, value, systemAccount, pkStorageItem, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    state = new Map();
                    _i = 0, keyValues_2 = keyValues;
                    _d.label = 1;
                case 1:
                    if (!(_i < keyValues_2.length)) return [3 /*break*/, 6];
                    _a = keyValues_2[_i], patriciaKey = _a[0], value = _a[1];
                    systemAccount = util_crypto_1.xxhashAsHex("System", 128) + util_crypto_1.xxhashAsHex("Account", 128).slice(2);
                    if (!patriciaKey.toHex().startsWith(systemAccount)) return [3 /*break*/, 4];
                    pkStorageItem = util_crypto_1.xxhashAsHex("System", 128) + util_crypto_1.xxhashAsHex("Account", 128).slice(2);
                    _b = common_1.insertOrNewMap;
                    _c = [state, pkStorageItem];
                    return [4 /*yield*/, transformSystemAccount(fromApi, toApi, patriciaKey, value)];
                case 2: return [4 /*yield*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 3:
                    _d.sent();
                    return [3 /*break*/, 5];
                case 4:
                    console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, state];
            }
        });
    });
}
function transformSystemAccount(fromApi, toApi, completeKey, scaleOldAccountInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var oldAccountInfo, newAccountInfo, old;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    oldAccountInfo = fromApi.createType("AccountInfo", scaleOldAccountInfo);
                    return [4 /*yield*/, toApi.createType("AccountInfo", [
                            0,
                            0,
                            1,
                            0,
                            [
                                oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt(),
                                0,
                                0,
                                0 // free frozen balance
                            ]
                        ])];
                case 1:
                    newAccountInfo = _a.sent();
                    if (oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt() !== newAccountInfo.data.free.toBigInt()) {
                        old = oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt();
                        throw new Error("Transformation failed. AccountData Balances. (Left: " + old + " vs. " + "Right: " + newAccountInfo.data.free.toBigInt());
                    }
                    return [2 /*return*/, new StorageMapValue(newAccountInfo.toU8a(true), completeKey)];
            }
        });
    });
}
function transformBalances(fromApi, toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var state, _i, keyValues_3, _a, patriciaKey, value, pkStorageItem, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    state = new Map();
                    _i = 0, keyValues_3 = keyValues;
                    _d.label = 1;
                case 1:
                    if (!(_i < keyValues_3.length)) return [3 /*break*/, 6];
                    _a = keyValues_3[_i], patriciaKey = _a[0], value = _a[1];
                    if (!patriciaKey.toHex().startsWith(util_crypto_1.xxhashAsHex("Balances", 128) + util_crypto_1.xxhashAsHex("TotalIssuance", 128).slice(2))) return [3 /*break*/, 4];
                    pkStorageItem = util_crypto_1.xxhashAsHex("Balances", 128) + util_crypto_1.xxhashAsHex("TotalIssuance", 128).slice(2);
                    _b = common_1.insertOrNewMap;
                    _c = [state, pkStorageItem];
                    return [4 /*yield*/, transformBalancesTotalIssuance(fromApi, toApi, patriciaKey, value)];
                case 2: return [4 /*yield*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 3:
                    _d.sent();
                    return [3 /*break*/, 5];
                case 4:
                    console.log("Fetched data that can not be transformed. Part of Balances. PatriciaKey is: " + patriciaKey.toHex());
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, state];
            }
        });
    });
}
function transformBalancesTotalIssuance(fromApi, toApi, completeKey, scaleOldTotalIssuance) {
    return __awaiter(this, void 0, void 0, function () {
        var oldIssuance, newIssuance;
        return __generator(this, function (_a) {
            oldIssuance = fromApi.createType("Balance", scaleOldTotalIssuance);
            newIssuance = toApi.createType("Balance", oldIssuance.toU8a(true));
            if (oldIssuance.toBigInt() !== newIssuance.toBigInt()) {
                throw new Error("Transformation failed. TotalIssuance. (Left: " + oldIssuance.toJSON() + " vs. " + "Right: " + newIssuance.toJSON());
            }
            return [2 /*return*/, new StorageValueValue(newIssuance.toU8a(true))];
        });
    });
}
function transformVesting(fromApi, toApi, keyValues, atFrom, atTo) {
    return __awaiter(this, void 0, void 0, function () {
        var state, atFromAsNumber, atToAsNumber, _i, keyValues_4, _a, patriciaKey, value, pkStorageItem, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    state = new Map();
                    return [4 /*yield*/, fromApi.rpc.chain.getBlock(atFrom)];
                case 1:
                    atFromAsNumber = (_d.sent()).block.header.number.toBigInt();
                    atToAsNumber = BigInt(0);
                    _i = 0, keyValues_4 = keyValues;
                    _d.label = 2;
                case 2:
                    if (!(_i < keyValues_4.length)) return [3 /*break*/, 7];
                    _a = keyValues_4[_i], patriciaKey = _a[0], value = _a[1];
                    if (!patriciaKey.toHex().startsWith(util_crypto_1.xxhashAsHex("Vesting", 128) + util_crypto_1.xxhashAsHex("Vesting", 128).slice(2))) return [3 /*break*/, 5];
                    pkStorageItem = util_crypto_1.xxhashAsHex("Vesting", 128) + util_crypto_1.xxhashAsHex("Vesting", 128).slice(2);
                    _b = common_1.insertOrNewMap;
                    _c = [state, pkStorageItem];
                    return [4 /*yield*/, transformVestingVestingInfo(fromApi, toApi, patriciaKey, value, atFromAsNumber, atToAsNumber)];
                case 3: return [4 /*yield*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 4:
                    _d.sent();
                    return [3 /*break*/, 6];
                case 5:
                    console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [2 /*return*/, state];
            }
        });
    });
}
function transformVestingVestingInfo(fromApi, toApi, completeKey, scaleOldVestingInfo, atFrom, atTo) {
    return __awaiter(this, void 0, void 0, function () {
        var old, remainingLocked, newPerBlock, newStartingBlock, blockPeriodOldVesting, blocksPassedSinceVestingStart, remainingBlocks, newVesting;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    old = fromApi.createType("VestingInfo", scaleOldVestingInfo);
                    blockPeriodOldVesting = (old.locked.toBigInt() / old.perBlock.toBigInt());
                    blocksPassedSinceVestingStart = (atFrom - old.startingBlock.toBigInt());
                    // We need to check if vesting is ongoing, is finished or has not yet started, as conversion will be different.
                    if (blocksPassedSinceVestingStart > 0 && (blockPeriodOldVesting - blocksPassedSinceVestingStart) > 0) {
                        remainingBlocks = (blockPeriodOldVesting - blocksPassedSinceVestingStart) / BigInt(2);
                        // This defines the remaining locked amount. Same as if a person has called vest once at the snapshot block.
                        remainingLocked = old.locked.toBigInt() - (blocksPassedSinceVestingStart * old.perBlock.toBigInt());
                        newPerBlock = remainingLocked / remainingBlocks;
                        newStartingBlock = atTo;
                    }
                    else if ((blockPeriodOldVesting - blocksPassedSinceVestingStart) <= 0) {
                        // If vesting is finished -> use same start block and give everything at first block
                        remainingLocked = old.locked.toBigInt();
                        newPerBlock = old.locked.toBigInt();
                        newStartingBlock = atTo;
                    }
                    else if ((old.startingBlock.toBigInt() - atFrom) >= 0) {
                        // If vesting has not started yes -> use starting block as (old - blocks_passed_on_old_mainnet) / 2 and multiply per block by 2 to take into account
                        // 12s block time.
                        remainingLocked = old.locked.toBigInt();
                        newPerBlock = old.perBlock.toBigInt() * BigInt(2);
                        newStartingBlock = ((old.startingBlock.toBigInt() - atFrom) / BigInt(2)) + atTo;
                    }
                    else {
                        throw Error("Unreachable code... Came here with old vesting info of: " + old.toHuman());
                    }
                    return [4 /*yield*/, toApi.createType("VestingInfo", [remainingLocked, newPerBlock, newStartingBlock])];
                case 1:
                    newVesting = _a.sent();
                    return [2 /*return*/, new StorageMapValue(newVesting.toU8a(true), completeKey)];
            }
        });
    });
}
var StorageItem = /** @class */ (function () {
    function StorageItem(value) {
        this.value = value;
    }
    return StorageItem;
}());
exports.StorageItem = StorageItem;
var StorageValueValue = /** @class */ (function (_super) {
    __extends(StorageValueValue, _super);
    function StorageValueValue(value) {
        return _super.call(this, value) || this;
    }
    return StorageValueValue;
}(StorageItem));
exports.StorageValueValue = StorageValueValue;
var StorageMapValue = /** @class */ (function (_super) {
    __extends(StorageMapValue, _super);
    function StorageMapValue(value, key, optional) {
        var _this = _super.call(this, value) || this;
        _this.optional = optional;
        _this.patriciaKey = key;
        return _this;
    }
    return StorageMapValue;
}(StorageItem));
exports.StorageMapValue = StorageMapValue;
var StorageDoubleMapValue = /** @class */ (function (_super) {
    __extends(StorageDoubleMapValue, _super);
    function StorageDoubleMapValue(value, key1, key2) {
        var _this = _super.call(this, value) || this;
        _this.patriciaKey1 = key1;
        _this.patriciaKey2 = key2;
        return _this;
    }
    return StorageDoubleMapValue;
}(StorageItem));
exports.StorageDoubleMapValue = StorageDoubleMapValue;
function test_run() {
    return __awaiter(this, void 0, void 0, function () {
        var wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, metadataFrom, metadataTo, _loop_2, _i, storageItems_2, key, lastHdr, at, to, keyItems, _a, storageItems_3, stringKey, migrationData;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    wsProviderFrom = new api_1.WsProvider("wss://fullnode.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderFrom
                        })];
                case 1:
                    fromApi = _b.sent();
                    wsProviderTo = new api_1.WsProvider("wss://fullnode-collator.charcoal.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderTo
                        })];
                case 2:
                    toApi = _b.sent();
                    storageItems = [
                        //xxhashAsHex('Vesting', 128)
                        util_crypto_1.xxhashAsHex('Proxy', 128)
                    ];
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 3:
                    metadataFrom = _b.sent();
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 4:
                    metadataTo = _b.sent();
                    _loop_2 = function (key) {
                        var availableFrom = false;
                        var availableTo = false;
                        metadataFrom.asLatest.modules.forEach(function (module) {
                            if (module.storage.isSome) {
                                if (key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                                    availableFrom = true;
                                }
                            }
                        });
                        metadataTo.asLatest.modules.forEach(function (module) {
                            if (module.storage.isSome) {
                                if (key.startsWith(util_crypto_1.xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                                    availableTo = true;
                                }
                            }
                        });
                        if (!availableFrom || !availableTo) {
                            console.log("Storage with key " + key + " is not available");
                            storageItems.filter(function (val) { return key != val; });
                        }
                    };
                    // Check if module is available
                    // Iteration is death, but we do not care here...
                    for (_i = 0, storageItems_2 = storageItems; _i < storageItems_2.length; _i++) {
                        key = storageItems_2[_i];
                        _loop_2(key);
                    }
                    return [4 /*yield*/, fromApi.rpc.chain.getHeader()];
                case 5:
                    lastHdr = _b.sent();
                    at = lastHdr.hash;
                    to = toApi.createType("Hash", 0);
                    keyItems = [];
                    for (_a = 0, storageItems_3 = storageItems; _a < storageItems_3.length; _a++) {
                        stringKey = storageItems_3[_a];
                        keyItems.push(toApi.createType("StorageKey", stringKey));
                    }
                    return [4 /*yield*/, transform(fromApi, toApi, keyItems, at, to)];
                case 6:
                    migrationData = _b.sent();
                    fromApi.disconnect();
                    toApi.disconnect();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
//# sourceMappingURL=transform.js.map