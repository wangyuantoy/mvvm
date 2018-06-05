function MyMVVM(options = {}) {
    this.$options = options; // 把所有属性挂载在$options
    let data = this._data = this.$options.data;
    observe(data);
    // this 代理了this._data
    for(let key in data){
        Object.defineProperty(this,key,{
            enumerable:true,
            get(){
                return this._data[key]
            },
            set(newVal){
                this._data[key] = newVal
            }
        })
    }
    initComputed.call(this);
    new Compile(options.el,this)
}
// 观察对象给对象增加ObjectDefineProperty
function Observe(data) { // 主要逻辑
    let dep = new Dep();
    for(let key in data){  // 把data属性通过Object.defineProperty()的方式 定义属性
        let val = data[key];
        observe(val);
        Object.defineProperty(data,key,{
            enumerable:true,
            get(){
                Dep.target && dep.addSub(Dep.target); // [watcher] 添加进队列
                return val
            },
            set(newVal){
                if(val === newVal) {
                    return;
                }
                val = newVal;
                observe(newVal);
                dep.notify() // 所有watcher的update方法执行
            }
        })
    }
}
function initComputed() { // computed具有缓存功能
    let vm = this;
    let computed = this.$options.computed; // 是一个对象
    Object.keys(computed).forEach(function (key) {
        Object.defineProperty(vm,key,{ // computed[key]
            get: typeof computed[key] === 'function'? computed[key] : computed[key].get,
            set(){

            }
        });
    })
}
function Compile(el,vm) {
    // el表示替换的范围
    // DOM中的节点塞入fragment时，原节点会被删除
    vm.$el = document.querySelector(el);
    let fragment = document.createDocumentFragment();
    while(child = vm.$el.firstChild){ // 获取到的元素节点 塞入fragment 在内存中操作
        fragment.appendChild(child)
    }

    replace(fragment);
    function replace(fragment){
        Array.from(fragment.childNodes).forEach(function (node) { // 类数组转换为数组，循环
            let text = node.textContent;
            let reg = /\{\{(.*)\}\}/;
            if(node.nodeType === 3 && reg.test(text)){ // 文本节点
                let arr = RegExp.$1.split('.');
                let val = vm;
                arr.forEach(function (k) { // 取this.a.a / this.b
                    val = val[k]
                });
                new Watcher(vm,RegExp.$1,function (newVal) {
                    node.textContent = text.replace(reg,newVal)
                });
                // 替换
                node.textContent = text.replace(reg,val) // 替换模板
            }
            if(node.nodeType === 1){ // DOM节点
                let nodeAttrs = node.attributes;
                Array.from(nodeAttrs).forEach(function (attr) {
                    let name = attr.name; //
                    let exp = attr.value;
                    if(name.indexOf("v-") === 0){
                        node.value = vm[exp];
                    }
                    new Watcher(vm,exp,function (newVal) {
                        node.value = newVal;//  当watcher触发时会自动将内容放到输入框内
                    });
                    node.addEventListener("input",function (e) {
                        let newVal = e.target.value;
                        vm[exp] = newVal
                    })
                })
            }
            if(node.childNodes){ // 节点递归
                replace(node)
            }
        });
    }
    vm.$el.appendChild(fragment)
}
function observe(data) {
    if(typeof data !== "object") return;
    return new Observe(data);
}

// vue特点：不能新增不存在的属性，不存在的属性不存在get和set
// 深度响应  以为每次赋予一个新对象是会给这个新对象增加数据劫持

// 发布订阅
function Dep() {
    this.subs = [];
}
Dep.prototype.addSub = function (sub) { // 订阅
    this.subs.push(sub)
};

Dep.prototype.notify = function () {
    this.subs.forEach(sub => sub.update())
};

// watcher
function Watcher(vm,exp,fn) { // Watcher是一个类， 通过这个类创建的实例都有update方法
    this.fn = fn;
    this.vm = vm;
    this.exp = exp;
    Dep.target = this;
    let val = vm;
    let arr = exp.split('.');
    arr.forEach(function (k) { // 目的是为了触发取值时的get方法，get方法中把watcher添加到队列里
        val = val[k]
    });
    Dep.target = null; // 添加成功后target置为null

}
Watcher.prototype.update = function () {
    let val =this.vm;
    let arr = this.exp.split('.');
    arr.forEach(function (k) {
        val = val[k]
    });
    this.fn(val);
};

