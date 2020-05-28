const MongoAccess = require("../../shared/mongo/MongoAccess");
const modelData = require('../models/modelData');

let gameMongo = new MongoAccess();

module.exports = gameMongo;

//数据表模型
let DataSchema = new gameMongo.Schema({
    uuid: {type: Number, unique: true}, //玩家编号
    data: {},
});

gameMongo.models = {
    demo: DataSchema,
};

for (let key in modelData.Table) {
    const table = modelData.Table[key];
    gameMongo[table] = DataSchema;
}
