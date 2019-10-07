const sendmail = require("sendmail")();
const fs = require('fs');
const { isPointInPolygon } = require("geolib");
const fetch = require("node-fetch");

const twoBedrooms = {
  query:
    "https://sfbay.craigslist.org/jsonsearch/apa/?sort=date&availabilityMode=0&min_bedrooms=2&max_bedrooms=2&max_price=3800&postal=94110&query=mission&search_distance=0&map=1",
  name: "Two Bedroom"
};

const threeBedrooms = {
  query:
    "https://sfbay.craigslist.org/jsonsearch/apa/?sort=date&availabilityMode=0&min_bedrooms=3&max_bedrooms=3&max_price=5600&postal=94110&query=mission&search_distance=0&map=1",
  name: "Three Bedroom"
};

const sendPromise = html => new Promise((resolve, reject) => {
  sendmail(
    {
      from: "guythomas721@gmail.com",
      to: "mmcdowellap5@gmail.com , guythomas721@gmail.com ",
      subject: "New houses I found",
      html
    },
    function(err, reply) {
      if (err){
        reject(err);
      } else {
        resolve(reply)
      }
    }
  );
})

const topLeft = { latitude: 37.768682, longitude: -122.426696 };
const topRight = { latitude: 37.768242, longitude: -122.407941 };
const bottomLeft = { latitude: 37.751854, longitude: -122.425152 };
const bottomRight = { latitude: 37.752905, longitude: -122.406526 };

const isInTheMission = ({ Latitude: latitude, Longitude: longitude }) =>
  isPointInPolygon({ latitude, longitude }, [
    topLeft,
    topRight,
    bottomLeft,
    bottomRight
  ]);

const getListings = async ({ query, name }) => {
  const response = await fetch(query);
  const data = await response.json();
  const alreadySent = new Set(fs.readFileSync('sent.txt', 'utf8').split('\n'));
  const listingsInBounds = data[0]
    .filter(listing => Object.hasOwnProperty.call(listing, "Ask"))
    .filter(isInTheMission)
    .filter(listing => !alreadySent.has(listing.PostingURL));

  return { name, listings: listingsInBounds };
};

const emailHousesInTheMissions = async (queryURLS = []) => {
  const results = await Promise.all(queryURLS.map(getListings));
  console.log("results", results);
  const totalResultsCount = results.reduce(
    (acc, { listings }) => acc + listings.length,
    0
  );

  if (!totalResultsCount) {
    console.log("Existing since there are no results");
    return;
  }
  const listingsHTML = results
    .map(
      ({ name, listings }) =>
        `
    <h2>${name}</h2>
    <ul>
      ${listings
        .map(
          ({ Ask, PostingTitle, PostingURL }) =>
            `<li>( $${Ask} ) <a href="${PostingURL}">${PostingTitle}</a></li>`
        )
        .join("\n")}
    </ul>`
    )
    .join("\n");

  const finalHTML = `
        <h1>New Houses!</h1>
        <br>
        ${listingsHTML}
        `;

  if (process.env.NODE_ENV === "production") {
    const logText = results.map(({ name, listings }) => listings.map( listing => listing.PostingURL).join('\n')).join('\n');
    try{
      await sendPromise(finalHTML);
      fs.appendFileSync('sent.txt', logText);
    } catch(e){
      fs.appendFileSync('failed.txt', logText);
    }
  } else {
    console.log("Would Send\n", finalHTML);
  }
};

emailHousesInTheMissions([twoBedrooms, threeBedrooms]);
