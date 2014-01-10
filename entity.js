/**************************************
**    Simple JavaScript Data Wrapper for Server and Client
**    Version 0.1
**    By ChironChan 
**    MIT Licensed.
**************************************/

var utils = (function(){
    function createTypeTester(type) {
        var toString = Object.prototype.toString;
        type = "[object "+type+"]";
        return function(obj) {
            if (toString.call(obj) !== type)
                return false;
            return true;
        }
    }

    var require         = require || undefined;//兼容客户端
    var isArray         = require?require('util').isArray:createTypeTester('Array');
    var isNull          = createTypeTester('Null');
    var isUndefined     = createTypeTester('Undefined');
    var isNumber        = createTypeTester('Number');
    var isBoolean       = createTypeTester('Boolean');
    var isString        = createTypeTester('String');
    var isFunction      = createTypeTester('Function');
    var isInt           = function(num) {return isNumber(num) && (Math.floor(num) === num)};
    var isObject        = function(obj) {if (Object.prototype.toString.call(obj) !== "[object Object]") return false;for (var key in obj) {return Object.prototype.hasOwnProperty.call(obj, key);}return false;}
    var deepClone       = function(obj) {return JSON.parse(JSON.stringify(obj));}
    var emptyFunction   = function(){};

    var defineValueProperty = function(obj,name,value,writable,enumerable,configurable) {
        Object.defineProperty(obj,name,{
            value: value,
            writable : writable || false,
            enumerable : enumerable || false,
            configurable : (configurable === undefined ? true : (!!configurable))
        })
    }
    var defineGetOnlyProperty = function(obj,name,getter,enumerable,configurable) {
        Object.defineProperty(obj,name,{
            get : getter,
            set : emptyFunction,//不执行任何动作
            enumerable : enumerable || false,
            configurable : configurable || false
        })
    }

    var defineGetSetProperty = function(obj,name,getter,setter,enumerable,configurable) {
        Object.defineProperty(obj,name,{
            get : getter,
            set : setter,//不执行任何动作
            enumerable : enumerable || false,
            configurable : configurable || false
        })
    }
    var deepInspect = function(obj,output) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key))continue;
            var val = obj[key];
            if (isFunction(val)) {
                for (var key2 in val) {
                    if (!obj.hasOwnProperty(key2))continue;
                    deepInspect(val,output[key] = {});
                    break;//如果存在则生成。
                }
            } else if (isObject(val)) {
                deepInspect(val,output[key] = {});
            } else if (isArray(val)) {
                deepInspect(val,output[key] = []);
            } else {
                output[key] = val;
            }
        }
        return output;
    }
    var inspect = function(obj,depth) {
        console.log(JSON.stringify(deepInspect(obj,{}),0,2));
    }

    function _inspectEmptyEntity(attributes,pkey,ppkey,pppkey,ppppkey,pppppkey){
        attributes = attributes || this;
        pkey = pkey || '';
        ppkey = ppkey || '';
        pppkey = pppkey || '';
        ppppkey = ppppkey || '';
        pppppkey = pppppkey || '';

        if (attributes.entity_list && attributes.entity_list.length > 0) {
            console.log('position:' + [pppppkey,ppppkey,pppkey,ppkey].join('/').replace(/^\/+/,'')+ '  count:' + attributes.entity_list.length);
        }
        for (var key in attributes) {
            if (utils.isObject(attributes)) {
                _inspectEmptyEntity(attributes[key],key,pkey,ppkey,pppkey,ppppkey);
            }
        }
    }

    function _filterExportData(attributes,item,data){
        item = item || {};
        attributes = attributes || {};
        var shortKeyToWholeKey = attributes.shortKeyToWholeKey || {};
        for (var sKey in data) {
            var key = shortKeyToWholeKey[sKey] || sKey;
            if (attributes[key]) {
                if (attributes[key].notExport) 
                    delete data[sKey];
                else if (attributes[key].attributes || attributes[key].item) {
                    _filterExportData(attributes[key].attributes,attributes[key].item,data[sKey]);
                }
            } else if (item.notExport){
                delete data[sKey];
            } else if (item.attributes || item.item) {
                _filterExportData(item.attributes,item.item,data[sKey]);
            }
        }
        return data;
    }

    return {
        deepClone:deepClone,
        isArray:isArray,
        isInt:isInt,
        isNull:isNull,
        isUndefined:isUndefined,
        isNumber:isNumber,
        isBoolean:isBoolean,
        isString:isString,
        isFunction:isFunction,
        isObject:isObject,
        emptyFunction:emptyFunction,
        defineValueProperty:defineValueProperty,
        defineGetOnlyProperty:defineGetOnlyProperty,
        defineGetSetProperty:defineGetSetProperty,
        inspect:inspect,
        _inspectEmptyEntity : _inspectEmptyEntity,//不想共享太多接口。
        _filterExportData:_filterExportData,
    }
})();

function createEntityManager(attribute,item,propName) {
    if (!attribute.entity_list)         utils.defineValueProperty(attribute,'entity_list',[],false,false,false);
    if (!attribute.shortKeyToWholeKey)  utils.defineValueProperty(attribute,'shortKeyToWholeKey',{},false,false,false);
    if (!attribute.wholeKeyToShortKey)  utils.defineValueProperty(attribute,'wholeKeyToShortKey',{},false,false,false);
    if (!attribute.typeForKey)          utils.defineValueProperty(attribute,'typeForKey',{},false,false,false);
    if (!attribute._inspect)            utils.defineValueProperty(attribute,'_inspect',utils._inspectEmptyEntity,false,false,false);

    var entity_list = attribute.entity_list;
    var shortKeyToWholeKey = attribute.shortKeyToWholeKey;
    var wholeKeyToShortKey = attribute.wholeKeyToShortKey;
    var typeForKey = attribute.typeForKey;

    function createBooleanProperty(entity,prop,attr,configurable) {
        var changes = entity._changes;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Normal';
        var defaultData = (attr.defaultData === true)?1:0;
        utils.defineGetSetProperty(entity, prop, function () {
            return (this._data[key] === undefined)?!!defaultData:!!this._data[key];
        }, function (val) {
            if (!attr.notExport) changes[key] = 1;
            var val = utils.isBoolean(val)?(val?1:0):(val === 'true'?1:0);
            if (val === defaultData) {
                delete this._data[key];
            } else {
                this._data[key] = val;
            }
        },true,configurable || false);
    }
    function createNumberProperty(entity,prop,attr,configurable) {
        var changes = entity._changes;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Normal';
        var defaultData = attr.defaultData || 0;
        utils.defineGetSetProperty(entity, prop, function () {
            return this._data[key] || defaultData;
        }, function (val) {
            if (!attr.notExport) changes[key] = 1;
            val = utils.isNumber(val)?val:parseFloat(val);
            if (isNaN(val)) throw val + ' not a number';
            if (val === defaultData) {
                delete this._data[key];
            } else {
                this._data[key] = val;
            }
        },true,configurable || false);
    }
    function createStringProperty(entity,prop,attr,configurable) {
        var changes = entity._changes;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Normal';
        var defaultData = attr.defaultData || '';
        utils.defineGetSetProperty(entity, prop, function () {
            return this._data[key] || defaultData;
        }, function (val) {
            if (!attr.notExport) changes[key] = 1;
            val = utils.isString(val)?val:('' + val);
            if (val === defaultData) {
                delete this._data[key];
            } else {
                this._data[key] = val;
            }
        },true,configurable || false);
    }
    function createObjectProperty(entity,prop,attr,configurable) {
        var changes = entity._changes;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Normal';
        var defaultData = JSON.stringify(attr.defaultData || {});
        utils.defineGetSetProperty(entity, prop, function () {
            if (!attr.notExport && !changes[key]) {
                changes[key] = JSON.stringify(this._data[key]);
            }
            return this._data[key]?this._data[key]:(this._data[key] = JSON.parse(defaultData));
        }, function (val) {
            if (!utils.isObject(val)) 
                throw val + ' not a object';
            changes[key] = 1;
            this._data[key] = val;
        },true,configurable || false);
    }
    function createArrayProperty(entity,prop,attr,configurable) {
        var changes = entity._changes;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Normal';
        var defaultData = JSON.stringify(attr.defaultData || []);
        utils.defineGetSetProperty(entity, prop, function () {
            if (!changes[key]) {
                changes[key] = JSON.stringify(this._data[key]);
            }
            return this._data[key]?this._data[key]:(this._data[key] = JSON.parse(defaultData));
        }, function (val) {
            if (!utils.isArray(val)) 
                throw val + ' not a array';
            if (!attr.notExport) changes[key] = 1;
            this._data[key] = val;
        },true,configurable || false);
    }
    function createStructProperty(entity,prop,attr,configurable) {
        //var sub_changes = entity._sub_changes;
        var sub_entity_list = entity._sub_entity_list;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Struct';
        var attributes = attr.attributes || {};
        var subManager = createEntityManager(attributes,undefined,prop);
        utils.defineGetOnlyProperty(entity, prop, function () {
            if (!this._data[key])
                this._data[key] = {};
            //sub_changes[key] = prop;
            sub_entity_list[prop] = sub_entity_list[prop] || subManager.createEntity(this._data[key]);
            return sub_entity_list[prop];
        },true,configurable || false);
    }
    function createStructObjectProperty(entity,prop,attr,configurable) {
        //var sub_changes = entity._sub_changes;
        var sub_entity_list = entity._sub_entity_list;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Struct';
        var attributes = attr.attributes || {};
        var item = utils.isString(attr.item)?{type:attr.item}:(attr.item||{type:'String'});
        var subManager = createEntityManager(attributes,item,prop);
        utils.defineGetOnlyProperty(entity, prop, function () {
            if (!this._data[key])
                this._data[key] = {};
            //sub_changes[key] = prop;
            sub_entity_list[prop] = sub_entity_list[prop] || subManager.createEntity(this._data[key]);
            return sub_entity_list[prop];
        },true,configurable || false);
    }
    function createStructArrayProperty(entity,prop,attr,configurable) {
        //var sub_changes = entity._sub_changes;
        var sub_entity_list = entity._sub_entity_list;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Struct';
        if (!attr.item)
            throw 'StructArray need item';
        var arrayAttribute = {
            splice : function(index,count) {
                var insertObjs = Array.prototype.slice.call(arguments,2);
                var indexArray = this._i;
                //移除对象
                for (var i = index + count - 1; i>=index; i-- ) {
                    this._removeArrayItem(i);
                }
                //传入对象
                for (var i = 0; i < insertObjs.length; i++) {
                    var item = insertObjs[i];
                    //item._setKeyForMe(index + i);
                    var realKey = ++this._l;
                    indexArray.splice(index+i,0,realKey);
                    this._setItem(realKey,item);
                }
            },
            push : function() {
                this.splice.apply(this,[this.count(),0].concat(Array.prototype.slice.call(arguments,0)));
            },
            sort : function(fn) {
                var self = this;
                this._i.sort(function(a,b){
                    var realA = self[a],
                        realB = self[b];
                    return fn(realA,realB);
                });
            },
            unshift : function(item) {
                this.splice(0,0,item);
            },
            reverse : function() {
                this._i.reverse();
            },
            _removeArrayItem : function(i) {
                var realKey = this._i[i];
                if (realKey) {
                    this.deleteItem(realKey);
                    this._i.splice(i,1);
                    this._changes[realKey] = 1;
                    
                }
            },
            forEach : function(fn) {
                var indexArray = this._i;
                for (var i=0;i<indexArray.length;i++){
                    var val = this._index(i);
                    if (fn(i,val)) {
                        this._removeArrayItem(i--);
                    }
                }
            },
            forEachReverse : function(fn) {
                var indexArray = this._i;
                for (var i=indexArray.length-1;i>=0;i--){
                    var val = this._index(i);
                    if (fn(i,val)) {
                        this._removeArrayItem(i);
                    }
                }
            },
            _index : function(key) {
                var realKey = this._i[key];
                if (realKey) {
                    return this[realKey];
                }
                return undefined;
                //实现自定义索引器
            },
            count : function() {
                return this._i.length;
            },
            _i : 'Array',
            _l : 'Number',
        }
        var subManager = createEntityManager(arrayAttribute,attr.item,prop);
        utils.defineGetOnlyProperty(entity, prop, function () {
            if (!this._data[key])
                this._data[key] = {};//_index。索引
            //sub_changes[key] = prop;
            sub_entity_list[prop] = sub_entity_list[prop] || subManager.createEntity(this._data[key]);
            return sub_entity_list[prop];
        },true,configurable || false);
    }

    function createDataProperty(entity) {
        function exportData() {
            var data = utils.deepClone(this._data);
            return utils._filterExportData(attribute,item,data);
        }
        utils.defineValueProperty(entity,'exportData',exportData,false,true,false);//可写，不可枚举，不可修改配置。
        utils.defineValueProperty(entity,'_data',{},true,false,false);//可写，不可枚举，不可修改配置。
    }
    function createInspectsProperty(entity) {
        var inspect = function() {
            utils.inspect(entity,10);
        }
       
        utils.defineValueProperty(entity,'_inspect',inspect,false,false,false);//可写，不可枚举，不可修改配置。
    }
    function createReleaseMeProperty(entity) {
        var defaultData = {};
        var changes = entity._changes;
        //var sub_changes = entity._sub_changes;
        var sub_entity_list = entity._sub_entity_list;
        var releaseMe = function() {
            //所有儿子都要释放

            for (var key in sub_entity_list) {
                entity.deleteItem && entity.deleteItem(key);
                sub_entity_list[key] && sub_entity_list[key].releaseMe();
                delete sub_entity_list[key];
            }
            // for (var key in sub_changes)
            //     delete sub_changes[key];
            for (var key in changes)
                delete changes[key];
            this._data = defaultData;
            entity_list.push(this);
        }
        utils.defineValueProperty(entity,'releaseMe',releaseMe,false,true,false);//不可配置，不可写，可被枚举出来
    }
    function createSubEntityProperty(entity) {
        utils.defineValueProperty(entity,'_sub_entity_list',{},false,false,false);//可写，不可枚举，不可修改配置。
        //utils.defineValueProperty(entity,'_sub_changes',{},false,false,false);//不可修改对象引用，可修改对象里面的值，不可枚举，不可修改配置。
        utils.defineValueProperty(entity,'_changes',{},false,false,false);//可写，不可枚举，不可修改配置。
    }
    function createKeyForMeProperty(entity) {
        utils.defineValueProperty(entity,'_setKeyForMe',function(key){
            utils.defineValueProperty(entity,'keyForMe',key || '',false,false,true);//不可写，不可枚举，可修改配置。
        },false,false,false);//不可写，不可枚举，可修改配置。

        entity._setKeyForMe(propName||'');
    }
    function createDeleteItemProperty(entity) {
        function deleteItem(key) {
            var value = entity[key];
            if (value && value.releaseMe)
                value.releaseMe();
            delete entity[key];
            delete entity._data[key];
            delete entity._sub_entity_list[key];
        }
        utils.defineValueProperty(entity,'deleteItem',deleteItem,false,true,false);//不可写，不可枚举，可修改配置。
    }

    function createCreateItemProperty(entity) {
        var type = item.type;

        //var normal_type = (type == 'Number' || type == 'String' || type == 'Boolean' || type == 'Array' || type == 'Object');
        function createItem(key,newVal) {
            var value = entity[key];
            if (value !== undefined)
                throw 'already exists key:' + key;

            if (type === 'Boolean')
                createBooleanProperty(entity,key,item,true) && utils.isBoolean(newVal) && entity[key] = newVal;
            else if (type === 'Number')
                createNumberProperty(entity,key,item,true) && utils.isNumber(newVal) && entity[key] = newVal;
            else if (type === 'String')
                createStringProperty(entity,key,item,true) && utils.isString(newVal) && entity[key] = newVal;
            else if (type === 'Object')
                createObjectProperty(entity,key,item,true) && utils.isObject(newVal) && entity[key] = newVal;
            else if (type === 'Array')
                createArrayProperty(entity,key,item,true) && utils.isArray(newVal) && entity[key] = newVal;
            else if (newVal !== undefined) 
                throw 'not support set struct value';
            else if (type === 'Struct') 
                createStructProperty(entity,key,item,true);
            else if (type === 'StructObject') 
                createStructObjectProperty(entity,key,item,true);
            else if (type === 'StructArray') 
                createStructArrayProperty(entity,key,item,true);
            else 
                throw 'not support type:' + type;

            return entity[key];
        }
        utils.defineValueProperty(entity,'createItem',createItem,false,true,false);//不可写，不可枚举，可修改配置。
    }
    function createNewItemProperty(entity) {
        var type = item.type;
        if (type != 'Struct' && type != 'StructArray' && type != 'StructObject')
            throw 'not support type:' + type;
        var subManager = createEntityManager(item.attributes || {},item.item);
        function newItem(data) {
            return subManager.createEntity(data || {});
        }
        utils.defineValueProperty(entity,'newItem',newItem,false,true,false);//不可写，不可枚举，可修改配置。
    }
    function createHasItemProperty(entity) {
        function hasItem(key) {
            if (!attribute[key] && entity[key]!==undefined && key != 'createItem' && key != 'hasItem' && key != 'keyForMe' && key != 'deleteItem' && key != 'releaseMe')
                return true;
            return false;
        }
        utils.defineValueProperty(entity,'hasItem',hasItem,false,true,false);//不可写，不可枚举，可修改配置。
    }
    function createSetItemProperty(entity) {
        function setItem(prop,item) {
            entity._data[prop] = item._data;
            entity._sub_entity_list[prop] = item;
            //entity._sub_changes[prop] = prop;
            //console.log(prop,item,item.count);
            utils.defineGetOnlyProperty(entity, prop, function () {
                return entity._sub_entity_list[prop];
            },true,true);
        }
        utils.defineValueProperty(entity,'_setItem',setItem,false,false,false);//不可写，不可枚举，可修改配置。
    }
    function createRebuildArrayProperty(entity) {
        function rebuildArray() {
            var data = utils.deepClone(entity._data);
            var indexArray = utils.deepClone(data._i);
            var last = data._l;

            //缓存的对象要清理
            entity.splice(0,entity.count());//删除所有
            entity._data._l = 0;//还原
            for (var i = 0; i < indexArray.length; i++) {
                entity.push(entity.newItem(data[indexArray[i]]));
            }
        }
        utils.defineValueProperty(entity,'rebuildArray',rebuildArray,false,false,false);//不可写，不可枚举，可修改配置。
    }
    function createGetChangesProperty(entity) {
        //2种做法。1种是记录每个动作。2种是最后一次性做比对，第一种开发成本高，难理解，难维护，性能较优，第二种性能损耗高，开发成本低，容易理解和维护。
        function getChanges() {
            var log = {};
            var sub_entity_list = this._sub_entity_list;
            var changes = this._changes;

            var realData = this._data;
            // for (var key in sub_changes) {
            //     var sub_entity = sub_entity_list[sub_changes[key]];
            //     if (!sub_entity) continue;
            //     var sub = sub_entity.getChanges();
            //     for (var hasChange in sub) {
            //         log[key] = sub;
            //         break;
            //     }
            //     delete sub_changes[key];
            // }
            for (var key in sub_entity_list) {
                if (attribute && attribute[key] && attribute[key].notExport) continue;
                if (attribute && !attribute[key] && item && item.notExport) continue;
                var sub_entity = sub_entity_list[key];
                var sub = sub_entity.getChanges();
                for (var hasChange in sub) {
                    log[wholeKeyToShortKey[key] || key] = sub;
                    break;
                }
                //delete sub_changes[key];
            }

            for (var key in changes) {
                if (changes[key] !== 1 && changes[key] === JSON.stringify(realData[key])) {
                    continue;
                }
                log[key] = realData[key];
                if (log[key] === undefined)
                    log[key] = '---';
                delete changes[key];
            }
            
            return log;
        }
        utils.defineValueProperty(entity,'getChanges',getChanges,false,false,false);//不可写，不可枚举，可修改配置。
    }
    function createMergeChangesProperty(entity) {
        var sub_entity_list = entity._sub_entity_list;

        function mergeChanges(changes) {
            var data = entity._data;//实时获取
            for (var key in changes) {
                //shortName -> longName
                var wholeKey = shortKeyToWholeKey[key] || key;//兼容itemKey
                var val = changes[key];
                if (val === '---') {//删除
                    if (sub_entity_list[wholeKey]) {
                        sub_entity_list[wholeKey].releaseMe();
                        delete sub_entity_list[wholeKey];
                    }
                    delete data[key];
                } else if (typeForKey[wholeKey] === 'Normal'){
                    data[key] = val;//直接替换
                } else if (typeForKey[wholeKey] === 'Struct'){
                    entity(wholeKey,true).mergeChanges(val);
                } else if (item){//item
                    if (!entity.hasItem(key)) {
                        entity.createItem(key);
                    }
                    entity[key].mergeChanges(val);
                } else {
                    console.log('error changes');
                }
            }
        }
        utils.defineValueProperty(entity,'mergeChanges',mergeChanges,false,false,false);//不可写，不可枚举，可修改配置。
    }

    //递归实现
    function createEntity() {
        var entity = function(key, value){
            //新obj.同时支持()访问
            if (entity._index) {
                // 自定义索引器
                return entity._index(key,value);
            }
            if (item && value!==undefined && value !== null && !entity[key]) {
                entity.createItem(key);
            }
            if (value !== undefined && value !== null) {
                try {
                    entity[key] = value;
                }catch(e){}
           }
            return entity[key];
        };
        createSubEntityProperty(entity);
        createDataProperty(entity);
        createInspectsProperty(entity);
        createReleaseMeProperty(entity);
        
        createKeyForMeProperty(entity);

        createGetChangesProperty(entity);
        createMergeChangesProperty(entity);

        if (item) {
            createDeleteItemProperty(entity);
            createCreateItemProperty(entity);
            createHasItemProperty(entity);
        }
        if (attribute._i && attribute._l && attribute._index) {
            //数组增加一个加入的接口
            createSetItemProperty(entity);
            createNewItemProperty(entity);
            createRebuildArrayProperty(entity);
        }
        
        for (var key in attribute) {
            var value = attribute[key];
            value = utils.isFunction(value)?{type:'Function',defaultData:value}:(utils.isString(value)?{type:value}:value);
            if (value.type === 'Function')
                utils.defineValueProperty(entity,key,value.defaultData,false,true,false);//可被枚举出来
            else if (value.type === 'Boolean')
                createBooleanProperty(entity,key,value);
            else if (value.type === 'Number')
                createNumberProperty(entity,key,value);
            else if (value.type === 'String')
                createStringProperty(entity,key,value);
            else if (value.type === 'Object')
                createObjectProperty(entity,key,value);
            else if (value.type === 'Array')
                createArrayProperty(entity,key,value);
            else if (value.type === 'Struct') 
                createStructProperty(entity,key,value);
            else if (value.type === 'StructObject') 
                createStructObjectProperty(entity,key,value);
            else if (value.type === 'StructArray') 
                createStructArrayProperty(entity,key,value);
            else
                throw 'not support type:' + value.type;
        } 
        return entity;
    }
    function dequeueEntity(data) {
        var entity = entity_list.shift();
        if (!entity) {
            entity = createEntity();
        }
        entity._data = data;
        return entity;
    }
    return { createEntity : dequeueEntity }
}

var exports = exports || {};//兼容浏览器
exports.createEntityManager = createEntityManager;


// var test_attributes = {
//     checkData : {
//         type : 'Function',
//         defaultData : function(){    //如果没有这项，默认为 function(){};
//             console.log('checkData');
//         }
//     },
//     checkData2 : function() {      //等同于上面的checkData
//         console.log('checkData2');
//     },
//     isMan : {
//         type : 'Boolean',
//         shortKey : 'm',//缩减存储空间
//         defaultData : true,      //如果没有这项，默认为false
//         notExport : true,
//     },
//     level : {
//         type : 'Number',
//         shortKey : 'l',//缩减存储空间
//         defaultData : 1        //如果没有这项，默认为0
//     },
//     nickname : {
//         type : 'String',
//         shortKey : 'na',//缩减存储空间
//         defaultData : 'unknow_name'
//     },
//     params : {
//         type : 'Object',
//         shortKey : 'p',//缩减存储空间
//         defaultData : {         // 如果没有这项，默认为{},会深度复制，不建议使用此类型。
//             source : ''
//         }
//     },
//     friends : {
//         type : 'Array',
//         shortKey : 'f',//缩减存储空间
//         defaultData : []         // 如果没有这项，默认为[],会深度复制，不建议使用此类型。每次更变会下发完整数据到客户端。
//     },
//     convert : {
//         type : 'Struct',   
//         attributes : {
//             en : 'String',
//             cn : {
//                 type : 'String'
//             },
//             tt : function() { 
//                 console.log('tt');
//             }
//         }
//     },
//     en_to_cn : {
//         type : 'StructObject',    // T_StructObject有item也有attributes
//         item : 'String'
//     },
//     cards : {
//         type : 'StructObject',    // T_StructObject有item也有attributes

//         attributes : {
//             count : 'Number'
//         },
//         item : {
//             type : 'StructObject',
//             item : {
//                 type : 'Struct',
//                 attributes : {
//                     id : {type:'String',notExport : true},
//                     count : 'Number'
//                 },
                
//             }
//         }
//     },
//     formationNames : {
//         type : 'StructArray',  //采用object来存数组，只追加id的object项，有一个专门的repair函数。每次登陆的时候修正object的id，例如{0:'1',1:'2',3:'4'},等同于['1','2','4'],
//         //没有defaultData选项，
//         item : {
//             type : 'StructObject',//只支持StructObject,StructArray,Struct
//             attributes : {
//                 count : 'Number'
//             },
//             item : 'String',
//         }
//     },
// }

// var manager = createEntityManager(test_attributes);
// var entity = manager.createEntity({});
// entity.isMan = true;
// entity.cards('asfsdf',true)('test',true).id = '12323';
// entity.cards('asfsdf',true)('test',true).count = 1024;
// console.log(JSON.stringify(entity.getChanges()));
// entity.level = 10;
// entity.convert.en = '123213';
// entity('cards')('test',true)('test_2',true).count = 10;
// entity.cards.test.test_2.id = 'serer';

// // entity._inspect();

// var entity2 = manager.createEntity({});
// entity2.mergeChanges(entity.getChanges());
// utils.inspect(entity2._data,10);

// entity.friends.push('sdfdee');
// entity.friends = [];


//
//// entity.convert.cn = '123213';
// console.log(entity.convert('en'));
// entity.convert('en','33333333');
// entity('convert').en
// console.log(entity('convert').en);
// console.log(entity.convert.keyForMe);
// entity.convert.tt();

// entity.en_to_cn('test1','value1');
// entity.en_to_cn.createItem('test2').test2 = '3234234';
// entity.en_to_cn('test2','333331111111');
// entity.en_to_cn.deleteItem('test1');
// console.log(entity.en_to_cn.hasItem('test1'));
// console.log(entity.en_to_cn.hasItem('test2'));
//entity.en_to_cn.test2 = '3333333333';
// console.log(entity.en_to_cn.hasItem('test1'));
// console.log(entity.en_to_cn.test2);

// entity.cards.count = 1;
// entity.cards.createItem('t1').t1.createItem('t2').id = 1;
// entity.cards.t1.t2.count = 10;

// for (var i=0; i< 10; i++) {
//     var item = entity.formationNames.newItem();
//     item.count = i*30;
//     entity.formationNames.push(item);
// }
// entity.formationNames.splice(1,1);
// entity.formationNames.splice(5,2);
// entity.formationNames.rebuildArray();

// console.log(entity.getChanges());
// entity.formationNames('0').count = 10;
// console.log(entity.getChanges());
// entity.formationNames('0').count = 0;
// console.log(entity.getChanges());
// entity.formationNames.splice(0,1);
// console.log(entity.getChanges());
// console.log(entity.formationNames('1').count);

// var item = entity.formationNames.newItem();
// var item2 = entity.formationNames.newItem();
// item.count = 10;
// item2.count = 20;
// //
// entity.formationNames.push(item2);
// entity.formationNames.push(item);
// entity.formationNames.splice(1,1);


// test_attributes._inspect();

// entity.releaseMe();
// test_attributes._inspect();



// console.log('new entity');
// entity = manager.createEntity({});
// entity.cards.count = 1;
// entity.cards.createItem('t1').t1.createItem('t2').id = 1;
// entity.cards.t1.t2.count = 10;

// var item = entity.formationNames.newItem();
// item.count = 10;
// test_attributes._inspect();
// var entity2 = manager.createEntity({});
// var ch = entity.getChanges();
// console.log(ch);
// entity2.mergeChanges(ch);
// console.log(entity2._data);

// entity.mergeChanges({l:30,convert:{cn:'sdfsdfsdfsdf'}});
// console.log(entity.level);

// entity.mergeChanges({l:30,convert:{cn:'sdfsdfsdfsdf'}});

// item.createItem('test').test = 'sdfsdfdsf';
// var item2 = entity.formationNames.newItem();
// item2.count = 20;
// var item3 = entity.formationNames.newItem();
// item3.count = 30;
// var item4 = entity.formationNames.newItem();
// item4.count = 100;
// var item5 = entity.formationNames.newItem();
// item5.count = 50;
// console.log(item5.getChanges());
// entity.formationNames.push(item2,item,item3,item4,item5);
// var o = entity.getChanges();
// console.log(o);
// entity.formationNames.reverse();
// var o = entity.getChanges();
// console.log(o);
// entity.formationNames('1');
// var o = entity.getChanges();
// console.log(o);
// entity.formationNames.splice(1,1);
// var o = entity.getChanges();
// console.log(o);


// entity.formationNames.forEach(function(i,item){
//     console.log(i);
//     console.log(item.count);
// });
// // entity.formationNames.reverse();
// entity.formationNames.forEach(function(i,item){
//     console.log(i);
//     if (item.count == 10)return true;
// });
// console.log(entity.formationNames('1').count);

// var item6 = entity.formationNames.newItem();
// item6.count = 60;
// entity.formationNames.unshift(item6);
// entity.formationNames.sort(function(a,b){
//     return  - a.count + b.count;
// });
//console.log(entity.formationNames.count());

//entity.releaseMe();
// entity._inspect();
// utils.inspect(entity._data,10);
// console.log(entity._data);


