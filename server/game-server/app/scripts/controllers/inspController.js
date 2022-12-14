const InspirationEvent = require('./fixedController').InspirationEvent;
const InspirationTheme = require('./fixedController').InspirationTheme;
const GeneralAwards = require('./fixedController').GeneralAwards;
const heroController = require('./heroController');
const Notification = require('./notifController').Notification;
const playerController = require('./playerController');
const skillController = require('./../controllers/skillController');
const models = require('./../models');
const utils = require('./../../common/utils');
const _ = require('lodash')
const INSP_COUNT_MAX = 4;
const INSP_COUNT_UPTIME = 6*60*60*1000; // 6 hour
const INSP_AP = 1500

const SOME_DICE_ITEMID = 440004;
const DOUBLE_DICE_ITEMID = 440005;

const validator = require('validator');
const GameRedisHelper = require('./../../../index.app').GameRedisHelper;
const CONSTANTS = require('./../../common/constants');
function getWalkNode(mapNode)
{
    return {
        gridPos: mapNode.gridPos,
        eventId: mapNode.eventId,
        triggerStat: mapNode.triggerStat,
        status: mapNode.status,
        awardData: mapNode.awardData
    }
}

function getTotalAwardData(totalAwardData, awardData)
{
    totalAwardData.baselingg += awardData.baselingg;
    totalAwardData.lingg += awardData.lingg;
    totalAwardData.emotion += awardData.emotion;
    totalAwardData.ap += awardData.ap;
    totalAwardData.items = totalAwardData.items.concat(awardData.items);
    for (let i in totalAwardData.currency)
        totalAwardData.currency[i] += awardData.currency[i] ;

    return totalAwardData;
}

function doAction(awardMapCfg, extBuff, currPos, walkCount, EvData, themeId, heroId)
{
    function setBuffLis(eBuff, buffType, buffValue)
    {
        if ('object' === typeof eBuff.lis) {
            var isFind = false;
            for (let i in eBuff.lis) {
                if (eBuff.lis[i].type  === buffType) {
                    eBuff.lis[i].value += buffValue;
                    isFind = true;
                    break;
                }
            }

            if (!isFind) {
                eBuff.lis.push({ type: buffType, value: buffValue });
            }
        } else {
            eBuff.lis = [{ type: buffType, value: buffValue }];
        }
    }

    function getCovertEventData(evData, tid, hid) {
        // ?????????????????????????????????????????????
        var newEvData = InspirationEvent.getThemeEventDataConfig(tid, evData.eventId, hid);
        return (newEvData ? newEvData : evData);
    }

    var awardData = models.InspAwardModel();
    var awardId_ = 0;
    var addGrid_ = 0;
    var addBaseLingg_ = 0;
    var castAp_ = 0;

    var eventData = getCovertEventData(EvData, themeId, heroId);

    if (eventData.type === 1) { // ????????????
        awardData.ap = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
    } else if (eventData.type === 2) { // ????????????
        awardData.ap = 0-utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
    } else if (eventData.type === 3) { // ????????????
        awardData.lingg = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
    } else if (eventData.type === 4) { // ??????????????????
        walkCount = 0; // ????????????
    } else if (eventData.type === 5) { // ??????????????????
        var awardId = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        awardId_ = awardId
        var bonusData = awardMapCfg.get(awardId);
        awardData.items = bonusData.items;
    } else if (eventData.type === 6) { // ????????????
        var awardId = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        awardId_ = awardId
        var bonusData = awardMapCfg.get(awardId);
        awardData.currency = bonusData.currency;
    } else if (eventData.type === 7) { // ????????????
        var awardId = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        awardId_ = awardId
        var bonusData = awardMapCfg.get(awardId);
        awardData.currency = bonusData.currency;
    } else if (eventData.type === 8) { // ????????????
        awardData.emotion = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
    } else if (eventData.type === 9) { // ????????????????????????
        var cAp = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        extBuff.ap -= cAp;
        castAp_ = 0 - cAp;

        setBuffLis(extBuff, eventData.type, cAp);

    } else if (eventData.type === 10) { // ????????????
        var diceNum = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        addGrid_ = diceNum;
        walkCount += diceNum; // ??????????????????????????????????????????????????????????????????
    } else if (eventData.type === 11) { // ????????????????????????
        addBaseLingg_ = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        extBuff.lingg += addBaseLingg_;

        setBuffLis(extBuff, eventData.type, addBaseLingg_);

    } else if (eventData.type === 12) { // ????????????????????????
        var cAp = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        extBuff.ap += cAp;
        castAp_ = cAp;

        setBuffLis(extBuff, eventData.type, cAp);

    } else if (eventData.type === 13) { // ????????????
        awardData.emotion -= utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
    } else if (eventData.type === 14) { // ????????????
        var step = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        addGrid_ = 0 - step;
        currPos -= step;
        currPos -= 1; // ?????????1?????????????????????1
        if (currPos < 0) currPos = 0; // ?????????????????????
        walkCount = 1;

    } else if (eventData.type === 15) { // ????????????
        awardData.lingg -= utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];

    }else if(eventData.type === 16){ // ??????buff
        extBuff.eventBuff = eventData.value.split(',')
    } else if (eventData.type === 101) {
        // ???????????????
        var diceCountVal = utils.randomListByWeight(utils.getHashArraySplitTwice(eventData.value, '|', ','), 1)[0];
        if ('number' === typeof extBuff.diceCount) {
            extBuff.diceCount += diceCountVal;
        } else {
            extBuff.diceCount = diceCountVal;
        }
        setBuffLis(extBuff, eventData.type, diceCountVal);
    }

    return {
        castAp: castAp_,
        addBaseLingg: addBaseLingg_,
        addGrid: addGrid_,
        awardId: awardId_,
        extBuff: extBuff,
        currPos: currPos,
        walkCount: walkCount,
        awardData: awardData
    }
}

class inspController
{
    constructor(uuid,multiController, taskController = null)
    {
        this.uuid_ = uuid ? parseInt(uuid) : 0;
        this.tblname_ = 'InspData';
        this.inspData = null;
        this.inspRedisDataString = null;
        this.multiController = multiController;
        this.taskController = taskController;
    }

    errorHandle(){
        this.inspData = null;
        this.inspRedisDataString = null
    }

    costBuff(themeId,buff)
    {
        return new Promise(resolve => {
            if(!buff|| buff.length === 0){
                return resolve(1)
            }
            this.getInspDataFromDataSource(function (data) {
                let inspData = data.inspData.filter(element=>{ return element.themeId == themeId})
                if(inspData.length === 0||!inspData[0].extBuff || !inspData[0].extBuff.eventBuff){return resolve(-1)}
                let eventBuff = inspData[0].extBuff.eventBuff
                if(eventBuff){
                   let buffId = eventBuff[0]
                   let ret = buff.filter((element )=>{ return element.id == buffId})
                    if(ret && ret.length > 0){
                        return resolve(1)
                    }else{
                        return resolve(-1)
                    }
                }else{
                    //???buff
                    return resolve(-1)
                }
            })
        })
    }

    getInspDataFromDataSource (callback) {
        if (this.inspData == null) {
            GameRedisHelper.getHashFieldValue(this.tblname_, this.uuid_, sInspirationData => {
                this.inspRedisDataString = sInspirationData;
                let doc = sInspirationData &&  validator.isJSON(sInspirationData) ? JSON.parse(sInspirationData) : null;
                this.inspData = doc;
                callback (doc);
            });
        }else {
            callback (this.inspData);
        }
    }

    saveInspDataToDataSource (inspData, callback) {
        if (inspData != null) {
            let saveString = JSON.stringify(inspData);
            let shouldSave = false;
            if (this.inspRedisDataString == null || this.inspRedisDataString !== saveString) {
                shouldSave = true;
            }
            if (shouldSave) {
                this.inspData = inspData;
                this.multiController.uniqPush(1,this.tblname_ + ":" + this.uuid_, saveString)
                this.inspRedisDataString = saveString;
                callback(true);
            }else {
                callback (true);
            }
        }else {
            callback (true)
        }
    }

    closeGrid(grid,mapCount)
    {
        if(grid - 1 < 1){
            return [grid,grid +1]
        }
        if(grid + 1 > mapCount){
            return [grid,grid-1]
        }
        return [grid,grid-1,grid +1]
    }

    // =================================================================
    // ????????????
    // =================================================================
    createThemeMapData(themeId, heroId, callback)
    {
        var mapData = [],self = this
        // ??????????????????
        let countConfig =  InspirationTheme.getEventCountConfig(themeId)
        // ????????????
        let persistEventList = InspirationTheme.getTypeEventConfig(themeId, 0, countConfig.persistEventCount)

        // ????????????????????????
        let randEventList   = InspirationTheme.getTypeEventConfig(themeId, 1,  countConfig.randEventCount)

        let merchantEventList = InspirationTheme.getTypeEventConfig(themeId,4,countConfig.merchantEventNum)

        let themeEventList = InspirationTheme.getTypeEventConfig(themeId,2, 1) // ??????????????????????????????

        const [linkEventList,map] = InspirationTheme.getLinkEventConfig(themeId,3,countConfig.linkEventNum)

        // ??????????????????????????????????????????????????????
        for (let i = 0; i < countConfig.mapCount-1; i++) {
            mapData.push(models.InspGridModel());
        }
        // ?????????????????????????????????+???????????????
        var eventList = persistEventList.concat(randEventList);
        // ???????????????????????????+????????????+?????????????????????
        eventList = eventList.concat(merchantEventList)
        eventList = eventList.concat(InspirationTheme.getRandHeroOwnEventListConfig(themeId, heroId,countConfig.heroLinkEventNum));
        const grid_map = {}
        let withOut = []
        // ??????????????????
        linkEventList.map(element =>{
            let link_start_grid = _.random(5,30)
            let link_end_grid = _.random(40,67)
            withOut.push(...self.closeGrid(link_end_grid,countConfig.mapCount),...self.closeGrid(link_start_grid,countConfig.mapCount))
            grid_map[link_start_grid] = element
            grid_map[link_end_grid] = parseInt(map[element])
        })

        let total = _.times(countConfig.mapCount, Number)
        total[0] = countConfig.mapCount
        if (themeEventList.length >= 1) {
            // ??????????????????
            var midPos = Math.floor(countConfig.mapCount / 2) - 1;
            mapData[midPos].eventId = themeEventList[0];
            withOut.push(...self.closeGrid(midPos),countConfig.mapCount)
        }

        //??????
        eventList = _.shuffle(eventList)
        let remainGrid = _.difference(total,withOut)
        let max_step = (remainGrid.length / eventList.length).toFixed(0)
        max_step = Number(max_step)
        const compare = JSON.parse(JSON.stringify(max_step))
        let min_step = 2
        let step = _.random(min_step,max_step)
        let count = 0,stepCount = 0,times = 0,move = 0,eventCount = JSON.parse(JSON.stringify(eventList.length))
        for (let grid of remainGrid){
            count ++
            if(count === step){
                // ??????
                count = 0
                times ++
                step = _.random(min_step,max_step)
                stepCount = step - compare
                if(stepCount < 0){
                    if(max_step < 8){
                        min_step ++
                        max_step ++
                    }
                }
                if(stepCount > 0){
                    if(min_step > 2){
                        min_step --
                        max_step --
                        move --
                    }
                }
                if(times === remainGrid.length ){
                    eventCount--
                    if(eventCount> 0){
                        grid_map[grid - stepCount] = eventList.pop()
                    }else{
                        break
                    }
                }else{
                    eventCount--
                    if(eventCount> 0){
                        grid_map[grid] = eventList.pop()
                    }else{
                        break
                    }
                }
            }
        }

        for (let i = 0; i < mapData.length; i++){
            mapData[i].gridPos = i+1;
            if(grid_map[i+1]){
                mapData[i].eventId = grid_map[i+1]
            }
        }

        // ???????????????????????????????????????
        var lastGridData = models.InspGridModel();
        lastGridData.gridPos = countConfig.mapCount;
        mapData.push(lastGridData);
        callback(mapData);
    }

    getBaseInfo(callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc) {
                callback({inspCount: doc.inspCount,inspCountUpStartTime: doc.inspCountUpStartTime,inspBuyCount: doc.inspBuyCount});
            } else {
                callback({inspCount: 0,inspCountUpStartTime: 0,inspBuyCount: 0});
            }
        });
    }

    getData(clsHero, themeId, playHeroId, callback)
    {
        // ??????????????????????????????????????????????????????
        this.getInspDataFromDataSource (async doc => {
            if (doc) {
                if (themeId > 0) {
                    let pos = -1;
                    for (let i = 0; i < doc.inspData.length; i++) {
                        if (doc.inspData[i].themeId === themeId) {
                            pos = i;
                            break;
                        }
                    }
                    if (pos > -1) {
                        // ????????????????????????
                        if (doc.inspData[pos].mapData.length === 0 ||
                                doc.inspData[pos].currGridPos === doc.inspData[pos].mapData.length) {
                            doc.inspActionPoint = INSP_AP;
                            // ?????????????????????????????????????????????????????????
                            this.createThemeMapData(themeId, playHeroId, async mapData => {
                                doc.inspData[pos].playHeroId = playHeroId;
                                delete doc.inspData[pos].linggTotal;
                                doc.inspData[pos].mapData = mapData; // ???????????????
                                doc.inspData[pos].extBuff = models.InspThemeModel().extBuff;
                                doc.inspData[pos].currGridPos = 0;
                                doc.inspData[pos].addSkillBaselinggan = 0;
                                doc.inspData[pos].freeItemCnt = 0;
                                doc.inspData[pos].freeItemId  = -1;

                                let skillEffectData = await skillController.calcHeroActiveSkillEffects(clsHero, skillController.EFFECTSYS().INSPIRATION, playHeroId, null);
                                if (skillEffectData.effBuffData != null) {
                                    let addBaseLinggan = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().ADDBASELINGGAN];
                                    if (addBaseLinggan != null && addBaseLinggan.value != null) {
                                        doc.inspData[pos].addSkillBaselinggan = addBaseLinggan.value
                                        console.log("---- skill active add base ling gan  ", playHeroId, addBaseLinggan)
                                        doc.inspData[pos].effSkillList = skillEffectData.effSkillList;
                                    }

                                    let freeItemCnt = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().USEITEMFREE];
                                    if (freeItemCnt != null && freeItemCnt.value != null) {
                                        doc.inspData[pos].freeItemId = freeItemCnt.value;
                                        if (freeItemCnt.extra != null) doc.inspData[pos].freeItemCnt = freeItemCnt.extra;
                                        doc.inspData[pos].effSkillList = skillEffectData.effSkillList;
                                    }
                                }

                                this.saveInspDataToDataSource (doc, ()=> {
                                    callback(doc, {mapData: doc.inspData[pos].mapData, currGridPos: doc.inspData[pos].currGridPos,
                                        effSkillList:doc.inspData[pos].effSkillList, freeItemId:doc.inspData[pos].freeItemId, freeItemCnt:doc.inspData[pos].freeItemCnt});
                                });
                            });
                        } else {
                            callback(doc, {mapData: doc.inspData[pos].mapData, currGridPos: doc.inspData[pos].currGridPos,
                                effSkillList:doc.inspData[pos].effSkillList, freeItemId:doc.inspData[pos].freeItemId, freeItemCnt:doc.inspData[pos].freeItemCnt});
                        }
                    } else {
                        // ?????????????????????????????????????????????????????????
                        this.createThemeMapData(themeId, playHeroId, async mapData => {
                            var themeModel = models.InspThemeModel();
                            themeModel.themeId      = themeId;
                            themeModel.playHeroId   = playHeroId;
                            themeModel.mapData      = mapData;
                            themeModel.addSkillBaselinggan = 0;
                            themeModel.freeItemCnt  = 0;
                            themeModel.freeItemId   = -1;

                            let skillEffectData = await skillController.calcHeroActiveSkillEffects(clsHero, skillController.EFFECTSYS().INSPIRATION, playHeroId, null);
                            if (skillEffectData.effBuffData != null) {
                                let addBaseLinggan = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().ADDBASELINGGAN];
                                if (addBaseLinggan != null && addBaseLinggan.value != null) {
                                    themeModel.addSkillBaselinggan = addBaseLinggan.value
                                    console.log("---- skill active add base ling gan  ", playHeroId, addBaseLinggan)
                                }

                                let freeItemCnt = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().USEITEMFREE];
                                if (freeItemCnt != null && freeItemCnt.value != null) {
                                    themeModel.freeItemId = freeItemCnt.value;
                                    if (freeItemCnt.extra != null) themeModel.freeItemCnt = freeItemCnt.extra;
                                }
                            }

                            var isFind = false;
                            for (let i = 0; i < doc.inspData.length; i++) {
                                if (doc.inspData[i].themeId == themeId) {
                                    doc.inspData[i].playHeroId = playHeroId;
                                    delete doc.inspData[i].linggTotal;
                                    doc.inspData[i].mapData = mapData;
                                    isFind = true;
                                    break;
                                }
                            }
                            if (!isFind)
                                doc.inspData.push(themeModel); // {themeId, mapData}

                            this.saveInspDataToDataSource (doc, ()=> {
                                callback(doc, {mapData: mapData, currGridPos: 0, effSkillList:themeModel.effSkillList, freeItemId:themeModel.freeItemId, freeItemCnt:themeModel.freeItemCnt});
                            });
                        });
                    }
                } else {
                    // Call from GameData
                    var themeData = null;
                    for (let i in doc.inspData) {
                        if (doc.inspData[i].mapData.length != doc.inspData[i].currGridPos) {
                            themeData = doc.inspData[i];
                            break;
                        }
                    }
                    callback(doc, {themeData: themeData});
                }
            } else {
                // ????????????
                let inspModel = models.InspModel();
                inspModel.uuid = this.uuid_;
                inspModel.inspBuyCount = 0;
                inspModel.inspCount = INSP_COUNT_MAX; // ?????????????????????
                inspModel.inspActionPoint = INSP_AP;
                inspModel.themeList = InspirationTheme.getOpenWeekThemeListConfig();
                inspModel.inspData = [];

                if (themeId > 0) {
                    this.createThemeMapData(themeId, playHeroId, async mapData => {
                    //this.createThemeData(themeId, playHeroId, themeData => {
                        var themeModel = models.InspThemeModel();
                        themeModel.themeId      = themeId;
                        themeModel.playHeroId   = playHeroId;
                        themeModel.mapData      = mapData;
                        themeModel.addSkillBaselinggan = 0;
                        themeModel.freeItemCnt  = 0;
                        themeModel.freeItemId   = -1;

                        let skillEffectData = await skillController.calcHeroActiveSkillEffects(clsHero, skillController.EFFECTSYS().INSPIRATION, playHeroId, null);
                        if (skillEffectData.effBuffData != null) {
                            let addBaseLinggan = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().ADDBASELINGGAN];
                            if (addBaseLinggan != null && addBaseLinggan.value != null) {
                                themeModel.addSkillBaselinggan = addBaseLinggan.value
                                console.log("---- skill active add base ling gan  ", playHeroId, addBaseLinggan)
                            }

                            let freeItemCnt = skillEffectData.effBuffData[skillController.EFFECTRESULTTYPE().USEITEMFREE];
                            if (freeItemCnt != null && freeItemCnt.value != null) {
                                themeModel.freeItemId = freeItemCnt.value;
                                if (freeItemCnt.extra != null) themeModel.freeItemCnt = freeItemCnt.extra;
                            }
                        }

                        var isFind = false;
                        for (let i = 0; i < inspModel.inspData.length; i++) {
                            if (inspModel.inspData[i].themeId == themeId) {
                                inspModel.inspData[i].playHeroId = playHeroId;
                                delete inspModel.inspData[i].linggTotal;
                                inspModel.inspData[i].mapData = mapData;
                                isFind = true;
                                break;
                            }
                        }
                        if (!isFind)
                            inspModel.inspData.push(themeModel); // {themeId, mapData}

                        this.saveInspDataToDataSource (inspModel, ()=> {
                            callback(inspModel, {mapData: mapData, currGridPos: 0, effSkillList:themeModel.effSkillList, freeItemId:themeModel.freeItemId, freeItemCnt:themeModel.freeItemCnt});
                        });
                    });
                } else {
                    this.saveInspDataToDataSource (inspModel, ()=> {
                        callback(inspModel, {themeData:null});
                    });
                }
            }
        });
    }

    getThemeData(themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            let themeData = null;
            if (doc && doc.inspData) {
                for (let index in doc.inspData) {
                    if (doc.inspData[index].themeId == themeId) {
                        themeData = doc.inspData[index];
                        break;
                    }
                }
            }
            callback(themeData);
        });
    }

    getThemeDataUsingThemeId (themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            let themeData = null;
            if (doc && doc.inspData) {
                for (let index in doc.inspData) {
                    if (doc.inspData[index].themeId == themeId) {
                        themeData = doc.inspData[index];
                        break;
                    }
                }
            }
            callback (doc, themeData);
        });
    }

    async setThemeData(themeId, themeData)
    {
        return new Promise( resolve => {
            this.getInspDataFromDataSource (doc => {
                if (doc && doc.inspData) {
                    for (let index in doc.inspData) {
                        if (doc.inspData[index].themeId == themeId) {
                            doc.inspData[index] = themeData
                            break;
                        }
                    }
                    this.saveInspDataToDataSource (doc, ()=> {
                        resolve(true);
                    });
                }else {
                    resolve(false);
                }
            });
        });
    }

    // =================================================================
    // ?????????
    // =================================================================
    checkPlayHeroValid(themeId, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            callback(themeDatas && inspData && 'number' == typeof inspData.playHeroId ? inspData.playHeroId : 0);
        });
    }

    checkPlayIsOverValid(themeId, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            let isOver = false;
            if (themeDatas && inspData) {
                isOver = (inspData.currGridPos === inspData.mapData.length);
            }
           callback(isOver);
        });
    }

    getExtBuffAp(themeId, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            var extAp = 0;
            if (themeDatas && inspData && inspData.extBuff != null) {
                extAp = inspData.extBuff.ap;
            }
            callback(extAp);
        })
    }

    setGameOver(themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && doc.inspData) {
                for (let i in doc.inspData) {
                    if (doc.inspData[i].themeId === themeId) {
                        // ??????????????????????????????????????????????????????
                        doc.inspData[i].currGridPos = doc.inspData[i].mapData.length;
                        break;
                    }
                }
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            } else {
                callback();
            }
        });
    }

    getAwardAll(themeId, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            var totalAwardData = models.InspAwardModel(), overAwardData = {};
            if (themeDatas && inspData) {
                var themeData = inspData;
                for (let i in themeData.mapData) {
                    if (themeData.mapData[i].awardData) {
                        var idx = parseInt(i);

                        if ((idx + 1) === themeData.mapData.length) {
                            overAwardData = themeData.mapData[i].awardData;
                        } else {
                            totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[i].awardData);
                        }
                    }
                }
            }
            callback(totalAwardData, overAwardData);
        });
    }

    toPlayDice(themeId, callback)
    {
        // ????????????
        function getWalkCount(diceNum, mapNum, currPos)
        {
            return (diceNum+currPos) > mapNum ? (mapNum-currPos) : diceNum;
        }

        // ??????????????????????????????????????????
        function getDiceNum(useItem, extBuff)
        {
            //var effItemId = 0;
            var totalDiceNum = 0, diceList = [];
            if (useItem.length > 0) {
                /*
                if (useItem[0].id == SOME_DICE_ITEMID) {
                    // ????????????
                    var diceVal = useItem[0].count;//utils.getRandom(6);
                    totalDiceNum += diceVal;
                    diceList.push(diceVal);

                    //effItemId = SOME_DICE_ITEMID;
                } else if (useItem[0].id == DOUBLE_DICE_ITEMID) {
                    // ????????????
                    for (let i = 0; i < 2; i++) {
                        var diceVal = utils.getRandom(6);
                        totalDiceNum += diceVal;
                        diceList.push(diceVal);
                    }

                    //effItemId = DOUBLE_DICE_ITEMID;
                }*/
                var pos = -1;
                // ????????????????????????????????????
                for (let i in useItem) {
                    if (useItem[i].id === SOME_DICE_ITEMID) {
                        pos = i;
                        break;
                    }
                }
                if (pos > -1) {
                    // ??????????????????
                    var diceVal = useItem[pos].count;//utils.getRandom(6);
                    totalDiceNum += diceVal;
                    diceList.push(diceVal);
                    useItem.splice(pos, 1); // ???????????????
                } else {
                    if (useItem[0].id === DOUBLE_DICE_ITEMID) {
                        // ????????????
                        for (let i = 0; i < 2; i++) {
                            var diceVal = utils.getRandom(6);
                            totalDiceNum += diceVal;
                            diceList.push(diceVal);
                        }
                    }

                    useItem = [];
                }
            } else {
                // ??????????????????
                totalDiceNum = utils.getRandom(6);
                diceList.push(totalDiceNum);
            }

            // ????????????????????????
            totalDiceNum += extBuff.diceCount;

            return {
                //effItemId: effItemId,
                totalDiceNum: totalDiceNum,
                diceData: diceList,
                useItem: useItem
            }
        }

        // ??????????????????
        this.getInspDataFromDataSource (doc => {
            if (doc == null) doc = {};
            var pos = -1, themeData = null, addSkillBaselinggan = 0;
            // ??????????????????????????????
            for (let i in doc.inspData) {
                if (doc.inspData[i].themeId === themeId) {
                    themeData = doc.inspData[i];
                    if (themeData.addSkillBaselinggan != null) addSkillBaselinggan = themeData.addSkillBaselinggan;
                    pos = i;
                    break;
                }
            }

            // ??????????????????
            var diceData = getDiceNum(doc.useEffectItem, themeData.extBuff);
            //doc.effItemId = diceData.effItemId; // ???????????????????????????gamedata???????????????
            doc.effItemId = 0; // ?????????????????????????????????????????????

            doc.useEffectItem = diceData.useItem; // ??????????????????????????????

            var totalAwardData = models.InspAwardModel();

            // ????????????????????????
            GeneralAwards.getAwardMapConfig(awardMapConfig => {
                // ????????????????????????
                InspirationEvent.getEventMapConfig(eventMapConfig => {
                    // ???????????????????????????
                    InspirationTheme.getBaseLinggConfig(themeId, baseLingg => {
                        baseLingg += themeData.extBuff.lingg;
                        baseLingg += addSkillBaselinggan;

                        //var baseLingg_ = baseLingg + themeData.extBuff != null ? themeData.extBuff.lingg : 0;
                        // ??????????????????????????????
                        InspirationTheme.getOverAwardBonusConfig(themeId, (overAwardId, overBonusData) => {
                            // ????????????
                            var walkCount = getWalkCount(diceData.totalDiceNum, themeData.mapData.length, themeData.currGridPos);
                            var walkList = [];


                            while (walkCount--) {

                                ++themeData.currGridPos; // ????????????????????????????????????

                                var index = themeData.currGridPos - 1; // ???????????????????????????1

                                // themeData.mapData[index].status = 1; // ????????????????????????
                                if (themeData.mapData[index] == null || themeData.mapData[index] == 'undefined' || 'object' != typeof themeData.mapData[index]) {
                                    break;
                                }

                                if ('number' != typeof themeData.mapData[index].triggerStat) themeData.mapData[index].triggerStat = 0;

                                if (themeData.currGridPos === themeData.mapData.length) {
                                    // ???????????????????????????????????????????????????????????????????????????????????????
                                    themeData.mapData[index].awardData = models.InspAwardModel();
                                    if (themeData.mapData[index].status === 0) {
                                        if (themeData.mapData[index].awardData.baselingg) {
                                            themeData.mapData[index].awardData.baselingg += baseLingg;
                                        } else {
                                            themeData.mapData[index].awardData.baselingg = baseLingg;
                                        }
                                    }
                                    //themeData.mapData[index].awardData.lingg += baseLingg; // ??????????????????
                                    themeData.mapData[index].awardData.items = overBonusData.items;
                                    themeData.mapData[index].awardData.lingg = overBonusData.attrs.lingg;
                                    themeData.mapData[index].awardData.rewardId = overAwardId;
                                    themeData.mapData[index].awardData.currency = overBonusData.currency;

                                    totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);

                                    var mapNode = getWalkNode(themeData.mapData[index]);
                                    walkList.push(mapNode);

                                    walkCount = 0; // ????????????
                                } else {

                                    var eventData = eventMapConfig.get(themeData.mapData[index].eventId);
                                    if (eventData) {
                                        if (walkCount === 0 && eventData.optFlag === 1) {
                                            // ???????????????
                                            themeData.mapData[index].awardData = models.InspAwardModel();
                                            if (themeData.mapData[index].status === 0)
                                                themeData.mapData[index].awardData.baselingg += baseLingg;
                                            themeData.mapData[index].triggerStat = 1; // ??????????????????????????????????????????????????????????????????

                                            totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);

                                            var mapNode = getWalkNode(themeData.mapData[index]);
                                            walkList.push(mapNode);
                                        } else {
                                            if (walkCount === 0 && themeData.mapData[index].triggerStat === 0) { // ????????????
                                                // ?????????????????????????????????
                                                var retData = doAction(awardMapConfig, themeData.extBuff, themeData.currGridPos, walkCount, eventData, themeData.themeId, themeData.playHeroId);

                                                var oldCurrGridPos = themeData.currGridPos;

                                                themeData.extBuff = retData.extBuff;
                                                themeData.currGridPos = retData.currPos;
                                                walkCount = retData.walkCount;
                                                if (themeData.mapData[index].status === 0) {
                                                    if (retData.awardData.baselingg) {
                                                        retData.awardData.baselingg += baseLingg;
                                                    } else {
                                                        retData.awardData.baselingg = baseLingg;
                                                    }
                                                }

                                                totalAwardData = getTotalAwardData(totalAwardData, retData.awardData);

                                                themeData.mapData[index].awardData = retData.awardData;
                                                if (retData.awardId > 0)
                                                    themeData.mapData[index].awardData.rewardId = retData.awardId;
                                                if (retData.addGrid !== 0)
                                                    themeData.mapData[index].awardData.addGrid = retData.addGrid;
                                                if (retData.addBaseLingg > 0) themeData.mapData[index].awardData.addBaseLingg = retData.addBaseLingg;
                                                themeData.mapData[index].awardData.castAp = retData.castAp;
                                                themeData.mapData[index].triggerStat = 1; // ??????????????????

                                                // ==================================================
                                                if (oldCurrGridPos > retData.currPos) {
                                                    // ???????????????
                                                    for (let k = index; k > retData.currPos; k--) {
                                                        var mapNode = getWalkNode(themeData.mapData[k]);
                                                        walkList.push(mapNode);
                                                    }
                                                } else {
                                                    var mapNode = getWalkNode(themeData.mapData[index]);
                                                    walkList.push(mapNode);
                                                }
                                                // ==================================================
                                            } else {
                                                // ?????????????????????????????????????????????????????????
                                                if (eventData.passFlag === 1 && themeData.mapData[index].triggerStat === 0) {
                                                    // ???????????????????????????
                                                    var retData = doAction(awardMapConfig, themeData.extBuff, themeData.currGridPos, walkCount, eventData, themeData.themeId, themeData.playHeroId);

                                                    var oldCurrGridPos = themeData.currGridPos;

                                                    themeData.extBuff = retData.extBuff;
                                                    themeData.currGridPos = retData.currPos;
                                                    walkCount = retData.walkCount;
                                                    if (themeData.mapData[index].status === 0) {
                                                        if (retData.awardData.baselingg) {
                                                            retData.awardData.baselingg += baseLingg;
                                                        } else {
                                                            retData.awardData.baselingg = baseLingg;
                                                        }
                                                    }
                                                    //retData.awardData.lingg += baseLingg; // ??????????????????
                                                    totalAwardData = getTotalAwardData(totalAwardData, retData.awardData);

                                                    themeData.mapData[index].awardData = retData.awardData;
                                                    if (retData.awardId > 0)
                                                        themeData.mapData[index].awardData.rewardId = retData.awardId;
                                                    if (retData.addGrid !== 0)
                                                        themeData.mapData[index].awardData.addGrid = retData.addGrid;
                                                    if (retData.addBaseLingg > 0) themeData.mapData[index].awardData.addBaseLingg = retData.addBaseLingg;
                                                    themeData.mapData[index].awardData.castAp = retData.castAp;
                                                    themeData.mapData[index].triggerStat = 1; // ??????????????????

                                                    // ==================================================
                                                    if (oldCurrGridPos > retData.currPos) {
                                                        // ???????????????
                                                        for (let k = index; k > retData.currPos; k--) {
                                                            var mapNode = getWalkNode(themeData.mapData[k]);
                                                            walkList.push(mapNode);
                                                        }
                                                    } else {
                                                        var mapNode = getWalkNode(themeData.mapData[index]);
                                                        walkList.push(mapNode);
                                                    }
                                                    // ==================================================
                                                } else {
                                                    // ???????????????
                                                    themeData.mapData[index].awardData = models.InspAwardModel();
                                                    if (themeData.mapData[index].status === 0) {
                                                        themeData.mapData[index].awardData.baselingg += baseLingg;
                                                    }

                                                    totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);

                                                    var mapNode = getWalkNode(themeData.mapData[index]);
                                                    walkList.push(mapNode); // ??????????????????????????????
                                                }
                                            }
                                        }
                                    } else {
                                        // ????????????????????????????????????????????????
                                        themeData.mapData[index].awardData = models.InspAwardModel();
                                        if (themeData.mapData[index].status === 0) {
                                            if (themeData.mapData[index].awardData.baselingg) {
                                                themeData.mapData[index].awardData.baselingg += baseLingg;
                                            } else {
                                                themeData.mapData[index].awardData.baselingg = baseLingg;
                                            }
                                        }
                                        totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);
                                        var mapNode = getWalkNode(themeData.mapData[index]);
                                        walkList.push(mapNode); // ??????????????????????????????
                                    }
                                }

                                themeData.mapData[index].status = 1; // ????????????????????????
                            }

                            doc.inspData[pos] = themeData; // ????????????????????????
                            // ????????????
                            //GameDB.updateOne(this.tblname_, {$set:doc}, { uuid: this.uuid_ }, _ => {
                            //GameRedisHelper.setHashFieldValue(this.tblname_, this.uuid_, JSON.stringify(doc), () => {
                            this.saveInspDataToDataSource (doc, ()=> {
                                callback({
                                    currGridPos: themeData.currGridPos,
                                    diceData: diceData.diceData,
                                    walkData: walkList,
                                    awardData: totalAwardData
                                });
                            });
                        });
                    })
                });
            });
        });
    }

    // =================================================================
    // ????????????
    // =================================================================
    checkThemeUnlockValid(themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            let ret = false;
            if (doc && doc.themeList) {
                for (let i = 0; i < doc.themeList.length; i++) {
                    if (doc.themeList[i] === themeId) {
                        ret = true;
                        break;
                    }
                }
            }
            callback(ret);
        });
    }

    // ????????????cycle:week???????????????
    openThemeByCycleWeek(callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc) {
                var newThemeLis = InspirationTheme.getOpenWeekThemeListConfig();
                if (JSON.stringify(doc.themeList) !== JSON.stringify(newThemeLis)) {
                    doc.inspData = [];
                }
                doc.themeList = newThemeLis;
                this.saveInspDataToDataSource (doc, ()=> {
                    callback(doc.themeList);
                });
            } else {
                callback([]);
            }
        });
    }
    // ??????????????????
    getCurrGridPos(themeId, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
           callback(themeDatas && inspData ? inspData.currGridPos : 0);
        });
    }

    setCurrGridPos(themeId, v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc == null) doc = {};
            if (doc.inspData == null) doc.inspData = [];
            for (let i = 0; i < doc.inspData.length; i++) {
                if (doc.inspData[i].themeId === themeId) {
                    doc.inspData[i].currGridPos = v;
                }
            }
        });
    }

    // =================================================================
    // ??????????????????
    // =================================================================
    // ?????????????????????
    isUseItemSomeDice(callback)
    {
        // ????????????ID????????????
        this.getUseEffectItem(useItem => {
            callback(useItem.length > 0 ? useItem[0].itemId === SOME_DICE_ITEMID : false);
        });
    }

    getUseEffectItem(callback)
    {
        this.getInspDataFromDataSource (doc => {
            callback(doc ? doc.useEffectItem : []);
        });
    }

    useEffectItem(callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc) {
                doc.useEffectItem = [];
                this.saveInspDataToDataSource (doc, ()=> {
                    callback(doc.useEffectItem);
                });
            }else {
                callback ([]);
            }
        });
    }

    setUseEffectItem(items, callback)
    {
        this.getInspDataFromDataSource (doc => {
            doc.useEffectItem = items;
            this.saveInspDataToDataSource (doc, ()=> {
                callback();
            });
        });
    }

    addUseEffectItem(item, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc.useEffectItem == null) doc.useEffectItem = [];
            doc.useEffectItem.push (item);
            this.saveInspDataToDataSource (doc, ()=> {
                callback();
            });
        });
    }

    // ?????????????????????
    isControlDice(callback)
    {
        this.getInspDataFromDataSource (doc => {
            var ret = false;
            if (doc && Array.isArray(doc.useEffectItem)) {
                for (let i in doc.useEffectItem) {
                    if (doc.useEffectItem[i].id == 440004) {
                        ret = true;
                        break;
                    }
                }
            }
            callback(ret);
        });
    }

    setEffItemId(eitemId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            doc.effItemId = eitemId;
            this.saveInspDataToDataSource (doc, ()=> {
                callback();
            });
        });
    }

    // =================================================================
    // ??????????????????
    // =================================================================
    getInspBuyCount(callback)
    {
        this.getInspDataFromDataSource (doc => {
            callback(doc ? doc.inspBuyCount : 0);
        });
    }

    addInspBuyCount(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc.inspBuyCount == null) doc.inspBuyCount = 0;
            doc.inspBuyCount += v;
            this.saveInspDataToDataSource (doc, ()=> {
                callback(doc.inspBuyCount);
            });
        });
    }

    setInspBuyCount(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && doc.inspBuyCount) {
                doc.inspBuyCount = v
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            }else {
                callback();
            }
        });
    }

    // =================================================================
    // ????????????
    // =================================================================
    getInspCountCd(st)
    {
        var now = (new Date()).getTime();
        var cd = INSP_COUNT_UPTIME - (now-st);
        if (cd < 0) cd = 0;
        return cd;
    }

    setInspBatterySTime(st, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && 'number' == typeof doc.inspCountUpStartTime) {
                if (st > 0)
                    doc.inspCountUpStartTime = st;
                this.saveInspDataToDataSource (doc, ()=> {
                    callback(st);
                });
            } else {
                callback(0);
            }
        });
    }

    setInspCountUpStartTime(st, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && 'number' == typeof doc.inspCountUpStartTime) {
                if (doc.inspCountUpStartTime == 0) {
                    doc.inspCountUpStartTime = st;
                    this.saveInspDataToDataSource (doc, ()=> {
                        callback(doc.inspCountUpStartTime)
                    });
                } else {
                    callback(doc.inspCountUpStartTime);
                }
            } else {
                callback(0);
            }
        });
    }

    updateInspCount(reset, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && typeof doc.inspCountUpStartTime === 'number' && typeof doc.inspCount === 'number') {
                /* ??????????????????????????????
                 if (doc.inspCount < INSP_COUNT_MAX) {
                    var now = (new Date()).getTime();
                    if (doc.inspCountUpStartTime === 0)
                        doc.inspCountUpStartTime = now;
                    if ((now-doc.inspCountUpStartTime) >= INSP_COUNT_UPTIME) {
                        var count = Math.floor((now-doc.inspCountUpStartTime)/INSP_COUNT_UPTIME);
                        doc.inspCount += count;
                        doc.inspCount = doc.inspCount > INSP_COUNT_MAX ? INSP_COUNT_MAX : doc.inspCount;
                        doc.inspCountUpStartTime = now - ((now-doc.inspCountUpStartTime)-INSP_COUNT_UPTIME*count);
                    }
                }*/
                if (reset) {
                    doc.inspCount = INSP_COUNT_MAX;
                    doc.inspCountUpStartTime = 0;
                    doc.inspBuyCount = 0;
                }
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            } else {
                callback();
            }
        });
    }

    checkInspCountValid(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            let nowCount = doc && doc.inspCount ? doc.inspCount : 0;
            callback(nowCount >= v);
        });
    }

    isInspCountFull(callback)
    {
        this.getInspDataFromDataSource (doc => {
            callback(doc && doc.inspCount ? (doc.inspCount === INSP_COUNT_MAX) : false);
        });
    }

    getInspCount(callback)
    {
        this.getInspDataFromDataSource (doc => {
            callback(doc && doc.inspCount ? doc.inspCount : 0);
        });
    }

    addInspCount(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && 'number' == typeof doc.inspCount) {
                doc.inspCount += v;
                this.saveInspDataToDataSource (doc, ()=> {
                    callback(doc.inspCount);
                });
            }else {
                callback (0);
            }
        });
    }

    costInspCount(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && doc.inspCount) {
                doc.inspCount -= v;
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            }else {
                callback ();
            }
        });
    }

    // =================================================================
    // ?????????
    // =================================================================
    getInspActionPoint(callback)
    {
        this.getInspDataFromDataSource (doc => {
            callback(doc && doc.inspActionPoint ? doc.inspActionPoint : 0);
        });
    }

    setInspActionPoint(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc && doc.inspActionPoint) {
                doc.inspActionPoint = v;
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            }else {
                callback();
            }
        });
    }

    checkInspActionPointValid(v, callback)
    {
        this.getInspActionPoint(ap => {
            callback(ap >= v);
        });
    }

    costInspActionPoint(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            if (doc.inspActionPoint == null) doc.inspActionPoint = 0;
            var ap = 0;
            if (doc) {
                ap = doc.inspActionPoint - v;
                ap = ap < 0 ? 0 : ap;
            }
            doc.inspActionPoint = ap;

            this.saveInspDataToDataSource (doc, ()=> {
                callback(ap);
            });
        });
    }

    addInspActionPoint(v, callback)
    {
        this.getInspDataFromDataSource (doc => {
           if (doc.inspActionPoint == null) doc.inspActionPoint = 0;

            var ap = 0;
            if (doc) {
                ap = doc.inspActionPoint + v;
                ap = ap < 0 ? 0 : ap;
            }

            doc.inspActionPoint = ap;
            this.saveInspDataToDataSource (doc, ()=> {
                callback(ap);
            });
        });
    }

    // =================================================================
    // ????????????
    // =================================================================
    getEventIdByGridPos(themeId, gridPos, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            let eventId = 0;
            if (themeDatas && inspData) {
                let mapData = inspData.mapData;
                for (let i = 0; i < mapData.length; i++) {
                    if (mapData[i].gridPos === gridPos) {
                        eventId = mapData[i].eventId;
                        break;
                    }
                }
            }
            callback(eventId);
        });
    }

    getRandomGoods(eventId)
    {
        let shopData = InspirationEvent.getRandomByConfig(eventId);
        return shopData;
    }

    buyGoods(goodsId)
    {
        let shopData = InspirationEvent.goodsBuy(goodsId);
        return shopData;
    }

    getSelectOptionCost(eventId, selectId, callback)
    {
        InspirationEvent.getOptCost(eventId, selectId, costData => {
            callback(costData);
        });
    }

    doSelectEvent(themeId, eventId, selectId, callback)
    {
        // ??????????????????????????????????????????????????????????????????
        this.getInspDataFromDataSource (doc => {
            if (doc && doc.inspData) {
                let pos = -1, themeData = null;
                for (let i in doc.inspData) {
                    if (doc.inspData[i].themeId === themeId &&
                        doc.inspData[i].mapData.length > 0) {
                        pos = Number(i);
                        themeData = doc.inspData[i];
                        break;
                    }
                }
                var index = themeData.currGridPos-1;
                if (pos === -1 || themeData === null || themeData.mapData[index] == null || themeData.mapData[index] == 'undefined' || 'object' != typeof themeData.mapData[index]) {
                    callback(null);
                } else {

                    if ('number' != typeof themeData.mapData[index].triggerStat) themeData.mapData[index].triggerStat = 0;

                    // ??????????????????
                    var walkList = [];
                    var totalAwardData = models.InspAwardModel();
                    GeneralAwards.getAwardMapConfig(awardMapConfig => {
                        // ????????????????????????
                        InspirationEvent.getEventMapConfig(eventMapConfig => {
                            // ???????????????????????????
                            InspirationTheme.getBaseLinggConfig(themeId, baseLingg => {
                                baseLingg += themeData.extBuff.lingg;
                                // ??????????????????????????????
                                InspirationTheme.getOverAwardBonusConfig(themeId, (overAwardId, overBonusData) => {
                                    // ????????????????????????
                                    InspirationEvent.getOptionEffectConfig(eventId, selectId, effConfig => {
                                        var walkCount = 0;
                                        var retData = doAction(awardMapConfig, themeData.extBuff,
                                            themeData.currGridPos, walkCount, effConfig, themeData.themeId, themeData.playHeroId);

                                        // ==================================================
                                        if ('number' != typeof retData.addGrid) retData.addGrid = 0;
                                        if (retData.addGrid != 0) {
                                            if (themeData.mapData[themeData.currGridPos-1].awardData != null && 'object' == typeof themeData.mapData[themeData.currGridPos-1].awardData) {
                                            themeData.mapData[themeData.currGridPos-1].awardData.addGrid = retData.addGrid;
                                            }
                                        }
                                        if (themeData.currGridPos > retData.currPos) {
                                            // ???????????????
                                            for (let k = (themeData.currGridPos-1); k > retData.currPos; k--) {
                                                var mapNode = getWalkNode(themeData.mapData[k]);
                                                walkList.push(mapNode);
                                            }
                                        }
                                        // ==================================================
                                        var oldCurrGridPos = themeData.currGridPos;

                                        themeData.currGridPos = retData.currPos;
                                        walkCount = retData.walkCount;
                                        if (walkCount > 0) {
                                            var mapNode = getWalkNode(themeData.mapData[oldCurrGridPos-1]);
                                            walkList.push(mapNode);
                                            // ?????????????????????????????????
                                            while (walkCount--) {
                                                ++themeData.currGridPos; // ????????????????????????????????????

                                                var index = themeData.currGridPos - 1; // ???????????????????????????1

                                                if (themeData.mapData[index] == null || themeData.mapData[index] == 'undefined' || 'object' != typeof themeData.mapData[index]) {
                                                    break;
                                                }

                                                if ('number' != typeof themeData.mapData[index].triggerStat) themeData.mapData[index].triggerStat = 0;
                                                if (themeData.mapData[index].triggerStat === 0) {
                                                    // ????????????????????????

                                                    if (themeData.currGridPos === themeData.mapData.length) {
                                                        // ???????????????????????????????????????????????????????????????????????????????????????
                                                        themeData.mapData[index].awardData = models.InspAwardModel();
                                                        if (themeData.mapData[index].awardData.baselingg) {
                                                            themeData.mapData[index].awardData.baselingg += baseLingg;
                                                        } else {
                                                            themeData.mapData[index].awardData.baselingg = baseLingg;
                                                        }
                                                        //themeData.mapData[index].awardData.lingg += baseLingg; // ??????????????????
                                                        themeData.mapData[index].awardData.items = overBonusData.items;
                                                        themeData.mapData[index].awardData.rewardId = overAwardId;
                                                        themeData.mapData[index].awardData.currency = overBonusData.currency;

                                                        totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);

                                                        walkCount = 0; // ????????????
                                                    } else {
                                                        var eventData = eventMapConfig.get(themeData.mapData[index].eventId);
                                                        if (eventData) {
                                                            if (walkCount === 0 && eventData.optFlag === 1) {
                                                                // ???????????????
                                                                themeData.mapData[index].awardData = models.InspAwardModel();
                                                                if (themeData.mapData[index].status === 0)
                                                                    themeData.mapData[index].awardData.baselingg += baseLingg;
                                                                themeData.mapData[index].triggerStat = 1; // ??????????????????????????????????????????????????????????????????
                                                                // themeData.mapData[index].awardData = _.omitBy(themeData.mapData[index].awardData,_.isEmpty)
                                                            } else {
                                                                if (walkCount === 0 && themeData.mapData[index].triggerStat === 0) { // ????????????
                                                                    // ?????????????????????????????????
                                                                    var retData = doAction(awardMapConfig, themeData.extBuff, themeData.currGridPos, walkCount, eventData, themeData.themeId, themeData.playHeroId);
                                                                    // ==================================================
                                                                    if (themeData.currGridPos > retData.currPos) {
                                                                        // ???????????????
                                                                        for (let k = (index-1); k > (retData.currPos+1); k--) {
                                                                            var mapNode = getWalkNode(themeData.mapData[k]);
                                                                            walkList.push(mapNode);
                                                                        }
                                                                    }
                                                                    // ==================================================

                                                                    themeData.extBuff = retData.extBuff;
                                                                    themeData.currGridPos = retData.currPos;
                                                                    walkCount = retData.walkCount;
                                                                    if (themeData.mapData[index].status === 0) {
                                                                        if (retData.awardData.baselingg) {
                                                                            retData.awardData.baselingg += baseLingg;
                                                                        } else {
                                                                            retData.awardData.baselingg = baseLingg;
                                                                        }
                                                                    }

                                                                    totalAwardData = getTotalAwardData(totalAwardData, retData.awardData);

                                                                    themeData.mapData[index].awardData = retData.awardData;
                                                                    if (retData.awardId > 0)
                                                                        themeData.mapData[index].awardData.rewardId = retData.awardId;
                                                                    if (retData.addGrid !== 0)
                                                                        themeData.mapData[index].awardData.addGrid = retData.addGrid;
                                                                    if (retData.addBaseLingg > 0) themeData.mapData[index].awardData.addBaseLingg = retData.addBaseLingg;
                                                                    themeData.mapData[index].awardData.castAp = retData.castAp;
                                                                    themeData.mapData[index].triggerStat = 1; // ??????????????????
                                                                    // themeData.mapData[index].awardData = _.omitBy(themeData.mapData[index].awardData,_.isEmpty)
                                                                } else {
                                                                    // ?????????????????????????????????????????????????????????
                                                                    if (eventData.passFlag === 1 && themeData.mapData[index].triggerStat === 0) {
                                                                        // ???????????????????????????
                                                                        var retData = doAction(awardMapConfig, themeData.extBuff, themeData.currGridPos, walkCount, eventData, themeData.themeId, themeData.playHeroId);
                                                                        // ==================================================
                                                                        if (themeData.currGridPos > retData.currPos) {
                                                                            // ???????????????
                                                                            for (let k = (index-1); k > (retData.currPos+1); k--) {
                                                                                var mapNode = getWalkNode(themeData.mapData[k]);
                                                                                walkList.push(mapNode);
                                                                            }
                                                                        }
                                                                        // ==================================================

                                                                        themeData.extBuff = retData.extBuff;
                                                                        themeData.currGridPos = retData.currPos;
                                                                        walkCount = retData.walkCount;
                                                                        if (themeData.mapData[index].status === 0) {
                                                                            if (retData.awardData.baselingg) {
                                                                                retData.awardData.baselingg += baseLingg;
                                                                            } else {
                                                                                retData.awardData.baselingg = baseLingg;
                                                                            }
                                                                        }
                                                                        //retData.awardData.lingg += baseLingg; // ??????????????????
                                                                        totalAwardData = getTotalAwardData(totalAwardData, retData.awardData);

                                                                        themeData.mapData[index].awardData = retData.awardData;
                                                                        if (retData.awardId > 0)
                                                                            themeData.mapData[index].awardData.rewardId = retData.awardId;
                                                                        if (retData.addGrid !== 0)
                                                                            themeData.mapData[index].awardData.addGrid = retData.addGrid;
                                                                        if (retData.addBaseLingg > 0) themeData.mapData[index].awardData.addBaseLingg = retData.addBaseLingg;
                                                                        themeData.mapData[index].awardData.castAp = retData.castAp;
                                                                        themeData.mapData[index].triggerStat = 1; // ??????????????????
                                                                        // themeData.mapData[index].awardData = _.omitBy(themeData.mapData[index].awardData,_.isEmpty)
                                                                    } else {
                                                                        // ???????????????
                                                                        themeData.mapData[index].awardData = models.InspAwardModel();
                                                                        if (themeData.mapData[index].status === 0)
                                                                            themeData.mapData[index].awardData.baselingg += baseLingg;
                                                                        totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);
                                                                        // themeData.mapData[index].awardData = _.omitBy(themeData.mapData[index].awardData,_.isEmpty)
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            // ????????????????????????????????????????????????
                                                            themeData.mapData[index].awardData = models.InspAwardModel();
                                                            if (themeData.mapData[index].status === 0) {
                                                                if (themeData.mapData[index].awardData.baselingg) {
                                                                    themeData.mapData[index].awardData.baselingg += baseLingg;
                                                                } else {
                                                                    themeData.mapData[index].awardData.baselingg = baseLingg;
                                                                }
                                                            }
                                                            totalAwardData = getTotalAwardData(totalAwardData, themeData.mapData[index].awardData);
                                                            // themeData.mapData[index].awardData = _.omitBy(themeData.mapData[index].awardData,_.isEmpty)
                                                        }
                                                    }

                                                    themeData.mapData[index].status = 1; // ????????????????????????

                                                    var mapNode = getWalkNode(themeData.mapData[index]);
                                                    walkList.push(mapNode); // ??????????????????????????????
                                                } else {
                                                    var mapNode = getWalkNode(themeData.mapData[index]);
                                                    walkList.push(mapNode); // ??????????????????????????????
                                                }
                                            }
                                        } else {
                                            // ?????????????????????
                                            var index = themeData.currGridPos - 1;
                                            totalAwardData = getTotalAwardData(totalAwardData, retData.awardData);
                                            var baselingg = themeData.mapData[index] && themeData.mapData[index].awardData && themeData.mapData[index].baselingg ? themeData.mapData[index].awardData.baselingg : 0;
                                            baselingg = baselingg ? baselingg : 0;
                                            themeData.mapData[index].awardData = retData.awardData;
                                            themeData.mapData[index].awardData.baselingg = baselingg;
                                            if (retData.addBaseLingg > 0) themeData.mapData[index].awardData.addBaseLingg = retData.addBaseLingg;
                                            themeData.mapData[index].awardData.castAp = retData.castAp;
                                            if (retData.awardId > 0)
                                                themeData.mapData[index].awardData.rewardId = retData.awardId;
                                            var mapNode = getWalkNode(themeData.mapData[index]);
                                            walkList.push(mapNode);
                                        }

                                        doc.inspData[pos] = themeData; // ????????????????????????
                                        // ????????????
                                        this.saveInspDataToDataSource (doc, ()=> {
                                            callback({
                                                playHeroId: themeData.playHeroId,
                                                currGridPos: themeData.currGridPos,
                                                walkData: walkList,
                                                awardData: totalAwardData
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
            } else {
                callback(null);
            }
        });
    }


    setGridStatus(themeId, gridPos, v, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            if (themeDatas && inspData) {
                for (let i = 0; i < inspData.mapData.length; i++) {
                    if (inspData.mapData[i].gridPos === gridPos) {
                        inspData.mapData[i].status = v;
                        break;
                    }
                }
                this.saveInspDataToDataSource (doc, ()=> {
                    callback();
                });
            }else {
                callback ();
            }
        });
    }

    getGridStatus(themeId, gridPos, callback)
    {
        this.getThemeDataUsingThemeId (themeId, (themeDatas, inspData) => {
            let stat = 1;
            if (themeDatas && inspData) {
                for (let i = 0; i < inspData.mapData.length; i++) {
                    if (inspData.mapData[i].gridPos === gridPos) {
                        stat = inspData.mapData[i].status
                        break;
                    }
                }
            }
            callback(stat);
        });
    }

    getBuffList(themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            var buffLis = [], eventBuff = [];
            if (doc && doc.inspData) {
                for (let index in doc.inspData) {
                    if (doc.inspData[index].themeId == themeId) {
                        if(_.isPlainObject(doc.inspData[index].extBuff) && doc.inspData[index].extBuff.eventBuff){
                            eventBuff = doc.inspData[index].extBuff.eventBuff
                        }
                        if ('object' === typeof doc.inspData[index].extBuff &&
                                'object' === typeof doc.inspData[index].extBuff.lis) {
                            buffLis = doc.inspData[index].extBuff.lis;
                        }
                        break;
                    }
                }
            }
            callback(buffLis,eventBuff);
        });
    }

    getLinggTotal(themeId, callback)
    {
        this.getInspDataFromDataSource (doc => {
            var linggTotal = 0;
            if (doc && doc.inspData) {
                for (let index in doc.inspData) {
                    if (doc.inspData[index].themeId == themeId) {
                        linggTotal = ('number' == typeof doc.inspData[index].linggTotal) ? doc.inspData[index].linggTotal : 0;
                        break;
                    }
                }
            }
            callback(linggTotal);
        });
    }

    addLinggTotal(themeId, v, callback)
    {
        this.getInspDataFromDataSource (doc => {
            var linggTotal = 0;
            if (doc && doc.inspData) {
                for (let index in doc.inspData) {
                    if (doc.inspData[index].themeId == themeId) {
                        if (doc.inspData[index].linggTotal) {
                            doc.inspData[index].linggTotal += v;

                            if (doc.inspData[index].linggTotal < 0)
                                doc.inspData[index].linggTotal = 0;

                            linggTotal = doc.inspData[index].linggTotal;
                        } else {
                            doc.inspData[index].linggTotal = v;
                            linggTotal = v;

                            if (v < 0) {
                                doc.inspData[index].linggTotal = 0;
                                linggTotal = 0;
                            }
                        }
                        break;
                    }
                }
            }
            callback(linggTotal);
        });
    }
}

module.exports = inspController;
