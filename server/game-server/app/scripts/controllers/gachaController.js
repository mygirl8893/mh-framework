const models = require('./../models');
const fixedController = require('./fixedController');
const heroController = require('./heroController');
const playerController = require('./playerController');
const utils = require('./../../common/utils');
const gamedata = require('./../../../configs/gamedata.json');
const Defaults = require('./../../designdata/Defaults');
var assert = require ('assert');
const skillController = require('./../controllers/skillController');
const CONSTANTS = require('./../../common/constants');

const validator = require('validator');
const GameRedisHelper = require('./../../../index.app').GameRedisHelper;

const globalController = require('./globalController');

const HeroGachaDayFree = require('./../../designdata/HeroGachaDayFree');

class GachaController
{
    constructor(uuid,multiController, taskController = null)
    {
        this.uuid_ = uuid ? parseInt(uuid) : 0;
        this.tblname_ = 'GachaData';
        this.gachaData = null;
        this.gachaRedisDataString = null;
        this.multiController = multiController;
        this.taskController = taskController;
    }

    errorHandle(){
        this.gachaData = null;
        this.gachaRedisDataString = null
    }

    getTblName()
    {
        return this.tblname_ + ":" + this.uuid_;
    }

    getGachaDataFromDataSource (callback) {
        if (this.gachaData == null) {
            GameRedisHelper.getHashFieldValue(this.tblname_, this.uuid_, sGachaData => {
                this.gachaRedisDataString = sGachaData;
                let doc = sGachaData && validator.isJSON(sGachaData)? JSON.parse(sGachaData) : null;
                this.gachaData = doc;
                callback (doc);
            });
        }else {
            callback (this.gachaData);
        }
    }

    saveGachaDataImmediately (callback) {
        this.saveGachaDataToDataSource (this.gachaData, callback, true);
    }

    saveGachaDataToDataSource (gachaData, callback, save = true) {
        if (gachaData != null) {
            let saveString = JSON.stringify(gachaData);
            let shouldSave = false;
            if (this.gachaRedisDataString == null || this.gachaRedisDataString != saveString) {
                shouldSave = true;
            }
            if (shouldSave) {
                this.gachaData = gachaData;
                this.multiController.push(1,this.tblname_ + ":" + this.uuid_, saveString)
                this.gachaRedisDataString = saveString;
                callback(true);
            }else {
                callback (true);
            }
        }else {
            callback (true)
        }
    }


    // ???????????????????????????????????????
    checkAreaIsOpen(areaId, callback)
    {
        fixedController.HeroGachaAreas.getCanUseConfig(areaId, canUse => {
            callback(canUse === 1);
        });
    }

    // ??????????????????????????????????????????
    checkAreaTimeIsOver(areaId, callback)
    {
        fixedController.HeroGachaAreas.getEndTimeConfig(areaId, endTime => {
            if (endTime) {
                if (endTime === '') {
                    callback(true);
                } else {
                    let et = new Date(endTime),
                        now = new Date();

                    callback(now > et);
                }
            } else {
                callback(false);
            }
        });
    }

    // ==================================================== ??????????????????

    // ???????????????????????????
    initAreaFreeData(callback)
    {
        /*
        HeroGachaDayFree.getDayFreeListConfig(dayFreeLis => {
            var freeAreaId = dayFreeLis && dayFreeLis.length > 0 ? dayFreeLis[0].AreaId : 0,
                data = [{ areaId: freeAreaId, free: (freeAreaId===0) ? 0 : 1 }];
            callback(data);
        });*/

        let dayFreeLis = HeroGachaDayFree.getDayFreeListConfig(),
            freeAreaId = dayFreeLis && dayFreeLis.length > 0 ? dayFreeLis[0].AreaId : 0,
            data = [{ areaId: freeAreaId, free: (freeAreaId===0) ? 0 : 1 }];
        callback(data);
    }

    // ????????????????????????
    updateAreaFreeData(isReset, callback)
    {
        var areaFreeLisDefault = [{ areaId: 0, free: 0 }];
        if (isReset) {
            globalController.getGlobalGachaDayFreeSelect(dayFreeSelect => {
                var freeAreaId = HeroGachaDayFree.getFreeAreaIdConfig(dayFreeSelect);
                if (freeAreaId === 0) {
                    // ????????????????????????
                    callback(areaFreeLisDefault);
                } else {
                    this.getGachaDataFromDataSource (gachaData =>{
                        if (gachaData) {
                            if (!gachaData.areaFreeList) {
                                gachaData.areaFreeList = areaFreeLisDefault;
                            }
                            if (gachaData.areaFreeList[0].areaId !== freeAreaId) {
                                // ??????????????????????????????????????????
                                gachaData.areaFreeList[0].areaId = freeAreaId;
                                gachaData.areaFreeList[0].free   = 1;
                            }
                            this.saveGachaDataToDataSource (gachaData, ()=> {
                                callback(gachaData.areaFreeList);
                            });
                        } else {
                            callback(areaFreeLisDefault);
                        }
                    });
                }
            });
        }else {
            callback(areaFreeLisDefault);
        }

        /*
        HeroGachaDayFree.getDayFreeListConfig(dayFreeLis => {
            if (dayFreeLis) {
                GameRedisHelper.getHashFieldValue(this.tblname_, this.uuid_, res => {
                    if (res && validator.isJSON(res)) {
                        var gachaData = JSON.parse(res),
                            dayFreeSelect = gachaData.dayFreeSelect ? gachaData.dayFreeSelect : 0,
                            freeAreaId = 0;

                        if (dayFreeSelect === 0) {
                            dayFreeSelect = dayFreeLis[0].Sort;
                            freeAreaId = dayFreeLis[0].AreaId;
                        } else {
                            ++dayFreeSelect;
                            if (dayFreeSelect > dayFreeLis.length) {
                                dayFreeSelect = dayFreeLis[0].Sort;
                                freeAreaId = dayFreeLis[0].AreaId;
                            } else {
                                for (let i in dayFreeLis) {
                                    if (dayFreeLis[i].Sort === dayFreeSelect) {
                                        freeAreaId = dayFreeLis[i].AreaId;
                                        break;
                                    }
                                }
                            }
                        }

                        var newAreaFreeLis = [{ areaId: freeAreaId, free: (freeAreaId===0) ? 0 : 1 }];
                        gachaData.dayFreeSelect = dayFreeSelect;
                        gachaData.areaFreeList = newAreaFreeLis;

                        GameRedisHelper.setHashFieldValue(this.tblname_, this.uuid_, JSON.stringify(gachaData), () => {
                            callback(newAreaFreeLis);
                        });
                    } else {
                        callback(null);
                    }
                });
            } else {
                callback(null);
            }
        });*/
    }

    // ????????????????????????
    /*
    getAreaFreeData(callback)
    {
        GameRedisHelper.getHashFieldValue(this.tblname_, this.uuid_, res => {
            var data = [{ areaId: 0, free: 0 }];
            if (res && validator.isJSON(res)) {
                var gachaData = JSON.parse(res);
                if (gachaData.areaFreeList) data = gachaData.areaFreeList;
            }

            callback(data);
        });
    }*/

    // ??????????????????
    checkAreaFree(areaId, callback)
    {
        //GameRedisHelper.getHashFieldValue(this.tblname_, this.uuid_, res => {
        this.getGachaDataFromDataSource (gachaData => {
            var flag = false;
            if (gachaData) {
                var areaFreeLis = [{ areaId: areaId, free: 0 }];
                if (gachaData.areaFreeList) {
                    for (let i in gachaData.areaFreeList) {
                        if (gachaData.areaFreeList[i].areaId === areaId) {
                            flag = (gachaData.areaFreeList[i].free > 0);
                            break;
                        }
                    }
                    areaFreeLis = gachaData.areaFreeList;
                }
                callback(flag, areaFreeLis);
            } else {
                //console.warn("[gachaController][checkAreaFree] data is wrong: ", this.uuid_, res);
                this.initAreaFreeData(areaFreeLis => {
                    if (areaFreeLis[0].free > 0) flag = true;
                    callback(flag, areaFreeLis);
                });
            }
        });
    }

    // ????????????????????????
    costAreaFreeCount(areaId, value, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var areaFreeLis = [{ areaId: areaId, free: 0 }];
            if (gachaData) {
                if (gachaData.areaFreeList && gachaData.areaFreeList[0]) {
                    if (gachaData.areaFreeList[0].free === 0) {
                        callback(areaFreeLis);
                    } else {
                        for (let i in gachaData.areaFreeList) {
                            if (gachaData.areaFreeList[i].areaId === areaId) {
                                gachaData.areaFreeList[i].free -= value;
                                break;
                            }
                        }
                        this.saveGachaDataToDataSource (gachaData, ()=> {
                            callback(gachaData.areaFreeList);
                        });
                    }
                } else {
                    callback(areaFreeLis);
                }
            } else {
                console.warn("[gachaController][costAreaFreeCount] data is wrong: ", this.uuid_, res);
                callback(areaFreeLis);
            }
        });
    }
    // ==================================================== ??????????????????

    getRandomEventDataByType (eventType, eventMap)
    {
        let eventIds = [];
        for (var [eventId, eventData] of eventMap) {
            if (eventData.eventType === eventType) {
                eventIds.push (eventId);
            }
        }
        return utils.getRandomFromArray (eventIds)
    }

    getSeekPointSeekCount (seekinfo, curindex)
    {
        assert (curindex >= 0 && curindex < seekinfo.length, "seek info index is not right");
        return seekinfo[curindex];
    }

    createAwardList(areaId, exceptHeroId, callback)
    {
        function getNewEventMap(map, lmttype)
        {
            var delEvId = [];
            for (var [eventId, eventData] of map) {
                if (eventData.eventType === lmttype) {
                    delEvId.push(eventId);
                }
            }

            for (let i = 0; i < delEvId.length; i++)
                map.delete(delEvId[i]);
            return map;
        }

        // ??????????????????????????????????????????????????????????????????
        var awardResList = [], subAwardCount = 0;
        // ?????? - ???????????? + ??????
        fixedController.HeroGahcaEvents.getEventListConfig(exceptHeroId, eventMap => {
            // ???????????? ????????????  ????????????????????????  ??????
            fixedController.HeroGachaAreas.getEventWeightConfig(areaId, areaConfig => {
                // ??????????????????
                fixedController.HeroGachaAreas.getRandomSkinEventId (areaId, gamedata.GACHA.GachaRandomProbs, skinEventId => {
                    if (skinEventId != 0) {
                        //console.error("-------------------------->>>>", skinEventId, eventMap);
                        var eventData = eventMap.get(skinEventId);
                        awardResList.push ({type: gamedata.GACHA.GachaEventType.Skin, eventId: skinEventId, awardId: utils.randomListByWeight(eventData.awardId)[0]});
                        subAwardCount += 1;
                    }
                    // ??????????????????
                    fixedController.HeroGachaAreas.getRandomHeroIdUsingProbs (areaId, exceptHeroId, gamedata.GACHA.GachaRandomProbs, extraHeroData => {
                        if (extraHeroData != 0) {
                            awardResList.push ({type: gamedata.GACHA.GachaEventType.Hero, eventId: 0, awardId:extraHeroData});
                            subAwardCount += 1;
                        }

                        let maxAddCountNum = areaConfig.addCountNum;
                        let maxAddRewardNum = areaConfig.addRewardNum - subAwardCount;

                        // ?????????????????????
                        while (maxAddCountNum --) {
                            // ?????????????????????????????????
                            var eventId = this.getRandomEventDataByType (gamedata.GACHA.GachaEventType.AddCount, eventMap)
                            assert (eventId != null, "can not found add count event data!!");
                            var eventData = eventMap.get(eventId);
                            awardResList.push ({type: gamedata.GACHA.GachaEventType.AddCount, eventId: eventId, awardId: utils.randomListByWeight(eventData.awardId)[0]});
                        }

                        // ??????????????????
                        while (maxAddRewardNum --) {
                            // ?????????????????????ID
                            var eventId = utils.randomListByWeight(areaConfig.awdEvTable)[0];
                            // ????????????????????????????????????
                            var eventData = eventMap.get(eventId);
                            if (!eventData || areaConfig.lmtEvMap.get(eventData.eventType) == 0) {
                                ++maxAddRewardNum; // ????????????
                                // ???????????????????????????
                                if (eventData)
                                    eventMap = getNewEventMap(eventMap, eventData.eventType);
                            } else {
                                // ????????????
                                areaConfig.lmtEvMap.set(eventData.eventType,
                                    areaConfig.lmtEvMap.get(eventData.eventType) -1);
                                if (areaConfig.lmtEvMap.get(eventData.eventType) == 0) {
                                    eventMap = getNewEventMap(eventMap, eventData.eventType);
                                }
                                awardResList.push({type: eventData.eventType, eventId: eventId, awardId: utils.randomListByWeight(eventData.awardId)[0]});
                            }
                        }

                        // ?????????????????????
                        let emptyGridCount = gamedata.GACHA.GachaGridNum - awardResList.length;
                        for (let i = 0; i < emptyGridCount; i++) {
                            var baseAwardEventId = utils.randomListByWeight(areaConfig.baseAwdTable)[0];
                            var eventData = eventMap.get(baseAwardEventId);
                            assert (eventData != null, "can not get event data");
                            let awardData = {type: gamedata.GACHA.GachaEventType.Empty, eventId: baseAwardEventId, awardId:utils.randomListByWeight(eventData.awardId)[0]}
                            awardResList.push(awardData);
                        }

                        var AwardRetData = {};
                        AwardRetData.awardResList = awardResList;
                        AwardRetData.seekPoint = areaConfig.seekPoint;
                        callback(AwardRetData);
                    });
                });
            });
        });
    }

    createMapInfo(areaId, exceptHeroId, callback, playerPtr)
    {
        let mapInfo = [];
        for (let i = 0; i < gamedata.GACHA.GachaGridNum; i++) {
            var gridModel = models.HeroGachaGridModel();
            mapInfo.push(gridModel);
        }
        this.createAwardList(areaId, exceptHeroId, retData => {
            let awardResList = retData.awardResList;
            for (let i = 0; i < awardResList.length; i++) {
                mapInfo[i].type = awardResList[i].type;
                mapInfo[i].awardRes.eventId = awardResList[i].eventId;
                mapInfo[i].awardRes.awardId = awardResList[i].awardId;
            }
            utils.shuffle(mapInfo);
            let curSeekPointIndex = 0;
            let leftSeekNum = this.getSeekPointSeekCount (retData.seekPoint, curSeekPointIndex)
            for (let i = 0; i < gamedata.GACHA.GachaGridNum; i++) {
                mapInfo[i].gridPos = i + 1;
                mapInfo[i].seekpoint = curSeekPointIndex + 1;
                leftSeekNum -= 1;
                if (leftSeekNum <= 0) {
                    curSeekPointIndex += 1;
                    if (curSeekPointIndex < retData.seekPoint.length) {
                        leftSeekNum = this.getSeekPointSeekCount (retData.seekPoint, curSeekPointIndex)
                    } else {
                        leftSeekNum = gamedata.GACHA.GachaGridNum;
                    }
                }
            }

            this.doGuideFirstGacha(playerPtr, mapInfo, newMapInfo => {
                callback(newMapInfo);
            });
        });
    }

    getGachaDataByUuid(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                var areaFreeList = gachaData.areaFreeList;
                callback(gachaData, areaFreeList);
            } else {
                this.initAreaFreeData(areaFreeLis => {
                    callback(null, areaFreeLis);
                });
            }
        });
    }

    checkIsOverValid(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                callback(gachaData.isAllOver && gachaData.isAllOver !== 0);
            } else {
                //console.warn("[gachaController][checkIsOverValid] data is wrong: ", this.uuid_, res);
                callback(false);
            }
        });
    }

    checkGachaDataIsAllOver (callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var isAllOver = 1;
            if (gachaData) {
                isAllOver = gachaData.isAllOver;
            }
            callback(isAllOver);
        });
    }

    updateGachaDataAllOver (isAllOver, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                gachaData.isAllOver = isAllOver;
                this.saveGachaDataToDataSource (gachaData, () => {
                    callback(isAllOver);
                });
            } else {
                console.warn("[gachaController][updateGachaDataAllOver] data is wrong: ", this.uuid_);
                callback(isAllOver);
            }
        });
    }

    doBonusHeroSkin(items, upSkinLis, playerItemLis, playerSkinHeroMap, skinItemLis)
    {
        // ??????????????????????????????????????????????????????????????????
        // ????????????????????????????????????????????????????????????
        function checkSkinItemId(plrItemLis, skinItemId) {
            for (let i in plrItemLis) {
                if (plrItemLis[i].id === skinItemId) {
                    // ??????????????????
                    return true;
                }
            }
            return false;
        }

        function isSkinUnlock(skins, skinId)
        {
            for (let i in skins) {
                if (skins[i].id === skinId) {
                    return true;
                }
            }
            return false;
        }

        if (skinItemLis.length > 0) {

            // ???????????????????????????
            var skinItemData = fixedController.Items.getItemSkinConfig(skinItemLis[0].id);
            if (skinItemData) {
                var aHeroSkin = null, skinType = null;

                if (checkSkinItemId(playerItemLis, skinItemData.skinItemId)) {
                    // ?????????????????????????????????????????????????????????????????????????????????
                    items.push({ id: skinItemData.skinPieceId, count: skinItemLis[0].count });

                    skinType = 3; // ??????
                } else {
                    // ????????????????????????
                    var heroSkins = playerSkinHeroMap.get(skinItemData.heroId); // ????????? + ?????????
                    if (heroSkins) {
                        // ???????????????????????????????????????
                        if (isSkinUnlock(heroSkins, skinItemData.skinId)) {
                            // ??????????????????????????????????????????????????????
                            items.push({ id: skinItemData.skinPieceId, count: skinItemLis[0].count });

                            skinType = 3; // ??????
                        } else {
                            // ?????????????????????????????????
                            var myskins = { id: skinItemData.skinId, new: 1, st: new Date().getTime() };
                            heroSkins.push(myskins);

                            aHeroSkin = { hid: skinItemData.heroId, skins: heroSkins };
                            upSkinLis.push(aHeroSkin);

                            skinType = 1; // ??????
                        }
                    } else {
                        // ?????????????????????????????????????????????
                        if (checkSkinItemId(playerItemLis, skinItemData.skinItemId)) {
                            // ???????????????????????????????????????????????????????????????
                            items.push({ id: skinItemData.skinPieceId, count: skinItemLis[0].count });

                            skinType = 3; // ??????
                        } else {
                            // ???????????????????????????
                            items.push(skinItemLis[0]);

                            skinType = 2; // ????????????
                        }
                    }
                }

                return {
                    items: items,
                    upSkinLis: upSkinLis,
                    skins: aHeroSkin,
                    skinType: skinType
                }
            } else {
                return {
                    items: items,
                    upSkinLis: upSkinLis,
                    skins: null,
                    skinType: null
                }
            }
        } else {
            return {
                items: items,
                upSkinLis: upSkinLis,
                skins: null,
                skinType: null
            }
        }
    }

    /**
     * isGuideGachaFirst - ????????????????????????????????????
     * @param {Object} mapInfo
     * @param {Number} seekpoint
     */
    isGuideGachaFirst(mapInfo, seekpoint)
    {
        var count = 0;
        for (let i in mapInfo) {
            if (mapInfo[i].seekpoint == seekpoint && mapInfo[i].isOpen == 0) {
                // ??????????????????
                ++count;
            }
        }

        return (count==0); // ?????????????????????
    }

    doGuideFirstGacha(playerPtr, mapInfo, callback)
    {
        playerPtr.getGachaFirstFlag(singleFirstFlag => {
            if (singleFirstFlag == 0) {
                // ??????????????????????????????????????????
                // ??????????????????(seekpoint==2)???????????????????????????????????????
                // ????????????????????????????????????type?????????????????????????????????????????????????????????????????????????????????????????????
                for (let i in mapInfo) {
                    if (mapInfo[i].seekpoint == 2) {
                        if (mapInfo[i].type == gamedata.GACHA.GachaEventType.Hero) {
                            // ???????????????????????????????????????
                            for (let j in mapInfo) {
                                if (mapInfo[j].type != gamedata.GACHA.GachaEventType.Hero && mapInfo[j].seekpoint != 2) {
                                    [mapInfo[i], mapInfo[j]] = [mapInfo[j], mapInfo[i]];
                                    [mapInfo[i].gridPos, mapInfo[j].gridPos] = [mapInfo[j].gridPos, mapInfo[i].gridPos];
                                    [mapInfo[i].seekpoint, mapInfo[j].seekpoint] = [mapInfo[j].seekpoint, mapInfo[i].seekpoint];
                                    break;
                                }
                            }
                        }
                    } else {
                        mapInfo[i].isOpen = 1; // ????????????????????????
                        mapInfo[i].type = 0;
                        mapInfo[i].awardRes.baseAwardId = 0;
                        mapInfo[i].awardRes.eventId = 0;
                        mapInfo[i].awardRes.awardId = 0;
                    }
                }

                // ????????????????????????????????????
                playerPtr.setGachaFirstFlag(1, () => {
                    callback(mapInfo);
                });
            } else {
                callback(mapInfo);
            }
        });
    }

    /**
     * getGachaData - ????????????????????????
     * @param {*} areaId ??????ID
     * @param {*} exceptHeroId ????????????ID??????????????????ID???
     * @param {*} callback
     */
    getGachaData(playerPtr, clsHero, areaId, exceptHeroId, gachaType, callback, refresh=false)
    {
        this.getGachaDataFromDataSource (res => {
            if (res) {
                // ?????????????????????
                /*
                let isOpenAll = true;
                for (let i = 0; i < res.mapInfo.length; i++) {
                    if (res.mapInfo[i].isOpen === 0) {
                        isOpenAll = false;
                        break;
                    }
                }*/

                if (refresh || res.isAllOver === 1) {
                    // ??????????????????
                    this.createMapInfo(areaId, exceptHeroId, mapInfo => {
                        // ??????????????????ID??????????????????????????????????????????????????????????????????
                        fixedController.HeroGachaAreas.getRandomHeroId(areaId, exceptHeroId, async heroId => {
                            let gachaModel = models.HeroGachaModel();
                            delete gachaModel.uuid;
                            gachaModel.awardHeroId  = heroId;
                            gachaModel.buyCount     = 0;
                            gachaModel.prCount      = 0;
                            gachaModel.gachaCount   = gamedata.GACHA.GachaCountDefault;
                            gachaModel.areaId       = areaId;
                            gachaModel.playHeroId   = exceptHeroId;
                            gachaModel.mapInfo      = mapInfo;
                            gachaModel.isAllOver    = 0;
                            gachaModel.gachaType    = gachaType;

                            if (gachaType === 1) {
                                let skillEffectData = await skillController.calcHeroActiveSkillEffects(clsHero, skillController.EFFECTSYS().GACHA, exceptHeroId, null);
                                if (skillEffectData.effBuffData != null) {
                                    let addSingleCnt = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().ADDSINGLEGACHACNT];
                                    if (addSingleCnt != null && addSingleCnt.value != null) {
                                        gachaModel.gachaCount += addSingleCnt.value;
                                        gachaModel.effSkillList = skillEffectData.effSkillList;
                                        console.log("----skill active log .. add gacha count", exceptHeroId, addSingleCnt.value)
                                    }
                                }
                            }

                            if (res.areaFreeList) {
                                gachaModel.areaFreeList = res.areaFreeList;
                                this.saveGachaDataToDataSource (gachaModel, () => {
                                    gachaModel.mapInfo = mapInfo;
                                    callback(gachaModel);
                                });
                            } else {
                                this.initAreaFreeData(areaFreeLis => {
                                    gachaModel.areaFreeList = areaFreeLis;
                                    this.saveGachaDataToDataSource (gachaModel, () => {
                                        gachaModel.mapInfo = mapInfo;
                                        callback(gachaModel);
                                    });
                                });
                            }
                        });
                    }, playerPtr);
                } else {
                    callback(res);
                }
            } else {
                // ??????????????????
                // ??????????????????
                this.createMapInfo(areaId, exceptHeroId, mapInfo => {
                    // ??????????????????ID??????????????????????????????????????????????????????????????????
                    fixedController.HeroGachaAreas.getRandomHeroId(areaId, exceptHeroId, async heroId => {
                        let gachaModel = models.HeroGachaModel();
                        gachaModel.uuid         = this.uuid_;
                        gachaModel.awardHeroId  = heroId;
                        gachaModel.areaId       = areaId;
                        gachaModel.gachaCount   = gamedata.GACHA.GachaCountDefault;
                        gachaModel.playHeroId   = exceptHeroId;
                        gachaModel.mapInfo      = mapInfo;
                        gachaModel.isAllOver    = 0;
                        gachaModel.gachaType    = gachaType;

                        if (gachaType === 1) {
                            let skillEffectData = await skillController.calcHeroActiveSkillEffects(clsHero, skillController.EFFECTSYS().GACHA, exceptHeroId, null);
                            if (skillEffectData.effBuffData != null) {
                                let addSingleCnt = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().ADDSINGLEGACHACNT];
                                if (addSingleCnt != null && addSingleCnt.value != null) {
                                    gachaModel.gachaCount += addSingleCnt.value;
                                    gachaModel.effSkillList = skillEffectData.effSkillList;
                                    console.log("----skill active log .. add gacha count", exceptHeroId, addSingleCnt.value)
                                }
                            }
                        }

                        this.initAreaFreeData(areaFreeLis => {
                            gachaModel.areaFreeList = areaFreeLis;
                            this.saveGachaDataToDataSource (gachaModel, () => {
                                gachaModel.mapInfo = mapInfo;
                                callback(gachaModel);
                            });
                        });
                    });
                }, playerPtr);
            }
        });
    }

    getAwardHeroId(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                callback(gachaData.awardHeroId ? gachaData.awardHeroId : 0);
            } else {
                console.warn("[gachaController][setAwardHeroId] data is wrong: ", this.uuid_, res);
                callback(0);
            }
        });
    }

    setAwardHeroId(heroId, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                gachaData.awardHeroId = heroId;
                this.multiController.push(1,this.tblname_ + ":" + this.uuid_,JSON.stringify(gachaData))
                callback();
            } else {
                console.warn("[gachaController][setAwardHeroId] data is wrong: ", this.uuid_, res);
                callback(0);
            }
        });
    }

    getTargetHeroSkillPointItem (itemList, hid)
    {
        for (let i in itemList) {
            if (itemList[i].value == hid) {
                return itemList[i].itemId;
            }
        }
        return 0;
    }

    // =======================================================

    doGachaMultiBonus(player, heroPtr, areaId, gachaData, callback)
    {
        /*
        function firstViewMohun(firstFlag, playerPtr, heroId, callback) {
            if (firstFlag) { // ??????
                playerPtr.setViewMohun(heroId, newViewMohun => {
                    callback(newViewMohun);
                });
            } else {
                callback(null);
            }
        }*/

        var setData = (data, callback) => {
            this.getGachaDataFromDataSource (gachaData => {
                if (gachaData) {
                    if (data.mapInfo) gachaData.mapInfo = data.mapInfo;
                    gachaData.gachaCount = 0;
                    //gachaData.isAllOver = 1;
                    this.saveGachaDataToDataSource (gachaData, () => {
                        callback();
                    });
                } else {
                    console.warn("[gachaController][doGachaMultiBonus] data is wrong: ", this.uuid_, res);
                    callback();
                }
            });
        }

        let hero = heroPtr;// new heroController(this.uuid_);
        //let player = new playerController (this.uuid_);
        var isFirst = false;
        player.getAlreadyGachaStatus (isAlreadyGacha => {
            player.getItemList(playerItemLis => {
                hero.getSkinHeroMap(skinHeroMap => {
                    this.getAwardHeroId(awardHeroId => {
                        //fixedController.HeroGachaAreas.getEventWeightConfig(areaId, areaConfig => {
                            fixedController.HeroLevelUpTermAndBonus.getHeroAttrConfig(1, heroAttrMap => {
                                Defaults.getDefaultValueConfig(Defaults.DEFAULTS_VALS().HEROEXCHANGE2SKILLPOINT, exchangePoint => {
                                    hero.heroCheckList(heroCheckList => {
                                        player.getEnterMohun(nowEnterMohun => {
                                            player.getMultiGachaFirstFlag(multiGachaFirstFlag => {
                                                fixedController.Items.getObjItemAboutHeroPieceConfig(ObjItemConfig => {
                                                    // ??????????????????
                                                    // ??????Hero??????????????????
                                                    var gachaCount = 0, items = [], heros = [], currency = [0,0,0], upSkinLis = [];
                                                    fixedController.GeneralAwards.getAwardAll(awardMap => {
                                                        for (let i = 0; i < gachaData.mapInfo.length; i++) {
                                                            if (gachaData.mapInfo[i].type == gamedata.GACHA.GachaEventType.Hero) {
                                                                var extraAwardHeroId = gachaData.mapInfo[i].awardRes.awardId
                                                                if (!isAlreadyGacha) {
                                                                    extraAwardHeroId = gamedata.GACHA.GachaFirstMohunId;
                                                                    isFirst = true;
                                                                    isAlreadyGacha = true;
                                                                }

                                                                /*if (multiGachaFirstFlag == 0) {
                                                                    // ???????????????
                                                                    // ??????/???????????????????????????, ??????/???????????????????????????
                                                                    if (nowEnterMohun == 310012 || nowEnterMohun == 310006) {
                                                                        extraAwardHeroId = 310021;
                                                                    } else if (nowEnterMohun == 310004 || nowEnterMohun == 310007) {
                                                                        extraAwardHeroId = 310026;
                                                                    }
                                                                }*/

                                                                if (!heroCheckList[extraAwardHeroId]) {
                                                                    // ????????????
                                                                    var heroModel = models.HeroModel(extraAwardHeroId);
                                                                    heroModel.hid = extraAwardHeroId;
                                                                    if (heroAttrMap.get(heroModel.hid))
                                                                        heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                    heros.push(heroModel);
                                                                    heroCheckList[extraAwardHeroId] = true;
                                                                    //gachaData.mapInfo[i].heroData = heroModel; // ????????????????????????????????????
                                                                    gachaData.mapInfo[i].awardRes.awardId = heroModel.hid;

                                                                    gachaData.mapInfo[i].bonusRes = {};
                                                                    gachaData.mapInfo[i].bonusRes.heros = heroModel;
                                                                } else {
                                                                    // ?????????
                                                                    gachaData.mapInfo[i].awardRes.spId = extraAwardHeroId;
                                                                    if (ObjItemConfig[extraAwardHeroId]) {
                                                                        items.push({ id: ObjItemConfig[extraAwardHeroId], count: exchangePoint });
                                                                        gachaData.mapInfo[i].bonusRes = {};
                                                                        gachaData.mapInfo[i].bonusRes.items = [{ id: ObjItemConfig[extraAwardHeroId], count: exchangePoint }];
                                                                    }
                                                                }
                                                            }else if (gachaData.mapInfo[i].type === gamedata.GACHA.GachaEventType.Empty) {
                                                                // ?????????
                                                                if (awardHeroId > 0) {
                                                                    // ?????????????????????????????????
                                                                    if (!isAlreadyGacha) {
                                                                        awardHeroId = gamedata.GACHA.GachaFirstMohunId;
                                                                        isFirst = true;
                                                                        isAlreadyGacha = true;
                                                                    }

                                                                    /*if (multiGachaFirstFlag == 0) {
                                                                        // ???????????????
                                                                        // ??????/???????????????????????????, ??????/???????????????????????????
                                                                        if (nowEnterMohun == 310012 || nowEnterMohun == 310006) {
                                                                            awardHeroId = 310021;
                                                                        } else if (nowEnterMohun == 310004 || nowEnterMohun == 310007) {
                                                                            awardHeroId = 310026;
                                                                        }
                                                                    }*/

                                                                    if (!heroCheckList[awardHeroId]) {
                                                                        var heroModel = models.HeroModel(awardHeroId);
                                                                        heroModel.hid = awardHeroId;
                                                                        if (heroAttrMap.get(heroModel.hid))
                                                                            heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                        heros.push(heroModel);
                                                                        heroCheckList[awardHeroId] = true;
                                                                        //gachaData.mapInfo[i].heroData = heroModel; // ???????????????????????????????????????
                                                                        gachaData.mapInfo[i].awardRes.awardId = heroModel.hid;

                                                                        gachaData.mapInfo[i].bonusRes = {};
                                                                        gachaData.mapInfo[i].bonusRes.heros = heroModel;
                                                                    } else {
                                                                        // ?????????
                                                                        gachaData.mapInfo[i].awardRes.spId = awardHeroId;
                                                                        if (ObjItemConfig[awardHeroId]) {
                                                                            items.push({ id: ObjItemConfig[awardHeroId], count: exchangePoint });
                                                                            gachaData.mapInfo[i].bonusRes = {};
                                                                            gachaData.mapInfo[i].bonusRes.items = [{ id: ObjItemConfig[awardHeroId], count: exchangePoint }];
                                                                        }
                                                                    }
                                                                    awardHeroId = 0;
                                                                } else {
                                                                    if (gachaData.mapInfo[i].awardRes.awardId > 0) {
                                                                        // ???????????????
                                                                        var bonus = awardMap.get(gachaData.mapInfo[i].awardRes.awardId);
                                                                        if (bonus) {
                                                                            var newHero = null;

                                                                            gachaCount += bonus.gachaCount;
                                                                            //items = items.concat(bonus.items);
                                                                            // hero???????????????model????????????????????????
                                                                            if (bonus.heros.length > 0) {
                                                                                let awardHeroId = bonus.heros[0].hid;
                                                                                if (!isAlreadyGacha) {
                                                                                    awardHeroId = gamedata.GACHA.GachaFirstMohunId;
                                                                                    isFirst = true;
                                                                                    isAlreadyGacha = true;
                                                                                }

                                                                                if (!heroCheckList[awardHeroId]) {
                                                                                    // ????????????
                                                                                    var heroModel = models.HeroModel(awardHeroId);
                                                                                    heroModel.hid = awardHeroId;
                                                                                    if (heroAttrMap.get(heroModel.hid))
                                                                                        heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                                    heros.push(heroModel);
                                                                                    // =============================
                                                                                    newHero = heroModel;
                                                                                    skinHeroMap.set(heroModel.hid, heroModel.skins);
                                                                                    // =============================
                                                                                    heroCheckList[awardHeroId] = true;
                                                                                    gachaData.mapInfo[i].heroData = heroModel; // ????????????????????????????????????
                                                                                    gachaData.mapInfo[i].awardRes.awardId = heroModel.hid;
                                                                                } else {
                                                                                    // ?????????
                                                                                    gachaData.mapInfo[i].awardRes.spId = awardHeroId;
                                                                                    if (ObjItemConfig[awardHeroId]) {
                                                                                        //items.push({ id: ObjItemConfig[awardHeroId], count: exchangePoint });
                                                                                        bonus.items.push({ id: ObjItemConfig[awardHeroId], count: exchangePoint });
                                                                                    }
                                                                                }
                                                                            }
                                                                            for (let k = 0; k < currency.length; k++)
                                                                                currency[k] += bonus.currency[k];

                                                                            // =====================================================================================
                                                                            // TO DO: ??????bonusRes { items, currency, heros, skins}
                                                                            gachaData.mapInfo[i].bonusRes = {};
                                                                            if (bonus.currency[0] > 0 || bonus.currency[1] > 0 || bonus.currency[2] > 0)
                                                                                gachaData.mapInfo[i].bonusRes.currency = bonus.currency;
                                                                            var tmps = this.doBonusHeroSkin(bonus.items, upSkinLis, playerItemLis, skinHeroMap, bonus.skinitems);

                                                                            if (tmps.skinType) {
                                                                                gachaData.mapInfo[i].awardRes.skinType = tmps.skinType;
                                                                            }

                                                                            if (tmps.items.length > 0) {
                                                                                gachaData.mapInfo[i].bonusRes.items = tmps.items;
                                                                                items = items.concat(tmps.items);
                                                                            }
                                                                            if (tmps.skins) gachaData.mapInfo[i].bonusRes.skins = tmps.skins;
                                                                            upSkinLis = tmps.upSkinLis;
                                                                            if (newHero) {
                                                                                for (let i in upSkinLis) {
                                                                                    if (upSkinLis[i].hid === newHero.hid) {
                                                                                        for (let j in heros) {
                                                                                            if (heros[j].hid === newHero.hid) {
                                                                                                heros[j].skins = upSkinLis[i].skins;
                                                                                                newHero.skins = upSkinLis[i].skins;
                                                                                                break;
                                                                                            }
                                                                                        }

                                                                                        upSkinLis.splice(i, 1);
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                if (JSON.stringify(newHero) !== '{}')
                                                                                    gachaData.mapInfo[i].bonusRes.heros = newHero;
                                                                            }
                                                                            // =====================================================================================
                                                                        }
                                                                    }
                                                                }
                                                            }else {
                                                                if (gachaData.mapInfo[i].awardRes.awardId > 0) {
                                                                    // ???????????????
                                                                    var bonus = awardMap.get(gachaData.mapInfo[i].awardRes.awardId);
                                                                    if (bonus) {
                                                                        var newHero = {};

                                                                        gachaCount += bonus.gachaCount;
                                                                        //items = items.concat(bonus.items);
                                                                        // hero???????????????model????????????????????????
                                                                        if (bonus.heros.length > 0) {

                                                                            let awardHeroId = bonus.heros[0].hid;
                                                                            if (!isAlreadyGacha) {
                                                                                awardHeroId = gamedata.GACHA.GachaFirstMohunId;
                                                                                isFirst = true;
                                                                                isAlreadyGacha = true;
                                                                            }

                                                                            if (!heroCheckList[awardHeroId]) {
                                                                                // ????????????
                                                                                var heroModel = models.HeroModel(awardHeroId);
                                                                                heroModel.hid = awardHeroId;
                                                                                if (heroAttrMap.get(heroModel.hid))
                                                                                    heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                                heros.push(heroModel);
                                                                                // =============================
                                                                                newHero = heroModel;
                                                                                skinHeroMap.set(heroModel.hid, heroModel.skins);
                                                                                // =============================
                                                                                heroCheckList[awardHeroId] = true;
                                                                                gachaData.mapInfo[i].heroData = heroModel; // ????????????????????????????????????
                                                                                gachaData.mapInfo[i].awardRes.awardId = heroModel.hid;
                                                                            } else {
                                                                                // ?????????
                                                                                gachaData.mapInfo[i].awardRes.spId = awardHeroId;
                                                                                if (ObjItemConfig[awardHeroId]) {
                                                                                    //items.push({ id: ObjItemConfig[awardHeroId], count: exchangePoint });
                                                                                    bonus.items.push({ id: ObjItemConfig[awardHeroId], count: exchangePoint });
                                                                                }
                                                                            }
                                                                        }
                                                                        for (let k = 0; k < currency.length; k++)
                                                                            currency[k] += bonus.currency[k];

                                                                        // =====================================================================================
                                                                        // TO DO: ??????bonusRes { items, currency, heros, skins}
                                                                        gachaData.mapInfo[i].bonusRes = {};
                                                                        if (bonus.currency[0] > 0 || bonus.currency[1] > 0 || bonus.currency[2] > 0)
                                                                            gachaData.mapInfo[i].bonusRes.currency = bonus.currency;
                                                                        var tmps = this.doBonusHeroSkin(bonus.items, upSkinLis, playerItemLis, skinHeroMap, bonus.skinitems);

                                                                        if (tmps.skinType) {
                                                                            gachaData.mapInfo[i].awardRes.skinType = tmps.skinType;
                                                                        }

                                                                        if (tmps.items.length > 0) {
                                                                            gachaData.mapInfo[i].bonusRes.items = tmps.items;
                                                                            items = items.concat(tmps.items);
                                                                        }
                                                                        if (tmps.skins) gachaData.mapInfo[i].bonusRes.skins = tmps.skins;
                                                                        upSkinLis = tmps.upSkinLis;
                                                                        if (newHero) {
                                                                            for (let i in upSkinLis) {
                                                                                if (upSkinLis[i].hid === newHero.hid) {
                                                                                    for (let j in heros) {
                                                                                        if (heros[j].hid === newHero.hid) {
                                                                                            heros[j].skins = upSkinLis[i].skins;
                                                                                            newHero.skins = upSkinLis[i].skins;
                                                                                            break;
                                                                                        }
                                                                                    }

                                                                                    upSkinLis.splice(i, 1);
                                                                                    break;
                                                                                }
                                                                            }

                                                                            if (JSON.stringify(newHero) !== '{}')
                                                                                gachaData.mapInfo[i].bonusRes.heros = newHero;
                                                                        }
                                                                        // =====================================================================================
                                                                    }
                                                                }
                                                            }
                                                            gachaData.mapInfo[i].isOpen = 1;
                                                        }

                                                        function multiFirstFlagSetting(plrPtr, flag, fn) {
                                                            if (flag == 0) {
                                                                plrPtr.setMultiGachaFirstFlag(1, fn);
                                                            } else {
                                                                fn();
                                                            }
                                                        }

                                                        multiFirstFlagSetting(player, multiGachaFirstFlag, () => {
                                                            player.setAlreadyGachaStatus (isAlreadyGacha, _ => {
                                                                hero.setUpSkinHeroGroup(upSkinLis, () => {
                                                                    setData(gachaData, () => {
                                                                    //GameDB.updateOne(this.tblname_, {$set:{mapInfo: gachaData.mapInfo, gachaCount: 0}}, {uuid: this.uuid_}, _ => {
                                                                        //firstViewMohun(isFirst, player, gamedata.GACHA.GachaFirstMohunId, viewMohun => {
                                                                            callback({
                                                                                mapInfo: gachaData.mapInfo,
                                                                                gachaCount: gachaCount,
                                                                                items: items,
                                                                                heros: heros,
                                                                                currency: currency
                                                                            }, null);
                                                                        //});
                                                                    },);
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        //});
                    });
                });
            });
        });
    }

    doGachaSingleBonus(playerPtr, heroPtr, gridPos, callback)
    {
        const getData = (callback) => {
            this.getGachaDataFromDataSource (gachaData => {
                callback(gachaData);
            });
        }

        const setData = (data, callback) => {
            this.getGachaDataFromDataSource (gachaData => {
                if (gachaData) {
                    gachaData.prCount = data.prCount;
                    gachaData.gachaCount = data.gachaCount;
                    gachaData.awardHeroId = data.awardHeroId;
                    gachaData.areaId = data.areaId;
                    gachaData.mapInfo = data.mapInfo;

                    this.saveGachaDataToDataSource (gachaData, () => {
                        callback();
                    });
                } else {
                    callback();
                }
            });
        }

        getData(doc => {
            if (doc && doc.gachaCount > 0 && doc.mapInfo) {
                var pos = -1;
                for (let i = 0; i < doc.mapInfo.length; i++) {
                    if (doc.mapInfo[i].gridPos === gridPos) {
                        pos = i; // ??????????????????
                        break;
                    }
                }
                if (pos === -1) {
                    callback(-2); // ????????????????????????????????????
                } else if (doc.mapInfo[pos].isOpen === 1) {
                    callback(-3); // ??????????????????
                } else {
                    doc.mapInfo[pos].isOpen = 1; // ????????????
                    doc.gachaCount -= 1; // ????????????
                    playerPtr.getEnterMohun(nowEnterMohun => {
                        //fixedController.HeroGachaAreas.getEventWeightConfig(doc.areaId, areaConfig => {
                        fixedController.HeroLevelUpTermAndBonus.getHeroAttrConfig(1, heroAttrMap => {
                            Defaults.getDefaultValueConfig(Defaults.DEFAULTS_VALS().HEROEXCHANGE2SKILLPOINT, exchangePoint => {
                                fixedController.Items.getObjItemAboutHeroPieceConfig(ObjItemConfig => {
                                    let hero = heroPtr;//new heroController(this.uuid_);
                                    //checkFirstGachaHeroCanAdd(hero, canAddHeroHZZ => {
                                    playerPtr.getItemList(playerItemLis => {
                                        hero.getSkinHeroMap(skinHeroMap => {
                                            hero.heroCheckList(heroCheckList => {
                                                var items = [], heros = [], currency = [0,0,0], upSkinLis = [];
                                                playerPtr.getGachaFirstFlag(singleFirstFlag => {
                                                    fixedController.GeneralAwards.getAwardAll(awardMap => {
                                                        //if (false) {
                                                        if (singleFirstFlag == 1 && this.isGuideGachaFirst(doc.mapInfo, 2)) {
                                                            // ??????????????????????????????????????????,????????????????????????????????????
                                                            // ???????????????????????????????????????

                                                            if (doc.mapInfo[pos].type != gamedata.GACHA.GachaEventType.Hero) {
                                                                // ??????????????????????????????
                                                                for (let k in doc.mapInfo) {
                                                                    // ???????????????????????????????????????????????????????????????
                                                                    if (doc.mapInfo[k].type == gamedata.GACHA.GachaEventType.Hero && doc.mapInfo[k].seekpoint != 2) {
                                                                        // ???????????????????????????
                                                                        // ?????????????????????????????????
                                                                        [doc.mapInfo[pos], doc.mapInfo[k]] = [doc.mapInfo[k], doc.mapInfo[pos]];
                                                                        [doc.mapInfo[pos].gridPos, doc.mapInfo[k].gridPos] = [doc.mapInfo[k].gridPos, doc.mapInfo[pos].gridPos];
                                                                        [doc.mapInfo[pos].seekpoint, doc.mapInfo[k].seekpoint] = [doc.mapInfo[k].seekpoint, doc.mapInfo[pos].seekpoint];
                                                                        // ?????????????????????isOpen ?????????????????????isOpen????????????
                                                                        doc.mapInfo[k].isOpen = 0;
                                                                        doc.mapInfo[pos].isOpen = 1;
                                                                        break;
                                                                    }
                                                                }
                                                            }

                                                            var extraHeroId;
                                                            doc.mapInfo[pos].type = gamedata.GACHA.GachaEventType.Hero;

                                                            // ????????????
                                                            // ??????/???????????????????????????, ??????/???????????????????????????
                                                            if (nowEnterMohun == 310012 || nowEnterMohun == 310006) {
                                                                extraHeroId = doc.mapInfo[pos].awardRes.awardId = 310021;
                                                            } else if (nowEnterMohun == 310004 || nowEnterMohun == 310007) {
                                                                extraHeroId = doc.mapInfo[pos].awardRes.awardId = 310021;
                                                            }

                                                            if (!heroCheckList[extraHeroId]) {
                                                                // ????????????
                                                                var heroModel = models.HeroModel(extraHeroId);
                                                                heroModel.hid = extraHeroId;
                                                                if (heroAttrMap.get(heroModel.hid))
                                                                    heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                heroModel.pursueTreeList = [{nodeId: 1, status: 1 }]; // ???????????????????????????(77 ????????????)
                                                                heros.push(heroModel);
                                                                heroCheckList[extraHeroId] = true;
                                                                doc.mapInfo[pos].awardRes.awardId = extraHeroId;

                                                                doc.mapInfo[pos].bonusRes = {};
                                                                doc.mapInfo[pos].bonusRes.heros = heroModel;
                                                            } else {
                                                                // ?????????
                                                                doc.mapInfo[pos].awardRes.spId = extraHeroId;
                                                                if (ObjItemConfig[extraHeroId]) {
                                                                    items.push({
                                                                        id: ObjItemConfig[extraHeroId],
                                                                        count: exchangePoint
                                                                    });
                                                                    doc.mapInfo[pos].bonusRes = {};
                                                                    doc.mapInfo[pos].bonusRes.items = [{
                                                                        id: ObjItemConfig[extraHeroId],
                                                                        count: exchangePoint
                                                                    }];
                                                                }
                                                            }

                                                            doc.awardHeroId = 0;
                                                            // ????????????????????????
                                                            playerPtr.setGachaFirstFlag(2, () => {
                                                                setData(doc, () => {
                                                                    callback(0, {
                                                                        gridData: doc.mapInfo[pos],
                                                                        gachaCount: doc.gachaCount,
                                                                        items: items,
                                                                        heros: heros,
                                                                        currency: currency
                                                                    });
                                                                });
                                                            });
                                                        } else {
                                                            // ????????????
                                                            if (doc.mapInfo[pos].type == gamedata.GACHA.GachaEventType.Hero) {
                                                                let extraHeroId = doc.mapInfo[pos].awardRes.awardId;
                                                                if (!heroCheckList[extraHeroId]) {
                                                                    // ????????????
                                                                    var heroModel = models.HeroModel(extraHeroId);
                                                                    heroModel.hid = extraHeroId;
                                                                    if (heroAttrMap.get(heroModel.hid))
                                                                        heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                    heros.push(heroModel);
                                                                    heroCheckList[extraHeroId] = true;
                                                                    //doc.mapInfo[pos].heroData = heroModel; // ????????????????????????????????????
                                                                    doc.mapInfo[pos].awardRes.awardId = extraHeroId;

                                                                    doc.mapInfo[pos].bonusRes = {};
                                                                    doc.mapInfo[pos].bonusRes.heros = heroModel;
                                                                } else {
                                                                    // ?????????
                                                                    doc.mapInfo[pos].awardRes.spId = extraHeroId;
                                                                    if (ObjItemConfig[extraHeroId]) {
                                                                        items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                        doc.mapInfo[pos].bonusRes = {};
                                                                        doc.mapInfo[pos].bonusRes.items = [{ id: ObjItemConfig[extraHeroId], count: exchangePoint }];
                                                                    }
                                                                }
                                                                // response
                                                                setData(doc, () => {
                                                                    //GameDB.updateOne(this.tblname_, {$set:doc}, { uuid: this.uuid_ }, _ => {
                                                                    //playerPtr.setGachaFirstFlag(1, () => {
                                                                    callback(0, {
                                                                        gridData: doc.mapInfo[pos],
                                                                        gachaCount: doc.gachaCount,
                                                                        items: items,
                                                                        heros: heros,
                                                                        currency: currency
                                                                    });
                                                                    //});
                                                                });
                                                            }else if (doc.mapInfo[pos].type === gamedata.GACHA.GachaEventType.Empty) {
                                                                // ???????????????????????????
                                                                if (doc.prCount < 25) doc.prCount += 1;
                                                                fixedController.HeroGachaCountPR.triggerCountPR(doc.prCount, ret => {
                                                                    if (ret && doc.awardHeroId > 0) {
                                                                        doc.awardHeroId = doc.awardHeroId;
                                                                        // ?????????????????????
                                                                        if (!heroCheckList[doc.awardHeroId]) {
                                                                            var heroModel = models.HeroModel(doc.awardHeroId);
                                                                            heroModel.hid = doc.awardHeroId;
                                                                            if (heroAttrMap.get(heroModel.hid))
                                                                                heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                            heros.push(heroModel);
                                                                            heroCheckList[doc.awardHeroId] = true;
                                                                            //doc.mapInfo[pos].heroData = heroModel; // ????????????????????????????????????
                                                                            doc.mapInfo[pos].awardRes.awardId = heroModel.hid;

                                                                            doc.mapInfo[pos].bonusRes = {};
                                                                            doc.mapInfo[pos].bonusRes.heros = heroModel;
                                                                        } else {
                                                                            // ?????????
                                                                            let extraHeroId = doc.awardHeroId;
                                                                            doc.mapInfo[pos].awardRes.spId = extraHeroId;
                                                                            if (ObjItemConfig[extraHeroId]) {
                                                                                items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                                doc.mapInfo[pos].bonusRes = {};
                                                                                doc.mapInfo[pos].bonusRes.items = [{ id: ObjItemConfig[extraHeroId], count: exchangePoint }];
                                                                            }
                                                                        }
                                                                        doc.awardHeroId = 0;
                                                                    } else {
                                                                        // ?????????????????? ???????????????
                                                                        var bonus = awardMap.get(doc.mapInfo[pos].awardRes.awardId);
                                                                        if (bonus) {
                                                                            var newHero = {};

                                                                            doc.gachaCount += bonus.gachaCount;
                                                                            //items = items.concat(bonus.items);
                                                                            // hero???????????????model????????????????????????
                                                                            if (bonus.heros.length > 0) {
                                                                                bonus.heros[0].hid = bonus.heros[0].hid;
                                                                                if (!heroCheckList[bonus.heros[0].hid]) {
                                                                                    // ????????????
                                                                                    var heroModel = models.HeroModel(bonus.heros[0].hid);
                                                                                    heroModel.hid = bonus.heros[0].hid;
                                                                                    if (heroAttrMap.get(heroModel.hid))
                                                                                        heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                                    heros.push(heroModel);
                                                                                    // =============================
                                                                                    newHero = heroModel;
                                                                                    skinHeroMap.set(heroModel.hid, heroModel.skins);
                                                                                    // =============================
                                                                                    heroCheckList[bonus.heros[0].hid] = true;
                                                                                    doc.mapInfo[pos].heroData = heroModel; // ????????????????????????????????????
                                                                                    doc.mapInfo[pos].awardRes.awardId = heroModel.hid;
                                                                                } else {
                                                                                    // ?????????
                                                                                    let extraHeroId = bonus.heros[0].hid;
                                                                                    doc.mapInfo[pos].awardRes.spId = extraHeroId;
                                                                                    if (ObjItemConfig[extraHeroId]) {
                                                                                        //items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                                        bonus.items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                                    }
                                                                                }
                                                                            }
                                                                            for (let k = 0; k < currency.length; k++)
                                                                                currency[k] += bonus.currency[k];

                                                                            // =====================================================================================
                                                                            // TO DO: ??????bonusRes { items, currency, heros, skins}
                                                                            doc.mapInfo[pos].bonusRes = {};
                                                                            if (bonus.currency[0] > 0 || bonus.currency[1] > 0 || bonus.currency[2] > 0)
                                                                                doc.mapInfo[pos].bonusRes.currency = bonus.currency;
                                                                            var tmps = this.doBonusHeroSkin(bonus.items, upSkinLis, playerItemLis, skinHeroMap, bonus.skinitems);

                                                                            if (tmps.skinType) {
                                                                                doc.mapInfo[pos].awardRes.skinType = tmps.skinType;
                                                                            }

                                                                            //console.log("======================>", JSON.stringify(tmps));
                                                                            if (tmps.items.length > 0) {
                                                                                doc.mapInfo[pos].bonusRes.items = tmps.items;
                                                                                items = items.concat(tmps.items);
                                                                            }
                                                                            if (tmps.skins) doc.mapInfo[pos].bonusRes.skins = tmps.skins;
                                                                            upSkinLis = tmps.upSkinLis;
                                                                            if (newHero) {
                                                                                for (let i in upSkinLis) {
                                                                                    if (upSkinLis[i].hid === newHero.hid) {
                                                                                        for (let j in heros) {
                                                                                            if (heros[j].hid === newHero.hid) {
                                                                                                heros[j].skins = upSkinLis[i].skins;
                                                                                                newHero.skins = upSkinLis[i].skins;
                                                                                                break;
                                                                                            }
                                                                                        }

                                                                                        upSkinLis.splice(i, 1);
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                if (JSON.stringify(newHero) !== '{}')
                                                                                    doc.mapInfo[pos].bonusRes.heros = newHero;
                                                                            }
                                                                            // =====================================================================================
                                                                        }
                                                                    }
                                                                    // response
                                                                    setData(doc, () => {
                                                                        //GameDB.updateOne(this.tblname_, {$set:doc}, { uuid: this.uuid_ }, _ => {
                                                                        hero.setUpSkinHeroGroup(upSkinLis, () => {
                                                                            //playerPtr.setGachaFirstFlag(1, () => {
                                                                            callback(0, {
                                                                                gridData: doc.mapInfo[pos],
                                                                                gachaCount: doc.gachaCount,
                                                                                items: items,
                                                                                heros: heros,
                                                                                currency: currency
                                                                            });
                                                                            //});
                                                                        });
                                                                    });
                                                                });
                                                            }else  {
                                                                // ????????????????????????awardId???????????????
                                                                var bonus = awardMap.get(doc.mapInfo[pos].awardRes.awardId);
                                                                if (bonus) {
                                                                    var newHero = {};

                                                                    doc.gachaCount += bonus.gachaCount;
                                                                    //items = items.concat(bonus.items);

                                                                    // hero???????????????model????????????????????????
                                                                    if (bonus.heros.length > 0) {
                                                                        bonus.heros[0].hid = bonus.heros[0].hid;
                                                                        if (!heroCheckList[bonus.heros[0].hid]) {
                                                                            // ????????????
                                                                            var heroModel = models.HeroModel(bonus.heros[0].hid);
                                                                            heroModel.hid = bonus.heros[0].hid;
                                                                            if (heroAttrMap.get(heroModel.hid))
                                                                                heroModel.attrs = heroAttrMap.get(heroModel.hid);
                                                                            heros.push(heroModel);
                                                                            // =============================
                                                                            newHero = heroModel;
                                                                            skinHeroMap.set(heroModel.hid, heroModel.skins);
                                                                            // =============================
                                                                            heroCheckList[bonus.heros[0].hid] = true;
                                                                            //doc.mapInfo[pos].heroData = heroModel; // ????????????????????????????????????
                                                                            doc.mapInfo[pos].awardRes.awardId = heroModel.hid;

                                                                            doc.mapInfo[pos].bonusRes = {};
                                                                            doc.mapInfo[pos].bonusRes.heros = heroModel;
                                                                        } else {
                                                                            // ?????????
                                                                            let extraHeroId = bonus.heros[0].hid;
                                                                            doc.mapInfo[pos].awardRes.spId = extraHeroId;
                                                                            if (ObjItemConfig[extraHeroId]) {
                                                                                //items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                                bonus.items.push({ id: ObjItemConfig[extraHeroId], count: exchangePoint });
                                                                            }
                                                                        }
                                                                    }
                                                                    for (let k = 0; k < currency.length; k++)
                                                                        currency[k] += bonus.currency[k];

                                                                    // =====================================================================================
                                                                    // TO DO: ??????bonusRes { items, currency, heros, skins}
                                                                    doc.mapInfo[pos].bonusRes = {};
                                                                    if (bonus.currency[0] > 0 || bonus.currency[1] > 0 || bonus.currency[2] > 0)
                                                                        doc.mapInfo[pos].bonusRes.currency = bonus.currency;
                                                                    var tmps = this.doBonusHeroSkin(bonus.items, upSkinLis, playerItemLis, skinHeroMap, bonus.skinitems);

                                                                    if (tmps.skinType) {
                                                                        doc.mapInfo[pos].awardRes.skinType = tmps.skinType;
                                                                    }

                                                                    //console.log("======================>", JSON.stringify(tmps));
                                                                    if (tmps.items.length > 0) {
                                                                        doc.mapInfo[pos].bonusRes.items = tmps.items;
                                                                        items = items.concat(tmps.items);
                                                                    }
                                                                    if (tmps.skins) doc.mapInfo[pos].bonusRes.skins = tmps.skins;
                                                                    upSkinLis = tmps.upSkinLis;
                                                                    if (newHero) {
                                                                        for (let i in upSkinLis) {
                                                                            if (upSkinLis[i].hid === newHero.hid) {
                                                                                for (let j in heros) {
                                                                                    if (heros[j].hid === newHero.hid) {
                                                                                        heros[j].skins = upSkinLis[i].skins;
                                                                                        newHero.skins = upSkinLis[i].skins;
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                upSkinLis.splice(i, 1);
                                                                                break;
                                                                            }
                                                                        }

                                                                        if (JSON.stringify(newHero) !== '{}')
                                                                            doc.mapInfo[pos].bonusRes.heros = newHero;
                                                                    }
                                                                    // =====================================================================================
                                                                }
                                                                // response
                                                                setData(doc, () => {
                                                                    //GameDB.updateOne(this.tblname_, {$set:doc}, { uuid: this.uuid_ }, _ => {
                                                                    hero.setUpSkinHeroGroup(upSkinLis, () => {
                                                                        //playerPtr.setGachaFirstFlag(1, () => {
                                                                        callback(0, {
                                                                            gridData: doc.mapInfo[pos],
                                                                            gachaCount: doc.gachaCount,
                                                                            items: items,
                                                                            heros: heros,
                                                                            currency: currency
                                                                        });
                                                                        //});
                                                                    });
                                                                });
                                                            }
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    });
                                    //});
                                });
                            });
                        });
                        //});
                    });
                }
            } else {
                callback(-1); // ????????????
            }
        });
    }

    getAwardAll(mapInfo, callback)
    {
        let awardGroup = [];
        for (let i = 0; i < mapInfo.length; i++) {
            if (mapInfo[i].awardRes.awardId > 0) {
                awardGroup.push(mapInfo[i].awardRes.awardId);
            }
        }

        fixedController.GeneralAwards.getBonusByGroup(awardGroup, (awardItem, awardCurrency, inAwardHero) => {
            callback(awardItem, awardCurrency, inAwardHero);
        });
    }

    getAwardHero(awardHeroId, callback)
    {
        const setData = (hid, save = false) => {
            this.getGachaDataFromDataSource (gachaData => {
                if (gachaData) {
                    gachaData.awardHeroId = hid;
                    this.saveGachaDataToDataSource (gachaData, ()=> {
                        callback();
                    }, save);
                } else {
                    console.warn("[gachaController][getAwardHero] data wrong: ", this.uuid_, res);
                    callback();
                }
            });
        }

        setData(0, () => {
            let hero = new heroController(this.uuid_, awardHeroId,this.multiController, this.taskController);
            hero.checkHero(heroValid => {
                if (heroValid) {
                    // ??????????????????????????????????????????
                    callback(null);
                } else {
                    // ??????????????????????????????
                    hero.createHero(newHeroData => {
                        callback(newHeroData);
                    });
                }
            });
        });
    }

    // ===============================================

    getGachaCount(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var count = 0;
            if (gachaData) {
                if (gachaData.gachaCount) count = gachaData.gachaCount;
            } else {
                console.warn("[gachaController][getGachaCount] data wrong: ", this.uuid_, res);
            }
            callback(count);
        });
    }

    addGachaCount(count, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                if (!gachaData.gachaCount) gachaData.gachaCount = 0;
                gachaData.gachaCount += count;
                this.saveGachaDataToDataSource (gachaData, ()=> {
                    callback(gachaData.gachaCount);
                });
            } else {
                console.warn("[gachaController][addGachaCount] data wrong: ", this.uuid_, res);
                callback(0);
            }
        });
    }

    costGachaCount(count, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                if (!gachaData.gachaCount) gachaData.gachaCount = 0;
                if (gachaData.gachaCount < count) {
                    console.warn("[gachaController][costGachaCount] gachaCount < count: ", this.uuid_, count);
                    callback(0);
                } else {
                    gachaData.gachaCount -= count;
                    this.saveGachaDataToDataSource (gachaData, ()=> {
                        callback(gachaData.gachaCount);
                    });
                }
            } else {
                console.warn("[gachaController][costGachaCount] data wrong: ", this.uuid_, res);
                callback(0);
            }
        });
    }

    getPRCount(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var prCount = 0;
            if (gachaData) {
                if (gachaData.prCount) prCount = gachaData.prCount;
            } else {
                console.warn("[gachaController][getPRCount] data wrong: ", this.uuid_, res);
            }

            callback(prCount);
        });
    }

    addPRCount(count, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                if (gachaData.prCount) {
                    gachaData.prCount += count;
                } else {
                    gachaData.prCount = count;
                }
                this.saveGachaDataToDataSource (gachaData, ()=> {
                    callback(gachaData.prCount);
                });
            } else {
                console.warn("[gachaController][addPRCount] data is null: ", this.uuid_);
                callback(0);
            }
        });
    }

    getGridData(gridPos, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                if (gachaData.mapInfo[gridPos-1]) {
                    callback(gachaData.mapInfo[gridPos-1]);
                } else {
                    console.warn("[GachaController][getGridData] mapInfo gridData is null: ", this.uuid_, gridPos);
                    callback(null);
                }
            } else {
                console.warn("[GachaController][getGridData] mapInfo is null: ", this.uuid_);
                callback(null)
            }
        });
    }

    setGridData(gridData, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                if (gachaData.mapInfo[gridData.gridPos-1]) {
                    gachaData.mapInfo[gridData.gridPos-1] = gridData;
                    this.saveGachaDataToDataSource (gachaData, ()=> {
                        callback(gachaData);
                    });
                } else {
                    console.warn("[GachaController][setGridData] null: ", this.uuid_, gridData);
                    callback(null);
                }
            } else {
                callback(null);
            }
        });
    }

    getAward(awardId, callback)
    {
        fixedController.GeneralAwards.getAward(awardId, bonusData => {
            callback(bonusData);
        });
    }

    getBaseAward(callback)
    {
        this.getAreaId(areaId => {
            fixedController.HeroGachaAreas.getRandomBaseAwardId(areaId, awardId => {
                fixedController.GeneralAwards.getAward(awardId, bonusData => {
                    callback(awardId, bonusData);
                });
            });
        });
    }

    getAreaId(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var areaId = 0;
            if (gachaData) {
                if (gachaData.areaId) areaId = gachaData.areaId;
            }
            callback(areaId);
        });
    }

    doGachaHeroAward(gridType, callback)
    {
        // ???????????????????????????
        if (gridType === 0) {
            this.getGachaDataFromDataSource (gachaData => {
                var awardHeroId = 0;
                if (gachaData) {
                    if (gachaData.awardHeroId) awardHeroId = gachaData.awardHeroId;
                }

                if (awardHeroId > 0) {
                    this.getPRCount(prCount => {
                        if (prCount < 25) {
                            this.addPRCount(1, newPrCount => {
                                fixedController.HeroGachaCountPR.triggerCountPR(newPrCount, ret => {
                                    if (ret) {
                                        // ???????????????
                                        this.getAwardHero(awardHeroId, heroData => {
                                            callback(heroData);
                                        });
                                    } else {
                                        callback(null);
                                    }
                                });
                            });
                        } else {
                            fixedController.HeroGachaCountPR.triggerCountPR(prCount+1, ret => {
                                if (ret) {
                                    // ???????????????
                                    this.getAwardHero(awardHeroId, heroData => {
                                        callback(heroData);
                                    });
                                } else {
                                    callback(null);
                                }
                            });
                        }
                    });
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    }

    getBuyCount(callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            var count = 1;
            if (gachaData) {
                if (gachaData.buyCount) count = gachaData.buyCount + 1;
            }
            callback(count);
        });
    }

    setBuyCount(count, callback)
    {
        this.getGachaDataFromDataSource (gachaData => {
            if (gachaData) {
                gachaData.buyCount = count;
                this.saveGachaDataToDataSource (gachaData, ()=> {
                    callback(count);
                })
            } else {
                console.warn("[gachaController][setBuyCount] data is null: ", this.uuid_);
                callback(count);
            }
        });
    }

    // ?????????????????????
    /*
    static checkFirstGachaHeroCanAdd(playerPtr, heroPtr, callback) {
        var HERO_HZZ = 310021;
        heroPtr.checkHeroById(HERO_HZZ, heroValid => {
            if (heroValid) {
                // ?????????????????????????????????
                callback(false);
            } else {
                playerPtr.getGachaFirstFlag(firstGachaFlag => {
                    // ???????????????
                    if (firstGachaFlag === 0) {
                        fixedController.HeroLevelUpTermAndBonus.getHeroAttrConfig(1, heroAttrMap => {
                            var heroModel = models.HeroModel(HERO_HZZ);
                            heroModel.hid = HERO_HZZ;
                            var attrsDefault = heroAttrMap.get(heroModel.hid);
                            if (attrsDefault) heroModel.attrs = attrsDefault;
                        });
                    } else {
                        callback(false);
                    }
                });
            }
        });
    }*/
}

module.exports = GachaController;
