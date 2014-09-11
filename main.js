var fs = require("exfs");

var TokenizedFilePath = "./parsedData/tokenized",
    Max = 30;

var dict;

initialize()
    .then(function() {
        var d = Promise.defer(),
            i = 0;

        function mainLoop() {
            console.log(create());
            if (++i < Max) {
                return mainLoop();
            } else {
                return d.resolve();
            }
        }
        mainLoop();

        return d.promise;
    })
    .catch(function(err) {
        console.error(err);
    });

function create() {
    var result = [],
        seedItems = dict[parseInt(dict.length * Math.random())],
        item1 = seedItems[0],
        item2 = seedItems[1],
        item3 = seedItems[2],
        offset = 0,
        item4;
    // console.log(item1, item2, item3);

    while (item3) {
        result.push(item1.word);
        item4 = searchNextWordByThreeWords(item1, item2, item3, offset);
        if (!item4) {
            result.push(item2.word);
            result.push(item3.word);
            break
        }

        item1 = item2;
        item2 = item3;
        item3 = item4;
        offset++;
    }

    return result.join("");
}

function initialize() {
    var d = Promise.defer();

    fs.readFile(TokenizedFilePath, function(err, data) {
        if (err) {
            d.reject(err);
        } else {
            var lines = data.toString("utf8").split("\n"),
                l = 0,
                max = lines.length,
                result = [],
                totalWordCount = 0;

            while (l < max) {
                var items = [];

                result.push(items);

                while (true) {
                    var line = lines[l],
                        tokens = line.split("\t");

                    l++;

                    if (tokens.length !== 2) {
                        break;
                    }

                    var word = tokens[0],
                        attr = tokens[1].split(",");

                    if (attr[0] === "記号") {
                        if (items.length) {
                            var lastItem = items.pop();
                            lastItem.word += word;
                            items.push(lastItem);
                        }

                        continue;
                    }

                    items.push({
                        word: word,
                        attr: attr
                    });
                    totalWordCount++;
                }
            }

            console.log("data load complete (count: %d)", totalWordCount);
            dict = result;
            d.resolve();
        }
    });

    return d.promise;
}

function searchNextWordByThreeWords(item1, item2, item3, offset) {
    var result = [],
        subResult = [];

    for (var i = 0, max = dict.length; i < max; i++) {

        var items = dict[i];

        for (var j = offset, max2 = items.length - 3; j < max2; j++) {

            var _item1 = items[j],
                _item2 = items[j + 1],
                _item3 = items[j + 2];

            if (item1.attr[0] === _item1.attr[0] &&
                item2.word === _item2.word &&
                item2.attr[0] === _item2.attr[0] &&
                item3.word === _item3.word &&
                item3.attr[0] === _item3.attr[0]) {
                subResult.push(items[j + 3]);
                continue;
            }

            if (item1.word === _item1.word &&
                item1.attr[0] === _item1.attr[0] &&
                item2.attr[0] === _item2.attr[0] &&
                item3.word === _item3.word &&
                item3.attr[0] === _item3.attr[0]) {
                subResult.push(items[j + 3]);
                continue;
            }

            if (item1.word === _item1.word &&
                item1.attr[0] === _item1.attr[0] &&
                item2.word === _item2.word &&
                item2.attr[0] === _item2.attr[0] &&
                item3.attr[0] === _item3.attr[0]) {
                subResult.push(items[j + 3]);
                continue;
            }

        }
    }
    return subResult.length ?
        subResult[parseInt(Math.random() * subResult.length)] :
        result.length ?
        result[parseInt(Math.random() * result.length)] :
        false;
}
