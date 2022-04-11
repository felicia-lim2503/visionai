"use strict";

const express = require("express");
const fs = require("fs");
const multer = require("multer");
// const { authUser } = require("@es-labs/node/auth");
// const StoreKnex = require("../../services").get("knex1");
const { OPENAI_API } = global.CONFIG;
const axios = require("axios");
const csv = require("fast-csv");
const papa = require("papaparse");
const path = require("path");
const { count, clear } = require("console");
const { clearInterval } = require("timers");

const upload = multer({ dest: "./uploadedFiles/" });

function transpose(a) {
  // Calculate the width and height of the Array
  let w = a.length || 0;
  let h = a[0] instanceof Array ? a[0].length : 0;

  // In case it is a zero matrix, no transpose routine needed.
  if (h === 0 || w === 0) {
    return [];
  }

  /**
   * @let {Number} i Counter
   * @let {Number} j Counter
   * @let {Array} t Transposed data is stored in this array.
   */
  let i,
    j,
    t = [];

  // Loop through every item in the outer array (height)
  for (i = 0; i < h; i++) {
    // Insert a new row (array)
    t[i] = [];

    // Loop through every item per item in outer array (width)
    for (j = 0; j < w; j++) {
      // Save transposed data.

      t[i][j] = a[j][i];
    }
  }

  return t;
}

async function saveInput(req) {
  let xlsx = require("node-xlsx");
  let fs = require("fs");
  let obj = xlsx.parse(req.file.path); // parses a file
  let rows = [];
  let writeStr = "";

  //looping through all sheets
  for (let i = 0; i < obj.length; i++) {
    let sheet = obj[i];
    //loop through all rows in the sheet
    for (let j = 0; j < sheet["data"].length; j++) {
      //add the row to the rows array
      rows.push(sheet["data"][j]);
    }
  }

  //creates the csv string to write it to a file
  for (let i = 0; i < rows.length; i++) {
    writeStr += rows[i].join(",") + "\n";
  }

  //writes to a file, but you will presumably send the csv as a
  //response instead
  fs.writeFile(
    __dirname + `/../survey-inputs/${req.file.originalname}.csv`,
    writeStr,
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log(
        `${req.file.originalname}.csv was saved in the current directory!`
      );
    }
  );
}

function countWords(str) {
  let length;
  if (str) {
    length = str.split(/[^\s]+/).length - 1;
  } else {
    length = 0;
  }
  return length;
}

function getModel(data) {
  let model = [];
  try {
    for (let productKey in data) {
      let modelArray = [];
      for (let review of data[productKey]) {
        //access each review in array
        let numOfWords = countWords(review);
        if (numOfWords > 7) {
          modelArray.push(review); //push all the reviews of each product in modelArray
        }
      }

      model.push({ [productKey]: modelArray });
    }
  } catch (e) {
    console.log("error:", e);
  }
  return model;
}

function exportToCsv(filename, rows) {
  let processRow = function (row) {
    let finalVal = "";
    for (let j = 0; j < row.length; j++) {
      let innerValue = row[j] === null ? "" : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      }
      let result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
      if (j > 0) finalVal += ",";
      finalVal += result;
    }
    return finalVal + "\n";
  };

  let csvFile = "";
  for (let i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  let blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    let link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      let url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

async function callAPI(rating_str, res) {
  return new Promise((resolve) => {
    const { Configuration, OpenAIApi } = require("openai");
    const configuration = new Configuration({
      apiKey: OPENAI_API,
    });
    const openai = new OpenAIApi(configuration);
    const response = openai.createCompletion("text-davinci-002", {
      prompt: `Write a product review based on these notes:\n\n${rating_str}${res}\n\nReview:`,
      temperature: 0.5,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 1.01,
      presence_penalty: 0.48,
    });
    setTimeout(() => {
      resolve(response);
    }, Math.floor(Math.random() * 5000));
  });
}

async function feedModel(cleanedData) {
  let result = [];
  let output = [["respid", "qn", "rating", "response", "new_response"]];

  try {
    for (const [index, [key, value]] of Object.entries(
      Object.entries(cleanedData)
    )) {
      for (const [k, v] of Object.entries(value)) {
        let obj = v;
        // console.log("obj", obj.new_response);
        let response;
        let row = [];
        if (index <= 20) {
          if (obj.new_response == "") {
            const promises = [];
            promises.push(await callAPI(obj.rating_str, obj.response));
            Promise.all(promises)
              .then((results) => {
                obj.new_response = results[0].data.choices[0].text;
                row = [
                  obj.respid,
                  obj.qn,
                  obj.rating,
                  obj.response,
                  obj.new_response.trim(),
                ];

                // console.log("row", row);
                output.push(row);
                // console.log("output", output);
                // console.log("print")
              })
              .catch((e) => {
                // Handle errors here
                console.log("errorS?", e);
              });
          }
        }
      }
    }

    // console.log("output2", output);
    return output;
  } catch (e) {
    console.log("error!", e);
  }
}

function cleanData(data) {
  try {
    let cleanedData = [];
    let key;
    for (let i in data) {
      let reviewObj;
      if (i > 0) {
        let eachReview = data[i];
        for (let x in eachReview) {
          key = eachReview[1];
          //translate ratings to text 1 - very bad, 2 - bad, 3 - average,  4 - good, 5 - excellent
          let rating;
          if (eachReview[2] == 5) {
            rating = "excellent";
          } else if (eachReview[2] == 4) {
            rating = "good";
          } else if (eachReview[2] == 3) {
            rating = "average";
          } else if (eachReview[2] == 2) {
            rating = "bad";
          } else {
            rating = "very bad";
          }

          let numOfWords = countWords(eachReview[3]);
          if (numOfWords > 5) {
            reviewObj = {
              [data[0][0]]: eachReview[0],
              [data[0][1]]: eachReview[1],
              [data[0][2]]: eachReview[2],
              rating_str: rating,
              [data[0][3]]: eachReview[3],
              new_response: "",
            };
          } else {
            reviewObj = {
              [data[0][0]]: eachReview[0],
              [data[0][1]]: eachReview[1],
              [data[0][2]]: eachReview[2],
              rating_str: rating,
              [data[0][3]]: eachReview[3],
              new_response:
                "Unable to generate new response as it is too short",
            };
          }
        }
        cleanedData.push({ [key]: reviewObj });
      }
    }
    // console.log("cleanedData", cleanedData);
    return cleanedData;
  } catch (e) {
    console.log("error->", e);
  }
}

async function generateReview(data) {
  let cleanedData;
  try {
    cleanedData = cleanData(data);
    // return cleanedData;
    let generate = await feedModel(cleanedData);
    return generate;
  } catch (e) {
    console.log("error->", e);
  }
}

module.exports = express
  .Router()

  .get("/check", async (req, res) => {
    res.json("testing");
  })

  .post("/saveFile", upload.single("file1"), function (req, res) {
    saveInput(req);
    const coolPath = path.join(
      __dirname,
      `/../survey-inputs/${req.file.originalname}.csv`
    );
    const file = fs.createReadStream(coolPath);
    let data = [];
    let reviews = {};
    let count = 0; // cache the running count
    papa.parse(file, {
      step: function (results) {
        data.push(results.data);
        count++;
      },
      complete: async function (results, file) {
        let output;
        try {
          console.log("parsing complete read", count, "records.");
          // data = transpose(data);
          output = await generateReview(data);
          console.log("output", output);
          return res.json(output);
          //run the openai function
        } catch (e) {
          console.log("error!", e);
        }
      },
    });
  });
