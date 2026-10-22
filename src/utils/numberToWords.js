export function amountToWords(amount) {
    let num = Math.round(Number(amount) || 0);
    if (num <= 0) return "Zero only";

    const ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    function convert(n) {
        let str = "";
        if (n > 99) {
            str += ones[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n > 19) {
            str += tens[Math.floor(n / 10)] + " ";
            n %= 10;
        }
        if (n > 0) {
            str += ones[n] + " ";
        }
        return str;
    }

    let result = "";
    if (num >= 10000000) {
        result += convert(Math.floor(num / 10000000)) + "Crore ";
        num %= 10000000;
    }
    if (num >= 100000) {
        result += convert(Math.floor(num / 100000)) + "Lakh ";
        num %= 100000;
    }
    if (num >= 1000) {
        result += convert(Math.floor(num / 1000)) + "Thousand ";
        num %= 1000;
    }
    result += convert(num);

    return result.trim().replace(/\s+/g, " ") + " only";
}