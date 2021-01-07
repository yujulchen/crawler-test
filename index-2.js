const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
const $ = require("jquery")(window);

const util = require('util');
const fs = require('fs');
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

let arrLink = [];

// callback 會變成巢狀
// promise 會接.then...
// async await 等A做完再做後面的

async function searchKeyword () {
    console.log('start to searching...');
    await nightmare
    .goto('https://play.niceday.tw/category/19?keyword=&category=19&page=1&sort=popular&area=all&tags=none&price_from=0&price_to=100000&start_date=1000-01-01&end_date=3000-12-31')
    .wait(1000)
    .catch(error => {
      console.error('Search failed:', error)
    })
}

async function parseHtml(){
    console.log('parseHtml')

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    let count = 0

    $(html).find('.ProductCard__Card-sc-1vcdm7s-13').each((index, element)=>{
        let name = $(element).find('.ProductCard__Title-sc-1vcdm7s-8').text();
        let description = $(element).find('.ProductCard__Description-sc-1vcdm7s-12').text();
        let location = $(element).find('.ProductCard__Location-sc-1vcdm7s-5').text();
        let href = $(element).closest('a').attr('href');
        // console.log('name', name);
        // console.log('description', description);
        // console.log('location', location);
        // console.log('href', href);

        let obj = {};
        obj.name = name;
        // console.log('name',JSON.stringify(obj))
        obj.description = description;
        // console.log('description',JSON.stringify(obj))
        obj.location = location;
        // console.log('location',JSON.stringify(obj))
        obj.href = href;
        // console.log('href',JSON.stringify(obj))

        arrLink.push(obj);
    });

    // console.log('arr',JSON.stringify(arrLink));
    await writeJson();
}

async function getData () {
    console.log('getData');

    let data = JSON.parse(await readFile("output/activity.json"))
    console.log('data', data);

    for (let i = 0; i < data.length; i++) {
        const data2 = await parseDetail(data[i].href);

        arrLink[i]["pics"] = data2.pics;
    }

    await writeJson();

}

// TODO:
async function parseDetail (url) {
    console.log('url', url);

    let allData = {};
    let picsArray = [];

    await nightmare.goto('https://play.niceday.tw'+url).wait(1000);

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    let totalPics = $(html).find(".slick-list>.slick-track>.Carousel__ImgContainer-sc-17ibooh-4>img").length;
    console.log("totalPics", totalPics);

    for (i=0; i <= totalPics; i++){
        let html2 = await nightmare.evaluate(()=>{
            return document.documentElement.innerHTML;
        })


        if ($(html2).find(".Carousel__ProductSlideImg-sc-17ibooh-5").attr('src') != undefined){
        picsArray.push($(html2).find(".Carousel__ProductSlideImg-sc-17ibooh-5").attr('src'))
        console.log('picsArray', picsArray);
        }
    }

    allData["pics"] = picsArray;

    console.log('allData', allData);

    return allData;
}

async function scrollPage(){
    console.log('scrollPage');

    let currentHeight = 0;
}


async function writeJson () {
    if (!fs.existsSync("output")) {
        await mkdir("output", {recursive: true})
    }

    console.log('arr2',arrLink)

    await writeFile (
        "output/" + "activity.json",
        JSON.stringify(arrLink)
    )
}

async function close () {
    await nightmare.end((err)=>{
        if (err) throw err;
        console.log('Nightmare is closed.')
    })
}

async function asyncArray(functionList) {
    for (let func of functionList) {
        // ↑ func：代名詞，承接functionList的value，ex:[searchKeyword, close]
        await func();
        // ↑ 名稱後面帶()，表示執行這個函數，ex:將func替換成value－>執行searchKeyword()
    }
}
``
try {
    asyncArray([searchKeyword, parseHtml, getData, close]).then(async()=>{console.log('Done.')});
} catch(err) {
    console.log('err:', err)
}