'use strict';
/*
* 被proxy代理的物件，在被set時將effect記錄於中心化的追蹤名單裡(weakmap)；在被get時依序觸發(trigger)所有相應的effect
*/

var recole = function () {
    this.symbol_reactive = Symbol();
    this._beforeMap = new WeakMap();
    this.proxyMap = new WeakMap();
    this.targetMap = new WeakMap(); // storing objects of type "object" not "proxy"
    this.currentEffect = null;
    console.log("init");
};
recole.prototype.addBefore = function (target, before) { //設定trigger時要提前被執行的effect
    let set = this._beforeMap.get(target);// return object of type "Set"
    if (!set) {
        this._beforeMap.set(target, (set = new Set()));
    }
    set.add(before);
};
recole.prototype.track = function (target, key, options = {}) {
    if (this.escape_effect_flag) { return }
    target = this._2targetObj(target);

    if (this.currentEffect) {
        let depsMap = this.targetMap.get(target); 
        if (!depsMap) { // 先確立reactive object有被記錄在targetMap裡
            this.targetMap.set(target, (depsMap = new Map())); 
        }
        // 再依據reactive object底下的key抓到相應的effect set
        let dep = depsMap.get(key); // Get the current dependencies (effects) that need to be run when this is set
        if (!dep) { // 確立這個key也有相應的effect set
            depsMap.set(key, (dep = new Set()));
        }
        if (options.before) {
            this.addBefore(target, options.before);
        }
        dep.add(this.currentEffect);
    }
};
recole.prototype.cancel = function (target) { // 移除對特定的reactive物件的追蹤
    target = this._2targetObj(target);
    this._beforeMap.delete(target);
    this.targetMap.delete(target);

};

recole.prototype.trigger_before = function (target, key) { // 先不要理這個
    target = this._2targetObj(target);
    //==
    let beforeSet = this._beforeMap.get(target);
    if (beforeSet) {
        beforeSet.forEach((eff) => {
            eff();
        });
    }
};
recole.prototype.trigger = function (target, key) { // 處發所有被追蹤的trigger
    if (this.escape_effect_flag) { return }
    target = this._2targetObj(target);
    //==
    const depsMap = this.targetMap.get(target); // 先由object指過去
    if (!depsMap) {
        return
    }
    let dep = depsMap.get(key); // 再由key指過去，就可以抓到所有effect了
    if (dep) {
        dep.forEach((eff) => {
            // run them all
            eff();
        });
    }
};

recole.prototype.createReactive = function (target, _relation_obj = null, _cache_obj = null) {
    let _this = this;
    let relation_obj = _relation_obj
    let cache_obj = _cache_obj
    const handler = {

        get(target, key, receiver) { // 當reactive的值在this.effect裡被取用時，呼叫track函數將當下的effect塞到
            let result = Reflect.get(target, key, receiver);
            _this.track(target, key); // If this reactive property (target) is GET inside then track the effect to rerun on SET
            return result
        },
        set(target, key, value, receiver) {
            let oldValue = target[key];
            if ((oldValue != value)) {
                _this.trigger_before(target, key);
            }
            let result = Reflect.set(target, key, value, receiver);
            if (result && (oldValue != value)) {
                _this.trigger(target, key); // If this reactive property (target) has effects to rerun on SET, trigger them.
            }
            return result
        }
    };
    let _proxy = new Proxy(target, handler);
    let keys = Reflect.ownKeys(target);
    keys.forEach((_key) => {
        let el = target[_key];
        if (el
            && typeof el == "object"
            && !Array.isArray(el)
            && _key != "recole"
        ) {
            _this.effect(() => {
                _proxy[_key] = el.ref[el.key];//this.targetMap.get(el.ref)[el.key]
            });
        }
    });
    Object.setPrototypeOf(_proxy, {
        set_relation_obj: (new_relation_obj) => {
            relation_obj = new_relation_obj
        },
        set_cache_obj: (new_cache_obj) => {
            cache_obj = new_cache_obj
        },
        relation_obj: () => {
            return relation_obj
        },
        cache_obj: () => {
            return cache_obj
        }
    });

    this.proxyMap.set(_proxy, target);
    return _proxy
};
recole.prototype.effect = function (eff) { // 只有在effect裡宣告的函示會在proxy handler裡被啟動追蹤
    this.currentEffect = eff; // must be a function
    this.currentEffect();
    this.currentEffect = null;
    return eff
};
recole.prototype.escape_effect = function (aa) { // 先不要理他
    let rtn
    this.escape_effect_flag = true;
    if (typeof aa == "function") {
        rtn = aa()
    } else {
        rtn = aa
    }
    this.escape_effect_flag = null;
    return rtn
}
recole.prototype.ref = function (init_value = 0, _relation_obj = null, _cache_obj = null) { // 先不要理他，目前好像只用在computed裡
    let _this = this;
    let raw = init_value;
    let raw_old = init_value;
    let relation_obj = _relation_obj
    let cache_obj = _cache_obj
    const r = {
        get value() {
            _this.track(r, 'value');
            return raw
        },
        set value(newVal) {
            if (raw == newVal) {
                //raw_old = raw
                return;
            }
            //raw_old = raw
            raw = newVal;
            _this.trigger(r, 'value');
        },
        // failed design 
        getOld: () => {
            return raw_old
        },
        setOld: () => {
            raw_old = raw;
            return raw_old
        }
        // failed design end
    };
    Object.setPrototypeOf(r, {
        set_relation_obj: (new_relation_obj) => {
            relation_obj = new_relation_obj
        },
        set_cache_obj: (new_cache_obj) => {
            cache_obj = new_cache_obj
        },
        relation_obj: () => {
            return relation_obj
        },
        cache_obj: () => {
            return cache_obj
        }
    });
    return r
};
recole.prototype.computed = function (getter) {
    let result = this.ref();
    this.effect(() => (result.value = getter()));
    return result
};
recole.prototype.watch = function (target, eff, before, options = {}) { // 就跟vue的watch一樣，可以用來取代this.effect
    this.currentEffect = eff;
    if (options["first_effect"] == true) {
        eff();
    }
    let trackOptions = before ? { before: before } : {};
    let keys = Reflect.ownKeys(target);
    keys.forEach((_key) => {
        this.track(target, _key, trackOptions);
    });

    this.currentEffect = null;
};
recole.prototype._2targetObj = function (target) { //拿到原始的object
    return this.proxyMap.get(target) ? this.proxyMap.get(target) : target
};


// module.exports=recole
export default recole
