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
const { count } = require("console");

const upload = multer({ dest: "./uploadedFiles/" });

function transpose(a) {
  // Calculate the width and height of the Array
  var w = a.length || 0;
  var h = a[0] instanceof Array ? a[0].length : 0;

  // In case it is a zero matrix, no transpose routine needed.
  if (h === 0 || w === 0) {
    return [];
  }

  /**
   * @var {Number} i Counter
   * @var {Number} j Counter
   * @var {Array} t Transposed data is stored in this array.
   */
  var i,
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
  var xlsx = require("node-xlsx");
  var fs = require("fs");
  var obj = xlsx.parse(req.file.path); // parses a file
  var rows = [];
  var writeStr = "";

  //looping through all sheets
  for (var i = 0; i < obj.length; i++) {
    var sheet = obj[i];
    //loop through all rows in the sheet
    for (var j = 0; j < sheet["data"].length; j++) {
      //add the row to the rows array
      rows.push(sheet["data"][j]);
    }
  }

  //creates the csv string to write it to a file
  for (var i = 0; i < rows.length; i++) {
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

async function feedModel(cleanedData) {
  try {
    let data = cleanedData;
    for (const [key, value] of Object.entries(data)) {
      for (const [k, v] of Object.entries(value)) {
        let obj = v;
        for (let i in obj) {
          if (obj.new_response == "") {
            const { Configuration, OpenAIApi } = require("openai");
            const configuration = new Configuration({
              apiKey: OPENAI_API,
            });
            const openai = new OpenAIApi(configuration);
            const response = await openai.createCompletion("text-davinci-002", {
              prompt: `Write a product review based on these notes:\n\n${obj.rating}${obj.response}\n\nReview:`,
              temperature: 0.5,
              max_tokens: 100,
              top_p: 1,
              frequency_penalty: 1.01,
              presence_penalty: 1.01,
            });
            obj.new_response = response.data.choices[0].text
            console.log("output", obj)
            // console.log("response", response.data.choices[0].text);
          }
        }
      }
    }
    // console.log("output",data)
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
          if (numOfWords > 4) {
            reviewObj = {
              [data[0][0]]: eachReview[0],
              [data[0][1]]: eachReview[1],
              [data[0][2]]: rating,
              [data[0][3]]: eachReview[3],
              new_response: "",
            };
          } else {
            reviewObj = {
              [data[0][0]]: eachReview[0],
              [data[0][1]]: eachReview[1],
              [data[0][2]]: rating,
              [data[0][3]]: eachReview[3],
              new_response:
                "Unable to generate new response as it is too short",
            };
          }
        }
      }
      cleanedData.push({ [key]: reviewObj });
    }
    // console.log("reviewArray", reviewArray);
    return cleanedData;
  } catch (e) {
    console.log("error->", e);
  }
}

function generateReview(data) {
  try {
    let cleanedData = cleanData(data);
    let generate = feedModel(cleanedData);
  } catch (e) {
    console.log("error->", e);
  }
  // let modelArray;
  // let modelStr;
  // try {
  //   //call getModel and get obj
  //   modelArray = getModel(data);
  //   // console.log("modelArray -", modelArray);
  //   //for each obj in the array, run the api
  //   for (let index in modelArray) {
  //     //concat all reviews into one string
  //     for (let productKey in modelArray[index]) {
  //       modelStr = modelArray[index][productKey].join(". ");
  //       // console.log("INPUT-------------->", modelStr);
  //       let output = feedModel(modelStr);
  //     }
  //   }
  // } catch (e) {
  //   console.log("error!", e);
  // }

  // return modelArray;
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
      complete: function (results, file) {
        let output;
        try {
          console.log("parsing complete read", count, "records.");
          // data = transpose(data);
          output = generateReview(data);
          //run the openai function
        } catch (e) {
          console.log("error!", e);
        }
        return res.json(output);
      },
    });
  });
