var MeCabJS = require("./mecabjs.js"),
    fs = require("exfs");

mecab = new MeCabJS();

var count = 0;

mecab.on("data", function(d) {
    var res = "";
    count += d.length;
    for (var i = 0, max = d.length; i < max; i++)
        res += d[i].word + "\n";

    console.log(count);
    output2.write(res);
});

var resource = fs.createReadStream("./output")
output2 = fs.createWriteStream("./output2");

var chunk = "";

resource.on("data", function(data) {
    chunk += data.toString("utf8");

    var i, line;
    while (1) {
        i = chunk.indexOf("\n");
        if (i === -1) break;

        line = chunk.substr(0, i);
        chunk = chunk.substr(i + 1);

        mecab.write(line);
    }
});
