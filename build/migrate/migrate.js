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
exports.test_run = exports.prepareMigrate = void 0;
// Here comes the oclif specific stuff
var command_1 = require("@oclif/command");
var api_1 = require("@polkadot/api");
var util_crypto_1 = require("@polkadot/util-crypto");
var common_1 = require("../common/common");
var transform_1 = require("../transform/transform");
var MigrateCommand = /** @class */ (function (_super) {
    __extends(MigrateCommand, _super);
    function MigrateCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MigrateCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var flags, wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, metadata, modules, _loop_1, _i, storageItems_1, key, at, lastHdr, migrationData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        flags = this.parse(MigrateCommand).flags;
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
                    case 6: return [4 /*yield*/, prepareMigrate(this.fromApi, this.toApi, storageItems, at)
                            .catch(function (err) { return console.log(err); })];
                    case 7:
                        migrationData = _a.sent();
                        if (flags["output"]) {
                            // TODO: Write stuff to a file here, correctly as a json
                            //       * define json format
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MigrateCommand.description = 'fork the state of an existing substrate based chain';
    MigrateCommand.flags = {
        'source-network': command_1.flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
        }),
        'destination-network': command_1.flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
        }),
        'at-block': command_1.flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a hash.',
            default: '-1',
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
    return MigrateCommand;
}(command_1.default));
exports.default = MigrateCommand;
function prepareMigrate(fromApi, toApi, storageItems, at) {
    return __awaiter(this, void 0, void 0, function () {
        var transformedData, _a, _b, migrationXts, _i, transformedData_1, _c, prefix, keyValues, migratedPalletStorageItems, migratedPalletStorageItems, migratedPalletStorageItems;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = Array).from;
                    return [4 /*yield*/, transform_1.transform(fromApi, toApi, storageItems, at)];
                case 1:
                    transformedData = _b.apply(_a, [_d.sent()]);
                    migrationXts = new Map();
                    _i = 0, transformedData_1 = transformedData;
                    _d.label = 2;
                case 2:
                    if (!(_i < transformedData_1.length)) return [3 /*break*/, 10];
                    _c = transformedData_1[_i], prefix = _c[0], keyValues = _c[1];
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("System", 128))) return [3 /*break*/, 4];
                    return [4 /*yield*/, prepareSystem(toApi, keyValues)];
                case 3:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 9];
                case 4:
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("Balances", 128))) return [3 /*break*/, 6];
                    return [4 /*yield*/, prepareBalances(toApi, keyValues)];
                case 5:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 9];
                case 6:
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("Vesting", 128))) return [3 /*break*/, 8];
                    return [4 /*yield*/, prepareVesting(toApi, keyValues)];
                case 7:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 9];
                case 8:
                    console.log("Fetched data that can not be migrated. PatriciaKey is: " + prefix);
                    _d.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 2];
                case 10: return [2 /*return*/, migrationXts];
            }
        });
    });
}
exports.prepareMigrate = prepareMigrate;
function prepareSystem(toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, _i, _a, _b, palletStorageItemKey, values, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    xts = new Map();
                    _i = 0, _a = Array.from(keyValues);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    _b = _a[_i], palletStorageItemKey = _b[0], values = _b[1];
                    if (!(palletStorageItemKey === (util_crypto_1.xxhashAsHex("System", 128) + util_crypto_1.xxhashAsHex("Account", 128).slice(2)))) return [3 /*break*/, 3];
                    _d = (_c = xts).set;
                    _e = [palletStorageItemKey];
                    return [4 /*yield*/, transformSystemAccount(toApi, values)];
                case 2:
                    _d.apply(_c, _e.concat([_f.sent()]));
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, xts];
            }
        });
    });
}
function transformSystemAccount(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, packetOfAccounts, maxAccounts, counter, _i, values_1, item, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    xts = new Array();
                    packetOfAccounts = new Array();
                    maxAccounts = toApi.consts.migration.maxAccounts.toNumber();
                    counter = 0;
                    _i = 0, values_1 = values;
                    _e.label = 1;
                case 1:
                    if (!(_i < values_1.length)) return [3 /*break*/, 8];
                    item = values_1[_i];
                    counter += 1;
                    if (!(item instanceof transform_1.StorageMapValue)) return [3 /*break*/, 6];
                    if (!(packetOfAccounts.length === maxAccounts - 1 || counter === values.length)) return [3 /*break*/, 3];
                    // push the last element and prepare extrinsic
                    _b = (_a = packetOfAccounts).push;
                    return [4 /*yield*/, retrieveIdAndAccount(item)];
                case 2:
                    // push the last element and prepare extrinsic
                    _b.apply(_a, [_e.sent()]);
                    xts.push(toApi.tx.migration.migrateSystemAccount(packetOfAccounts));
                    packetOfAccounts = new Array();
                    return [3 /*break*/, 5];
                case 3:
                    _d = (_c = packetOfAccounts).push;
                    return [4 /*yield*/, retrieveIdAndAccount(item)];
                case 4:
                    _d.apply(_c, [_e.sent()]);
                    _e.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6: throw Error("Expected System.Account storage values to be of type StorageMapValue. Got: " + JSON.stringify(item));
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/, xts];
            }
        });
    });
}
function retrieveIdAndAccount(item) {
    return __awaiter(this, void 0, void 0, function () {
        var id, value;
        return __generator(this, function (_a) {
            id = Array.from(item.patriciaKey);
            value = Array.from(item.value);
            return [2 /*return*/, [id, value]];
        });
    });
}
function prepareBalances(toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, _i, _a, _b, palletStorageItemKey, values, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    xts = new Map();
                    _i = 0, _a = Array.from(keyValues);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    _b = _a[_i], palletStorageItemKey = _b[0], values = _b[1];
                    if (!(palletStorageItemKey === util_crypto_1.xxhashAsHex("Balances", 128) + util_crypto_1.xxhashAsHex("TotalIssuance", 128).slice(2))) return [3 /*break*/, 3];
                    _d = (_c = xts).set;
                    _e = [palletStorageItemKey];
                    return [4 /*yield*/, transformBalancesTotalIssuance(toApi, values)];
                case 2:
                    _d.apply(_c, _e.concat([_f.sent()]));
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, xts];
            }
        });
    });
}
function transformBalancesTotalIssuance(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, _i, values_2, item, issuance;
        return __generator(this, function (_a) {
            xts = new Array();
            if (values.length != 1) {
                throw Error("TotalIssuance MUST be single value. Got " + values.length);
            }
            for (_i = 0, values_2 = values; _i < values_2.length; _i++) {
                item = values_2[_i];
                if (item instanceof transform_1.StorageValueValue) {
                    issuance = toApi.createType("Balance", item.value);
                    xts.push(toApi.tx.migration.migrateBalancesIssuance(issuance));
                }
                else {
                    throw Error("Expected Balances.TotalIssuance storage value to be of type StorageValueValue. Got: " + JSON.stringify(item));
                }
            }
            return [2 /*return*/, xts];
        });
    });
}
function prepareVesting(toApi, keyValues) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, _i, _a, _b, palletStorageItemKey, values, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    xts = new Map();
                    _i = 0, _a = Array.from(keyValues);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    _b = _a[_i], palletStorageItemKey = _b[0], values = _b[1];
                    if (!(palletStorageItemKey === util_crypto_1.xxhashAsHex("Vesting", 128) + util_crypto_1.xxhashAsHex("Vesting", 128).slice(2))) return [3 /*break*/, 3];
                    _d = (_c = xts).set;
                    _e = [palletStorageItemKey];
                    return [4 /*yield*/, transformVestingVestingInfo(toApi, values)];
                case 2:
                    _d.apply(_c, _e.concat([_f.sent()]));
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, xts];
            }
        });
    });
}
function transformVestingVestingInfo(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, packetOfVestings, maxVestings, counter, _i, values_3, item, vestingInfo;
        return __generator(this, function (_a) {
            xts = new Array();
            packetOfVestings = new Array();
            maxVestings = 10;
            counter = 0;
            for (_i = 0, values_3 = values; _i < values_3.length; _i++) {
                item = values_3[_i];
                counter += 1;
                if (item instanceof transform_1.StorageMapValue) {
                    vestingInfo = toApi.createType("VestingInfo", item.value);
                    if (packetOfVestings.length === maxVestings - 1 || counter === values.length) {
                        // push the last element and prepare extrinsic
                        packetOfVestings.push(vestingInfo);
                        xts.push(toApi.tx.migration.migrateVesting(packetOfVestings));
                        packetOfVestings = new Array();
                    }
                    else {
                        packetOfVestings.push(vestingInfo);
                    }
                }
                else {
                    throw Error("Expected Vesting.Vesting storage value to be of type StorageMapValue. Got: " + JSON.stringify(item));
                }
            }
            return [2 /*return*/, xts];
        });
    });
}
function test_run() {
    return __awaiter(this, void 0, void 0, function () {
        var wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, metadataFrom, metadataTo, _loop_2, _i, storageItems_2, key, lastHdr, at, migrationData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wsProviderFrom = new api_1.WsProvider("wss://fullnode.amber.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderFrom
                        })];
                case 1:
                    fromApi = _a.sent();
                    wsProviderTo = new api_1.WsProvider("wss://fullnode-collator.charcoal.centrifuge.io");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderTo
                        })];
                case 2:
                    toApi = _a.sent();
                    storageItems = [
                        util_crypto_1.xxhashAsHex('Vesting', 128)
                    ];
                    storageItems.push.apply(storageItems, common_1.DefaultStorage);
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 3:
                    metadataFrom = _a.sent();
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 4:
                    metadataTo = _a.sent();
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
                    lastHdr = _a.sent();
                    at = lastHdr.hash;
                    return [4 /*yield*/, prepareMigrate(fromApi, toApi, storageItems, at)];
                case 6:
                    migrationData = _a.sent();
                    fromApi.disconnect();
                    toApi.disconnect();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
//# sourceMappingURL=migrate.js.map