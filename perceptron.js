var Mat = require("../Mat");

function Perceptron(vectorSize) {
    if (!(this instanceof Perceptron)) {
        return new Perceptron();
    }

    this.weight = new Mat(vectorSize, 1);
    this.border = 0;
};

Perceptron.prototype.judge = function(dataVector) {
    if (dataVector.columns !== 1 || dataVector.rows !== this.weight.rows) {
        throw new Mat.MatrixSizeError("Input data vector is invalid size.");
    }

    return this.weight.dot(dataVector) >= this.border
};

Perceptron.prototype.train = function(dataVector, correctValue) {
    var judgedValue = this.judge(dataVector);

    if (judgedValue === correctValue) {
        return;
    }

    if (correctValue) {
        this.weight = this.weight.add(dataVector);
    } else {
        this.weight = this.weight.sub(dataVector);
    }
};
