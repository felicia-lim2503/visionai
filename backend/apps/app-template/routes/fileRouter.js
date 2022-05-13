"use strict";

const express = require("express");
const fs = require("fs");
const multer = require("multer");
// const { authUser } = require("@es-labs/node/auth");
// const StoreKnex = require("../../services").get("knex1");
const { OPENAI_API } = global.CONFIG;
const papa = require("papaparse");
const path = require("path");
const fs_extra = require("fs-extra");

const upload = multer({ dest: "./uploadedFiles/" });

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
    writeStr += rows[i].join("\t") + "\n";
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

async function callAPI(rating_str, res) {
  return new Promise((resolve) => {
    const { Configuration, OpenAIApi } = require("openai");
    const configuration = new Configuration({
      apiKey: OPENAI_API,
    });
    const openai = new OpenAIApi(configuration);
    const response = openai.createCompletion("text-davinci-002", {
      prompt: `Generate an eloquent review of the accompanying Product. The review should discuss the description of the product:\n\n${res}\n\n The review should discuss the rating of the product: ${rating_str}\n\n\n\nReview:`,
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
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
async function feedModel(cleanedData) {
  let output = [["respid", "qn", "rating", "response", "new_response"]];

  try {
    for (const [index, [key, value]] of Object.entries(
      Object.entries(cleanedData)
    )) {
      for (const [k, v] of Object.entries(value)) {
        let obj = v;
        let row = [];
        // if (index <= 60) {
        if (obj.new_response == "") {
          await delay(5000);
          const promises = [];
          let truncatedOutput1;
          promises.push(await callAPI(obj.rating_str, obj.response));
          Promise.all(promises)
            .then((results) => {
              obj.new_response = results[0].data.choices[0].text;
              if (
                /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                  obj.new_response
                )
              ) {
                //take first sentence
                const regex = /.*?(\.)(?=\s[A-Z])/;

                if (
                  (truncatedOutput1 = regex.exec(obj.new_response)) !== null
                ) {
                  // console.log(m[0]);
                  if (
                    /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                      truncatedOutput1
                    )
                  ) {
                    console.log(
                      `1ST run: ${obj.response} -> ${truncatedOutput1}`
                    );
                    let first_output = truncatedOutput1;
                    //2nd time
                    const promises_two = [];
                    let truncatedOutput2;
                    promises_two.push(
                      callAPI(obj.rating_str, obj.response + " " + first_output)
                    );
                    Promise.all(promises_two)
                      .then((results) => {
                        obj.new_response = results[0].data.choices[0].text;
                        if (
                          /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                            obj.new_response
                          )
                        ) {
                          //take first sentence
                          const regex = /.*?(\.)(?=\s[A-Z])/;

                          if (
                            (truncatedOutput2 = regex.exec(
                              obj.new_response
                            )) !== null
                          ) {
                            if (
                              /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                                truncatedOutput2
                              )
                            ) {
                              console.log(
                                `2ND run: ${obj.response} -> ${truncatedOutput2}`
                              );
                              let second_output = truncatedOutput2;
                              const promises_three = [];
                              let truncatedOutput3;
                              promises_three.push(
                                callAPI(
                                  obj.rating_str,
                                  obj.response + " " + second_output
                                )
                              );
                              Promise.all(promises_three)
                                .then((results) => {
                                  obj.new_response =
                                    results[0].data.choices[0].text;
                                  if (
                                    /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                                      obj.new_response
                                    )
                                  ) {
                                    //take first sentence
                                    const regex =
                                      /^.*?[.!?](?=\s[A-Z]|\s?$)(?!.*\))/;

                                    if (
                                      (truncatedOutput3 = regex.exec(
                                        obj.new_response
                                      )) !== null
                                    ) {
                                      if (
                                        /\b(apply|rate|rating|ratings|rated|use|using|used|uses|tried|tries|trying|try|purchase|purchases|purchased|purchasing)\b/i.test(
                                          truncatedOutput3
                                        )
                                      ) {
                                        console.log(
                                          `LAST run: ${obj.response} -> ${truncatedOutput3}`
                                        );
                                        //copy response column into new_response column
                                        row = [
                                          obj.respid,
                                          obj.qn,
                                          obj.rating,
                                          obj.response,
                                          obj.response,
                                        ];

                                        // console.log("row", row);
                                        output.push(row);
                                      }
                                    }
                                  } else {
                                    row = [
                                      obj.respid,
                                      obj.qn,
                                      obj.rating,
                                      obj.response,
                                      truncatedOutput3
                                        .toString()
                                        .replace(",.", ""),
                                    ];

                                    // console.log("row", row);
                                    output.push(row);
                                    // console.log("output", output);
                                    // console.log("print")
                                  }
                                })
                                .catch((e) => {
                                  // Handle errors here
                                  console.log("errorS?", e);
                                });
                            } else {
                              row = [
                                obj.respid,
                                obj.qn,
                                obj.rating,
                                obj.response,
                                truncatedOutput2.toString().replace(",.", ""),
                              ];

                              // console.log("row", row);
                              output.push(row);
                              // console.log("output", output);
                              // console.log("print")
                            }
                          }
                        } else {
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
                        }
                      })
                      .catch((e) => {
                        // Handle errors here
                        console.log("errorS?", e);
                      });
                  } else {
                    row = [
                      obj.respid,
                      obj.qn,
                      obj.rating,
                      obj.response,
                      truncatedOutput1.toString().replace(",.", ""),
                    ];

                    // console.log("row", row);
                    output.push(row);
                    // console.log("output", output);
                    // console.log("print")
                  }
                }
              } else {
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
              }
            })
            .catch((e) => {
              // Handle errors here
              console.log("errorS?", e);
            });
          //---
        } else {
          //copy response column into new_response column
          row = [
            obj.respid,
            obj.qn,
            obj.rating,
            obj.response,
            obj.new_response,
          ];

          // console.log("row", row);
          output.push(row);
        }
        // }
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
          } else if (eachReview[2] == 1) {
            rating = "very bad";
          } else if (eachReview[2] == 0) {
            rating = "";
          }

          let numOfWords = countWords(eachReview[3]);
          if (numOfWords <= 4) {
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
              new_response: eachReview[3],
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
  let generate;
  try {
    cleanedData = cleanData(data);
    // return cleanedData;
    generate = await feedModel(cleanedData);
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

  .post("/saveFile", upload.single("file1"), async function (req, res) {
    saveInput(req);
    const coolPath = path.join(
      __dirname,
      `/../survey-inputs/${req.file.originalname}.csv`
    );
    const file = fs.createReadStream(coolPath);
    let data = [];
    let count = 0; // cache the running count
    papa.parse(file, {
      delimiter: "\t",
      step: function (results) {
        if (results.data[0] != "") {
          data.push(results.data);
          count++;
        }
      },
      complete: async function (results, file) {
        let output;
        try {
          console.log("parsing complete read", count, "records.");
          output = await generateReview(data);
          // console.log("output", output);

          // fs.unlink(coolPath, (err) => {
          //   if (err) {
          //     console.error(err);
          //     return;
          //   }
          // });
        } catch (e) {
          console.log("error!", e);
        }
        // await fs_extra.remove(`/../survey-inputs/${req.file.originalname}.csv`);

        const fs = require("fs");

        const path = `./apps/app-template/survey-inputs/${req.file.originalname}.csv`;
        fs.unlink(path, function (err) {
          if (err) {
            console.error(err);
          } else {
            console.log("File removed:", path);
          }
        });
        return res.json(output);
      },
    });
  });
