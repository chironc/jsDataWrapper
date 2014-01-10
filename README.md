jsDataWrapper
=============

###简介:

刚重构的版本，在我的手游项目中的使用场景是客户端和服务端交换数据，每次客户端请求，都会把服务端的玩家数据更新的部分下发的客户端，客户端可以合并到本地。以此保持客户端最新数据。同时为了减少传输和由于key－value数据库存贮，所以此工具还带有压缩数据的功能。

###特性:
    1. 预定义结构，可以清晰了解数据结构
    2. 支持数据长短key。即采用完整命名方式访问数据，但实际数据采用缩写存储。
       单独修改完整命名不影响存储数据，单独修改缩写等于重置数据。
    3. 支持过滤。如果不想下发给客户端的数据，可禁止下发。
    4. 对象模拟数组，减少每次数组变动下发大数据的问题。
    5. 带数据格式验证，赋值时验证。
    6. 支持结构中带方法，方法的this可访问当前节点的对象。
    7. 布尔采用0，1存储，压缩空间。
    8. 可以获取距离上一次访问之间的所有变动数据，并且可以合并数据。
    9. 当修改的数据等于默认数据，则会直接删除以数据量。
    10. 提供_inspect函数查看数据状态。
    11. 支持多级对象。
    12. 带对象重用管理，newItem出来的对象，如果没有插入带队列需要releaseMe(), 
        同理createEntity出来的对象可以通过releaseMe释放

###样例:

测试及样例在最下面的注视部分。


var attributes = {
    isMan : {                           //isMan将作为可访问名字。
        type : 'Boolean',               //表示isMan属性是布尔类型，布尔类型只支持设置值为true,false,'true','false',设置其他值将会抛出异常，区分大小写。
        shortKey : 'm',                 //实际数据采用m作为key，即{m:1}
        defaultData : true,             //如果没有这项，默认为false,当没有修改此属性值时，读取此项作为默认，同时不会存储到实际数据中。
        notExport : true,               //此项表示exportData或getChanges时不输出此项数据，可用于屏蔽一些服务端不希望给客户端看到的数据。
    },
    checkData : {                       //checkData将作为可访问名字。
        type : 'Function',              //表示checkData是一个函数。
        defaultData : function(){}      //如果没有这项，默认为 function(){};
    },
    checkData2 : function() {           //等同于上面的checkData
        this.isMan = true;              //this指针指向同级的对象。
    },
    level : {
        type : 'Number',                //表示数据的类型为数值。字符串将会尝试parseFloat转换。返回NaN则抛出异常。
        defaultData : 1                 //如果没有这项，默认为0
    },
    nickname : 'String',                //字符串类型，等同于nickname:{type:'String'},默认值为''。
    third_info : 'Object',              //简单对象类型。与上一行同理。默认值{}
    friends : 'Array',                  //简单数组类型，默认值:[],未实现更新算法，所以当数组发生改变，则会完整下发。不建议存储大数组。
    gameName : {
        type : 'Struct',                //带属性结构，必须同级存在attributes对象，
        attributes : {                  //此对象内容编写规范就是当前例子，即允许递归。对象的子对象的概念。
            en : 'String',
            cn : 'String'
        }
    },
    friends2 : {                        //带属性和任意key对象的结构，attributes可选，item可选，item默认为'String'即{type:'String'},item的编写规则等同于attributes下任意一项的内容。
        type : 'StructObject',          //例子是一个另一种方式表示好友，避免大数组，同时可以方便判断是否我的好友。
        item : {type:'Number',defaultData:1}
    },
    quests : {                          
        type : 'StructArray',           //用对象模拟的数组，
        item : {                        //必选项，表示每个元素的内容
            type : 'Struct',            //Struct，StructArray，StructObject三选一。
            //notExport : true,         //支持item带notExport标识表示不导出。
            attributes : {
                type : 'String',        //此type不属于我们结构中的关键字，是支持的。
                id   : 'String',
                time : 'Number',
                state: 'Number',
                "@x" : 'String',        //支持特殊命名。
                param : {
                    type : 'Object',
                    notExport : true
                }
            }
        }
    },
    cards : {                           //一个多层复杂例子  
        type : 'StructObject',          //StructObject同时支持attribute和item
        attributes : {
            count : 'Number',
        },
        item : {
            type : 'StructObject',
            attributes : {
                count : 'Number',
            },
            item : {
                type : 'Struct',
                attributes : {
                    id : {type:'String',notExport : true},
                    count : 'Number'
                },
                
            }
        }
    }
}

var createEntityManager = require('entity').createEntityManager;
var manager = createEntityManager(attributes);
var realStorage = {m:1};
var entity = manager.createEntity(realStorage);//从数据库读数据。创建对象。

console.log('entity.isMan == true :',entity.isMan == true);//m是数据缩写，对应的就是isMan。而boolean存储的是0,1，1表示true，
entity._inspect();//输出用长名词的对象结构，包含解析所有默认值，由于console.log(entity)只能输出一堆getter,setter,特意设计此函数。
console.log('entity._data == realStorage :',entity._data == realStorage);
console.log(realStorage,entity.exportData());//不完全一样。exportData根据notExport标记生成。
entity.level = 10;
var changeLog = entity.getChanges();//返回距离上一次getChanges后的改动。
console.log(changeLog);

var entity2 = manager.createEntity({});//创建一个新对象
entity2.mergeChanges(changeLog);//合并更新到另一个entity。例如客户端entity。或另一个服务器的entity。
entity2._inspect();

entity.third_info.platform = '360';
entity.third_info.account = 'xxxx';
entity._inspect();

entity.third_info = {
    platform : 'tongbu'
}
entity._inspect();

entity.gameName.cn = '好游戏';
entity.gameName.en = 'good game';
entity._inspect();

entity.friends.push('f1','f2');
entity._inspect();
entity.friends = [];
entity._inspect();

console.log('f1 is my friend:',!!entity.friends2['f1']);
entity.friends2.createItem('f1');//默认值为1
console.log('f1 is my friend:',!!entity.friends2['f1']);
entity.friends2.f1 = 0;//改0也是可以的。
entity.friends2('f2');//尝试访问f2，不存在返回undefined;
entity.friends2('f2',true);//不存在则创建，
entity._inspect();

console.log('quests.count:',entity.quests.count);
var item = entity.quests.newItem();
item.type = '每日任务';
item.id = '1';
item["@x"] = 'xxx';
item.param.testexport = true;
changeLog = item.getChanges();

var item2 = entity.quests.newItem(changeLog);//导出的数据
var item3 = entity.quests.newItem(item._data);//完整数据。
item3.id = '2';
entity.quests.push(item3,item2);
console.log('quests.count:',entity.quests.count);
entity._inspect();
item.releaseMe();//没有加入数组的entity需要释放自己，释放后item不能再用。


entity.cards.count++;
console.log(entity.cards.count);
entity.cards('武器卡',true)('鬼影刀',true).id = '12';
entity('cards')('武器卡')('鬼影刀').count = 10;
entity('cards')('武器卡').count = 1;
entity.cards('fangju_cards',true)('miansha',true).id = '12';
entity.cards.fangju_cards.miansha.count = 9;
entity._inspect();

console.log(entity.exportData());
console.log(entity._data);

