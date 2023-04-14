'use strict';

const fs = require('fs');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', function(inputStdin) {
    inputString += inputStdin;
});

process.stdin.on('end', function() {
    inputString = inputString.split('\n');

    main();
});

function readLine() {
    return inputString[currentLine++];
}

/*
 * Complete the 'sockMerchant' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER n
 *  2. INTEGER_ARRAY ar
 */

function sockMerchant(n, ar) {
    // Write your code here

    arr;
    arr.push(ar[0]);
    for (let l = 0; l < n; l++) {
        let tr = true;
        for (let s = 0; s < arr.length; s++) {
            if (ar[l] == arr[s]) {
                tr = false;
                break;
            }
        }
        if (tr) {
            arr.push(ar[l]);
        }
    }

    let t = 0;
    for (let i = 0; i < arr.length; i++) {
        let c = 1;
        for (let j = 0; j < n; j++) {
            if (arr[i] == ar[j]) {
                c++;
            }
        }
        t += parseInt(c / 2);
    }
    return t;

}

function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const n = parseInt(readLine().trim(), 10);

    const ar = readLine().replace(/\s+$/g, '').split(' ').map(arTemp => parseInt(arTemp, 10));

    const result = sockMerchant(n, ar);

    ws.write(result + '\n');

    ws.end();
}