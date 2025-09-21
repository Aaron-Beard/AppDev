const usernumber = 4;

console.log("User Number is", usernumber, "\n");

calculateGrade(usernumber);
showStars(usernumber);
isPrime(usernumber);
multiplicationTable(usernumber);

function calculateGrade(score){
    console.log("Grade Table:");
    console.log("90-100: A");
    console.log("80-89: B");
    console.log("70-79: C");
    console.log("60-69: D");
    console.log("Below 60: F\n");

    score = score * 10 + 5;
    console.log("Score:", score);

    if (score < 60){
        console.log("Result: F\n");
    }
    else if (score < 70){
        console.log("Result: D\n");
    }
    else if (score < 80){
        console.log("Result: C\n");
    }
    else if (score < 90){
        console.log("Result: B\n");
    }
    else if (score <= 100){
        console.log("Result: A\n");
    }

}

function showStars(rows){
    rows += 2;
    for(let i = 1; i <= rows; i++){
        let stars = "";
        for(let j = 1; j <= i; j++){
            stars += "*";
        }
        console.log(stars);
    }
}

function isPrime(n){
    n += 10;
    let prime = true;
    for(let i = 2; i <= n/2; i++){
        if(n % i ===0){
            prime = false;
        }
    }
    switch(prime){
        case true:
            console.log("\n", n, "is prime\n")
            break;
        case false:
            console.log("\n", n, "is not prime\n");
            break;
        default:
            console.log("Error with prime variable\n");
    }
}

function multiplicationTable(n){
    for(let i = 1; i <= 12; i++){
        console.log(i, "*", n, "=", i*n);
    }
}

return;