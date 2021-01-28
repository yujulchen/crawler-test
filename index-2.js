const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
const $ = require("jquery")(window);

const util = require('util');
const fs = require('fs');
const { stringify } = require('querystring');
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const axios = require('axios');
const { resolve } = require('path');
const { rejects } = require('assert');
const { resolve4 } = require('dns');
const { url } = require('inspector');

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

        arrLink[i]["productSpec"] = data2.productSpec;

        await writeJson();
    }
}

async function parseDetail (url) {
    console.log('url', url);

    let allData = {};
    let picsArray = [];

    await nightmare.goto('https://play.niceday.tw'+url).wait(1000);

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    let totalPics = $(html).find(".slick-list>.slick-track>.Carousel__ImgContainer-sc-17ibooh-4").length;
    console.log("totalPics", totalPics);
    
    for (i=0; i <= totalPics; i++){
        // let picsArray = [];
        // await nightmare.wait(500);

        let html2 = await nightmare.evaluate(()=>{
            return document.documentElement.innerHTML;
        })

        let picsInside = $(html2).find(".Carousel__ProductSlideImg-sc-17ibooh-5").eq(i).attr('src');
        console.log('picsInside', picsInside)


        if (picsInside != undefined){
        picsArray.push(picsInside)
        console.log('picsArray', picsArray);
        }
    }

    allData["pics"] = picsArray;

    await scrollPage();

    html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    let productSpec = {};

    let allProductSpec = $(html).find("#detailCkeditor > ul > li")

    allProductSpec.each(function(index, element){
        productSpec[$(this).find('strong').text()] = $(this).text();
    })

    allData["productSpec"] = productSpec;
    // console.log('productSpec', productSpec)

    console.log('allData', allData);

    return allData;
}

async function scrollPage(){
    console.log('scrollPage');

    let currentHeight = 0;
    let offset = 0;

    while(offset <= currentHeight){
        currentHeight = await nightmare.evaluate(()=>{
            return document.documentElement.scrollHeight;
        })

        offset += 500;
        await nightmare.scrollTo(offset, 0).wait(500);
    }
}

async function downloadImgs(){
    let data = JSON.parse(await readFile("output/activity.json"))
    // console.log('data', data);

    for (let i = 0; i < data.length; i++) {
        console.log('downloadImg i=', i);
        let rootDir = './img';
        if(!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);

        let keyword = './img/' + 'event';
        if(!fs.existsSync(keyword)) fs.mkdirSync(keyword);

        let picsDir = './img/event/'+ data[i].name.replace(/\//g,"");
        if(!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        for(let picNum = 0; picNum < data[i].pics.length; picNum++){
            const url = data[i].pics[picNum];
            const filename = picsDir + '/' + picNum +'.jpg';
            await downloadEachPic(url, filename);

        }
    }
}

const downloadEachPic = (url, filename)=>{
    axios({
        url,
        responseType: "stream"
    }).then(response => 
        new Promise((resolve, reject) => {
            response.data.pipe(fs.createWriteStream(filename))
            .on("finish", ()=>resolve())
            .on("error", e=>reject(e))
        })
    )
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
    // asyncArray([searchKeyword, parseHtml, getData, close]).then(async()=>{console.log('Done.')});
    asyncArray([downloadImgs]).then(async()=>{console.log('Done.')});
} catch(err) {
    console.log('err:', err)
}