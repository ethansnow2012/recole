var recoi = require("./src/recoi")
let recoi1 = new recoi()
let product = recoi1.crecoieReactive({ price: 5, quantity: 2 })
let salePrice
let tempStr = ""
let tempStr2 = ""
let tempObj = {}
// test("",()=>{
//     expect().toBe()
// })

test("test case 1: reactive object test", ()=>{
    product.quantity = 3
    expect(
        product.quantity
    ).toBe(3)
})
test("test case 2: effect test",()=>{
    recoi1.effect(()=>{
        tempStr = `effect:${product.quantity}`
    })
    product.quantity = 10 // this should invoke the effect again
    expect(tempStr).toBe(`effect:10`)
})

test("test case 3: ref test",()=>{
    salePrice = recoi1.ref(0)
    recoi1.effect(()=>{ // the reactivity works via effect
        salePrice.value = product.price * 0.9
    })
    expect(salePrice.value).toBe(4.5) // product.price * 0.9 ===> 5 * 0.9 ===> 4.5
    product.price = 20 // set => trigger corresponding effect
    expect(salePrice.value).toBe(18) // product.price * 0.9 ===> 20 * 0.9 ===> 18
})

test("test case 4: computed test",()=>{
    let dutyPaidPrice = recoi1.computed(()=>{
        return salePrice.value + 10
    })
    expect(dutyPaidPrice.value).toBe(salePrice.value + 10)
    product.price += 1
    expect(dutyPaidPrice.value).toBe(salePrice.value + 10)
    salePrice.value = 10
    expect(dutyPaidPrice.value).toBe(20)
})
test("test case 5: watch on reactive obj",()=>{
    recoi1.watch(product, ()=>{
        tempStr = "watch1"
    })
    product.price += 1
    expect(tempStr).toBe(tempStr)
})
test("test case 6: reactive in reactive",()=>{
    let product2 = recoi1.crecoieReactive({ price: {ref: product, key: "price"}, quantity: 2 }) // declare object that is reactive with other reactive object
    product.price = 11
    expect(product2.price).toBe(11)
    product.price = product.price * 2 
    expect(product2.price).toBe(22)
})
test("test case 7: reactive object working with other ref",()=>{
    let product3 = recoi1.crecoieReactive({ price: {ref: salePrice, key: "value"}, quantity: 2 })
    salePrice.value = 77
    expect(product3.price).toBe(77)
    salePrice.value += 11
    expect(product3.price).toBe(88)
})
test("test case 8: Array init test",()=>{
    let array1 = recoi1.crecoieReactive({ theArray: [1,2,3,4,5]})
    
    recoi1.watch(array1, ()=>{
        tempObj = array1.theArray
    })
    array1.theArray[1]=10 // this did not triggered the effect above 
    expect(tempObj).not.toBe([1,10,3,4,5])
})
test("test case 9: Array init test 2",()=>{
    let array2_ref3 = recoi1.ref(3)
    let array2_ref4 = recoi1.ref(4)
    let array2_ref5 = recoi1.ref(5)
    let array2 = recoi1.crecoieReactive({ theArray: 
                                        [
                                            {ref: recoi1.ref(1), key: "value"}
                                            ,{ref: recoi1.ref(2), key: "value"}
                                            ,{ref: array2_ref3, key: "value"}
                                            ,{ref: array2_ref4, key: "value"}
                                            ,{ref: array2_ref5, key: "value"}
                                        ]
                                    })                             
    
    array2.theArray[1].value="xx"
    array2.theArray[2].value=10
    expect(array2.theArray[1].value).toBe("xx")
    expect(array2.theArray[2].value).toBe(10)
})
test("test case 10: ref in ref",()=>{
    let tc10_obj1 = {inner: recoi1.ref(1)}
    let tc10_block1 = recoi1.ref(tc10_obj1)
    tempStr = "111"
    tempStr2 = "222"
    recoi1.watch(tc10_block1, ()=>{
        tempStr = "tc11: watch1" // this should not be invoked
        
    })
    recoi1.watch(tc10_block1.value.inner, ()=>{
        tempStr2 = "tc11: watch2"
    })
    tc10_block1.value.inner.value = 10 // this should invoke the watch above
    expect(tempStr).not.toBe("tc11: watch1")
    expect(tempStr2).toBe("tc11: watch2")
})
test("test case 11: ref in ref in one declaration",()=>{
    let tc11_obj = recoi1.ref({ inner:recoi1.ref("hi") })
    tempStr=""
    recoi1.watch(tc11_obj.value.inner, ()=>{
        tempStr=tc11_obj.value.inner.value
    })
    tc11_obj.value.inner.value = 'hello'
    expect(tempStr).toBe('hello')
})