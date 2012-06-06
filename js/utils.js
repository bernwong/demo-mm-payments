var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
};

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function CurrencyFormatted(amount) {
    var i = parseFloat(amount), minus = '', s;
    if (isNaN(i)) { i = 0.00; }
    if (i < 0) { minus = '-'; }
    i = Math.floor((Math.abs(i) + .005) * 100) / 100;
    s = String(i);
    if (s.indexOf('.') < 0) { s += '.00'; }
    if (s.indexOf('.') == (s.length - 2)) { s += '0'; }
    return minus + s;
}
// end of function CurrencyFormatted()

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
