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
        return true;
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
        return true;
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
        return true;
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
        return true;
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
        return true;
    }
    function createStructProperty(entity,prop,attr,configurable) {
        //var sub_changes = entity._sub_changes;
        var sub_entity_list = entity._sub_entity_list;
        var key = attr.shortKey || prop;
        shortKeyToWholeKey[key] = prop;
        wholeKeyToShortKey[prop] = key;
        typeForKey[prop] = 'Struct';
        if (!attr.attributes || !utils.isObject(attr.attributes))
            throw 'attributes 必须存在';
        var subManager = createEntityManager(attr.attributes,undefined,prop);
        utils.defineGetOnlyProperty(entity, prop, function () {
            if (!this._data[key])
                this._data[key] = {};
            //sub_changes[key] = prop;
            sub_entity_list[prop] = sub_entity_list[prop] || subManager.createEntity(this._data[key]);
            return sub_entity_list[prop];
        },true,configurable || false);
        return true;
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
        return true;
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
                this.splice.apply(this,[this.count,0].concat(Array.prototype.slice.call(arguments,0)));
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
            // count : function() {
            //     return this._i.length;
            // },
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
        return true;
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
                createBooleanProperty(entity,key,item,true) && utils.isBoolean(newVal) && (entity[key] = newVal);
            else if (type === 'Number')
                createNumberProperty(entity,key,item,true) && utils.isNumber(newVal) && (entity[key] = newVal);
            else if (type === 'String')
                createStringProperty(entity,key,item,true) && utils.isString(newVal) && (entity[key] = newVal);
            else if (type === 'Object')
                createObjectProperty(entity,key,item,true) && utils.isObject(newVal) && (entity[key] = newVal);
            else if (type === 'Array')
                createArrayProperty(entity,key,item,true) && utils.isArray(newVal) && (entity[key] = newVal);
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
    function createCountProperty(entity) {
        function count() {
            return entity._data._i.length;
        }
        utils.defineGetOnlyProperty(entity,'count',count,false,false);//不可写，不可枚举，可修改配置。
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
            createCountProperty(entity);
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



// var attributes = {
//     isMan : {                           //isMan将作为可访问名字。
//         type : 'Boolean',               //表示isMan属性是布尔类型，布尔类型只支持设置值为true,false,'true','false',设置其他值将会抛出异常，区分大小写。
//         shortKey : 'm',                 //实际数据采用m作为key，即{m:1}
//         defaultData : true,             //如果没有这项，默认为false,当没有修改此属性值时，读取此项作为默认，同时不会存储到实际数据中。
//         notExport : true,               //此项表示exportData或getChanges时不输出此项数据，可用于屏蔽一些服务端不希望给客户端看到的数据。
//     },
//     checkData : {                       //checkData将作为可访问名字。
//         type : 'Function',              //表示checkData是一个函数。
//         defaultData : function(){}      //如果没有这项，默认为 function(){};
//     },
//     checkData2 : function() {           //等同于上面的checkData
//         this.isMan = true;              //this指针指向同级的对象。
//     },
//     level : {
//         type : 'Number',                //表示数据的类型为数值。字符串将会尝试parseFloat转换。返回NaN则抛出异常。
//         defaultData : 1                 //如果没有这项，默认为0
//     },
//     nickname : 'String',                //字符串类型，等同于nickname:{type:'String'},默认值为''。
//     third_info : 'Object',              //简单对象类型。与上一行同理。默认值{}
//     friends : 'Array',                  //简单数组类型，默认值:[],未实现更新算法，所以当数组发生改变，则会完整下发。不建议存储大数组。
//     gameName : {
//         type : 'Struct',                //带属性结构，必须同级存在attributes对象，
//         attributes : {                  //此对象内容编写规范就是当前例子，即允许递归。对象的子对象的概念。
//             en : 'String',
//             cn : 'String'
//         }
//     },
//     friends2 : {                        //带属性和任意key对象的结构，attributes可选，item可选，item默认为'String'即{type:'String'},item的编写规则等同于attributes下任意一项的内容。
//         type : 'StructObject',          //例子是一个另一种方式表示好友，避免大数组，同时可以方便判断是否我的好友。
//         item : {type:'Number',defaultData:1}
//     },
//     quests : {                          
//         type : 'StructArray',           //用对象模拟的数组，
//         item : {                        //必选项，表示每个元素的内容
//             type : 'Struct',            //Struct，StructArray，StructObject三选一。
//             //notExport : true,         //支持item带notExport标识表示不导出。
//             attributes : {
//                 type : 'String',        //此type不属于我们结构中的关键字，是支持的。
//                 id   : 'String',
//                 time : 'Number',
//                 state: 'Number',
//                 "@x" : 'String',        //支持特殊命名。
//                 param : {
//                     type : 'Object',
//                     notExport : true
//                 }
//             }
//         }
//     },
//     cards : {                           //一个多层复杂例子  
//         type : 'StructObject',          //StructObject同时支持attribute和item
//         attributes : {
//             count : 'Number',
//         },
//         item : {
//             type : 'StructObject',
//             attributes : {
//                 count : 'Number',
//             },
//             item : {
//                 type : 'Struct',
//                 attributes : {
//                     id : {type:'String',notExport : true},
//                     count : 'Number'
//                 },
                
//             }
//         }
//     }
// }

// //var createEntityManager = require('entity').createEntityManager;
// var manager = createEntityManager(attributes);
// var realStorage = {m:1};
// var entity = manager.createEntity(realStorage);//从数据库读数据。创建对象。

// console.log('entity.isMan == true :',entity.isMan == true);//m是数据缩写，对应的就是isMan。而boolean存储的是0,1，1表示true，
// entity._inspect();//输出用长名词的对象结构，包含解析所有默认值，由于console.log(entity)只能输出一堆getter,setter,特意设计此函数。
// console.log('entity._data == realStorage :',entity._data == realStorage);
// console.log(realStorage,entity.exportData());//不完全一样。exportData根据notExport标记生成。
// entity.level = 10;
// var changeLog = entity.getChanges();//返回距离上一次getChanges后的改动。
// console.log(changeLog);

// var entity2 = manager.createEntity({});//创建一个新对象
// entity2.mergeChanges(changeLog);//合并更新到另一个entity。例如客户端entity。或另一个服务器的entity。
// entity2._inspect();

// entity.third_info.platform = '360';
// entity.third_info.account = 'xxxx';
// entity._inspect();

// entity.third_info = {
//     platform : 'tongbu'
// }
// entity._inspect();

// entity.gameName.cn = '好游戏';
// entity.gameName.en = 'good game';
// entity._inspect();

// entity.friends.push('f1','f2');
// entity._inspect();
// entity.friends = [];
// entity._inspect();

// console.log('f1 is my friend:',!!entity.friends2['f1']);
// entity.friends2.createItem('f1');//默认值为1
// console.log('f1 is my friend:',!!entity.friends2['f1']);
// entity.friends2.f1 = 0;//改0也是可以的。
// entity.friends2('f2');//尝试访问f2，不存在返回undefined;
// entity.friends2('f2',true);//不存在则创建，
// entity._inspect();

// console.log('quests.count:',entity.quests.count);
// var item = entity.quests.newItem();
// item.type = '每日任务';
// item.id = '1';
// item["@x"] = 'xxx';
// item.param.testexport = true;
// changeLog = item.getChanges();

// var item2 = entity.quests.newItem(changeLog);//导出的数据
// var item3 = entity.quests.newItem(item._data);//完整数据。
// item3.id = '2';
// entity.quests.push(item3,item2);
// console.log('quests.count:',entity.quests.count);
// entity._inspect();
// item.releaseMe();//没有加入数组的entity需要释放自己，释放后item不能再用。


// entity.cards.count++;
// console.log(entity.cards.count);
// entity.cards('武器卡',true)('鬼影刀',true).id = '12';
// entity('cards')('武器卡')('鬼影刀').count = 10;
// entity('cards')('武器卡').count = 1;
// entity.cards('fangju_cards',true)('miansha',true).id = '12';
// entity.cards.fangju_cards.miansha.count = 9;
// entity._inspect();

// console.log(entity.exportData());
// console.log(entity._data);

