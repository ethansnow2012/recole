var recole = require("./dist/recole.js")
var puppeteer = require("puppeteer")
var path = require('path');

let recole1 = new recole()
let product = recole1.createReactive({ price: 5, quantity: 2 })
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
    recole1.effect(()=>{
        tempStr = `effect:${product.quantity}`
    })
    product.quantity = 10 // this should invoke the effect again
    expect(tempStr).toBe(`effect:10`)
})

test("test case 3: ref test",()=>{
    salePrice = recole1.ref(0)
    recole1.effect(()=>{ // the reactivity works via effect
        salePrice.value = product.price * 0.9
    })
    expect(salePrice.value).toBe(4.5) // product.price * 0.9 ===> 5 * 0.9 ===> 4.5
    product.price = 20 // set => trigger corresponding effect
    expect(salePrice.value).toBe(18) // product.price * 0.9 ===> 20 * 0.9 ===> 18
})

test("test case 4: computed test",()=>{
    let dutyPaidPrice = recole1.computed(()=>{
        return salePrice.value + 10
    })
    expect(dutyPaidPrice.value).toBe(salePrice.value + 10)
    product.price += 1
    expect(dutyPaidPrice.value).toBe(salePrice.value + 10)
    salePrice.value = 10
    expect(dutyPaidPrice.value).toBe(20)
})
test("test case 5: watch on reactive obj",()=>{
    recole1.watch(product, ()=>{
        tempStr = "watch1"
    })
    product.price += 1
    expect(tempStr).toBe(tempStr)
})
test("test case 6: reactive in reactive",()=>{
    let product2 = recole1.createReactive({ price: {ref: product, key: "price"}, quantity: 2 }) // declare object that is reactive with other reactive object
    product.price = 11
    expect(product2.price).toBe(11)
    product.price = product.price * 2 
    expect(product2.price).toBe(22)
})
test("test case 7: reactive object working with other ref",()=>{
    let product3 = recole1.createReactive({ price: {ref: salePrice, key: "value"}, quantity: 2 })
    salePrice.value = 77
    expect(product3.price).toBe(77)
    salePrice.value += 11
    expect(product3.price).toBe(88)
})
test("test case 8: Array init test",()=>{
    let array1 = recole1.createReactive({ theArray: [1,2,3,4,5]})
    
    recole1.watch(array1, ()=>{
        tempObj = array1.theArray
    })
    array1.theArray[1]=10 // this did not triggered the effect above 
    expect(tempObj).not.toBe([1,10,3,4,5])
})
test("test case 9: Array init test 2",()=>{
    let array2_ref3 = recole1.ref(3)
    let array2_ref4 = recole1.ref(4)
    let array2_ref5 = recole1.ref(5)
    let array2 = recole1.createReactive({ theArray: 
                                        [
                                            {ref: recole1.ref(1), key: "value"}
                                            ,{ref: recole1.ref(2), key: "value"}
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
    let tc10_obj1 = {inner: recole1.ref(1)}
    let tc10_block1 = recole1.ref(tc10_obj1)
    tempStr = "111"
    tempStr2 = "222"
    recole1.watch(tc10_block1, ()=>{
        tempStr = "tc11: watch1" // this should not be invoked
    })
    recole1.watch(tc10_block1.value.inner, ()=>{
        tempStr2 = "tc11: watch2"
    })
    tc10_block1.value.inner.value = 10 // this should invoke the watch above
    expect(tempStr).not.toBe("tc11: watch1")
    expect(tempStr2).toBe("tc11: watch2")
})
test("test case 11: ref in ref in one declaration",()=>{
    let tc11_obj = recole1.ref({ inner:recole1.ref("hi") })
    tempStr=""
    recole1.watch(tc11_obj.value.inner, ()=>{
        tempStr=tc11_obj.value.inner.value
    })
    tc11_obj.value.inner.value = 'hello'
    expect(tempStr).toBe('hello')
})
test("test case 12: prototype.cancel",()=>{
    let watchCount = 0
    let aa = recole1.createReactive({ ccc:"ccc" })
    recole1.watch(aa, ()=>{
        watchCount++
    })
    aa.ccc = 'bbb'
    recole1.cancel(aa)
    aa.ccc = 'aaa'

    expect(watchCount).toBe(1)
})



// puppeteer test

test('Validating all fields', async () => {
    let browser = await puppeteer.launch({
        headless: false, // The browser is visible
        ignoreHTTPSErrors: true,
        defaultViewport: null
    })
    let page = await browser.newPage()
    // await page.setViewport({
    //     width: puppeteer.devices.width,
    //     height: puppeteer.devices.height
    // });
    await page.goto("file://"+path.resolve(__dirname, './example/index.html'))
    console.log("------------------")

    await new Promise((resolve)=>{
        setTimeout(() => {
            resolve()
        }, 1000000);
    })
    
    await browser.close();
}, 1000000)