var recole = function(){
    this.symbol_reactive = Symbol()
    this._beforeMap = new WeakMap();
    //this.effMap = new WeakMap();
    this.proxyMap = new WeakMap();
    this.targetMap = new WeakMap(); // storing objects of type "object" not "proxy"
    this.currentEffect = null;
    console.log("init");
};
recole.prototype.addBefore = function(target, before){
    let set = this._beforeMap.get(target)// return object of type "Set"
    if (!set) {
        this._beforeMap.set(target, (set = new Set()))
    }
    set.add(before)
}
recole.prototype.track = function(target, key,options={}) {
    
    target = this._2targetObj(target)
    if (this.currentEffect) {
        let depsMap = this.targetMap.get(target) // Get the current depsMap for this target
        if (!depsMap) {
            // There is no map.
            this.targetMap.set(target, (depsMap = new Map())) // Crecolee one
        }
        let dep = depsMap.get(key) // Get the current dependencies (effects) that need to be run when this is set
        if (!dep) {
            // There is no dependencies (effects)
            depsMap.set(key, (dep = new Set())) // Crecolee a new Set
        }
        if(options.before){
            this.addBefore(target, options.before)
        }
        //this.effMap.set(this.currentEffect, this.currentEffect)
        dep.add(this.currentEffect)
    }
}
recole.prototype.cancel = function(target){
    target = this._2targetObj(target);
    this._beforeMap.delete(target);
    this.targetMap.delete(target);
    
}

recole.prototype.trigger_before = function(target, key) {
    target = this._2targetObj(target)
    //==
    let beforeSet = this._beforeMap.get(target)
    if(beforeSet){
        beforeSet.forEach((eff)=>{
            eff()
        })
    }
}
recole.prototype.trigger = function(target, key) {
    
    target = this._2targetObj(target)
    //==
    const depsMap = this.targetMap.get(target) // Does this object have any properties that have dependencies (effects)
    if (!depsMap) {
        return
    }
    let dep = depsMap.get(key) // If there are dependencies (effects) associated with this
    if (dep) {
        dep.forEach((eff) => {
            // run them all
            eff()
        })
    }
}

recole.prototype.createReactive = function (target)  {
    let _this = this
    const handler = {
        
        get(target, key, receiver) {
            let result = Reflect.get(target, key, receiver)
            _this.track(target, key) // If this reactive property (target) is GET inside then track the effect to rerun on SET
            return result
        },
        set(target, key, value, receiver) {
            let oldValue = target[key]
            if (oldValue != value) {
                _this.trigger_before(target, key) 
            }
            let result = Reflect.set(target, key, value, receiver)
            if (result && oldValue != value) {
                _this.trigger(target, key) // If this reactive property (target) has effects to rerun on SET, trigger them.
            }
            return result
        },
    }
    let _proxy = new Proxy(target, handler)
    let keys = Reflect.ownKeys(target)
    keys.forEach((_key)=>{
        let el =target[_key]
        if(el 
           && typeof el == "object"
           && !Array.isArray(el)
        ){
            _this.effect(()=>{
                _proxy[_key] = el.ref[el.key]//this.targetMap.get(el.ref)[el.key]
            })
        }
    })
    this.proxyMap.set(_proxy,target)
    return _proxy
}
recole.prototype.effect = function (eff) {
    this.currentEffect = eff // must be a function
    this.currentEffect()
    this.currentEffect = null
    return eff
}
recole.prototype.ref = function (init_value=0) {
    let _this = this
    let raw = init_value
    let raw_old = init_value
    const r = {  
        get value() {
            _this.track(r, 'value')
            return raw 
        },
        set value(newVal) {
            if(raw == newVal){
                //raw_old = raw
                return;
            }
            //raw_old = raw
            raw = newVal
            _this.trigger(r, 'value')
        },

        // failed design 
        getOld: ()=>{ 
            return raw_old 
        },
        setOld: ()=>{
            raw_old = raw
            return raw_old 
        }
        // failed design end
    }
    return r
}
recole.prototype.computed = function (getter) {
    let result = this.ref()
    this.effect(() => (result.value = getter()))
    return result
}
recole.prototype.watch = function(target, eff, before, options={}){
    //let _this = this

    this.currentEffect = eff
    if(options["first_effect"]==true){
        eff()
    }
    let trackOptions = before?{before:before}:{}
    let keys = Reflect.ownKeys(target)
    keys.forEach((_key)=>{
        this.track(target,_key, trackOptions)
    })
    
    this.currentEffect = null
}
recole.prototype._2targetObj = function(target){
    return this.proxyMap.get(target)?this.proxyMap.get(target):target
}

// module.exports=recole
export default recole