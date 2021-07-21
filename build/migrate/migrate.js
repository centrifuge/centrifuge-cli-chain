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
exports.test_run = exports.migrate = exports.prepareMigrate = exports.verifyMigration = void 0;
// Here comes the oclif specific stuff
var command_1 = require("@oclif/command");
var api_1 = require("@polkadot/api");
var util_crypto_1 = require("@polkadot/util-crypto");
var fs = require("fs");
var readline = require("readline");
var common_1 = require("../common/common");
var transform_1 = require("../transform/transform");
var fork_1 = require("../fork/fork");
var AvailableMigrations = [
    common_1.parseModuleInput("Balances.TotalIssuance"),
    common_1.parseModuleInput("System.Account"),
    common_1.parseModuleInput("Vesting.Vesting"),
    common_1.parseModuleInput("Proxy.Proxies"),
];
var MigrateCommand = /** @class */ (function (_super) {
    __extends(MigrateCommand, _super);
    function MigrateCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MigrateCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var flags, executor, wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, _i, storageItems_1, item, metadataFrom, metadataTo, from, lastHdr, bn, to, lastHdr, bn, err_1, migrationData, sequence, failed_1, results, lastHdr, newTo, failedPairs, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        flags = this.parse(MigrateCommand).flags;
                        if (flags["source-network"] === flags["destination-network"]) {
                            // TODO: Log error and abort
                        }
                        return [4 /*yield*/, this.parseExecutor(flags["executor"])];
                    case 1:
                        executor = _a.sent();
                        wsProviderFrom = new api_1.WsProvider(flags["source-network"]);
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: wsProviderFrom,
                                types: {
                                    ProxyType: {
                                        _enum: ['Any', 'NonTransfer', 'Governance', 'Staking', 'Vesting']
                                    }
                                }
                            })];
                    case 2:
                        fromApi = _a.sent();
                        wsProviderTo = new api_1.WsProvider(flags["destination-network"]);
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: wsProviderTo,
                                types: {
                                    ProxyType: {
                                        _enum: ['Any', 'NonTransfer', 'Governance', '_Staking', 'NonProxy']
                                    }
                                }
                            })];
                    case 3:
                        toApi = _a.sent();
                        this.fromApi = fromApi;
                        this.toApi = toApi;
                        storageItems = flags["modules"].map(function (value, index) {
                            return common_1.parseModuleInput(value);
                        });
                        if (!flags["no-default"]) {
                            storageItems.push.apply(storageItems, common_1.getDefaultStorage());
                        }
                        // Check if we can do this migration
                        for (_i = 0, storageItems_1 = storageItems; _i < storageItems_1.length; _i++) {
                            item = storageItems_1[_i];
                            if (!AvailableMigrations.includes(item)) {
                                // TODO: Log error and abort
                            }
                        }
                        return [4 /*yield*/, this.fromApi.rpc.state.getMetadata()];
                    case 4:
                        metadataFrom = _a.sent();
                        return [4 /*yield*/, this.toApi.rpc.state.getMetadata()];
                    case 5:
                        metadataTo = _a.sent();
                        return [4 /*yield*/, common_1.checkAvailability(metadataFrom.asLatest.modules, metadataTo.asLatest.modules, storageItems)];
                    case 6:
                        if (!(_a.sent())) {
                            // TODO: Log error and abort
                        }
                        if (!(flags["from-block"] == '-1')) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.fromApi.rpc.chain.getHeader()];
                    case 7:
                        lastHdr = _a.sent();
                        from = lastHdr.hash;
                        return [3 /*break*/, 10];
                    case 8:
                        bn = parseInt(flags['from-block']);
                        if (!(bn !== undefined)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.fromApi.rpc.chain.getBlockHash(bn)];
                    case 9:
                        from = _a.sent();
                        return [3 /*break*/, 10];
                    case 10:
                        if (!(flags["to-block"] == '-1')) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.toApi.rpc.chain.getHeader()];
                    case 11:
                        lastHdr = _a.sent();
                        to = lastHdr.hash;
                        return [3 /*break*/, 17];
                    case 12:
                        bn = parseInt(flags['to-block']);
                        if (!(bn !== undefined)) return [3 /*break*/, 17];
                        _a.label = 13;
                    case 13:
                        _a.trys.push([13, 15, , 16]);
                        return [4 /*yield*/, this.toApi.rpc.chain.getBlockHash(bn)];
                    case 14:
                        to = _a.sent();
                        return [3 /*break*/, 16];
                    case 15:
                        err_1 = _a.sent();
                        return [3 /*break*/, 16];
                    case 16: return [3 /*break*/, 17];
                    case 17:
                        _a.trys.push([17, 24, , 25]);
                        return [4 /*yield*/, prepareMigrate(fromApi, toApi, storageItems, from, to)];
                    case 18:
                        migrationData = _a.sent();
                        return [4 /*yield*/, this.parseSequence(flags["sequence"], storageItems)];
                    case 19:
                        sequence = _a.sent();
                        failed_1 = new Array();
                        return [4 /*yield*/, migrate(toApi, executor, sequence, migrationData, function (failedXts) {
                                failed_1.push.apply(failed_1, failedXts);
                                console.log("The following extrinsics failed during migration:");
                                for (var _i = 0, failedXts_1 = failedXts; _i < failedXts_1.length; _i++) {
                                    var xt = failedXts_1[_i];
                                    console.log(xt.toHuman());
                                }
                            })];
                    case 20:
                        results = _a.sent();
                        if (!flags["verify"]) return [3 /*break*/, 23];
                        return [4 /*yield*/, this.toApi.rpc.chain.getHeader()];
                    case 21:
                        lastHdr = _a.sent();
                        newTo = lastHdr.hash;
                        return [4 /*yield*/, verifyMigration(toApi, fromApi, storageItems, newTo, from)];
                    case 22:
                        failedPairs = _a.sent();
                        if (failedPairs.length !== 0) {
                            console.log("The following pairs failed to be verified: ");
                            console.log(failedPairs);
                        }
                        _a.label = 23;
                    case 23:
                        console.log("Logging extrinsic block hashes and indexes of the migration: ");
                        console.log(results);
                        fromApi.disconnect();
                        toApi.disconnect();
                        return [3 /*break*/, 25];
                    case 24:
                        err_2 = _a.sent();
                        return [3 /*break*/, 25];
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    MigrateCommand.prototype.parseSequence = function (inputSequence, storageItems) {
        return __awaiter(this, void 0, void 0, function () {
            var sequence, _i, _a, one, element, index, _b, storageItems_2, element, _c, storageItems_3, element;
            return __generator(this, function (_d) {
                sequence = new Array();
                if (inputSequence !== undefined && inputSequence.length > 0) {
                    for (_i = 0, _a = command_1.flags["sequence"]; _i < _a.length; _i++) {
                        one = _a[_i];
                        element = common_1.parseModuleInput(one);
                        index = storageItems.indexOf(element);
                        if (index > -1) {
                            storageItems.splice(index, 1);
                        }
                        else {
                            // TODO: Log error and abort
                        }
                        sequence.push(element);
                    }
                    // Now append the remaining elements, if any are there
                    for (_b = 0, storageItems_2 = storageItems; _b < storageItems_2.length; _b++) {
                        element = storageItems_2[_b];
                        sequence.push(element);
                    }
                }
                else {
                    for (_c = 0, storageItems_3 = storageItems; _c < storageItems_3.length; _c++) {
                        element = storageItems_3[_c];
                        sequence.push(element);
                    }
                }
                return [2 /*return*/, sequence];
            });
        });
    };
    MigrateCommand.prototype.parseExecutor = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            function capturePwd(isRead, cb) {
                return __awaiter(this, void 0, void 0, function () {
                    var rl;
                    return __generator(this, function (_a) {
                        rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });
                        rl.question('Please provide the password for JSON-account-file: ', function (password) {
                            // @ts-ignore
                            rl.output.write("\n");
                            // @ts-ignore
                            rl.history.slice(1);
                            rl.close();
                            isRead = true;
                            cb(password);
                        });
                        // @ts-ignore
                        rl._writeToOutput = function _writeToOutput(stringToWrite) {
                            // @ts-ignore
                            rl.output.write("*");
                        };
                        return [2 /*return*/];
                    });
                });
            }
            var keyring, file, executor, pwd_1, isRead, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        keyring = new api_1.Keyring();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        file = fs.readFileSync(filePath);
                        executor = keyring.addFromJson(JSON.parse(file.toString()));
                        isRead = false;
                        return [4 /*yield*/, capturePwd(isRead, function (password) {
                                pwd_1 = password;
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!!isRead) return [3 /*break*/, 5];
                        // Loop till user input is read...
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
                    case 4:
                        // Loop till user input is read...
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 5:
                        executor.unlock(pwd_1);
                        return [2 /*return*/, executor];
                    case 6:
                        err_3 = _a.sent();
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    MigrateCommand.description = 'migrate the state of an existing substrate-v2 based chain to a substrate-v3 based chain';
    MigrateCommand.flags = {
        'source-network': command_1.flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
            required: true,
        }),
        'destination-network': command_1.flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
            required: true,
        }),
        'from-block': command_1.flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a block number.',
            default: '-1',
        }),
        'to-block': command_1.flags.string({
            char: 'b',
            description: 'specify at which block to insert the state from the chain. Input must be a block number.',
            default: '-1',
        }),
        'executor': command_1.flags.string({
            description: 'path to a json file, exported from polkadot-js, with which the migration shall be executed.',
            required: true,
        }),
        'modules': command_1.flags.string({
            char: 'm',
            multiple: true,
            description: 'defines additional modules that shall be migrated. Modules can be defined as `PALLET_NAME` or as `PALLET_NAME.STORAGE_ITEM`'
        }),
        'sequence': command_1.flags.string({
            multiple: true,
            description: 'defines the sequence of the migration. Modules can be defined as `PALLET_NAME` or as `PALLET_NAME.STORAGE_ITEM`. If not provided random sequence will be choosen.'
        }),
        'no-default': command_1.flags.boolean({
            description: 'Do not migrate the default modules. Namely: System, Balances, Proxy, Vesting',
        }),
        'verify': command_1.flags.boolean({
            description: 'Verifies the migration after running it.',
        })
    };
    return MigrateCommand;
}(command_1.default));
exports.default = MigrateCommand;
function verifyMigration(toApi, fromApi, storageItems, atTo, atFrom) {
    return __awaiter(this, void 0, void 0, function () {
        var forkDataOld, forkDataNew, fromAsNum, toAsNum, failedAcc, itemsToCheck, _i, _a, _b, _one, data, _c, _d, _e, key, oldData, newData, failed, failed, failed, failed;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, fork_1.fork(fromApi, storageItems, atFrom)];
                case 1:
                    forkDataOld = _f.sent();
                    return [4 /*yield*/, fork_1.fork(toApi, storageItems, atTo)];
                case 2:
                    forkDataNew = _f.sent();
                    return [4 /*yield*/, fromApi.rpc.chain.getBlock(atFrom)];
                case 3:
                    fromAsNum = (_f.sent()).block.header.number.toBigInt();
                    return [4 /*yield*/, toApi.rpc.chain.getBlock(atTo)];
                case 4:
                    toAsNum = (_f.sent()).block.header.number.toBigInt();
                    failedAcc = new Array();
                    itemsToCheck = 0;
                    for (_i = 0, _a = Array.from(forkDataOld); _i < _a.length; _i++) {
                        _b = _a[_i], _one = _b[0], data = _b[1];
                        itemsToCheck += data.length;
                    }
                    console.log("Starting verification of " + itemsToCheck + " migrated storage keys.");
                    process.stdout.write("    Verifying:    0/" + itemsToCheck + "\r");
                    _c = 0, _d = Array.from(forkDataOld);
                    _f.label = 5;
                case 5:
                    if (!(_c < _d.length)) return [3 /*break*/, 16];
                    _e = _d[_c], key = _e[0], oldData = _e[1];
                    newData = forkDataNew.get(key);
                    if (!(oldData === undefined)) return [3 /*break*/, 6];
                    failedAcc.push.apply(failedAcc, oldData);
                    console.log("Some data from old could not be found in the new data...");
                    return [3 /*break*/, 15];
                case 6:
                    if (!(key === util_crypto_1.xxhashAsHex("System", 128) + util_crypto_1.xxhashAsHex("Account", 128).slice(2))) return [3 /*break*/, 8];
                    return [4 /*yield*/, verifySystemAccount(oldData, fromApi, newData, toApi)];
                case 7:
                    failed = _f.sent();
                    if (failed.length === 0) {
                        failedAcc.push.apply(failedAcc, failed);
                    }
                    return [3 /*break*/, 15];
                case 8:
                    if (!(key === util_crypto_1.xxhashAsHex("Balances", 128) + util_crypto_1.xxhashAsHex("TotalIssuance", 128).slice(2))) return [3 /*break*/, 10];
                    return [4 /*yield*/, verifyBalanceTotalIssuance(oldData, fromApi, newData, toApi)];
                case 9:
                    failed = _f.sent();
                    if (failed.length === 0) {
                        failedAcc.push.apply(failedAcc, failed);
                    }
                    return [3 /*break*/, 15];
                case 10:
                    if (!(key === util_crypto_1.xxhashAsHex("Vesting", 128) + util_crypto_1.xxhashAsHex("Vesting", 128).slice(2))) return [3 /*break*/, 12];
                    return [4 /*yield*/, verifyVestingVesting(oldData, fromApi, newData, toApi, fromAsNum, toAsNum)];
                case 11:
                    failed = _f.sent();
                    if (failed.length === 0) {
                        failedAcc.push.apply(failedAcc, failed);
                    }
                    return [3 /*break*/, 15];
                case 12:
                    if (!(key === util_crypto_1.xxhashAsHex("Proxy", 128) + util_crypto_1.xxhashAsHex("Proxies", 128).slice(2))) return [3 /*break*/, 14];
                    return [4 /*yield*/, verifyProxyProxies(oldData, fromApi, newData, toApi)];
                case 13:
                    failed = _f.sent();
                    if (failed.length === 0) {
                        failedAcc.push.apply(failedAcc, failed);
                    }
                    return [3 /*break*/, 15];
                case 14:
                    failedAcc.push.apply(failedAcc, oldData);
                    console.log("Some data from old could not be verified here...");
                    _f.label = 15;
                case 15:
                    _c++;
                    return [3 /*break*/, 5];
                case 16: return [2 /*return*/, failedAcc];
            }
        });
    });
}
exports.verifyMigration = verifyMigration;
function verifySystemAccount(oldData, oldApi, newData, newApi) {
    return __awaiter(this, void 0, void 0, function () {
        var failed, newDataMap, checked, _i, oldData_1, _a, key, value, oldAccount, newScale, newAccount;
        return __generator(this, function (_b) {
            failed = new Array();
            newDataMap = newData.reduce(function (map, obj) {
                map[obj[0].toHex()] = obj[1];
                return map;
            }, new Map());
            checked = 0;
            for (_i = 0, oldData_1 = oldData; _i < oldData_1.length; _i++) {
                _a = oldData_1[_i], key = _a[0], value = _a[1];
                process.stdout.write("    Verifying:    " + checked + "/ \r");
                oldAccount = oldApi.createType('AccountInfo', value);
                newScale = newDataMap.get(key.toHex());
                if (newScale !== undefined) {
                    newAccount = oldApi.createType('AccountInfo', newScale.get(key.toHex()[1]));
                    if (oldAccount.data.free.toBigInt() + oldAccount.data.reserved.toBigInt() !== newAccount.data.free.toBigInt()) {
                        failed.push([key, value]);
                    }
                }
                else {
                    failed.push([key, value]);
                }
                checked += 1;
            }
            return [2 /*return*/, failed];
        });
    });
}
function verifyBalanceTotalIssuance(oldData, oldApi, newData, newApi) {
    return __awaiter(this, void 0, void 0, function () {
        var failed, newDataMap, checked, _i, oldData_2, _a, key, value, oldIssuance, newScale, newIssuance;
        return __generator(this, function (_b) {
            failed = new Array();
            newDataMap = newData.reduce(function (map, obj) {
                map[obj[0].toHex()] = obj[1];
                return map;
            }, new Map());
            checked = 0;
            for (_i = 0, oldData_2 = oldData; _i < oldData_2.length; _i++) {
                _a = oldData_2[_i], key = _a[0], value = _a[1];
                process.stdout.write("    Verifying:    " + checked + "/ \r");
                oldIssuance = oldApi.createType('Balance', value);
                newScale = newDataMap.get(key.toHex());
                if (newScale !== undefined) {
                    newIssuance = oldApi.createType('Balance', newScale.get(key.toHex()[1]));
                    if (oldIssuance.toBigInt() > newIssuance.toBigInt()) {
                        failed.push([key, value]);
                    }
                }
                else {
                    failed.push([key, value]);
                }
                checked += 1;
            }
            return [2 /*return*/, failed];
        });
    });
}
function verifyProxyProxies(oldData, oldApi, newData, newApi) {
    return __awaiter(this, void 0, void 0, function () {
        var failed, newDataMap, checked, _i, oldData_3, _a, key, value, oldProxyInfo, newScale, newProxyInfo, _b, _c, oldDelegate, found, oldAccount, _d, _e, newDelegate, newAccount;
        return __generator(this, function (_f) {
            failed = new Array();
            newDataMap = newData.reduce(function (map, obj) {
                map[obj[0].toHex()] = obj[1];
                return map;
            }, new Map());
            checked = 0;
            for (_i = 0, oldData_3 = oldData; _i < oldData_3.length; _i++) {
                _a = oldData_3[_i], key = _a[0], value = _a[1];
                process.stdout.write("    Verifying:    " + checked + "/ \r");
                oldProxyInfo = oldApi.createType('(Vec<(AccountId, ProxyType)>, Balance)', value);
                newScale = newDataMap.get(key.toHex());
                if (newScale !== undefined) {
                    newProxyInfo = newApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', newScale.get(key.toHex()[1]));
                    if (oldProxyInfo[0][0].length === newProxyInfo[0][0].length
                        && oldProxyInfo[0][1].toBigInt() === newProxyInfo[0][1].toBigInt()
                        && oldProxyInfo[0][0][1].toBigInt() === newProxyInfo[0][0]["proxyType"].toBigInt()) {
                        // Now also check each delegate of this proxy entry
                        for (_b = 0, _c = oldProxyInfo[0][0]; _b < _c.length; _b++) {
                            oldDelegate = _c[_b];
                            found = false;
                            oldAccount = oldDelegate[0].toHex();
                            for (_d = 0, _e = newProxyInfo[0][0]; _d < _e.length; _d++) {
                                newDelegate = _e[_d];
                                newAccount = newDelegate["delegate"].toHex();
                                if (oldAccount === newAccount) {
                                    found = true;
                                }
                            }
                            if (!found) {
                                failed.push([key, value]);
                            }
                        }
                    }
                    else {
                        failed.push([key, value]);
                    }
                }
                else {
                    failed.push([key, value]);
                }
                checked += 1;
            }
            return [2 /*return*/, failed];
        });
    });
}
function verifyVestingVesting(oldData, oldApi, newData, newApi, atFrom, atTo) {
    return __awaiter(this, void 0, void 0, function () {
        var failed, newDataMap, checked, _i, oldData_4, _a, key, value, oldBalance, newBalance, overallOld, overallNew, oldVestingInfo, blockPeriodOldVesting, blocksPassedSinceVestingStart, remainingBlocksVestingOld, newScale, newVestingInfo, blockPeriodNewVesting, blocksPassedSinceVestingStartNew, remainingBlocksVestingNew;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    failed = new Array();
                    newDataMap = newData.reduce(function (map, obj) {
                        map[obj[0].toHex()] = obj[1];
                        return map;
                    }, new Map());
                    checked = 0;
                    _i = 0, oldData_4 = oldData;
                    _b.label = 1;
                case 1:
                    if (!(_i < oldData_4.length)) return [3 /*break*/, 5];
                    _a = oldData_4[_i], key = _a[0], value = _a[1];
                    process.stdout.write("    Verifying:    " + checked + "/ \r");
                    return [4 /*yield*/, oldApi.query.system.account(key.toU8a(true).slice(-32))];
                case 2:
                    oldBalance = (_b.sent()).data;
                    return [4 /*yield*/, newApi.query.system.account(key.toU8a(true).slice(-32))];
                case 3:
                    newBalance = (_b.sent()).data;
                    overallOld = oldBalance.free.toBigInt() + oldBalance.reserved.toBigInt();
                    overallNew = newBalance.free.toBigInt() + newBalance.reserved.toBigInt();
                    if (overallNew !== overallNew) {
                        failed.push([key, value]);
                        return [3 /*break*/, 4];
                    }
                    oldVestingInfo = oldApi.createType('VestingInfo', value);
                    blockPeriodOldVesting = (oldVestingInfo.locked.toBigInt() / oldVestingInfo.perBlock.toBigInt());
                    blocksPassedSinceVestingStart = (atFrom - oldVestingInfo.startingBlock.toBigInt());
                    remainingBlocksVestingOld = blockPeriodOldVesting - blocksPassedSinceVestingStart;
                    if (oldVestingInfo.startingBlock.toBigInt() - atFrom >= 0) {
                        // Vesting has passed, the chain will resolve this directly upon our inserts.
                    }
                    else {
                        newScale = newDataMap.get(key.toHex());
                        if (newScale !== undefined) {
                            newVestingInfo = oldApi.createType('VestingInfo', newScale.get(key.toHex()[1]));
                            blockPeriodNewVesting = newVestingInfo.locked.toBigInt() / newVestingInfo.perBlock.toBigInt();
                            blocksPassedSinceVestingStartNew = (atTo - newVestingInfo.startingBlock.toBigInt());
                            remainingBlocksVestingNew = blockPeriodNewVesting - blocksPassedSinceVestingStartNew;
                            if (remainingBlocksVestingOld !== (remainingBlocksVestingNew * BigInt(2))) {
                                failed.push([key, value]);
                            }
                        }
                        else {
                            failed.push([key, value]);
                        }
                    }
                    checked += 1;
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, failed];
            }
        });
    });
}
function prepareMigrate(fromApi, toApi, storageItems, at, to) {
    return __awaiter(this, void 0, void 0, function () {
        var transformedData, _a, _b, migrationXts, _i, transformedData_1, _c, prefix, keyValues, migratedPalletStorageItems, migratedPalletStorageItems, migratedPalletStorageItems, migratedPalletStorageItems;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = Array).from;
                    return [4 /*yield*/, transform_1.transform(fromApi, toApi, storageItems, at, to)];
                case 1:
                    transformedData = _b.apply(_a, [_d.sent()]);
                    migrationXts = new Map();
                    _i = 0, transformedData_1 = transformedData;
                    _d.label = 2;
                case 2:
                    if (!(_i < transformedData_1.length)) return [3 /*break*/, 12];
                    _c = transformedData_1[_i], prefix = _c[0], keyValues = _c[1];
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("System", 128))) return [3 /*break*/, 4];
                    return [4 /*yield*/, prepareSystem(toApi, keyValues)];
                case 3:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 4:
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("Balances", 128))) return [3 /*break*/, 6];
                    return [4 /*yield*/, prepareBalances(toApi, keyValues)];
                case 5:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 6:
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("Vesting", 128))) return [3 /*break*/, 8];
                    return [4 /*yield*/, prepareVesting(toApi, keyValues)];
                case 7:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 8:
                    if (!prefix.startsWith(util_crypto_1.xxhashAsHex("Proxy", 128))) return [3 /*break*/, 10];
                    return [4 /*yield*/, prepareProxy(toApi, keyValues)];
                case 9:
                    migratedPalletStorageItems = _d.sent();
                    migrationXts.set(prefix, migratedPalletStorageItems);
                    return [3 /*break*/, 11];
                case 10:
                    console.log("Fetched data that can not be migrated. PatriciaKey is: " + prefix);
                    _d.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/, migrationXts];
            }
        });
    });
}
exports.prepareMigrate = prepareMigrate;
function migrate(toApi, executor, sequence, data, cbErr) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var nonce, dispatcher, _i, sequence_1, one, palletData, _b, _c, _d, key, data_1, storageItemData;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, toApi.query.system.account(executor.address)];
                case 1:
                    nonce = (_e.sent()).nonce;
                    dispatcher = new common_1.Dispatcher(toApi, executor, nonce.toBigInt(), cbErr, 10, 100);
                    _i = 0, sequence_1 = sequence;
                    _e.label = 2;
                case 2:
                    if (!(_i < sequence_1.length)) return [3 /*break*/, 15];
                    one = sequence_1[_i];
                    if (!(one instanceof common_1.PalletElement)) return [3 /*break*/, 9];
                    palletData = data.get(one.palletHash);
                    if (!(palletData !== undefined)) return [3 /*break*/, 7];
                    _b = 0, _c = Array.from(palletData);
                    _e.label = 3;
                case 3:
                    if (!(_b < _c.length)) return [3 /*break*/, 6];
                    _d = _c[_b], key = _d[0], data_1 = _d[1];
                    return [4 /*yield*/, dispatcher.sudoDispatch(data_1)];
                case 4:
                    _e.sent();
                    _e.label = 5;
                case 5:
                    _b++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7: throw Error("Sequence element was NOT part of transformation. Pallet: " + one.pallet);
                case 8: return [3 /*break*/, 14];
                case 9:
                    if (!(one instanceof common_1.StorageItemElement)) return [3 /*break*/, 13];
                    storageItemData = (_a = data.get(one.palletHash)) === null || _a === void 0 ? void 0 : _a.get(one.key);
                    if (!(storageItemData !== undefined)) return [3 /*break*/, 11];
                    return [4 /*yield*/, dispatcher.sudoDispatch(storageItemData)];
                case 10:
                    _e.sent();
                    return [3 /*break*/, 12];
                case 11: throw Error("Sequence element was NOT part of transformation. Pallet: " + one.pallet + ", Item: " + one.item);
                case 12: return [3 /*break*/, 14];
                case 13: throw Error("Unreachable Code. qed.");
                case 14:
                    _i++;
                    return [3 /*break*/, 2];
                case 15: return [4 /*yield*/, dispatcher.getResults()];
                case 16: return [2 /*return*/, _e.sent()];
            }
        });
    });
}
exports.migrate = migrate;
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
                    return [4 /*yield*/, prepareSystemAccount(toApi, values)];
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
function prepareProxy(toApi, keyValues) {
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
                    if (!(palletStorageItemKey === (util_crypto_1.xxhashAsHex("Proxy", 128) + util_crypto_1.xxhashAsHex("Proxies", 128).slice(2)))) return [3 /*break*/, 3];
                    _d = (_c = xts).set;
                    _e = [palletStorageItemKey];
                    return [4 /*yield*/, prepareProxyProxies(toApi, values)];
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
function prepareProxyProxies(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, packetOfProxies, maxProxies, counter, _i, values_1, item, accountId, proxyInfo, accountId, proxyInfo;
        return __generator(this, function (_a) {
            xts = new Array();
            packetOfProxies = new Array();
            maxProxies = toApi.consts.migration.migrationMaxProxies.toNumber();
            counter = 0;
            for (_i = 0, values_1 = values; _i < values_1.length; _i++) {
                item = values_1[_i];
                // We know from the transformation that optional is set here.
                // In this case it defines the actual amount that shall be reserved on the delegator
                counter += 1;
                if (item instanceof transform_1.StorageMapValue) {
                    if (packetOfProxies.length === maxProxies - 1 || counter === values.length) {
                        accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32));
                        proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);
                        //console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());
                        packetOfProxies.push([accountId, item.optional, item.value]);
                        xts.push(toApi.tx.migration.migrateProxyProxies(packetOfProxies));
                        packetOfProxies = new Array();
                    }
                    else {
                        accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32));
                        proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);
                        //console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());
                        packetOfProxies.push([accountId, item.optional, item.value]);
                    }
                }
                else {
                    throw Error("Expected Proxy.Proxies storage values to be of type StorageMapValue. Got: " + JSON.stringify(item));
                }
            }
            return [2 /*return*/, xts];
        });
    });
}
function prepareSystemAccount(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, packetOfAccounts, maxAccounts, counter, _i, values_2, item, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    xts = new Array();
                    packetOfAccounts = new Array();
                    maxAccounts = toApi.consts.migration.migrationMaxAccounts.toNumber();
                    counter = 0;
                    _i = 0, values_2 = values;
                    _e.label = 1;
                case 1:
                    if (!(_i < values_2.length)) return [3 /*break*/, 8];
                    item = values_2[_i];
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
            id = Array.from(item.patriciaKey.toU8a(true));
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
                    return [4 /*yield*/, prepareBalancesTotalIssuance(toApi, values)];
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
function prepareBalancesTotalIssuance(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, _i, values_3, item, issuance;
        return __generator(this, function (_a) {
            xts = new Array();
            if (values.length != 1) {
                throw Error("TotalIssuance MUST be single value. Got " + values.length);
            }
            for (_i = 0, values_3 = values; _i < values_3.length; _i++) {
                item = values_3[_i];
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
                    return [4 /*yield*/, prepareVestingVestingInfo(toApi, values)];
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
function prepareVestingVestingInfo(toApi, values) {
    return __awaiter(this, void 0, void 0, function () {
        var xts, packetOfVestings, maxVestings, counter, _i, values_4, item, vestingInfo, accountId;
        return __generator(this, function (_a) {
            xts = new Array();
            packetOfVestings = new Array();
            maxVestings = toApi.consts.migration.migrationMaxVestings.toNumber();
            counter = 0;
            for (_i = 0, values_4 = values; _i < values_4.length; _i++) {
                item = values_4[_i];
                counter += 1;
                if (item instanceof transform_1.StorageMapValue) {
                    vestingInfo = toApi.createType("VestingInfo", item.value);
                    accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32));
                    if (packetOfVestings.length === maxVestings - 1 || counter === values.length) {
                        // push the last element and prepare extrinsic
                        packetOfVestings.push([accountId, vestingInfo]);
                        xts.push(toApi.tx.migration.migrateVestingVesting(packetOfVestings));
                        packetOfVestings = new Array();
                    }
                    else {
                        packetOfVestings.push([accountId, vestingInfo]);
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
        var wsProviderFrom, fromApi, wsProviderTo, toApi, storageItems, metadataFrom, metadataTo, lastFromHdr, at, lastToHdr, to, migrationData, sequence, keyring, alice, failed, results, lastHdr, newTo, verification, _i, verification_1, failed_2;
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
                    wsProviderTo = new api_1.WsProvider("ws://127.0.0.1:9946");
                    return [4 /*yield*/, api_1.ApiPromise.create({
                            provider: wsProviderTo,
                            types: {
                                ProxyType: {
                                    _enum: ['Any', 'NonTransfer', 'Governance', '_Staking', 'NonProxy']
                                }
                            }
                        })];
                case 2:
                    toApi = _a.sent();
                    storageItems = new Array();
                    storageItems.push.apply(storageItems, common_1.getDefaultStorage());
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 3:
                    metadataFrom = _a.sent();
                    return [4 /*yield*/, fromApi.rpc.state.getMetadata()];
                case 4:
                    metadataTo = _a.sent();
                    return [4 /*yield*/, fromApi.rpc.chain.getHeader()];
                case 5:
                    lastFromHdr = _a.sent();
                    at = lastFromHdr.hash;
                    return [4 /*yield*/, toApi.rpc.chain.getHeader()];
                case 6:
                    lastToHdr = _a.sent();
                    to = lastToHdr.hash;
                    return [4 /*yield*/, prepareMigrate(fromApi, toApi, storageItems, at, to)];
                case 7:
                    migrationData = _a.sent();
                    sequence = storageItems;
                    keyring = new api_1.Keyring({ type: 'sr25519' });
                    alice = keyring.addFromUri('//Alice');
                    failed = new Array();
                    return [4 /*yield*/, migrate(toApi, alice, sequence, migrationData, function (failedXts) {
                            failed.push.apply(failed, failedXts);
                            console.log("The following extrinsics failed");
                            for (var _i = 0, failedXts_2 = failedXts; _i < failedXts_2.length; _i++) {
                                var xt = failedXts_2[_i];
                                console.log(xt.toJSON());
                            }
                        })];
                case 8:
                    results = _a.sent();
                    return [4 /*yield*/, toApi.rpc.chain.getHeader()];
                case 9:
                    lastHdr = _a.sent();
                    newTo = lastHdr.hash;
                    return [4 /*yield*/, verifyMigration(toApi, fromApi, storageItems, newTo, at)];
                case 10:
                    verification = _a.sent();
                    if (verification.length === 0) {
                        console.log("Migration was successful.");
                    }
                    else {
                        console.log("Some failed. Data comes here: ");
                        for (_i = 0, verification_1 = verification; _i < verification_1.length; _i++) {
                            failed_2 = verification_1[_i];
                            console.log(JSON.stringify(failed_2));
                        }
                    }
                    fromApi.disconnect();
                    toApi.disconnect();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test_run = test_run;
//# sourceMappingURL=migrate.js.map