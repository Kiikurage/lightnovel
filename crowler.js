var request = require("request"),
    iconv = require("iconv-lite"),
    cheerio = require("cheerio"),
    fs = require("exfs"),
    path = require("path");

var Encoding = "utf-8",
    CacheFolder = "./cache/html/";
main("lightnovel")
    .then(function() {
        return main("lightnovel2")
    })
    .then(function() {
        return main("boyslove")
    })
    .then(function() {
        return main("literature")
    })
    .then(function() {
        return main("philosophy")
    })
    .catch(function(err) {
        console.log(err);
    });

function main(type) {
    var i = 1,
        d = Promise.defer(),
        results = [];

    function mainLoop() {
        if (i > 50) {
            results.sort();
            var cursor = 0;
            while (cursor < results.length) {
                while (results[cursor] === results[cursor + 1]) {
                    results.splice(cursor, 1);
                }
                cursor++;
            }
            fs.writeFileSync("./cache/data/" + type, results.join("\n"), true);
            return d.resolve();
        }

        var url;
        switch (type) {
            case "literature":
                url = "http://www.amazon.co.jp/s/ref=sr_pg_" + i +
                    "?rh=n%3A465392%2Cp_n_binding_browse-bin%3A86139051%2Cn%3A%21465610%2Cn%3A466284&page=" + i +
                    "&bbn=465610&sort=popularity-rank&ie=UTF8&qid=1410182851"
                break;

            case "lightnovel":
                url = "http://www.amazon.co.jp/s/ref=sr_pg_" + i +
                    "?rh=n%3A465392%2Cn%3A%21202188011%2Cn%3A2501045051%2Cn%3A2189052051%2Cn%3A2189055051%2Cp_6%3AAN1VRQENFRJN5&page=" + i +
                    "&sort=popularity-rank&ie=UTF8&qid=1410183205";
                break;

            case "lightnovel2":
                url = "http://www.amazon.co.jp/s/ref=sr_pg_" + i +
                    "?rh=n%3A465392%2Cn%3A%21202188011%2Cn%3A2501045051%2Cn%3A2189052051%2Cn%3A2189056051%2Cp_6%3AAN1VRQENFRJN5&page=" + i +
                    "&ie=UTF8&qid=1410273137"
                break;

            case "boyslove":
                url = "http://www.amazon.co.jp/s/ref=sr_pg_" + i +
                    "?rh=n%3A465392%2Cn%3A%21465610%2Cn%3A466280%2Cn%3A12075891%2Cp_6%3AAN1VRQENFRJN5&page=" + i +
                    "&ie=UTF8&qid=1410277684";
                break;

            case "philosophy":
                url = "http://www.amazon.co.jp/s/ref=lp_571582_pg_" + i +
                    "?rh=n%3A465392%2Cn%3A%21465610%2Cn%3A571582&page=" + i +
                    "&ie=UTF8&qid=1410278737";
                break;
        }

        getCache(url, i, type)
            .then(function(res) {
                results.push.apply(results, res.titles);
                i++;
                mainLoop();
            })
            .catch(d.reject);
    }
    mainLoop();

    return d.promise
}

function getCache(url, index, type) {
    return myRequest(url, "get", null, {
            index: index,
            type: type
        })
        .then(function(html) {
            var $ = cheerio.load(html),
                res = {};

            //titles
            var $titles = $(".newaps .lrg.bold"),
                titles = res.titles = [];
            for (var i = 0, max = $titles.length; i < max; i++) {
                var $title = $titles.eq(i),
                    title = $title.text().trim()
                    .replace("【Amazon.co.jp限定】", "")
                    .replace(/\(.*\)$/, "") //出版社名
                    .trim();
                titles.push(title);
            }

            //pagination
            var $pages = $(".pagnLink a"),
                nextURLs = res.nextURLs = [];
            for (var i = 0, max = $pages.length; i < max; i++) {
                var $page = $pages.eq(i);
                if ($page.hasClass(".a-disabled") || $page.hasClass(".a-selected")) {
                    continue;
                }

                res.nextURLs.push({
                    index: parseInt($page.text().trim()),
                    url: "http://www.amazon.co.jp" + $page.attr("href").trim()
                });
            }

            return res;
        })
}

function myRequest(uri, method, requestParams, cacheParams) {
    var escapedUri = uri.split("://")[1].split("?")[0],
        params = "";

    if (cacheParams) {
        Object.keys(cacheParams).forEach(function(key) {
            params += "-" + key + "." + cacheParams[key]
        });
    }

    var cachPath = CacheFolder + escapedUri + params + ".cache";

    return new Promise(function(resolve, reject) {
        fs.readFile(cachPath, "utf8", function(err, data) {
            if (err) {

                // Handle when cache isn't hit
                // request the resource.
                request[method]({
                    uri: uri,
                    form: requestParams,
                    encoding: null,
                }, function(err, res, body) {
                    if (!err && res.statusCode === 200) {
                        var encodedText = iconv.decode(body, Encoding);
                        fs.writeFile(cachPath, encodedText, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(encodedText);
                            }
                        }, true);
                    } else {
                        reject(err);
                    }
                });

            } else {

                // Handle when cache is hit
                resolve(data);

            }
        });
    });
}
