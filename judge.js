/**
 *
 *  ライトノベルっぽさを判定する
 *
 */

/**
 *  (例)
 * wordCountTable = {
 *      "名詞": {
 *          "俺": {
 *              inLightNovel: 50,
 *              inOthers: 30
 *          },
 *          "妹": {
 *              inLightNovel: 30,
 *              inOthers: 0
 *          },
 *          ...
 *      },
 *      "形容詞": {
 *          ...
 *      },
 *      ...
 *  };
 */
var mecabjs = require("../mecabjs"),
    fs = require("exfs");

var DataSetPath = {
        LightNovel: "./dataset/lightnovel",
        Others: "./dataset/others"
    },
    Border = 90;

var Type = {
    LightNovel: 1,
    Others: 2
};

var wordTable = {},
    categoryTable = {
        lightNovel: 0,
        others: 0,
        total: 0
    },
    titleList = {
        lightNovel: [],
        others: []
    },
    output = {
        wordTable: wordTable,
        categoryTable: categoryTable,
        titleList: titleList
    };

function learnByTokenizedItem(item, type) {
    var attr = item.attr,
        word = attr[6] === "*" ? item.word : attr[6],
        wordType = attr[0] + attr[1] + attr[2];

    if (attr[0] === "記号") {
        return
    }

    var typedWordTable = wordTable[wordType];
    if (!typedWordTable) {
        typedWordTable = {}
        wordTable[wordType] = typedWordTable;
    }

    var wordData = typedWordTable[word];
    if (!wordData) {
        wordData = {
            word: word,
            attr: attr,
            wordType: wordType,
            lightNovel: 0,
            others: 0
        };
        typedWordTable[word] = wordData;
    }

    switch (type) {
        case Type.LightNovel:
            wordData.lightNovel++;
            categoryTable.lightNovel++;
            categoryTable.total++;
            break;

        case Type.Others:
            wordData.others++;
            categoryTable.others++;
            categoryTable.total++;
            break;
    }

    // console.log("学習: %s -> タイプ: %s", word,
    // type === Type.LightNovel ? "LightNovel" : "Others");
}

function learnByText(text, type) {

    switch (type) {
        case Type.LightNovel:
            titleList.lightNovel.push(text);
            break;

        case Type.Others:
            titleList.others.push(text);
            break;
    }

    return tokenize(text)
        .then(function(items) {
            for (var i = 0, max = items.length; i < max; i++) {
                learnByTokenizedItem(items[i], type);
            }
        });
}

function learnByFile(path, type) {
    return new Promise(function(resolve, reject) {
            fs.readFile(path, "utf8", function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        })
        .then(function(data) {
            var defer = Promise.defer(),
                lines = data.split("\n"),
                lineCount = 0,
                max = lines.length,
                mainLoop = function() {
                    if (lineCount >= max) {
                        return defer.resolve();
                    }

                    learnByText(lines[lineCount], type)
                        .then(function() {
                            lineCount++;
                            mainLoop(lineCount);
                        })
                        .catch(function(err) {
                            defer.reject(err);
                        });
                }

            mainLoop();

            return defer.promise;
        })
}

function tokenize(text) {
    return mecabjs.input(text);
}

function judge(text) {
    return tokenize(text)
        .then(judgeByTokenizedItems);
}

function judgeWord(wordData) {
    var attr = wordData.attr,
        word = attr[6] === "*" ? wordData.word : attr[6],
        wordType = attr[0] + attr[1] + attr[2];
    typedWordTable = wordTable[wordType];

    if (!typedWordTable) {
        typedWordTable = {};
        wordTable[wordType] = typedWordTable;
    }

    var datasetWordData = typedWordTable[word];

    if (!datasetWordData) {
        datasetWordData = {
            word: word,
            attr: attr,
            lightNovel: 0,
            others: 0
        };
        typedWordTable[word] = datasetWordData;
    }

    return {
        word: word,
        attr: attr,
        lightNovel: (datasetWordData.lightNovel + 1) / categoryTable.lightNovel,
        others: (datasetWordData.others + 1) / categoryTable.others,
    };
}

function judgeByTokenizedItems(tokenizedItems) {
    var res = {};

    var categories = res.categories = {
            lightNovel: categoryTable.lightNovel / categoryTable.total,
            others: categoryTable.others / categoryTable.total
        },
        summary = res.summary = {
            lightNovel: Math.log(categories.lightNovel),
            others: Math.log(categories.others)
        },
        wordDatas = res.wordDatas = [];

    for (var i = 0, max = tokenizedItems.length; i < max; i++) {
        var item = judgeWord(tokenizedItems[i]);

        wordDatas.push(item);

        res.summary.lightNovel += Math.log(item.lightNovel);
        res.summary.others += Math.log(item.others);
    }
    res.summary.lightNovel = Math.exp(res.summary.lightNovel);
    res.summary.others = Math.exp(res.summary.others);

    return res;
}

learnByFile(DataSetPath.LightNovel, Type.LightNovel)
    .then(function() {
        return learnByFile(DataSetPath.Others, Type.Others);
    })
    .then(function() {
        fs.writeFileSync("./output.json", JSON.stringify(output), true);
        console.log("学習完了。入力をどうぞ。");
    })
    .catch(function(err) {
        console.error(err);
    });

process.stdin.setEncoding("utf8");
process.stdin.on("data", function(data) {
    var title = data.replace("\n", ""),
        mainLoop = function() {
            judge(title)
                .then(function(res) {
                    var total = res.summary.lightNovel + res.summary.others,
                        possibility = res.summary.lightNovel * 100 / total;

                    console.log("入力されたタイトル: %s", title);
                    console.log("ライトノベルっぽさ: %d%", possibility);

                    if (possibility > Border) {
                        return console.log("終了");
                    }
                    //一番邪魔な単語を探す
                    var worstWordData = {
                        word: "",
                        lightNovel: 1,
                        attr: [],
                        others: 0
                    };
                    for (var i = 0, max = res.wordDatas.length; i < max; i++) {
                        var wordData = res.wordDatas[i];

                        if (wordData.lightNovel < worstWordData.lightNovel) {
                            worstWordData = wordData;
                        }
                    }

                    //提案する新単語
                    var newWordType = worstWordData.attr[0] + worstWordData.attr[1] + worstWordData.attr[2],
                        newTypedWordTable = wordTable[newWordType],
                        newWordList = Object.keys(newTypedWordTable),
                        newWordIndex, newWord, newWordData;

                    if (newWordList.length === 0) {
                        console.log("これ以上良い方法が見つかりませんでした。");
                        return;
                    }

                    var i = 100;
                    while (--i) {
                        newWordIndex = parseInt(Math.random() * newWordList.length);
                        newWord = newTypedWordTable[newWordList[newWordIndex]];
                        newWordData = judgeWord(newWord);

                        if (newWordData.lightNovel > worstWordData.lightNovel) {
                            break;
                        }

                        newWord = null;
                    }
                    if (!newWord) {
                        console.log("これ以上良い方法が見つかりませんでした。");
                        return;
                    }

                    if (worstWordData.attr[0] === "名詞" && Math.random() > 0.9) {
                        if (newWordIndex === newWordList.length - 1) {
                            newWordIndex = -1;
                        }
                        newWordData.word = newTypedWordTable[newWordList[newWordIndex + 1]].word + "の" + newWordData.word;
                    }

                    console.log("改善案: %s -> %s", worstWordData.word, newWordData.word);
                    title = title.replace(worstWordData.word, newWordData.word);

                    mainLoop();
                })
                .catch(function(err) {
                    console.error(err);
                });
        }

    if (title === "@random") {
        title = titleList.others[parseInt(Math.random() * titleList.others.length)];
    }

    mainLoop(title);
});

"入力されたタイトル: 吾輩は猫である\nライトノベルっぽさ: 10.844865219750517%\n改善案: 吾輩 -> くちびる\n入力されたタイトル: くちびるは猫である\nライトノベルっぽさ: 12.737563935483948%\n改善案: くちびる -> 妹\n入力されたタイトル: 妹は猫である\nライトノベルっぽさ: 3.171082682867953%\n改善案: 妹 -> 俺の妹\n入力されたタイトル: 俺の妹は猫である\nライトノベルっぽさ: 87.05175909530978%\n改善案: 猫 -> 姫\n入力されたタイトル: 俺の妹は姫である\nライトノベルっぽさ: 97.51683517106113%"

process.on("uncaughtexception", function(err) {
    console.log(err);
})
