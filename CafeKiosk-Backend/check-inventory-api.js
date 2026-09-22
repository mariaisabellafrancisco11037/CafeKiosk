const http = require("http");

const url =
    "http://127.0.0.1:5000/api/inventory/live?cafeId=cafe-1";

console.log("Checking:", url);

http.get(url, response => {
    let body = "";

    response.on("data", chunk => {
        body += chunk;
    });

    response.on("end", () => {
        console.log("HTTP STATUS:", response.statusCode);
        console.log("BODY:");
        console.log(body);
    });

}).on("error", error => {
    console.error("CONNECTION ERROR:", error.message);
});
